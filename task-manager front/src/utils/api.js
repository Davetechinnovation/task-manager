// api.js
const BASE_URL = 'https://task-manager-91g9.onrender.com'; // Backend URL

// Function to handle API errors
const handleResponse = async (response) => {
    if (!response.ok) {
        const message = await response.text(); // or response.json() if backend sends JSON error
        if (response.status === 403) {
            throw new Error("Please login to enjoy all benefits of DDM-cohort4-taskmanager");
        } else {
            throw new Error(`API Error: ${response.status} - ${message}`);
        }
    }
    return response.json();
};

// Function to fetch tasks
export const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Fetch Tasks Error:", error);
        throw new Error("Could not fetch tasks: " + error.message);
    }
};

// Function to add a new task
export const addTask = async (taskData) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/add_task`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Add Task Error:", error);
        throw new Error("Could not add task: " + error.message);
    }
};


// Function to update task status
export const updateTaskStatus = async (taskId, status) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Update Task Status Error:", error);
        throw new Error("Could not update task status: " + error.message);
    }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Delete Task Error:", error);
        throw new Error("Could not delete task: " + error.message);
    }
};

// Function to edit an existing task
export const editTask = async (taskId, taskData) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Edit Task Error:", error);
        throw new Error("Could not edit task: " + error.message);
    }
};

// Function to share a task
export const shareTask = async (taskId, isShared) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}/share`, { //  Backend endpoint for sharing
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_shared: isShared }), // Send the desired is_shared status
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Share Task Error:", error);
        throw new Error("Could not share task: " + error.message);
    }
};

// ✅ New function to fetch all users
export const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/users`, { //  Backend endpoint to fetch users
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        return handleResponse(response);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        throw new Error("Could not fetch users: " + error.message);
    }
};