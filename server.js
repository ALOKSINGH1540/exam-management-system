const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

const DB_NAME = process.env.DB_NAME || 'citizen_portal';
const PORT = Number(process.env.PORT) || 3000;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

const ensureDatabaseAndTables = () => new Promise((resolve, reject) => {
    const adminConnection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    adminConnection.connect((connectErr) => {
        if (connectErr) {
            return adminConnection.end(() => reject(connectErr));
        }

        adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``, (dbErr) => {
            if (dbErr) {
                return adminConnection.end(() => reject(dbErr));
            }

            adminConnection.query(`USE \`${DB_NAME}\``, (useErr) => {
                if (useErr) {
                    return adminConnection.end(() => reject(useErr));
                }

                const createTablesQuery = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('user', 'admin') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS applications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    subject VARCHAR(255) NOT NULL,
                    department VARCHAR(100) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'Pending',
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS students (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    roll_number VARCHAR(100) UNIQUE NOT NULL,
                    course VARCHAR(100) NOT NULL
                );
                CREATE TABLE IF NOT EXISTS timetables (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    course VARCHAR(100) NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    exam_date DATE NOT NULL,
                    exam_time TIME NOT NULL
                );
                CREATE TABLE IF NOT EXISTS admit_cards (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    roll_number VARCHAR(100) NOT NULL,
                    exam_center VARCHAR(255) NOT NULL,
                    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    roll_number VARCHAR(100) NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    marks INT NOT NULL
                );`;

                adminConnection.query(createTablesQuery, (tableErr) => {
                    if (tableErr) {
                        return adminConnection.end(() => reject(tableErr));
                    }

                    const defaultAdminEmail = 'admin@university.edu';
                    const defaultAdminPassword = 'admin123';
                    const defaultAdminName = 'System Admin';

                    db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [defaultAdminEmail], async (userErr, userResults) => {
                        if (userErr) {
                            return adminConnection.end(() => reject(userErr));
                        }

                        if (userResults.length === 0) {
                            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
                            db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                                [defaultAdminName, defaultAdminEmail, hashedPassword, 'admin'],
                                (insertErr) => {
                                    adminConnection.end(() => {
                                        if (insertErr) return reject(insertErr);
                                        resolve();
                                    });
                                }
                            );
                            return;
                        }

                        adminConnection.end(() => resolve());
                    });
                });
            });
        });
    });
});

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const nextPort = port + 1;
            console.log(`Port ${port} is busy. Retrying on ${nextPort}...`);
            startServer(nextPort);
            return;
        }

        console.error('Server startup failed:', err.message);
        process.exit(1);
    });
};

ensureDatabaseAndTables().then(() => {
    console.log('Database and tables are ready and connected!');
    startServer(PORT);
}).catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exit(1);
});

// === 3. AUTHENTICATION APIs ===
app.post('/api/register', async (req, res) => {
    const { name, email, password, role = 'user' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields are required!' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'Registration successful!' });
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/login', (req, res) => {
    const { email, password, requiredRole } = req.body;
    db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, requiredRole], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length === 0) return res.status(400).json({ success: false, message: 'Invalid credentials or role!' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials!' });
        res.json({ success: true, message: 'Login successful!', user: { id: user.id, name: user.name, role: user.role } });
    });
});

// === 4. NOTICE BOARD & AI APIs ===
app.post('/api/submit-application', (req, res) => {
    const { userId, subject, department, description } = req.body;
    db.query('INSERT INTO applications (user_id, subject, department, description) VALUES (?, ?, ?, ?)', 
    [userId, subject, department, description], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Information published successfully!' });
    });
});

app.get('/api/applications', (req, res) => {
    const query = 'SELECT a.*, u.name as author FROM applications a JOIN users u ON a.user_id = u.id ORDER BY a.submitted_at DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: results });
    });
});

app.post('/api/ai-help', async (req, res) => {
    const { promptText } = req.body;
    if (!promptText) return res.status(400).json({ success: false, message: 'Prompt text is required!' });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash', 
            contents: `You are an expert academic assistant. Create a formal, professional notice or content for students based on this prompt: "${promptText}"`
        });
        res.json({ success: true, aiResponse: response.text });
    } catch (error) { res.status(500).json({ success: false, message: 'AI generation failed: ' + error.message }); }
});

// === 5. NEW EXAMINATION APIs (ADMIN ONLY - WRITE ACCESS) ===

// Add Student API (Admin Only)
app.post('/api/students', (req, res) => {
    const { name, roll_number, course, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Access Denied! Only Admin can add students.' });
    db.query('INSERT INTO students (name, roll_number, course) VALUES (?, ?, ?)', [name, roll_number, course], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Student registered successfully!' });
    });
});

// Add Timetable API (Admin Only)
app.post('/api/timetables', (req, res) => {
    const { course, subject, exam_date, exam_time, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Access Denied!' });
    db.query('INSERT INTO timetables (course, subject, exam_date, exam_time) VALUES (?, ?, ?, ?)', [course, subject, exam_date, exam_time], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Exam scheduled successfully!' });
    });
});

// Issue Admit Card API (Admin Only)
app.post('/api/admit-cards', (req, res) => {
    const { roll_number, exam_center, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Access Denied!' });
    db.query('INSERT INTO admit_cards (roll_number, exam_center) VALUES (?, ?)', [roll_number, exam_center], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Admit Card generated successfully!' });
    });
});

// Upload Result API (Admin Only)
app.post('/api/results', (req, res) => {
    const { roll_number, subject, marks, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Access Denied!' });
    db.query('INSERT INTO results (roll_number, subject, marks) VALUES (?, ?, ?)', [roll_number, subject, marks], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Result uploaded successfully!' });
    });
});

// === 6. STUDENT READ-ONLY APIs (VIEW ACCESS) ===

// View Timetable
app.get('/api/view-timetable', (req, res) => {
    db.query('SELECT * FROM timetables ORDER BY exam_date ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: results });
    });
});

// Fetch Admit Card by Roll Number
app.post('/api/view-admit-card', (req, res) => {
    const { roll_number } = req.body;
    const query = 'SELECT a.*, s.name, s.course FROM admit_cards a JOIN students s ON a.roll_number = s.roll_number WHERE a.roll_number = ?';
    db.query(query, [roll_number], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Admit Card not found for this Roll Number.' });
        res.json({ success: true, data: results[0] });
    });
});

// Fetch Result by Roll Number
app.post('/api/view-result', (req, res) => {
    const { roll_number } = req.body;
    const query = 'SELECT r.*, s.name FROM results r JOIN students s ON r.roll_number = s.roll_number WHERE r.roll_number = ?';
    db.query(query, [roll_number], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Result not found for this Roll Number.' });
        res.json({ success: true, data: results });
    });
});
