const { pool } = require('./config/db');

async function migrate() {
  try {
    console.log('Running migration...');
    
    // 1. Add register_number to users table if not exists
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN register_number VARCHAR(100) DEFAULT NULL');
      console.log('Success: Added register_number to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Skipped: register_number already exists in users');
      } else {
        throw e;
      }
    }

    // 2. Create student_records table for verification
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
    console.log('Success: student_records table verified/created');

    // 3. Insert some dummy student records for testing if empty
    const [existing] = await pool.execute('SELECT id FROM student_records LIMIT 1');
    if (existing.length === 0) {
      await pool.execute('INSERT INTO student_records (name, email, register_number, department, batch) VALUES (?, ?, ?, ?, ?)', ['Vivek', 'vivek@example.com', 'REG001', 'Computer Science', '2021-2025']);
      await pool.execute('INSERT INTO student_records (name, email, register_number, department, batch) VALUES (?, ?, ?, ?, ?)', ['Ananya', 'ananya@example.com', 'REG002', 'Information Technology', '2022-2026']);
      
      console.log('Success: Inserted test data into student_records');
    }

  } catch (error) {
    console.error('Migration error:', error.message);
  }
  process.exit(0);
}

migrate();
