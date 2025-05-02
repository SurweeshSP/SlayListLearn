const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const socket = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const port = 7000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontEnd')));

const dbPath = path.join(__dirname, '../database/slaylistlearn.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to slaylistlearn.db SQLite database');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontEnd/into.html'));
}); 

app.post('/registration', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Fill all the columns' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertQuery = `INSERT INTO user (username, email, password) VALUES (?, ?, ?)`;

        db.run(insertQuery, [username, email, hashedPassword], function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Registration failed. Email might already exist.' });
            }
            const safeUsername = username.replace(/[^a-zA-Z0-9_]/g, '');

            const usertableq = `
                CREATE TABLE IF NOT EXISTS posts_${safeUsername} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post TEXT NOT NULL,
                    likes INTEGER DEFAULT 0,
                    comments TEXT,
                    visibility TEXT CHECK(visibility IN ('public', 'private')) DEFAULT 'public'
                )
            `;

            db.run(usertableq, (err) => {
                if (err) {
                    console.error(`User table has an error: ${err.message}`);
                    return res.status(500).json({ error: 'User table creation failed' });
                }

                console.log("User table successfully created!");
                return res.status(201).json({
                    message: 'User registered successfully and user post table created',
                    userId: this.lastID
                });
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to hash password' });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Fill in both email and password' });
    }

    const query = `SELECT * FROM user WHERE email = ?`;

    db.get(query, [email], async (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const passwordMatch = await bcrypt.compare(password, row.password);

        if (passwordMatch) {
            res.status(200).json({ message: 'Login successful', userId: row.id });
        } else {
            res.status(400).json({ error: 'Invalid email or password' });
        }
    });
});

app.get('/front', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontEnd/front.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
