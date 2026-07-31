const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Register
router.post('/register', upload.single('profile_photo'), async (req, res) => {
  try {
    const { name, email, password, role, staff_role, department, batch, college_name, register_number } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let isApproved = false;
    let profilePhotoUrl = null;

    if (req.file) {
      profilePhotoUrl = `/uploads/${req.file.filename}`;
    }

    // Role-specific logic
    if (role === 'student') {
      if (!register_number) {
        return res.status(400).json({ message: 'Register number is required for students' });
      }
      // Check against student_records table
      const [record] = await pool.execute(
        'SELECT id FROM student_records WHERE email = ? AND register_number = ?',
        [email, register_number]
      );
      
      // If found in college DB, auto-approve. Otherwise, send to admin board for manual approval.
      isApproved = record.length > 0;
    } else if (role === 'alumni') {
      // Alumni always need admin approval if they have a register number or by default
      isApproved = false; 
    } else if (role === 'admin') {
      isApproved = true;
    } else {
      // HOD/Faculty/etc
      isApproved = false;
    }

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role, staff_role, department, batch, is_approved, college_name, register_number, profile_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        email, 
        hashedPassword, 
        role, 
        staff_role || null, 
        department || null, 
        batch || null, 
        isApproved, 
        college_name || null, 
        register_number || null,
        profilePhotoUrl
      ]
    );

    res.status(201).json({
      message: isApproved
        ? 'Registration successful'
        : 'Registration successful. Awaiting admin approval.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ message: 'Account pending admin approval' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.put('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password required' });
    
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'No account found with that email' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, staff_role, department, batch, skills, bio, profile_photo, contact_info, is_approved, created_at, college_name FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
