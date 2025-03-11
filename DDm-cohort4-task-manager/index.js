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
    origin: 'http://localhost:5173',
};
app.use(cors(corsOptions));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.connect()
    .then(() => console.log('✅ Connected to Neon PostgreSQL Database'))
    .catch(err => console.error('🛑 Error connecting to database:', err.message));

const createTables = async () => {
    try {
        await pool.query(`
                -- DROP TABLE IF EXISTS task_comments CASCADE;  -- Uncomment if you need to recreate task_comments table
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
                    category TEXT,
                    is_shared BOOLEAN DEFAULT FALSE
                );
                CREATE TABLE IF NOT EXISTS task_comments (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                    comment TEXT NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    parent_comment_id INTEGER REFERENCES task_comments(id) ON DELETE CASCADE, -- ✅ ADDED parent_comment_id
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        console.log('✅ Tables created or already exist');
    } catch (err) {
        console.error('🛑 Error creating tables:', err.message);
    }
}; createTables();

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


// ✅ Protected route handler for GET /tasks - Fetch tasks for authenticated user (now includes shared tasks and sharer's username)
app.get('/tasks', authenticateJWT, async (req, res) => { // Apply authenticateJWT middleware
    try {
        const userId = req.user.userId; // User ID is now available from req.user

        // Modified query to fetch tasks, including sharer's username for shared tasks
        const result = await pool.query(`
            SELECT
                tasks.*,
                CASE
                    WHEN tasks.is_shared = TRUE THEN sharer_user.username
                    ELSE NULL  -- Or you can put current user's username if you want to track original owner even for non-shared tasks
                END AS shared_by_username
            FROM tasks
            INNER JOIN users ON tasks.user_id = users.id  -- Join to get task owner's username
            LEFT JOIN users AS sharer_user ON tasks.user_id = sharer_user.id -- Join again to get sharer's username
            WHERE tasks.user_id = $1 OR tasks.is_shared = TRUE
            ORDER BY tasks.id DESC; -- Optional: Order by task ID or any other relevant field
        `, [userId]);
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
            return res.status(401).json({ message: 'Username not found' }); // ✅ Specific error: Username not found
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password' }); // ✅ Specific error: Incorrect password
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' }); // ✅ JWT_SECRET from .env

        res.status(200).json({ token, username: user.username, userId: user.id, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed due to server error', error: error.message }); // ✅ More descriptive server error
    }
});

// ✅ Route handler for POST /signup - User signup (no auth middleware needed)
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'All fields are required for signup' }); // ✅ More specific message
    }

    try {
        // Check if username or email already exists
        const existingUserResult = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUserResult.rows.length > 0) {
            const existingUser = existingUserResult.rows[0];
            if (existingUser.username === username) {
                return res.status(409).json({ message: 'Username already taken' }); // ✅ Specific error: Username taken
            } else if (existingUser.email === email) {
                return res.status(409).json({ message: 'Email already registered' }); // ✅ Specific error: Email taken
            }
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
        res.status(500).json({ message: 'Signup failed due to server error', error: error.message }); // ✅ More descriptive server error
    }
});


// ✅ Protected route handler for POST /add_task - Add a new task (requires authentication)
app.post('/add_task', authenticateJWT, async (req, res) => { // Apply authenticateJWT middleware
    try {
        const userId = req.user.userId; // User ID from authenticated token

        // ✅ Expect 'is_shared' in req.body as well
        const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, is_shared } = req.body;

        const result = await pool.query(
            `INSERT INTO tasks (user_id, task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, is_shared) -- ✅ Include is_shared in INSERT
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) -- ✅ Added $11 for is_shared
             RETURNING *`,
            [userId, task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, is_shared] // ✅ Pass is_shared value
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
    const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, is_shared } = req.body; // ✅ Expect is_shared in req.body

    try {
        // TODO: Authorization - Optionally verify if the user owns this task

        const result = await pool.query(
            `UPDATE tasks SET task_name = $1, task_description = $2, task_start_time = $3, task_end_time = $4,
             task_start_date = $5, task_end_date = $6, status = $7, priority = $8, category = $9, is_shared = $10 -- ✅ Include is_shared in UPDATE
             WHERE id = $11 RETURNING *`,
            [task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, is_shared, taskId] // ✅ Pass is_shared value
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

// ✅ Protected route handler for PUT /tasks/:taskId/share - Share/unshare a task (requires authentication)
app.put('/tasks/:taskId/share', authenticateJWT, async (req, res) => {
    const taskId = req.params.taskId;
    const { is_shared } = req.body; // Expecting is_shared boolean in the request body

    try {
        const query = 'UPDATE tasks SET is_shared = $1 WHERE id = $2 AND user_id = $3'; // Ensure user can only share their own tasks
        const values = [is_shared, taskId, req.user.userId]; // req.user is set by authenticateToken middleware
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Task not found or not owned by user' });
        }

        res.json({ message: 'Task share status updated successfully' });

    } catch (error) {
        console.error('Error sharing task:', error);
        res.status(500).json({ message: 'Failed to update task share status', error: error.message });
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

// ✅ Route handler for POST /tasks/:taskId/comments - Add a comment to a task (requires authentication)
app.post('/tasks/:taskId/comments', authenticateJWT, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { comment, parentCommentId } = req.body; // ✅ Expect parentCommentId in body
    const userId = req.user.userId; // Get user ID from JWT

    if (!comment) {
        return res.status(400).json({ message: 'Comment text is required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO task_comments (task_id, comment, user_id, parent_comment_id) -- ✅ Include parent_comment_id in INSERT
             VALUES ($1, $2, $3, $4) -- ✅ Added $4 for parent_comment_id
             RETURNING *`,
            [taskId, comment, userId, parentCommentId || null] // ✅ Use parentCommentId, default to null if not provided
        );
        const newComment = result.rows[0];
        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        console.error('Detailed Error adding comment:', error.stack); // ✅ ADDED detailed error logging
        res.status(500).json({ message: 'Failed to add comment', error: error.message });
    }
});

// ✅ Route handler for GET /tasks/:taskId/comments - Get comments for a task (requires authentication)
app.get('/tasks/:taskId/comments', authenticateJWT, async (req, res) => {
    const taskId = parseInt(req.params.taskId);

    try {
        // Modified query to fetch comments, including parent_comment_id
        const result = await pool.query(`
            SELECT task_comments.*, users.username
             FROM task_comments
             JOIN users ON task_comments.user_id = users.id
             WHERE task_id = $1
             ORDER BY task_comments.created_at ASC`,
            [taskId]
        );
        const comments = result.rows;
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Failed to fetch comments', error: error.message });
    }
});

// ✅ Protected route handler for DELETE /tasks/:taskId/comments/:commentId - Delete a comment (requires authentication)
app.delete('/tasks/:taskId/comments/:commentId', authenticateJWT, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.userId; // Get user ID from JWT

    try {
        // Fetch the task and comment to check ownership and shared status
        const taskResult = await pool.query('SELECT user_id, is_shared FROM tasks WHERE id = $1', [taskId]);
        const task = taskResult.rows[0];
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const commentCheckResult = await pool.query(
            'SELECT user_id FROM task_comments WHERE id = $1 AND task_id = $2',
            [commentId, taskId]
        );
        if (commentCheckResult.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found or not belonging to this task' });
        }
        const commentAuthorId = commentCheckResult.rows[0].user_id;

        // Authorization logic:
        // 1. Comment author can always delete their own comment
        // 2. If the task is shared, the original task creator (sharer) can delete any comment
        if (commentAuthorId !== userId) { // If current user is NOT the comment author
            if (!(task.is_shared && task.user_id === userId)) { // AND if the task is NOT shared OR current user is NOT the sharer
                return res.status(403).json({ message: 'Unauthorized to delete this comment' }); // Forbidden
            }
        }

        const result = await pool.query(
            'DELETE FROM task_comments WHERE id = $1 AND task_id = $2 RETURNING *',
            [commentId, taskId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found or not belonging to this task' });
        }
        res.status(200).json({ message: 'Comment deleted successfully', deletedComment: result.rows[0] });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Failed to delete comment', error: error.message });
    }
});

// ✅ New protected route handler for GET /users - Fetch all users (requires authentication)
app.get('/users', authenticateJWT, async (req, res) => {
    try {
        const result = await pool.query('SELECT username FROM users'); //  Simple query to fetch usernames
        const users = result.rows.map(row => ({ username: row.username })); // Format as array of objects
        res.status(200).json(users); // Respond with the array of usernames
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
});


// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));