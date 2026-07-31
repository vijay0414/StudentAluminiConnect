const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const { pool, initDatabase } = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const followerRoutes = require('./routes/followers');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/followers', followerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_online', async (userId) => {
    onlineUsers.set(userId, socket.id);
    try {
      await pool.execute('UPDATE users SET is_online = true WHERE id = ?', [userId]);
    } catch (e) {}
    io.emit('user_status', { userId, isOnline: true });
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, content, senderName, senderPhoto } = data;
    try {
      const [users] = await pool.execute('SELECT id, role FROM users WHERE id IN (?, ?)', [senderId, receiverId]);
      const senderRole = users.find(u => u.id == senderId)?.role;
      const receiverRole = users.find(u => u.id == receiverId)?.role;
      const isStudentOrAlumni = (role) => role === 'student' || role === 'alumni';
      
      if (isStudentOrAlumni(senderRole) && isStudentOrAlumni(receiverRole)) {
        const [follows] = await pool.execute(
          'SELECT id FROM followers WHERE status = "accepted" AND ((follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?))',
          [senderId, receiverId, receiverId, senderId]
        );
        if (follows.length === 0) {
          socket.emit('message_error', { error: 'You must have an accepted follow connection to message this student' });
          return;
        }
      }

      const [result] = await pool.execute(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [senderId, receiverId, content]
      );

      // Create notification
      await pool.execute(
        'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
        [receiverId, senderId, 'message', result.insertId, `${senderName} sent you a message`]
      );

      const messageData = {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        sender_name: senderName,
        sender_photo: senderPhoto,
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Send to receiver if online
      const receiverSocket = onlineUsers.get(receiverId.toString()) || onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_message', messageData);
        io.to(receiverSocket).emit('new_notification', {
          type: 'message',
          from_name: senderName,
          message: `${senderName} sent you a message`
        });
      }

      // Send back to sender
      socket.emit('message_sent', messageData);
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing', (data) => {
    const { receiverId } = data;
    const receiverSocket = onlineUsers.get(receiverId.toString()) || onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('user_typing', data);
    }
  });

  socket.on('mark_read', async (data) => {
    const { senderId, receiverId } = data;
    try {
      await pool.execute(
        'UPDATE messages SET is_read = true WHERE sender_id = ? AND receiver_id = ? AND is_read = false',
        [senderId, receiverId]
      );
    } catch (e) {}
  });

  socket.on('disconnect', async () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      try {
        await pool.execute('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = ?', [disconnectedUserId]);
      } catch (e) {}
      io.emit('user_status', { userId: disconnectedUserId, isOnline: false });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 CampusConnect server running on port ${PORT}`);
  });
});
