/**
 * To-Do List Application - JavaScript (PostgreSQL Version)
 * 
 * Client-side logic for the To-Do List application.
 * Uses REST API endpoints to communicate with PostgreSQL backend for data persistence.
 */

// ============================================================================
// TASK MODEL
// ============================================================================

/**
 * Task class representing a single to-do item.
 * @property {string} id - Unique identifier for the task
 * @property {string} title - The task description
 * @property {boolean} isDone - Whether the task is completed
 * @property {string} createdAt - ISO date string of when task was created
 */
class Task {
    constructor(id, title, isDone = false, createdAt = new Date().toISOString()) {
        this.id = id;
        this.title = title;
        this.isDone = isDone;
        this.createdAt = createdAt;
    }

    /**
     * Creates a new Task with a unique ID based on current timestamp
     * @param {string} title - The task title
     * @returns {Task} New task instance
     */
    static create(title) {
        return new Task(
            Date.now().toString(),
            title.trim(),
            false,
            new Date().toISOString()
        );
    }

    /**
     * Converts Task object to plain object for JSON storage
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            isDone: this.isDone,
            createdAt: this.createdAt
        };
    }

    /**
     * Creates a Task from a plain object (from API response)
     * @param {Object} obj - Plain object with task data
     * @returns {Task} Task instance
     */
    static fromJSON(obj) {
        return new Task(obj.id, obj.title, obj.isDone, obj.createdAt);
    }
}

// ============================================================================
// TO-DO APP
// ============================================================================

class ToDoApp {
    constructor() {
        // API configuration
        this.API_URL = '/api';

        // Task list array
        this.tasks = [];

        // For undo functionality
        this.deletedTask = null;
        this.deletedTaskIndex = -1;
        this.snackbarTimeout = null;

        // For edit functionality
        this.editingTaskId = null;

        // Loading state
        this.isLoading = false;

        // Initialize DOM references
        this.initDOMReferences();

        // Load tasks from API
        this.loadTasks();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.render();
        this.updateDate();
    }

    /**
     * Initialize references to DOM elements
     */
    initDOMReferences() {
        this.taskListEl = document.getElementById('taskList');
        this.emptyStateEl = document.getElementById('emptyState');
        this.statsEl = document.getElementById('stats');
        this.dateEl = document.getElementById('currentDate');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modal = document.getElementById('modal');
        this.taskInput = document.getElementById('taskInput');
        this.submitTaskBtn = document.getElementById('submitTaskBtn');
        this.modalTitle = document.getElementById('modalTitle');
        this.snackbar = document.getElementById('snackbar');
        this.snackbarMessage = document.getElementById('snackbarMessage');
        this.snackbarAction = document.getElementById('snackbarAction');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Open modal
        this.addTaskBtn.addEventListener('click', () => this.openModal());

        // Close modal on overlay click
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.closeModal();
            }
        });

        // Submit task (handles both add and edit)
        this.submitTaskBtn.addEventListener('click', () => this.handleSubmit());

        // Submit on Enter key
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.handleSubmit();
            }
        });

        // Undo delete
        this.snackbarAction.addEventListener('click', () => this.undoDelete());

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // --------------------------------------------------------------------------
    // API METHODS
    // --------------------------------------------------------------------------

    /**
     * Makes a fetch request to the API
     * @param {string} endpoint - API endpoint (e.g., '/tasks')
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} body - Request body (optional)
     * @returns {Promise} API response
     */
    async apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.API_URL}${endpoint}`, options);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API error:', error);
            this.showSnackbar(`Error: ${error.message}`);
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // DATA PERSISTENCE METHODS
    // --------------------------------------------------------------------------

    /**
     * Loads tasks from API on app startup.
     */
    async loadTasks() {
        try {
            this.isLoading = true;
            const response = await this.apiCall('/tasks');
            
            if (response.success) {
                this.tasks = response.data.map(obj => Task.fromJSON(obj));
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    // --------------------------------------------------------------------------
    // TASK OPERATIONS
    // --------------------------------------------------------------------------

    /**
     * Adds a new task via API
     */
    async addTask(title) {
        try {
            this.isLoading = true;
            const response = await this.apiCall('/tasks', 'POST', { title });
            
            if (response.success) {
                const newTask = Task.fromJSON(response.data);
                this.tasks.unshift(newTask);
                this.render();
                this.closeModal();
                this.editingTaskId = null;
                this.showSnackbar('Task added successfully');
            }
        } catch (error) {
            console.error('Error adding task:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Toggles the completion status of a task via API
     * @param {string} id - Task ID to toggle
     */
    async toggleTask(id) {
        try {
            const task = this.tasks.find(t => t.id === id);
            if (!task) return;

            const response = await this.apiCall(`/tasks/${id}`, 'PUT', {
                isDone: !task.isDone
            });

            if (response.success) {
                task.isDone = response.data.isDone;
                this.render();
            }
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    }

    /**
     * Deletes a task via API with undo option
     * @param {string} id - Task ID to delete
     */
    async deleteTask(id) {
        try {
            const index = this.tasks.findIndex(t => t.id === id);
            if (index === -1) return;

            // Store for potential undo
            this.deletedTask = this.tasks[index];
            this.deletedTaskIndex = index;

            // Remove from UI immediately for better UX
            this.tasks.splice(index, 1);
            this.render();

            // Delete from API
            await this.apiCall(`/tasks/${id}`, 'DELETE');
            this.showSnackbar(`Deleted "${this.deletedTask.title}"`);

            // Clear undo after 5 seconds
            setTimeout(() => {
                this.deletedTask = null;
                this.deletedTaskIndex = -1;
            }, 5000);
        } catch (error) {
            console.error('Error deleting task:', error);
            // Restore task on error
            if (this.deletedTask && this.deletedTaskIndex !== -1) {
                this.tasks.splice(this.deletedTaskIndex, 0, this.deletedTask);
                this.render();
            }
        }
    }

    /**
     * Undoes the last delete operation
     */
    async undoDelete() {
        try {
            if (!this.deletedTask) return;

            // Re-add task to API (simulate by re-creating)
            const response = await this.apiCall('/tasks', 'POST', {
                title: this.deletedTask.title
            });

            if (response.success) {
                const restoredTask = Task.fromJSON(response.data);
                this.tasks.splice(this.deletedTaskIndex, 0, restoredTask);
                this.render();
                this.hideSnackbar();
                this.deletedTask = null;
                this.deletedTaskIndex = -1;
                this.showSnackbar('Task restored');
            }
        } catch (error) {
            console.error('Error restoring task:', error);
        }
    }

    /**
     * Edits an existing task's title via API
     * @param {string} id - Task ID to edit
     * @param {string} newTitle - New title for the task
     */
    async editTask(id, newTitle) {
        try {
            if (!newTitle.trim()) return;

            this.isLoading = true;
            const response = await this.apiCall(`/tasks/${id}`, 'PUT', {
                title: newTitle
            });

            if (response.success) {
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    task.title = response.data.title;
                    this.render();
                    this.showSnackbar('Task updated successfully');
                }
            }
        } catch (error) {
            console.error('Error editing task:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handles form submission - routes to add or edit based on mode
     */
    handleSubmit() {
        const title = this.taskInput.value.trim();
        if (!title) return;

        if (this.editingTaskId) {
            this.editTask(this.editingTaskId, title);
        } else {
            this.addTask(title);
        }

        this.closeModal();
        this.editingTaskId = null;
    }

    // --------------------------------------------------------------------------
    // UI METHODS
    // --------------------------------------------------------------------------

    /**
     * Opens the modal for adding or editing a task
     * @param {string|null} taskId - Task ID to edit, or null for add mode
     */
    openModal(taskId = null) {
        this.editingTaskId = taskId;

        if (taskId) {
            // Edit mode
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.taskInput.value = task.title;
                this.modalTitle.textContent = 'Edit Task';
                this.submitTaskBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Save Changes
                `;
            }
        } else {
            // Add mode
            this.taskInput.value = '';
            this.modalTitle.textContent = 'Add New Task';
            this.submitTaskBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Task
            `;
        }

        this.modalOverlay.classList.add('active');
        setTimeout(() => this.taskInput.focus(), 100);
    }

    /**
     * Closes the add task modal
     */
    closeModal() {
        this.modalOverlay.classList.remove('active');
    }

    /**
     * Shows the snackbar with a message
     * @param {string} message - Message to display
     */
    showSnackbar(message) {
        // Clear any existing timeout
        if (this.snackbarTimeout) {
            clearTimeout(this.snackbarTimeout);
        }

        this.snackbarMessage.textContent = message;
        this.snackbar.classList.add('active');

        // Auto-hide after 4 seconds
        this.snackbarTimeout = setTimeout(() => {
            this.hideSnackbar();
        }, 4000);
    }

    /**
     * Hides the snackbar
     */
    hideSnackbar() {
        this.snackbar.classList.remove('active');
        if (this.snackbarTimeout) {
            clearTimeout(this.snackbarTimeout);
        }
    }

    /**
     * Updates the date display in the header
     */
    updateDate() {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('en-US', options);
        this.dateEl.textContent = today;
    }

    /**
     * Formats a date string in a human-friendly way
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        if (taskDate.getTime() === today.getTime()) {
            return `Today at ${timeStr}`;
        } else if (taskDate.getTime() === yesterday.getTime()) {
            return `Yesterday at ${timeStr}`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    /**
     * Main render method - updates the entire UI
     */
    render() {
        this.renderStats();
        this.renderTasks();
    }

    /**
     * Renders the statistics chips
     */
    renderStats() {
        const pendingCount = this.tasks.filter(t => !t.isDone).length;
        const doneCount = this.tasks.filter(t => t.isDone).length;

        if (this.tasks.length === 0) {
            this.statsEl.innerHTML = '';
            return;
        }

        this.statsEl.innerHTML = `
      <div class="stat-chip pending">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        ${pendingCount} pending
      </div>
      <div class="stat-chip done">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        ${doneCount} done
      </div>
    `;
    }

    /**
     * Renders the task list
     */
    renderTasks() {
        if (this.tasks.length === 0) {
            this.emptyStateEl.classList.remove('hidden');
            this.taskListEl.classList.add('hidden');
            return;
        }

        this.emptyStateEl.classList.add('hidden');
        this.taskListEl.classList.remove('hidden');

        this.taskListEl.innerHTML = this.tasks.map(task => `
      <li class="task-card ${task.isDone ? 'done' : ''}" data-id="${task.id}">
        <div class="checkbox" onclick="app.toggleTask('${task.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="task-content" onclick="app.toggleTask('${task.id}')">
          <p class="task-title">${this.escapeHtml(task.title)}</p>
          <span class="task-date">${this.formatDate(task.createdAt)}</span>
        </div>
        <button class="edit-btn" onclick="event.stopPropagation(); app.openModal('${task.id}')" aria-label="Edit task" ${this.isLoading ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="delete-btn" onclick="event.stopPropagation(); app.deleteTask('${task.id}')" aria-label="Delete task" ${this.isLoading ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </li>
    `).join('');
    }

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================================================
// INITIALIZE APP
// ============================================================================

// Create global app instance when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ToDoApp();
});
