const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  try {
    // Create database if not exists
    const tempConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await tempConn.end();

    // Create tables
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student','alumni','staff','admin') NOT NULL DEFAULT 'student',
        staff_role VARCHAR(50) DEFAULT NULL,
        department VARCHAR(100) DEFAULT NULL,
        batch VARCHAR(20) DEFAULT NULL,
        skills TEXT DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        register_number VARCHAR(100) DEFAULT NULL,
        profile_photo VARCHAR(500) DEFAULT NULL,
        cover_photo VARCHAR(500) DEFAULT NULL,
        contact_info VARCHAR(200) DEFAULT NULL,
        college_name VARCHAR(150) DEFAULT NULL,
        is_approved BOOLEAN DEFAULT FALSE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS student_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        register_number VARCHAR(100) UNIQUE NOT NULL,
        department VARCHAR(100) DEFAULT NULL,
        batch VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add test data for student_records if empty
    const [studentRecordsCount] = await pool.execute('SELECT COUNT(*) AS count FROM student_records');
    if (studentRecordsCount[0].count === 0) {
      await pool.execute(`
        INSERT INTO student_records (name, email, register_number, department, batch) VALUES
        ('Mark', 'mark@example.com', '922523205179', 'Information Technology', '2027'),
        ('Jane Smith', 'jane.smith@example.com', '922523205180', 'Electrical Engineering', '2024'),
        ('Alice Johnson', 'alice.j@example.com', '922523205181', 'Mechanical Engineering', '2026')
      `);
      console.log('Test data added to student_records table.');
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        image_url VARCHAR(500) DEFAULT NULL,
        video_url VARCHAR(500) DEFAULT NULL,
        post_type ENUM('general','announcement','job','internship') DEFAULT 'general',
        tags VARCHAR(500) DEFAULT NULL,
        is_announcement BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS followers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        status ENUM('pending', 'accepted') DEFAULT 'accepted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await pool.execute("ALTER TABLE followers ADD COLUMN status ENUM('pending', 'accepted') DEFAULT 'accepted' AFTER following_id");
    } catch(e) {
      // Column might already exist, ignore
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        from_user_id INT NOT NULL,
        type ENUM('like','comment','follow','message') NOT NULL,
        reference_id INT DEFAULT NULL,
        message VARCHAR(500) DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create default admin
    const bcrypt = require('bcryptjs');
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@campusconnect.com']);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.execute(
        'INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, ?, ?)',
        ['Admin', 'admin@campusconnect.com', hashedPassword, 'admin', true]
      );
      console.log('Default admin created: admin@campusconnect.com / admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

module.exports = { pool, initDatabase };
