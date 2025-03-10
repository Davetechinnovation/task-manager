const express = require('express');
const { Pool } = require('pg'); // Import PostgreSQL client
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json());

// Configure CORS with your frontend URL
const corsOptions = {
  origin: 'https://ddm-cohort-4-task-manager.netlify.app',
};
app.use(cors(corsOptions));

// Connect to Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon
});

// Test the database connection
pool.connect()
  .then(() => console.log('✅ Connected to Neon PostgreSQL Database'))
  .catch(err => console.error('🛑 Error connecting to database:', err.message));

// Create Tables (if not exist)
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_name TEXT NOT NULL,
        task_description TEXT NOT NULL,
        task_start_time TEXT NOT NULL,
        task_end_time TEXT NOT NULL,
        task_start_date TEXT NOT NULL,
        task_end_date TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'in-progress', 'completed', 'overdue')) DEFAULT 'pending',
        priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
        category TEXT
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tables created or already exist');
  } catch (err) {
    console.error('🛑 Error creating tables:', err.message);
  }
};

// Run table creation
createTables();

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
