const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const xlsx = require('xlsx');
const fs = require('fs');
const router = express.Router();

// Get pending users
router.get('/pending-users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, staff_role, department, batch, created_at, register_number, profile_photo FROM users WHERE is_approved = false ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk upload students via Excel
router.post('/upload-students', authMiddleware, roleMiddleware('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an Excel file (.xlsx or .xls)' });
  }

  const filePath = req.file.path;
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Excel Upload: Processing ${data.length} rows.`);

    let successCount = 0;
    let errorCount = 0;

    // Helper to find a value by flexible key matching
    const getValue = (row, keys) => {
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        const found = rowKeys.find(rk => 
          rk.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, '')
        );
        if (found) return row[found];
      }
      return null;
    };

    for (const record of data) {
      const name = getValue(record, ['Name', 'full_name', 'student_name']);
      const email = getValue(record, ['Email', 'email_address']);
      const regNum = getValue(record, ['Register Number', 'Reg No', 'reg_number', 'register_no', 'reg_no']);
      const dept = getValue(record, ['Department', 'branch', 'dept']);
      const batch = getValue(record, ['Batch', 'year']);

      if (name && email && regNum) {
        try {
          await pool.execute(
            'INSERT INTO student_records (name, email, register_number, department, batch) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, department = ?, batch = ?',
            [name, email, regNum, dept || null, batch || null, name, dept || null, batch || null]
          );
          successCount++;
        } catch (e) {
          console.error('DB Insert Error:', e.message);
          errorCount++;
        }
      } else {
        console.warn('Record skipped due to missing required fields:', record);
        errorCount++;
      }
    }

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.json({
      message: `Upload complete. ${successCount} records processed.`,
      summary: { total: data.length, success: successCount, failed: errorCount }
    });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Error processing Excel file' });
  }
});

// Approve user
router.put('/approve/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await pool.execute('UPDATE users SET is_approved = true WHERE id = ?', [req.params.id]);
    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject (delete) user
router.delete('/reject/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ? AND is_approved = false', [req.params.id]);
    res.json({ message: 'User rejected and removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, staff_role, department, batch, is_approved, created_at, register_number FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard stats
router.get('/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [pendingUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_approved = false');
    const [totalPosts] = await pool.execute('SELECT COUNT(*) as count FROM posts');
    const [verifiedStudents] = await pool.execute('SELECT COUNT(*) as count FROM student_records');

    const [roleBreakdown] = await pool.execute(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    res.json({
      totalUsers: totalUsers[0].count,
      pendingUsers: pendingUsers[0].count,
      totalPosts: totalPosts[0].count,
      verifiedStudents: verifiedStudents[0].count,
      roleBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all posts (admin)
router.get('/posts', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.*, u.name, u.profile_photo, u.role as user_role
       FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`
    );
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post (admin)
router.delete('/posts/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
