const mysql = require('mysql2');
require('dotenv').config();

// MySQL se connect kar rahe hain (bina database name ke)
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

console.log("Connecting to MySQL...");

// 1. Database banayein
connection.query("CREATE DATABASE IF NOT EXISTS citizen_portal;", (err) => {
    if (err) {
        console.error("Database banane mein error:", err.message);
        process.exit(1);
    }
    console.log("Database 'citizen_portal' ready hai!");
    
    // 2. Database select karein
    connection.query("USE citizen_portal;", (err) => {
        if (err) throw err;
        
        // 3. Users table banayein
        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        
        connection.query(createTableQuery, (err) => {
            if (err) throw err;
            console.log("Users table successfully ban gayi hai! Ab aap server start kar sakte hain.");
            process.exit();
        });
    });
});