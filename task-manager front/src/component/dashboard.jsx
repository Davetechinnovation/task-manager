import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEdit, FaTrash, FaCommentDots, FaUserCircle } from 'react-icons/fa';
import { MdUpdate, MdAccountCircle } from 'react-icons/md';
import { fetchTasks, addTask, updateTaskStatus, deleteTask, editTask as apiEditTask } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Task from '../pages/task';
import moment from 'moment';

const Dashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showTask, setShowTask] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('username') || '';
    });
    const logoutTimeoutRef = useRef(null); // Ref to store the timeout

    const isLoggedIn = () => {
        return localStorage.getItem('token') !== null;
    };

    const handleLogout = async () => {
        const currentUsername = localStorage.getItem('username');
        toast.promise(
            logoutRequest(currentUsername),
            {
                pending: 'Logging out...',
                success: `${currentUsername} has successfully logged out. Redirecting to login...`,
                error: 'Logout failed. Please try again.'
            }
        );
    };

    const logoutRequest = async (currentUsername) => {
        clearAutomaticLogout(); // Clear the automatic logout timeout on manual logout
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('tokenExpiration');
        setUsername('');
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate('/login');
        return `${currentUsername} has successfully logged out.`;
    };

    const clearAutomaticLogout = () => {
        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current); // Clear the timeout using the ref
            logoutTimeoutRef.current = null; // Reset the ref
        }
    };


    const checkTokenExpiration = useCallback(() => {
        const expirationTime = localStorage.getItem('tokenExpiration');
        if (expirationTime) {
            const expiryTime = parseInt(expirationTime, 10);
            const currentTime = new Date().getTime();
            const timeLeft = expiryTime - currentTime;

            if (timeLeft <= 0) {
                // Token expired
                handleAutomaticLogout();
            } else {
                // Set timeout to logout when token expires
                logoutTimeoutRef.current = setTimeout(() => { // Store timeout in ref
                    handleAutomaticLogout();
                }, timeLeft);
            }
        }
    }, [navigate]);


    const handleAutomaticLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('tokenExpiration');
        toast.info('Your session has expired due to inactivity. Please log in again.');
        navigate('/login');
    };


    useEffect(() => {
        checkTokenExpiration(); // Check token expiration on component mount

        // Clear timeout when component unmounts
        return () => clearAutomaticLogout();
    }, [checkTokenExpiration]); // Dependency on useCallback function


    const getPriorityBasedOnStatus = (status) => {
        switch (status) {
            case 'pending': return 'low';
            case 'in-progress': return 'medium';
            case 'completed': return 'high';
            case 'overdue': return 'low';
            default: return 'low';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-200 text-yellow-700';
            case 'in-progress': return 'bg-blue-200 text-blue-700';
            case 'completed': return 'bg-green-200 text-green-700';
            case 'overdue': return 'bg-red-200 text-red-700';
            default: return 'bg-gray-200 text-gray-700';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'low': return 'bg-green-200 text-green-700';
            case 'medium': return 'bg-yellow-200 text-yellow-700';
            case 'high': return 'bg-red-200 text-red-700';
            default: return 'bg-gray-200 text-gray-700';
        }
    };

    // Modified handleUpdateStatus to accept an 'isAutomatic' parameter
    const handleUpdateStatus = useCallback(async (taskId, newStatus, isAutomatic = false) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('You must be logged in to update task status. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return;
        }

        try {
            console.log("Before updateStatus API call - Tasks state:", tasks); // ADDED LOG
            await updateTaskStatus(taskId, newStatus);
            setTasks(prevTasks => { // Update setTasks to use prevState and log
                const updatedTasks = prevTasks.map(task =>
                    task.id === taskId
                        ? { ...task, status: newStatus, priority: getPriorityBasedOnStatus(newStatus) }
                        : task
                );
                console.log("After setTasks in handleUpdateStatus - Updated Tasks state:", updatedTasks); // ADDED LOG
                return updatedTasks;
            });
            setShowStatusDropdown(null);
            if (!isAutomatic) { // Show toast only if the update is NOT automatic
                toast.success('Task status updated successfully');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            if (!isAutomatic) { // Show error toast only if the update is NOT automatic
                toast.error('Failed to update task status');
            }
        }
    }, [navigate, setTasks, tasks]); // Added tasks to dependency array - important!


    useEffect(() => {
        const loadTasks = async () => {
            setLoading(true);
            try {
                const data = await fetchTasks();
                if (data.message) {
                    setTasks([]);
                } else {
                    const mappedTasks = data.map(task => ({
                        id: task.id,
                        title: task.task_name,
                        description: task.task_description,
                        startDate: task.task_start_date,
                        endDate: task.task_end_date,
                        startTime: task.task_start_time,
                        endTime: task.task_end_time,
                        status: task.status,
                        priority: getPriorityBasedOnStatus(task.status),
                        category: task.category,
                    }));
                    setTasks(mappedTasks);
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                toast.error(error.message || 'Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };
        loadTasks();
    }, []);

    useEffect(() => {
        const checkOverdueTasks = async () => {
            tasks.forEach(async task => {
                if (task.status !== 'completed') {
                    const taskEndTime = moment(`${task.endDate} ${task.endTime}`, 'YYYY-MM-DD HH:mm');
                    if (moment().isAfter(taskEndTime)) {
                        try {
                            // Call handleUpdateStatus with isAutomatic = true
                            await handleUpdateStatus(task.id, 'overdue', true);
                        } catch (error) {
                            console.error(`Error updating task ${task.id} to overdue:`, error);
                        }
                    }
                }
            });
        };

        const intervalId = setInterval(checkOverdueTasks, 60000);

        return () => clearInterval(intervalId);
    }, [tasks, handleUpdateStatus]);


    const totalTasks = tasks?.length || 0;
    const inProgressTasks = tasks?.filter(task => task.status === 'in-progress').length || 0;
    const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
    const overdueTasks = tasks?.filter(task => task.status === 'overdue').length || 0;
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
    const highPriorityTasks = tasks?.filter(task => task.priority === 'high').length || 0;

    const filteredTasks = tasks?.filter(task => statusFilter === 'all' || task.status === statusFilter) || [];

    console.log("Tasks being rendered:", filteredTasks); // ADDED LOG

    const handleDeleteTask = async (taskId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('You must be logged in to delete a task. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return;
        }

        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTask(taskId);
                setTasks(tasks.filter(task => task.id !== taskId));
                toast.success('Task deleted successfully');
            } catch (error) {
                console.error('Error deleting task:', error);
                toast.error('Failed to delete task');
            }
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowTask(true);
    };


    const TaskCard = ({ task, onEdit, onDelete, onUpdateStatus, showStatusDropdown, setShowStatusDropdown }) => {
        return (
            <div className="p-4 border rounded-lg shadow-md relative">
                <div className="absolute top-2 right-2 flex space-x-2 text-gray-600">
                    <FaEdit className="cursor-pointer" onClick={() => onEdit(task)} />
                    <MdUpdate className="cursor-pointer" onClick={() => setShowStatusDropdown(showStatusDropdown === task.id ? null : task.id)} />
                    <FaTrash className="cursor-pointer text-red-500" onClick={() => onDelete(task.id)} />
                </div>
                <h3 className="font-bold text-lg mb-1">{task.title}</h3>
                <p className="text-sm text-gray-600">{task.description}</p>
                <div className="flex mt-2">
                    <span className={`inline-block px-2 py-1 text-sm rounded-md ${getStatusColor(task.status)}`}>
                        {task.status}
                    </span>
                    <span className={`inline-block px-2 py-1 text-sm rounded-md ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                    </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Start: {task.startDate} {task.startTime}</p>
                <p className="text-xs text-gray-500">End: {task.endDate} {task.endTime}</p>
                <button
                    className="mt-2 p-1 text-black border border-black rounded-md"
                    onClick={() => setShowStatusDropdown(showStatusDropdown === task.id ? null : task.id)}
                >
                    Change Status
                </button>
                {showStatusDropdown === task.id && (
                    <div className="mt-2 relative">
                        <select
                            className="w-full p-2 border rounded"
                            value={task.status}
                            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                        >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                )}
                <div className="mt-2 text-gray-500 flex items-center cursor-pointer">
                    <FaCommentDots className="mr-1" /> Comment
                </div>
            </div>
        );
    };

    const statusFilters = ['all', 'pending', 'in-progress', 'completed', 'overdue'];

    const reloadTasks = async () => {
        setLoading(true);
        try {
            const data = await fetchTasks();
            if (data.message) {
                setTasks([]);
            } else {
                const mappedTasks = data.map(task => ({
                    id: task.id,
                    title: task.task_name,
                    description: task.task_description,
                    startDate: task.task_start_date,
                    endDate: task.task_end_date,
                    startTime: task.task_start_time,
                    endTime: task.task_end_time,
                    status: task.status,
                    priority: getPriorityBasedOnStatus(task.status),
                    category: task.category,
                }));
                setTasks(mappedTasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error(error.message || 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-4">
            <div className="flex justify-between mb-5 flex-wrap items-center">
                <div>
                    <h1 className="text-3xl font-bold">Task Manager</h1>
                    <p className='font-extralight'>Organize and track your tasks efficiently</p>
                </div>
                <div className="flex items-center space-x-4">
                    {isLoggedIn() ? (
                        <>
                            <span className="font-semibold hidden sm:block">Welcome back, {username}</span> {/* Hide username on small screens */}
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 px-3 py-2 rounded-md text-white hover:bg-red-600 text-sm"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <MdAccountCircle size={30} className="text-gray-500" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }} />
                    )}
                    <button
                        aria-label="Add new task"
                        onClick={() => {
                            if (!isLoggedIn()) {
                                toast.error('You must be logged in to add a task. Redirecting to login...');
                                setTimeout(() => {
                                    navigate('/login');
                                }, 2000);
                                return;
                            }
                            setEditingTask(null);
                            setShowTask(true);
                        }}
                        className="bg-blue-700 px-3 py-2 rounded-md text-white hover:bg-blue-600 whitespace-nowrap sm:ml-auto" // Added responsive classes
                    >
                        Add new task
                    </button>
                </div>
            </div>

            <h1 className="text-center text-xl">Task Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-3 mt-4">
                <div className="border border-gray-300 p-4">
                    <b>Total Tasks</b>
                    <p className="text-2xl">{totalTasks}</p>
                    <p className="text-sm text-gray-500">Completed: {completedTasks}</p>
                </div>
                <div className="border border-gray-300 p-4">
                    <b>Completion Rate</b>
                    <p className="text-2xl">{completionRate}%</p>
                    <p className="text-sm text-gray-500">Tasks in Progress: {inProgressTasks}</p>
                </div>
                <div className="border border-gray-300 p-4">
                    <b>High Priority Tasks</b>
                    <p className="text-2xl">{highPriorityTasks}</p>
                </div>
            </div>

            <div className="flex flex-wrap space-x-5 border-b mb-5 justify-center mt-10">
                {statusFilters.map(status => (
                    <button
                        key={status}
                        className={`py-2 px-4 ${statusFilter === status ? 'border-b-2 border-blue-500' : 'text-gray-500'}`}
                        onClick={() => setStatusFilter(status)}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-center">Loading tasks...</p>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center text-gray-500">
                    <p>No tasks to show. Add a task to get started!</p>
                    <button
                        className="mt-2 text-blue-500 hover:underline"
                        onClick={() => setStatusFilter('all')}
                    >
                        Clear Filter
                    </button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {console.log("Rendering tasks:", filteredTasks)} {/* ADDED LOG */}
                    {filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onUpdateStatus={handleUpdateStatus}
                            showStatusDropdown={showStatusDropdown}
                            setShowStatusDropdown={setShowStatusDropdown}
                        />
                    ))}
                </div>
            )}

            {showTask && (
                <Task
                    onClose={() => setShowTask(false)}
                    setTasks={setTasks}
                    editingTask={editingTask}
                    reloadTasks={reloadTasks}
                    setEditingTask={setEditingTask}
                />
            )}

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>
    );
};

export default Dashboard;