import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { addTask, editTask } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa'; // Import spinner icon

const Task = ({ onClose, setTasks, editingTask, reloadTasks}) => {
    const [taskName, setTaskName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(false); // Added loading state
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (editingTask) {
            setIsEditing(true);
            setTaskName(editingTask.title || '');
            setCategory(editingTask.category || '');
            setDescription(editingTask.description || '');
            setStartDate(editingTask.startDate || '');
            setEndDate(editingTask.endDate || '');
            setStartTime(editingTask.startTime || '');
            setEndTime(editingTask.endTime || '');
            setStatus(editingTask.status || 'pending');
        } else {
            setIsEditing(false);
            setTaskName('');
            setCategory('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setStartTime('');
            setEndTime('');
            setStatus('pending');
        }
    }, [editingTask]);

    const handleSubmit = async () => {
        console.log('handleSubmit called');

        const startDateTime = new Date(`${startDate}T${startTime}:00`);
        const endDateTime = new Date(`${endDate}T${endTime}:00`);

        if (startDateTime >= endDateTime) {
            toast.error('Start date/time must be earlier than end date/time');
            return;
        }

        const taskData = {
            task_name: taskName,
            task_description: description,
            task_start_time: startTime,
            task_end_time: endTime,
            task_start_date: startDate,
            task_end_date: endDate,
            status: status,
            priority: 'medium',
            category: category || null,
        };

        console.log('Task Data:', taskData);

        const token = localStorage.getItem('token');
        console.log('Token:', token);

        if (!token) {
            toast.error('You must be logged in to add a task. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return;
        }

        setLoading(true); // Set loading to true before API call
        try {
            console.log('Attempting to add/update task');

            if (isEditing && editingTask) {
                const response = await editTask(editingTask.id, taskData);
                console.log('Update Task Response:', response);

                if (response.task) {
                    setTasks((prevTasks) =>
                        prevTasks.map((task) =>
                            task.id === editingTask.id ? response.task : task
                        )
                    );
                    toast.success('Task updated successfully!');
                    setTimeout(() => {
                        reloadTasks(); // Reload tasks on dashboard after edit
                        onClose();
                    }, 1000);
                }
            } else {
                const response = await addTask(taskData);
                console.log('Add Task Response:', response);

                if (response) {
                    const newTask = {
                        id: response.id,
                        title: response.task_name,
                        description: response.task_description,
                        startDate: response.task_start_date,
                        endDate: response.task_end_date,
                        startTime: response.task_start_time?.split('T')[1]?.slice(0, 5) || '00:00', // FIX: Optional chaining and default
                        endTime: response.task_end_time?.split('T')[1]?.slice(0, 5) || '00:00',   // FIX: Optional chaining and default
                        status: response.status,
                        priority: response.priority,
                        category: response.category,
                    };
                    setTasks((prevTasks) => [newTask, ...prevTasks]);
                    toast.success('Task added successfully!');
                    setTimeout(() => {
                        reloadTasks(); // Reload tasks on dashboard after add
                        onClose();
                    }, 1000);
                }
            }


        } catch (error) {
            console.error('Error saving task:', error);

            if (error.message.includes('No token found')) {
                toast.error('You must be logged in to add a task. Redirecting to login...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                toast.error(isEditing ? 'Failed to update task. Please try again.' : 'Failed to save task. Please try again.');
            }
        } finally {
            setLoading(false); // Set loading to false after API call completes
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center py-10">
            <div className="bg-white p-6 shadow-lg rounded-lg w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        &times;
                    </button>
                </div>

                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Task Name</label>
                        <input
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="Enter task name"
                            disabled={loading} // Disable when loading
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={loading} // Disable when loading
                        >
                            <option value="">Select a category</option>
                            <option value="Work">Work</option>
                            <option value="Personal">Personal</option>
                            <option value="Study">Study</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Health">Health</option>
                            <option value="Finance">Finance</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Fitness">Fitness</option>
                            <option value="Chores">Chores</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Enter task description..."
                        rows="3"
                        disabled={loading} // Disable when loading
                    ></textarea>
                </div>

                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={loading} // Disable when loading
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={loading} // Disable when loading
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Start Time</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={loading} // Disable when loading
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">End Time</label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            disabled={loading} // Disable when loading
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={loading} // Disable when loading
                    >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                {/* Display Selected Values */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold">Selected Values:</h3>
                    <p>Task Name: {taskName}</p>
                    <p>Category: {category}</p>
                    <p>Description: {description}</p>
                    <p>Start Date: {startDate}</p>
                    <p>End Date: {endDate}</p>
                    <p>Start Time: {startTime}</p>
                    <p>End Time: {endTime}</p>
                    <p>Status: {status}</p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto"
                        disabled={loading} // Disable button when loading
                    >
                        {loading ? (
                            <FaSpinner className="animate-spin mx-auto" /> // Show spinner when loading
                        ) : (
                            isEditing ? 'Update Task' : 'Create Task'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Task;