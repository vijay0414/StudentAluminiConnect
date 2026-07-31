const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, approvedMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create post
router.post('/', authMiddleware, approvedMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { content, post_type, tags, is_announcement } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    // Only staff can create announcements
    const announcement = (is_announcement === 'true' || is_announcement === true) && req.user.role === 'staff';

    // Only alumni can create job/internship posts
    let type = post_type || 'general';
    if ((type === 'job' || type === 'internship') && req.user.role !== 'alumni') {
      type = 'general';
    }

    let imageUrl = null;
    let videoUrl = null;
    if (req.file) {
      if (req.file.mimetype.startsWith('video/')) {
        videoUrl = `/uploads/${req.file.filename}`;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO posts (user_id, content, image_url, video_url, post_type, tags, is_announcement) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, content, imageUrl, videoUrl, type, tags || null, announcement]
    );

    const [post] = await pool.execute(
      `SELECT p.*, u.name, u.profile_photo, u.role as user_role, u.staff_role, u.college_name
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Post created', post: { ...post[0], likeCount: 0, commentCount: 0, isLiked: false } });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feed
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { tag, type, followed } = req.query;

    let query = `
      SELECT p.*, u.name, u.profile_photo, u.role as user_role, u.staff_role, u.college_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    let params = [req.user.id];

    let conditions = [];

    if (tag) {
      conditions.push(`p.tags LIKE ?`);
      params.push(`%${tag}%`);
    }
    if (type) {
      conditions.push(`p.post_type = ?`);
      params.push(type);
    }
    if (followed === 'true') {
      conditions.push(`(p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?) OR p.user_id = ?)`);
      params.push(req.user.id, req.user.id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Announcements first, then by date
    query += ` ORDER BY p.is_announcement DESC, p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [posts] = await pool.execute(query, params);

    // Get total for pagination
    let countQuery = `SELECT COUNT(*) as total FROM posts p`;
    let countParams = [];
    let countConditions = [];
    
    if (tag) {
      countConditions.push(`p.tags LIKE ?`);
      countParams.push(`%${tag}%`);
    }
    if (type) {
      countConditions.push(`p.post_type = ?`);
      countParams.push(type);
    }
    if (followed === 'true') {
      countConditions.push(`(p.user_id IN (SELECT following_id FROM followers WHERE follower_id = ?) OR p.user_id = ?)`);
      countParams.push(req.user.id, req.user.id);
    }
    if (countConditions.length > 0) {
      countQuery += ` WHERE ` + countConditions.join(' AND ');
    }

    const [total] = await pool.execute(countQuery, countParams);

    res.json({
      posts: posts.map(p => ({ ...p, isLiked: p.isLiked > 0 })),
      total: total[0].total,
      page,
      totalPages: Math.ceil(total[0].total / limit)
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.*, u.name, u.profile_photo, u.role as user_role, u.staff_role, u.college_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.user.id, req.params.id]
    );
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });
    res.json({ ...posts[0], isLiked: posts[0].isLiked > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/Unlike post
router.post('/:id/like', authMiddleware, approvedMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existing.length > 0) {
      await pool.execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      res.json({ message: 'Post unliked', liked: false });
    } else {
      await pool.execute('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);

      // Create notification
      const [post] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (post.length > 0 && post[0].user_id !== userId) {
        await pool.execute(
          'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
          [post[0].user_id, userId, 'like', postId, `${req.user.name} liked your post`]
        );
      }

      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comment', authMiddleware, approvedMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, content]
    );

    // Create notification
    const [post] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (post.length > 0 && post[0].user_id !== req.user.id) {
      await pool.execute(
        'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
        [post[0].user_id, req.user.id, 'comment', req.params.id, `${req.user.name} commented on your post`]
      );
    }

    const [comment] = await pool.execute(
      `SELECT c.*, u.name, u.profile_photo FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Comment added', comment: comment[0] });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a post
router.get('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const [comments] = await pool.execute(
      `SELECT c.*, u.name, u.profile_photo FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit post
router.put('/:id', authMiddleware, approvedMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { content, post_type, tags, is_announcement } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const [posts] = await pool.execute('SELECT user_id, image_url, video_url FROM posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });
    if (posts[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let imageUrl = posts[0].image_url;
    let videoUrl = posts[0].video_url;

    if (req.file) {
      if (req.file.mimetype.startsWith('video/')) {
        videoUrl = `/uploads/${req.file.filename}`;
        imageUrl = null;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
        videoUrl = null;
      }
    }

    const type = post_type || 'general';
    const announcement = (is_announcement === 'true' || is_announcement === true) && (req.user.role === 'staff' || req.user.role === 'admin');

    await pool.execute(
      `UPDATE posts SET content = ?, image_url = ?, video_url = ?, post_type = ?, tags = ?, is_announcement = ? WHERE id = ?`,
      [content, imageUrl, videoUrl, type, tags || null, announcement, req.params.id]
    );

    const [updatedPost] = await pool.execute(
      `SELECT p.*, u.name, u.profile_photo, u.role as user_role, u.staff_role, u.college_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.user.id, req.params.id]
    );

    res.json({ message: 'Post updated', post: { ...updatedPost[0], isLiked: updatedPost[0].isLiked > 0 } });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post (owner or admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    if (posts[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user posts
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.*, u.name, u.profile_photo, u.role as user_role, u.staff_role, u.college_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ? ORDER BY p.created_at DESC`,
      [req.user.id, req.params.userId]
    );
    res.json(posts.map(p => ({ ...p, isLiked: p.isLiked > 0 })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
