const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      `SELECT n.*, u.name as from_name, u.profile_photo as from_photo
       FROM notifications n JOIN users u ON n.from_user_id = u.id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
      [req.user.id]
    );
    res.json({ count: result[0].count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark as read
router.put('/read', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = true WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark single notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear all notifications
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
