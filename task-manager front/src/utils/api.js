const API_BASE_URL = 'https://task-manager-91g9.onrender.com'; // Replace with your backend URL

// ✅ Function to add a new task
export const addTask = async (task) => {
    const token = localStorage.getItem('token'); // Get the token from localStorage
    if (!token) {
        throw new Error('No token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/add_task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Include the token in the header
        },
        body: JSON.stringify(task),
    });

    if (!response.ok) throw new Error(`Failed to add task: ${await response.text()}`);
    return await response.json();
};

// ✅ Function to fetch all tasks
export const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found. Please log in.');
    }
    const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
            'Authorization': `Bearer ${token}` // Always include Authorization header
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error!', response.status, errorText);
        throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`);
    }
    return await response.json();
};

// ✅ Function to update a task's status
export const updateTaskStatus = async (taskId, newStatus) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Failed to update task status: ${response.status} ${response.statusText} - ${message}`);
    }
    return await response.json();
};

// ✅ Function to edit a task (PUT request to replace entire task)
export const editTask = async (taskId, updatedTask) => { // Renamed to editTask
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, { // PUT request to /tasks/:taskId
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedTask),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Failed to update task: ${response.status} ${response.statusText} - ${message}`);
    }
    return await response.json();
};


// ✅ Function to update specific fields of a task (PATCH - not used in this edit feature, but kept for potential future use)
export const updateTask = async (taskId, updateFields) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateFields), // Only send fields that need updating
    });

    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
};

// ✅ Function to delete a task
export const deleteTask = async (taskId) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return await response.json();
};