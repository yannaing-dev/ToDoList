/**
 * Task Routes
 * 
 * API endpoints for task management with PostgreSQL
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// ============================================================================
// GET - Retrieve all tasks
// ============================================================================
/**
 * GET /api/tasks
 * Returns all tasks sorted by creation date (newest first)
 */
router.get('/tasks', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, title, is_done as "isDone", created_at as "createdAt" FROM tasks ORDER BY created_at DESC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tasks'
        });
    }
});

// ============================================================================
// POST - Create a new task
// ============================================================================
/**
 * POST /api/tasks
 * Body: { title: string }
 * Returns the created task
 */
router.post('/tasks', async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const id = Date.now().toString();
        const createdAt = new Date().toISOString();

        const result = await query(
            'INSERT INTO tasks (id, title, is_done, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, is_done as "isDone", created_at as "createdAt"',
            [id, title.trim(), false, createdAt, createdAt]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create task'
        });
    }
});

// ============================================================================
// PUT - Update a task (toggle completion status or edit title)
// ============================================================================
/**
 * PUT /api/tasks/:id
 * Body: { title?: string, isDone?: boolean }
 * Returns the updated task
 */
router.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, isDone } = req.body;

        let updateQuery = 'UPDATE tasks SET updated_at = NOW()';
        const values = [];
        let paramCount = 1;

        if (title !== undefined && title.trim() !== '') {
            updateQuery += `, title = $${paramCount}`;
            values.push(title.trim());
            paramCount++;
        }

        if (isDone !== undefined) {
            updateQuery += `, is_done = $${paramCount}`;
            values.push(isDone);
            paramCount++;
        }

        updateQuery += ` WHERE id = $${paramCount} RETURNING id, title, is_done as "isDone", created_at as "createdAt"`;
        values.push(id);

        const result = await query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update task'
        });
    }
});

// ============================================================================
// DELETE - Delete a task
// ============================================================================
/**
 * DELETE /api/tasks/:id
 * Deletes the task with the given ID
 */
router.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM tasks WHERE id = $1 RETURNING id, title, is_done as "isDone", created_at as "createdAt"',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            message: 'Task deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete task'
        });
    }
});

// ============================================================================
// DELETE - Clear all completed tasks
// ============================================================================
/**
 * DELETE /api/tasks/completed
 * Deletes all tasks where is_done = true
 */
router.delete('/tasks-completed', async (req, res) => {
    try {
        const result = await query('DELETE FROM tasks WHERE is_done = true');

        res.json({
            success: true,
            message: 'Completed tasks cleared',
            deletedCount: result.rowCount
        });
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear completed tasks'
        });
    }
});

module.exports = router;
