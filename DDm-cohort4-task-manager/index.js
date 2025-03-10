const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to SQLite Database
const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) {
        console.error('🛑 Error connecting to SQLite:', err.message);
    } else {
        console.log('✅ Connected to SQLite Database');

        // Enable foreign keys, WAL mode, and busy timeout
        db.serialize(() => {
            db.run('PRAGMA foreign_keys = ON;');
            db.run('PRAGMA journal_mode = WAL;');
            db.run('PRAGMA busy_timeout = 5000;');
        });

        // Create Tables
        console.log('⏳ Starting table creation...'); // ✅ Log: Start of table creation

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE
            );
        `, (err) => { // ✅ Add callback function for logging
            if (err) {
                console.error('🛑 Error creating users table:', err.message);
            } else {
                console.log('✅ Users table created or already exists');
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_name TEXT NOT NULL,
                task_description TEXT NOT NULL,
                task_start_time TEXT NOT NULL,
                task_end_time TEXT NOT NULL,
                task_start_date TEXT NOT NULL,
                task_end_date TEXT NOT NULL,
                status TEXT CHECK( status IN ('pending', 'in-progress', 'completed', 'overdue') ) DEFAULT 'pending',
                priority TEXT CHECK( priority IN ('low', 'medium', 'high') ) DEFAULT 'medium',
                category TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
        `, (err) => { // ✅ Add callback function for logging
            if (err) {
                console.error('🛑 Error creating tasks table:', err.message);
            } else {
                console.log('✅ Tasks table created or already exists');
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS task_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                comment TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        `, (err) => { // ✅ Add callback function for logging
            if (err) {
                console.error('🛑 Error creating task_comments table:', err.message);
            } else {
                console.log('✅ Task comments table created or already exists');
                console.log('✅ Table creation process completed.'); // ✅ Log: End of table creation
            }
        });
    }
});

// Middleware to authenticate JWT token (No changes needed)
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from "Bearer <token>"
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Route: User Registration (No changes needed)
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hashedPassword, email],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Failed to register user', details: err.message });
            }
            res.status(201).json({ message: 'User registered successfully' });
        }
    );
});

// Route: User Login (No changes needed)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to login', details: err.message });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, 'your-secret-key', { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    });
});


// Route: Add a New Task (No changes needed)
app.post('/add_task', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, 'your-secret-key');
        const userId = decoded.id; // Assuming the token contains the user ID

        const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category } = req.body;

        const sql = `
            INSERT INTO tasks (task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, userId];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to add task', details: err.message });
            }

            // Fetch the newly inserted task
            const taskId = this.lastID;
            db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
                if (err) {
                    console.error('Error fetching task after insert:', err);
                    return res.status(500).json({ error: 'Failed to fetch task after insert', details: err.message });
                }
                res.json(task); // Send the full task object in the response
            });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});


// Route: Get All Tasks (No changes needed)
app.get('/tasks', (req, res) => {
    console.log("➡️  /tasks route hit"); // ADD THIS LINE
    const token = req.headers['authorization']?.split(' ')[1];
    let user_id = null;

    if (token) {
        try {
            const user = jwt.verify(token, 'your-secret-key');
            user_id = user.id;
            console.log("✅ Token verified, user_id:", user_id); // ADD THIS LINE
        } catch (err) {
            console.error('⚠️ Invalid token:', err.message);
            console.log("❌ Token verification failed"); // ADD THIS LINE
        }
    } else {
        console.log("⚠️ No token provided"); // ADD THIS LINE
    }

    if (user_id) {
        db.all('SELECT * FROM tasks WHERE user_id = ?', [user_id], (err, rows) => {
            if (err) {
                console.error('🛑 Database error:', err.message);
                console.log("❌ Database query error"); // ADD THIS LINE
                return res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
            }
            console.log("✅ Tasks fetched successfully, count:", rows.length); // ADD THIS LINE
            res.status(200).json(rows || []);
        });
    } else {
        console.log("ℹ️  No user_id, sending default message"); // ADD THIS LINE
        res.status(200).json({ message: 'No tasks to show. Add a task to get started!' });
    }
});

// Route: Update Task Status (No changes needed)
app.put('/tasks/:id/status', async (req, res) => {
    console.log("➡️  PUT /tasks/:id/status route HIT"); // Debugging log 1: Route hit
    console.log("  Task ID (req.params.id):", req.params.id); // Debugging log 2: Task ID
    console.log("  Request Body (req.body):", req.body);     // Debugging log 3: Request body

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, 'your-secret-key');
        const userId = decoded.id;
        const taskId = req.params.id;
        const { status } = req.body;

        console.log("  Extracted Task ID:", taskId);   // Debugging log 4: Extracted Task ID
        console.log("  Extracted User ID:", userId);   // Debugging log 5: Extracted User ID
        console.log("  New Status:", status);          // Debugging log 6: New Status

        if (!['pending', 'in-progress', 'completed', 'overdue'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const sql = 'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?';
        const params = [status, taskId, userId];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update task status', details: err.message });
            }
            if (this.changes > 0) {
                res.json({ message: 'Task status updated successfully' });
            } else {
                res.status(404).json({ error: 'Task not found or not authorized to update' }); // 404 if task not found or not authorized
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Route: Edit Task (PUT request to replace entire task) (No changes needed)
app.put('/tasks/:id', authenticateToken, async (req, res) => { // PUT /tasks/:id for editing
    console.log("➡️  PUT /tasks/:id route HIT for editing"); // Debugging log for edit route
    const taskId = req.params.id;
    const userId = req.user.id; // User ID from authenticateToken middleware
    const updatedTaskData = req.body; // Task data from request body

    console.log("  Task ID to edit:", taskId);
    console.log("  User ID:", userId);
    console.log("  Updated Task Data:", updatedTaskData);


    // Validate updated task data if necessary (similar to addTask route)

    const { task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category } = updatedTaskData;


    const sql = `
        UPDATE tasks SET
            task_name = ?,
            task_description = ?,
            task_start_time = ?,
            task_end_time = ?,
            task_start_date = ?,
            task_end_date = ?,
            status = ?,
            priority = ?,
            category = ?
        WHERE id = ? AND user_id = ?
    `;
    const params = [task_name, task_description, task_start_time, task_end_time, task_start_date, task_end_date, status, priority, category, taskId, userId];


    db.run(sql, params, function(err) {
        if (err) {
            console.error('Database error during task edit:', err);
            return res.status(500).json({ error: 'Failed to update task', details: err.message });
        }
        if (this.changes > 0) {
            db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
                if (err) {
                    console.error('Error fetching task after update:', err);
                    return res.status(500).json({ error: 'Failed to fetch task after update', details: err.message });
                }
                res.json({ message: 'Task updated successfully', task: task }); // Send updated task
            });

        } else {
            res.status(404).json({ error: 'Task not found or not authorized to update' });
        }
    });


});

// Route: Check and Update Overdue Tasks
app.post('/tasks/check-overdue', async (req, res) => { // New route to check and update overdue tasks
    console.log("➡️  POST /tasks/check-overdue route HIT"); // Debugging log for overdue check route

    db.all('SELECT * FROM tasks WHERE status IN (?, ?)', ['pending', 'in-progress'], (err, tasks) => { // Fetch only pending and in-progress tasks
        if (err) {
            console.error('🛑 Database error fetching tasks for overdue check:', err.message);
            return res.status(500).json({ error: 'Failed to check for overdue tasks', details: err.message });
        }

        let updatedTaskCount = 0;
        tasks.forEach(task => {
            const taskEndDate = moment(`${task.task_end_date}T${task.task_end_time}`); // Use moment to parse date and time
            const now = moment();

            if (now.isAfter(taskEndDate) && task.status !== 'overdue') { // Check if current time is after task end date and time and status is not already overdue
                db.run(
                    'UPDATE tasks SET status = ? WHERE id = ?',
                    ['overdue', task.id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error(`🛑 Error updating task ${task.id} to overdue:`, updateErr.message);
                        } else if (this.changes > 0) {
                            updatedTaskCount++;
                            console.log(`✅ Task ${task.id} status updated to overdue`);
                        }
                    }
                );
            }
        });

        res.json({ message: `${updatedTaskCount} tasks updated to overdue` }); // Respond with the number of tasks updated
    });
});


// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});