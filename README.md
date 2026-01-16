# To-Do List Application - PostgreSQL Setup Guide

This To-Do List application now uses **PostgreSQL** for persistent data storage instead of localStorage.

## Database Setup

### 1. Create PostgreSQL Database

First, create a new database in PostgreSQL:

```sql
CREATE DATABASE todolist_db;
```

### 2. Run the SQL Schema

Execute the SQL file to create the required tables:

```bash
psql -U postgres -d todolist_db -f database.sql
```

Or manually run the SQL commands from [database.sql](database.sql):

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_is_done ON tasks(is_done);
```

## Configuration

### 1. Create `.env` File

Copy the example environment file and configure your database connection:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todolist_db
PORT=3000
NODE_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- **express**: Web server framework
- **pg**: PostgreSQL client for Node.js
- **dotenv**: Environment variable management

## Running the Application

### Development Mode

```bash
npm start
```

Or

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

The application provides the following REST API endpoints:

### Get All Tasks
```
GET /api/tasks
```

### Create Task
```
POST /api/tasks
Body: { "title": "Task description" }
```

### Update Task
```
PUT /api/tasks/:id
Body: { "title": "New title", "isDone": true }
```

### Delete Task
```
DELETE /api/tasks/:id
```

## Features

✅ **Persistent Storage** - All tasks are stored in PostgreSQL  
✅ **Real-time Updates** - Tasks update immediately via API  
✅ **Undo Delete** - Restore deleted tasks within 5 seconds  
✅ **Task Management** - Add, edit, complete, and delete tasks  
✅ **Statistics** - View pending and completed task counts  
✅ **Responsive Design** - Works on desktop and mobile devices  

## Project Structure

```
.
├── config/
│   └── database.js         # PostgreSQL connection configuration
├── routes/
│   └── taskRoutes.js       # API route handlers
├── public/
│   ├── index.html          # Main HTML file
│   ├── app.js              # Client-side JavaScript (API-based)
│   ├── styles.css          # Application styles
│   └── assets/             # Static assets
├── server.js               # Express server setup
├── database.sql            # Database schema
├── package.json            # Project dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Troubleshooting

### Connection Failed
- Verify PostgreSQL is running
- Check `.env` file has correct credentials
- Ensure database `todolist_db` exists
- Verify tables were created: `\dt` in psql

### Port Already in Use
- Change `PORT` in `.env` to an available port
- Or kill the process: `npx kill-port 3000`

### Database Errors
- Re-run the schema: `psql -U postgres -d todolist_db -f database.sql`
- Check PostgreSQL logs for detailed errors

## Development Notes

- The app uses an async API with proper error handling
- Tasks are loaded from the database on page load
- All CRUD operations are persisted to PostgreSQL
- The UI remains responsive during API calls
- Deleted tasks can be restored for 5 seconds
