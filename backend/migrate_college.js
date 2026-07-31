const { pool } = require('./config/db');

async function migrate() {
  try {
    console.log('Running migration...');
    // Add college_name column if it does not exist
    await pool.execute('ALTER TABLE users ADD COLUMN college_name VARCHAR(255) DEFAULT NULL');
    console.log('Migration successful: Added college_name to users table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Migration skipped: college_name already exists');
    } else {
      console.error('Migration error:', error.message);
    }
  }
  process.exit(0);
}

migrate();
