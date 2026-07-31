const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get follow requests
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT f.id as follow_id, u.id, u.name, u.email, u.role, u.department, u.profile_photo, u.bio
       FROM followers f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.id;
    const followerRole = req.user.role;

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Check if user exists
    const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [followingId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    
    const targetRole = users[0].role;

    // Check if already following
    const [existing] = await pool.execute(
      'SELECT id, status FROM followers WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: existing[0].status === 'pending' ? 'Follow request already sent' : 'Already following this user' });
    }

    // Determine status based on roles
    // student -> student requires request
    // alumni acts like student
    const isStudentOrAlumni = (role) => role === 'student' || role === 'alumni';
    let status = 'accepted';
    let messageStr = 'Followed successfully';
    let notifMsg = `${req.user.name} started following you`;
    
    if (isStudentOrAlumni(followerRole) && isStudentOrAlumni(targetRole)) {
        status = 'pending';
        messageStr = 'Follow request sent';
        notifMsg = `${req.user.name} requested to follow you`;
    }

    await pool.execute(
      'INSERT INTO followers (follower_id, following_id, status) VALUES (?, ?, ?)',
      [followerId, followingId, status]
    );

    // Create notification
    await pool.execute(
      'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
      [followingId, followerId, 'follow', followerId, notifMsg]
    );

    res.json({ message: messageStr, status });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept follow request
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const followerId = parseInt(req.params.id);
    const followingId = req.user.id;

    const [result] = await pool.execute(
      'UPDATE followers SET status = "accepted" WHERE follower_id = ? AND following_id = ? AND status = "pending"',
      [followerId, followingId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'No pending request found' });
    }

    // Create notification for the follower that request was accepted
    await pool.execute(
      'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
      [followerId, followingId, 'follow', followingId, `${req.user.name} accepted your follow request`]
    );

    res.json({ message: 'Follow request accepted' });
  } catch (error) {
    console.error('Accept error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject / Cancel / Unfollow user
router.delete('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    // This could be: current user unfollowing target, OR current user rejecting target's request/follow
    // First, try deleting where current user is follower
    let [result] = await pool.execute(
      'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetId]
    );

    if (result.affectedRows === 0) {
       // If nothing deleted, try deleting where target is follower (rejecting request or removing follower)
       [result] = await pool.execute(
         'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
         [targetId, currentUserId]
       );
    }

    res.json({ message: 'Action successful' });
  } catch (error) {
    console.error('Unfollow/Reject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get followers
router.get('/:id/followers', authMiddleware, async (req, res) => {
  try {
    const [followers] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.profile_photo, u.bio, f.status
       FROM followers f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND f.status = 'accepted' ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(followers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get following
router.get('/:id/following', authMiddleware, async (req, res) => {
  try {
    const [following] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.profile_photo, u.bio, f.status
       FROM followers f JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND f.status = 'accepted' ORDER BY f.created_at DESC`,
      [req.params.id]
    );
    res.json(following);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
