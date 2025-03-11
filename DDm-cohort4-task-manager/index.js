const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const corsOptions = {
    origin: 'https://ddm-cohort-4-task-manager.netlify.app', // Replace with your Netlify URL if different
};
app.use(cors(corsOptions));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.connect()
    .then(() => console.log('✅ Connected to Neon PostgreSQL Database'))
    .catch(err => console.error('🛑 Error connecting to database:', err.message));

const createTables = async () => { // Run table creation only once on server start
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
createTables();

// ✅ Authentication Middleware - to protect routes
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Bearer <token>
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.error('JWT Verification Error:', err);
                return res.sendStatus(403); // Forbidden - Token invalid
            }
            req.user = user; // Attach user info to request object
            next(); // Proceed to the next middleware or route handler
        });
    } else {
        res.sendStatus(401); // Unauthorized - No token provided
    }
};


// ✅ Protected route handler for GET /tasks - Fetch tasks for authenticated user
app.get('/tasks', authenticateJWT, async (req, res) => { // Apply authenticateJWT middleware
    try {
        const userId = req.user.userId; // User ID is now available from req.user

        const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
        const tasks = result.rows;

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
});


// ✅ Route handler for POST /login - User login (no auth middleware needed)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' }); // ✅ JWT_SECRET from .env

        res.status(200).json({ token, username: user.username, userId: user.id, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// ✅ Route handler for POST /signup - User signup (no auth middleware needed)
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        // Check if username or email already exists
        const existingUserResult = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(409).json({ message: 'Username or email already taken' }); // 409 Conflict
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash password

        const newUserResult = await pool.query(
            'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, hashedPassword, email]
        );
        const newUser = newUserResult.rows[0];

        res.status(201).json({ message: 'Signup successful', user: { id: newUser.id, username: newUser.username, email: newUser.email } }); // 201 Created
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Signup failed', error: error.message });
    }
});


// ✅ Protected route handler for POST /add_task - Add a new task (requires authentication)
app.post('/add_task', authenticateJWT, async (req, res) => { // Apply authenticateJWT middleware
    try {
        const userId = req.user.userId; // User ID from authenticated token

        const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category } = req.body;

        const result = await pool.query(
            `INSERT INTO tasks (user_id, task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [userId, task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category]
        );
        const newTask = result.rows[0];

        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ message: 'Failed to add task', error: error.message });
    }
});

// ✅ Protected route handler for PUT /tasks/:taskId/status - Update task status (requires authentication)
app.put('/tasks/:taskId/status', authenticateJWT, async (req, res) => { // Apply authenticateJWT
    const taskId = parseInt(req.params.taskId);
    const { status } = req.body;

    if (!['pending', 'in-progress', 'completed', 'overdue'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        // TODO: Authorization - Optionally verify if the user owns this task before updating
        // For now, assuming user is authorized if token is valid

        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
            [status, taskId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const updatedTask = result.rows[0];
        res.status(200).json(updatedTask);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Failed to update task status', error: error.message });
    }
});

// ✅ Protected route handler for PUT /tasks/:taskId - Edit/Update entire task (requires authentication)
app.put('/tasks/:taskId', authenticateJWT, async (req, res) => { // Apply authenticateJWT
    const taskId = parseInt(req.params.taskId);
    const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category } = req.body;

    try {
        // TODO: Authorization - Optionally verify if the user owns this task

        const result = await pool.query(
            `UPDATE tasks SET task_name = $1, task_description = $2, task_start_time = $3, task_end_time = $4,
             task_start_date = $5, task_end_date = $6, status = $7, priority = $8, category = $9
             WHERE id = $10 RETURNING *`,
            [task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, taskId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const updatedTask = result.rows[0];
        res.status(200).json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Failed to update task', error: error.message });
    }
});

// ✅ Protected route handler for DELETE /tasks/:taskId - Delete a task (requires authentication)
app.delete('/tasks/:taskId', authenticateJWT, async (req, res) => { // Apply authenticateJWT
    const taskId = parseInt(req.params.taskId);

    try {
        // TODO: Authorization - Optionally verify if the user owns this task

        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [taskId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ message: 'Task deleted successfully', deletedTask: result.rows[0] });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Failed to delete task', error: error.message });
    }
});


// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));