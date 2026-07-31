const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, approvedMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Get user profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, name, email, role, staff_role, department, batch, skills, bio, profile_photo, cover_photo, contact_info, created_at, college_name FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    // Get follower/following counts
    const [followerCount] = await pool.execute('SELECT COUNT(*) as count FROM followers WHERE following_id = ? AND status = "accepted"', [req.params.id]);
    const [followingCount] = await pool.execute('SELECT COUNT(*) as count FROM followers WHERE follower_id = ? AND status = "accepted"', [req.params.id]);
    const [postCount] = await pool.execute('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [req.params.id]);

    // Check if current user follows this user
    const [isFollowing] = await pool.execute(
      'SELECT status FROM followers WHERE follower_id = ? AND following_id = ?',
      [req.user.id, req.params.id]
    );

    res.json({
      ...users[0],
      followerCount: followerCount[0].count,
      followingCount: followingCount[0].count,
      postCount: postCount[0].count,
      isFollowing: isFollowing.length > 0 && isFollowing[0].status === 'accepted',
      followStatus: isFollowing.length > 0 ? isFollowing[0].status : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/update', authMiddleware, upload.fields([{ name: 'profile_photo', maxCount: 1 }, { name: 'cover_photo', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, department, batch, skills, bio, contact_info, college_name } = req.body;
    let profilePhoto = null;
    let coverPhoto = null;

    if (req.files && req.files.profile_photo) {
      profilePhoto = `/uploads/${req.files.profile_photo[0].filename}`;
    }
    if (req.files && req.files.cover_photo) {
      coverPhoto = `/uploads/${req.files.cover_photo[0].filename}`;
    }

    let query = `UPDATE users SET name = ?, department = ?, batch = ?, skills = ?, bio = ?, contact_info = ?, college_name = ?`;
    let params = [name, department || null, batch || null, skills || null, bio || null, contact_info || null, college_name || null];

    if (profilePhoto) {
      query += `, profile_photo = ?`;
      params.push(profilePhoto);
    }
    if (coverPhoto) {
      query += `, cover_photo = ?`;
      params.push(coverPhoto);
    }

    query += ` WHERE id = ?`;
    params.push(req.user.id);

    await pool.execute(query, params);

    const [updated] = await pool.execute(
      'SELECT id, name, email, role, staff_role, department, batch, skills, bio, profile_photo, cover_photo, contact_info FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user: updated[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, department, batch, role } = req.query;
    let query = `SELECT id, name, email, role, staff_role, department, batch, profile_photo, cover_photo, bio, college_name FROM users WHERE is_approved = true`;
    let params = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (department) {
      query += ` AND department = ?`;
      params.push(department);
    }
    if (batch) {
      query += ` AND batch = ?`;
      params.push(batch);
    }
    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    query += ` ORDER BY name ASC LIMIT 50`;

    const [users] = await pool.execute(query, params);
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
