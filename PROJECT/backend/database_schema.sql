-- Database Foundation: Hostel/PG Management System
-- Step 1: Create Database and Tables

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS hostel_pg_db;
USE hostel_pg_db;

-- 2. Create Tables

-- Table 1: users (Login system)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STUDENT') NOT NULL
);

-- Table 2: rooms (Hostel rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL
);

-- Table 3: beds (Beds inside rooms)
CREATE TABLE IF NOT EXISTS beds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bed_number VARCHAR(20) NOT NULL,
    room_id INT NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Table 4: students (Student details + room info)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    bed_id INT UNIQUE, -- Can be NULL if not yet assigned
    join_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bed_id) REFERENCES beds(id)
);

-- Table 5: rent (Monthly rent tracking)
CREATE TABLE IF NOT EXISTS rent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('PAID', 'PENDING') DEFAULT 'PENDING',
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Table 6: complaints (Problem tracking)
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'OPEN',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Table 7: notices (Announcements)
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
