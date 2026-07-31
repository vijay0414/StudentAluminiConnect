const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get conversations list
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [conversations] = await pool.execute(
      `SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as user_id,
        (SELECT name FROM users WHERE id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) as name,
        (SELECT profile_photo FROM users WHERE id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) as profile_photo,
        (SELECT is_online FROM users WHERE id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) as is_online,
        (SELECT content FROM messages WHERE
          ((sender_id = ? AND receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) OR
           (sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND receiver_id = ?))
          ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE
          ((sender_id = ? AND receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) OR
           (sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND receiver_id = ?))
          ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
          AND receiver_id = ? AND is_read = false) as unread_count
      FROM messages m
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    // Deduplicate by user_id
    const uniqueConvos = [];
    const seen = new Set();
    for (const c of conversations) {
      if (!seen.has(c.user_id)) {
        seen.add(c.user_id);
        uniqueConvos.push(c);
      }
    }

    res.json(uniqueConvos);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages between two users
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const [messages] = await pool.execute(
      `SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    // Mark messages from other user as read
    await pool.execute(
      'UPDATE messages SET is_read = true WHERE sender_id = ? AND receiver_id = ? AND is_read = false',
      [otherUserId, currentUserId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message (REST fallback)
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    // Check permissions
    const [users] = await pool.execute('SELECT id, role FROM users WHERE id IN (?, ?)', [req.user.id, req.params.userId]);
    const senderRole = users.find(u => u.id == req.user.id)?.role;
    const receiverRole = users.find(u => u.id == req.params.userId)?.role;
    const isStudentOrAlumni = (role) => role === 'student' || role === 'alumni';
    
    if (isStudentOrAlumni(senderRole) && isStudentOrAlumni(receiverRole)) {
      const [follows] = await pool.execute(
        'SELECT id FROM followers WHERE status = "accepted" AND ((follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?))',
        [req.user.id, req.params.userId, req.params.userId, req.user.id]
      );
      if (follows.length === 0) {
        return res.status(403).json({ message: 'You must have an accepted follow connection to message this student' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.user.id, req.params.userId, content]
    );

    // Create notification
    await pool.execute(
      'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
      [req.params.userId, req.user.id, 'message', result.insertId, `${req.user.name} sent you a message`]
    );

    const [message] = await pool.execute(
      'SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
      [result.insertId]
    );

    res.status(201).json(message[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete specific message
router.delete('/message/:msgId', authMiddleware, async (req, res) => {
  try {
    const [msg] = await pool.execute('SELECT * FROM messages WHERE id = ?', [req.params.msgId]);
    if (msg.length === 0) return res.status(404).json({ message: 'Not found' });
    if (msg[0].sender_id !== req.user.id && msg[0].receiver_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    
    await pool.execute('DELETE FROM messages WHERE id = ?', [req.params.msgId]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Clear entire chat History
router.delete('/:userId/clear', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      `DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [req.user.id, req.params.userId, req.params.userId, req.user.id]
    );
    res.json({ message: 'Chat cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing chat' });
  }
});

module.exports = router;
