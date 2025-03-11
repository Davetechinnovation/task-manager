import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEdit, FaTrash, FaCommentDots, FaUserCircle, FaSpinner, FaPaperPlane, FaShareAlt, FaReply } from 'react-icons/fa'; // ✅ Import FaReply
import { MdUpdate, MdAccountCircle } from 'react-icons/md';
import { fetchTasks, addTask, updateTaskStatus, deleteTask, editTask as apiEditTask, shareTask as apiShareTask, fetchUsers } from '../utils/api'; //  Import fetchUsers
import { useNavigate } from 'react-router-dom';
import Task from '../pages/task';
import moment from 'moment';
import 'moment-timezone';

const Dashboard = () => {
    const [tasks, setTasks] = useState();
    const [statusFilter, setStatusFilter] = useState('all');
    const [showTask, setShowTask] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('username') || '';
    });
    const logoutTimeoutRef = useRef(null);
    const [statusLoading, setStatusLoading] = useState({});
    const [commentLoading, setCommentLoading] = useState(false);
    const [comments, setComments] = useState({});
    const [showCommentsSection, setShowCommentsSection] = useState(null);
    const [newCommentText, setNewCommentText] = useState('');
    const statusFilters = ['all', 'pending', 'in-progress', 'completed', 'overdue', 'shared'];
    const [replyingToCommentId, setReplyingToCommentId] = useState(null); // ✅ State for reply functionality
    const [mentionedUsers, setMentionedUsers] = useState([]); // ✅  Initialize as empty array
    const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
    const [mentionSearchTerm, setMentionSearchTerm] = useState('');


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
        clearAutomaticLogout();
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
            clearTimeout(logoutTimeoutRef.current);
            logoutTimeoutRef.current = null;
        }
    };

    const checkTokenExpiration = useCallback(() => {
        const expirationTime = localStorage.getItem('tokenExpiration');
        if (expirationTime) {
            const expiryTime = parseInt(expirationTime, 10);
            const currentTime = new Date().getTime();
            const timeLeft = expiryTime - currentTime;

            if (timeLeft <= 0) {
                handleAutomaticLogout();
            } else {
                logoutTimeoutRef.current = setTimeout(() => {
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
        checkTokenExpiration();

        return () => clearAutomaticLogout();
    }, [checkTokenExpiration]);

    const getPriorityBasedOnStatus = (status) => {
        switch (status) {
            case 'pending': return 'low';
            case 'in-progress': return 'medium';
            case 'completed': return 'high';
            case 'overdue': return 'high';
            default: return 'low';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-200 text-yellow-700';
            case 'in-progress': return 'bg-blue-200 text-blue-700';
            case 'completed': return 'bg-green-200 text-green-700';
            case 'overdue': return 'bg-red-200 text-red-700';
            case 'shared': return 'bg-purple-200 text-purple-700';
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

    const handleUpdateStatus = useCallback(async (taskId, newStatus, isAutomatic = false) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to enjoy all benefits of DDM-cohort4-taskmanager. Redirecting to login...'); // ✅ Updated error message
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return;
        }

        setStatusLoading(prevState => ({ ...prevState, [taskId]: true }));
        try {
            await updateTaskStatus(taskId, newStatus);
            setTasks(prevTasks => {
                const updatedTasks = prevTasks.map(task =>
                    task.id === taskId
                        ? { ...task, status: newStatus, priority: getPriorityBasedOnStatus(newStatus) }
                        : task
                );
                return updatedTasks;
            });
            setShowStatusDropdown(null);
            if (!isAutomatic) {
                toast.success('Task status updated successfully');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            if (!isAutomatic) {
                toast.error('Failed to update task status');
            }
        } finally { // ✅ Corrected finally block
            setStatusLoading(prevState => ({ ...prevState, [taskId]: false }));
        }
    }, [navigate, setTasks, tasks]);

    useEffect(() => {
        const loadTasks = async () => {
            setLoading(true);
            try {
                const data = await fetchTasks();
                if (data.message) {
                    setTasks();
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
                        isShared: task.is_shared,
                        sharedByUsername: task.shared_by_username, // ✅ Get sharedByUsername from backend
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
                    const taskEndTime = moment(`${task.endDate} ${task.endTime}`, 'YYYY-MM-DD HH:mm:ss');
                    if (moment().isAfter(taskEndTime)) {
                        try {
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

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const usersData = await fetchUsers();
                if (Array.isArray(usersData)) {
                    const usernames = usersData.map(user => user.username); // ✅ Assuming backend returns array of user objects with 'username' property
                    setMentionedUsers(usernames);
                } else {
                    console.error("Users data is not an array:", usersData);
                    toast.error("Failed to load users list.");
                    setMentionedUsers([]); // Ensure mentionedUsers is an empty array in case of error
                }

            } catch (error) {
                console.error('Error loading users:', error);
                toast.error(error.message || 'Failed to load users list.');
                setMentionedUsers([]); // Ensure mentionedUsers is an empty array in case of error
            }
        };

        loadUsers();
    }, []);

    // ✅ Conditionally filter out shared tasks from overview counts
    const userTasks = tasks?.filter(task => {
        // Include all tasks that are NOT shared OR tasks that ARE shared AND were created by the current user
        return !task.isShared || (task.isShared && task.sharedByUsername === username);
    }) || [];

    const totalTasks = userTasks?.length || 0;
    const inProgressTasks = userTasks?.filter(task => task.status === 'in-progress').length || 0;
    const completedTasks = userTasks?.filter(task => task.status === 'completed').length || 0;
    const overdueTasks = userTasks?.filter(task => task.status === 'overdue').length || 0;
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
    const highPriorityTasks = userTasks?.filter(task => task.priority === 'high').length || 0;


    const filteredTasks = tasks?.filter(task => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'shared') return task.isShared;
        return task.status === statusFilter;
    }) || [];


    const handleDeleteTask = async (taskId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to enjoy all benefits of DDM-cohort4-taskmanager. Redirecting to login...'); // ✅ Updated error message
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

    const loadComments = async (taskId) => {
        setCommentLoading(true);
        try {
            const response = await fetch(`https://task-manager-91g9.onrender.com/tasks/${taskId}/comments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load comments');
            }

            const fetchedComments = await response.json();
            // ✅ Restructure comments to be nested
            const structuredComments = fetchedComments.reduce((acc, comment) => {
                if (!comment.parent_comment_id) {
                    acc[comment.id] = { ...comment, replies: [] };
                }
                return acc;
            }, {});
            fetchedComments.forEach(comment => {
                if (comment.parent_comment_id && structuredComments[comment.parent_comment_id]) {
                    structuredComments[comment.parent_comment_id].replies.push(comment);
                }
            });
            setComments(prevComments => ({ ...prevComments, [taskId]: structuredComments }));
        } catch (error) {
            console.error('Error loading comments:', error);
            toast.error(error.message || 'Failed to load comments');
        } finally {
            setCommentLoading(false);
        }
    };


    const handleAddComment = async (taskId, parentCommentId = null, mentionUsernames = []) => { // ✅ Include mentionUsernames
        if (!isLoggedIn()) { // ✅ Check if user is logged in
            toast.error('Please login to enjoy all benefits of DDM-cohort4-taskmanager'); // ✅ Updated error message
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return; // ✅ Early return, do not proceed with comment submission
        }
        if (!newCommentText.trim()) {
            toast.warn('Comment text cannot be empty');
            return;
        }

        setCommentLoading(true);
        console.log("handleAddComment START - Task ID:", taskId, "Parent Comment ID:", parentCommentId); // ✅ Log start of function
        try {
            const response = await fetch(`https://task-manager-91g9.onrender.com/tasks/${taskId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment: newCommentText, parentCommentId: parentCommentId, mentionedUsers: mentionUsernames }), // ✅ Send mentionedUsers
            });

            console.log("handleAddComment - Fetch Response:", response); // ✅ Log fetch response

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add comment');
            }

            const newComment = await response.json();
            // ... (rest of your comment state update logic) ...
            setComments(prevComments => {
                const updatedComments = { ...prevComments };
                if (parentCommentId) {
                    // It's a reply
                    if (updatedComments[taskId] && updatedComments[taskId][parentCommentId]) {
                        updatedComments[taskId][parentCommentId].replies.push(newComment);
                    }
                } else {
                    // It's a top-level comment
                    updatedComments[taskId] = { ...updatedComments[taskId], [newComment.id]: { ...newComment, replies: [] } };
                }
                return updatedComments;
            });
            setNewCommentText('');
            setReplyingToCommentId(null); // ✅ Clear reply-to state
            toast.success('Comment added successfully');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error(error.message || 'Failed to add comment');
        } finally {
            setCommentLoading(false);
            console.log("handleAddComment END - Finally block"); // ✅ Log end of function
        }
    };


    const handleDeleteComment = async (commentId, taskId) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            setCommentLoading(true);
            try {
                const response = await fetch(`https://task-manager-91g9.onrender.com/tasks/${taskId}/comments/${commentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete comment');
                }

                toast.success('Comment deleted successfully');
                setComments(prevComments => {
                    const updatedComments = { ...prevComments };
                    if (updatedComments[taskId]) {
                        delete updatedComments[taskId][commentId]; // Delete top-level comment
                        // Also need to remove it from replies if it's a reply (less common to delete parent directly)
                        for (const parentId in updatedComments[taskId]) {
                            updatedComments[taskId][parentId].replies = updatedComments[taskId][parentId].replies.filter(reply => reply.id !== commentId);
                        }
                    }
                    return updatedComments;
                });
            } catch (error) {
                console.error('Error deleting comment:', error);
                toast.error(error.message || 'Failed to delete comment');
            } finally {
                setCommentLoading(false);
            }
        }
    };

    const handleShareTask = async (taskId, currentSharedStatus) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to enjoy all benefits of DDM-cohort4-taskmanager.'); // ✅ Updated error message
            return;
        }

        setStatusLoading(prevState => ({ ...prevState, [taskId]: true }));
        try {
            await apiShareTask(taskId, !currentSharedStatus);
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? { ...task, isShared: !currentSharedStatus } : task
                )
            );
            toast.success(`Task ${!currentSharedStatus ? 'shared' : 'unshared'} successfully`);
        } catch (error) {
            console.error('Error sharing task:', error);
            toast.error(`Failed to ${!currentSharedStatus ? 'share' : 'unshare'} task`);
        } finally {
            setStatusLoading(prevState => ({ ...prevState, [taskId]: false }));
        }
    };

    const renderComment = useCallback((comment, taskId, depth = 0) => {
        const marginLeft = depth * 4; // Indentation for nested comments

        return (
            <li key={comment.id} className={`p-2 rounded-md bg-gray-50 border`} style={{ marginLeft: `${marginLeft}em` }}>
                <div className="flex items-center space-x-2 mb-1">
                    <FaUserCircle className="text-lg text-gray-700" />
                    <span className="font-semibold">{comment.username || username}</span>
                    <button
                        className="ml-auto text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteComment(comment.id, taskId)}
                        aria-label="Delete Comment"
                    >
                        <FaTrash />
                    </button>
                </div>
                <p className="text-sm text-gray-800">{comment.comment}</p>
                <p className="text-xs text-gray-500 mt-1 text-right">
                    {moment(comment.created_at).tz('Africa/Lagos').format('MMM DD,YYYY, hh:mm a')}
                </p>
                <button
                    onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)} // ✅ Toggle reply state
                    className="text-sm text-blue-500 hover:text-blue-700 mt-1 block"
                    aria-label="Reply to comment"
                >
                    <FaReply className="inline-block mr-1" /> Reply
                </button>

                {replyingToCommentId === comment.id && ( // ✅ Show reply input if replying to this comment
                    <div className="mt-2 flex">
                        <input
                            type="text"
                            className="flex-grow p-2 border rounded-md mr-2"
                            placeholder="Reply to comment..."
                            value={newCommentText}
                            onChange={(e) => {
                                setNewCommentText(e.target.value);
                                setMentionSearchTerm(e.target.value); // ✅ Update search term for mentions
                                setShowMentionsDropdown(e.target.value.includes('@')); // ✅ Show dropdown on '@'
                            }}
                            onBlur={() => setTimeout(() => setShowMentionsDropdown(false), 100)} // ✅ Hide dropdown on blur
                            onFocus={() => setShowMentionsDropdown(mentionSearchTerm.includes('@'))} // ✅ Show dropdown on focus if '@' is present
                        />
                         {showMentionsDropdown && (
                            <ul className="absolute z-10 mt-1 w-auto bg-white border rounded shadow-md">
                                {mentionedUsers.length === 0 ? ( // ✅ Handle no users case
                                    <li className="px-4 py-2 text-gray-500">No active users</li>
                                ) : mentionedUsers.length === 1 ? ( // ✅ Handle single user case
                                    <li
                                        key={mentionedUsers[0]}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            setNewCommentText(newCommentText.replace(/@\w*/, `@${mentionedUsers[0]} `)); // ✅ Use the single username
                                            setShowMentionsDropdown(false);
                                        }}
                                    >
                                        {mentionedUsers[0]}
                                    </li>
                                ) : ( // ✅ Handle multiple users case
                                    mentionedUsers
                                        .filter(user => user.toLowerCase().includes(mentionSearchTerm.substring(mentionSearchTerm.indexOf('@') + 1).toLowerCase()))
                                        .map(user => (
                                            <li
                                                key={user}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setNewCommentText(newCommentText.replace(/@\w*/, `@${user} `)); // ✅ Replace mention in text
                                                    setShowMentionsDropdown(false);
                                                }}
                                            >
                                                {user}
                                            </li>
                                        ))
                                )}
                            </ul>
                        )}
                        <button
                            onClick={() => handleAddComment(taskId, comment.id)} // ✅ Pass parentCommentId
                            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                            disabled={commentLoading}
                            aria-label="Add Reply"
                        >
                            {commentLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                        </button>
                    </div>
                )}

                {/* ✅ Render replies recursively */}
                {comment.replies && comment.replies.length > 0 && (
                    <ul className="ml-5 mt-2 space-y-2">
                        {comment.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(reply => (
                            renderComment(reply, taskId, depth + 1) // Recursive call for replies
                        ))}
                    </ul>
                )}
            </li>
        );
    }, [username, handleDeleteComment, commentLoading, replyingToCommentId, newCommentText, setNewCommentText, handleAddComment, mentionedUsers, mentionSearchTerm, setShowMentionsDropdown]);


    const TaskCardPropsAreEqual = (prevProps, nextProps) => {
        return (
            prevProps.task === nextProps.task &&
            prevProps.onEdit === nextProps.onEdit &&
            prevProps.onDelete === nextProps.onDelete &&
            prevProps.onUpdateStatus === nextProps.onUpdateStatus &&
            prevProps.showStatusDropdown === nextProps.showStatusDropdown &&
            prevProps.statusLoading === nextProps.statusLoading &&
            prevProps.showCommentsSection === nextProps.showCommentsSection &&
            prevProps.commentLoading === nextProps.commentLoading &&
            prevProps.comments === nextProps.comments &&
            prevProps.newCommentText === nextProps.newCommentText &&
            prevProps.replyingToCommentId === nextProps.replyingToCommentId &&
            prevProps.username === nextProps.username
        );
    };
    
    // TaskCard component
    const TaskCard = memo(({
        task,
        onEdit,
        onDelete,
        onUpdateStatus,
        showStatusDropdown,
        setShowStatusDropdown,
        statusLoading,
        showCommentsSection,
        setShowCommentsSection,
        commentLoading,
        comments,
        newCommentText,
        setNewCommentText,
        loadComments,
        handleAddComment,
        handleDeleteComment,
        username,
        onShareTask,
        replyingToCommentId,
        setReplyingToCommentId,
    }) => {
        const isCommentsSectionVisible = showCommentsSection === task.id;
        const commentInputRef = useRef(null);
    
        // Log to track TaskCard renders
        console.log("TaskCard RENDERED for task ID:", task.id, "Comment Section Visible:", isCommentsSectionVisible);
    
        // Handle comment section toggle
        const handleCommentClick = useCallback(() => {
            if (!isCommentsSectionVisible) {
                loadComments(task.id);
                setShowCommentsSection(task.id);
            } else {
                setShowCommentsSection(null);
            }
        }, [isCommentsSectionVisible, task.id, loadComments, setShowCommentsSection]);
    
        // Focus the input field when the comment section is visible
        useEffect(() => {
            if (isCommentsSectionVisible && commentInputRef.current) {
                commentInputRef.current.focus();
            }
        }, [isCommentsSectionVisible]);
    
        // Get status and priority colors
        const getStatusColor = useCallback((status) => {
            switch (status) {
                case 'pending': return 'bg-yellow-200 text-yellow-700';
                case 'in-progress': return 'bg-blue-200 text-blue-700';
                case 'completed': return 'bg-green-200 text-green-700';
                case 'overdue': return 'bg-red-200 text-red-700';
                case 'shared': return 'bg-purple-200 text-purple-700';
                default: return 'bg-gray-200 text-gray-700';
            }
        }, []);
    
        const getPriorityColor = useCallback((priority) => {
            switch (priority) {
                case 'low': return 'bg-green-200 text-green-700';
                case 'medium': return 'bg-yellow-200 text-yellow-700';
                case 'high': return 'bg-red-200 text-red-700';
                default: return 'bg-gray-200 text-gray-700';
            }
        }, []);
    
        const canEdit = task.sharedByUsername === username || !task.isShared;
    
        return (
            <div className="p-4 border rounded-lg shadow-md relative">
                <div className="absolute top-2 right-2 flex space-x-2 text-gray-600">
                    {canEdit && <FaEdit className="cursor-pointer" onClick={() => onEdit(task)} />}
                    {canEdit && <MdUpdate className="cursor-pointer" onClick={() => setShowStatusDropdown(showStatusDropdown === task.id ? null : task.id)} />}
                    {canEdit && <FaTrash className="cursor-pointer text-red-500" onClick={() => onDelete(task.id)} />}
                    <FaShareAlt
                        className={`cursor-pointer ${task.isShared ? 'text-blue-500' : 'text-gray-500'}`}
                        onClick={() => onShareTask(task.id, task.isShared)}
                        aria-label={task.isShared ? "Unshare Task" : "Share Task"}
                    />
                </div>
                <h3 className="font-bold text-lg mb-1">{task.title}</h3>
                {task.isShared && task.sharedByUsername && (
                    <p className="text-sm italic text-gray-500 mb-1">
                        Shared by: {task.sharedByUsername === username ? 'Me' : task.sharedByUsername}
                    </p>
                )}
                <p className="text-sm text-gray-600">{task.description}</p>
                {task.category && (
                    <p className="text-sm text-gray-700 mb-1">Category: {task.category}</p>
                )}
                <div className="flex mt-2">
                    <span className={`inline-block px-2 py-1 text-sm rounded-md ${getStatusColor(task.status)}`}>
                        {task.status}
                    </span>
                    <span className={`inline-block px-2 py-1 text-sm rounded-md ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                    </span>
                    {task.isShared && (
                        <span className={`inline-block px-2 py-1 text-sm rounded-md ${getStatusColor('shared')}`}>
                            Shared
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Start: {task.startDate} {task.startTime}</p>
                <p className="text-xs text-gray-500">End: {task.endDate} {moment(task.endTime, 'HH:mm:ss').format('HH:mm')}</p>
    
                {canEdit && (
                    <div className="mt-2 relative">
                        <select
                            className="w-full p-2 border rounded"
                            value={task.status}
                            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                            disabled={statusLoading[task.id]}
                        >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        {statusLoading[task.id] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded pointer-events-none">
                                <FaSpinner className="animate-spin" />
                            </div>
                        )}
                    </div>
                )}
    
                <div className="mt-3 border-t pt-3">
                    <button
                        className="p-1 text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 w-full"
                        onClick={handleCommentClick}
                        disabled={commentLoading}
                    >
                        <FaCommentDots className="mr-2" />
                        Comments
                        {commentLoading && <FaSpinner className="animate-spin ml-1" />}
                    </button>
    
                    {isCommentsSectionVisible && (
                        <div className="mt-2 relative">
                            <h4 className="font-semibold mb-2">Comments</h4>
                            {commentLoading && <p className="text-gray-500">Loading comments...</p>}
                            {comments[task.id] && Object.values(comments[task.id]).length > 0 ? (
                                <ul className="space-y-2">
                                    {Object.values(comments[task.id]).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => (
                                        <li key={comment.id} className="p-2 rounded-md bg-gray-50 border">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <FaUserCircle className="text-lg text-gray-700" />
                                                <span className="font-semibold">{comment.username || username}</span>
                                                <button
                                                    className="ml-auto text-red-500 hover:text-red-700"
                                                    onClick={() => handleDeleteComment(comment.id, task.id)}
                                                    aria-label="Delete Comment"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-800">{comment.comment}</p>
                                            <p className="text-xs text-gray-500 mt-1 text-right">
                                                {moment(comment.created_at).tz('Africa/Lagos').format('MMM DD, YYYY, hh:mm a')}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : !commentLoading ? (
                                <p className="text-gray-500 mt-2">No comments yet.</p>
                            ) : null}
    
                            {!replyingToCommentId && (
                                <div className="flex mt-2">
                                    <input
                                        type="text"
                                        ref={commentInputRef}
                                        className="flex-grow p-2 border rounded-md mr-2"
                                        placeholder="Add a comment..."
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                    />
                                    <button
                                        onClick={() => handleAddComment(task.id)}
                                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                                        disabled={commentLoading}
                                        aria-label="Add Comment"
                                    >
                                        {commentLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }, TaskCardPropsAreEqual);
    
    TaskCard.displayName = 'TaskCard';

    

    const handleAddTask = useCallback(async (taskData) => {
        setLoading(true);
        try {
            const newTask = await addTask(taskData);
            setTasks([...tasks, {
                id: newTask.id,
                title: taskData.task_name,
                description: taskData.task_description,
                startDate: taskData.task_start_date,
                endDate: taskData.task_end_date,
                startTime: taskData.task_start_time,
                endTime: taskData.task_end_time,
                status: taskData.status,
                priority: getPriorityBasedOnStatus(taskData.status),
                category: taskData.category,
                isShared: taskData.is_shared,
                sharedByUsername: username, // ✅ Set sharedByUsername to current user when task is created
            }]);
            setShowTask(false);
            toast.success('Task added successfully');
        } catch (error) {
            console.error('Error adding task:', error);
            toast.error('Failed to add task');
        } finally {
            setLoading(false);
        }
    }, [setTasks, tasks, username]);

    const handleUpdateExistingTask = useCallback(async (taskId, taskData) => {
        setLoading(true);
        try {
            await apiEditTask(taskId, taskData);
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? {
                        id: taskId,
                        title: taskData.task_name,
                        description: taskData.task_description,
                        startDate: taskData.task_start_date,
                        endDate: taskData.task_end_date,
                        startTime: taskData.task_start_time,
                        endTime: taskData.task_end_time,
                        status: taskData.status,
                        priority: getPriorityBasedOnStatus(taskData.status),
                        category: taskData.category,
                        isShared: taskData.is_shared,
                        sharedByUsername: task.sharedByUsername // Keep sharedByUsername during task update
                    } : task
                )
            );
            setEditingTask(null);
            setShowTask(false);
            toast.success('Task updated successfully');
        } catch (error) {
            console.error('Error editing task:', error);
            toast.error('Failed to update task');
        } finally {
            setLoading(false);
        }
    }, [setTasks]);

    const handleFormSubmit = async (taskData) => {
        if (editingTask) {
            await handleUpdateExistingTask(editingTask.id, taskData);
        } else {
            await handleAddTask(taskData);
        }
    };

    const handleCancelTaskForm = () => {
        setShowTask(false);
        setEditingTask(null);
    };


    const reloadTasks = useCallback(() => {
        const loadTasks = async () => {
            setLoading(true);
            try {
                const data = await fetchTasks();
                if (data.message) {
                    setTasks();
                } else {
                    const mappedTasks = data.map(task => ({
                        id: task.id,
                        title: task.task_name,
                        description: task.task_description,
                        startDate: task.task_start_date,
                        endDate: task.task_end_date,
                        startTime: task.task_start_time,
                        endTime: task.end_time,
                        status: task.status,
                        priority: getPriorityBasedOnStatus(task.status),
                        category: task.category,
                        isShared: task.is_shared,
                        sharedByUsername: task.shared_by_username // ✅ Get sharedByUsername on reload as well
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
    }, [setTasks, setLoading]);


    return (
        <div className="p-4">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            <div className="flex justify-between mb-5 flex-wrap items-center">
                <div>
                    <h1 className="text-3xl font-bold">Task Manager</h1>
                    <p className='font-extralight'>Organize and track your tasks efficiently</p>
                </div>
                <div className="flex items-center space-x-4">
                    {isLoggedIn() ? (
                        <>
                            <span className="font-semibold">Welcome back, {username}</span>
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
                                toast.error('Please login to enjoy all benefits of DDM-cohort4-taskmanager. Redirecting to login...'); // ✅ Updated error message
                                setTimeout(() => {
                                    navigate('/login');
                                }, 2000);
                                return;
                            }
                            setEditingTask(null);
                            setShowTask(true);
                        }}
                        className="bg-blue-700 px-3 py-2 rounded-md text-white hover:bg-blue-600 whitespace-nowrap sm:ml-auto"
                    >
                        Add new task
                    </button>
                </div>
            </div>

            <h1 className="text-center text-xl">Task Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-3 mt-4">
                <div className="border border-gray-300 p-4 rounded-md shadow-sm">
                    <b>Total Tasks</b>
                    <p className="text-2xl font-semibold">{totalTasks}</p>
                    <p className="text-sm text-gray-500">Completed: {completedTasks}</p>
                </div>
                <div className="border border-gray-300 p-4 rounded-md shadow-sm">
                    <b>Completion Rate</b>
                    <p className="text-2xl font-semibold">{completionRate}%</p>
                    <p className="text-sm text-gray-500">Tasks in Progress: {inProgressTasks}</p>
                </div>
                <div className="border border-gray-300 p-4 rounded-md shadow-sm">
                    <b>High Priority Tasks</b>
                    <p className="text-2xl font-semibold">{highPriorityTasks}</p>
                </div>
                <div className="border border-gray-300 p-4 rounded-md shadow-sm">
                    <b>Overdue Tasks</b>
                    <p className="text-2xl font-semibold">{overdueTasks}</p>
                </div>
            </div>


            <div className="flex flex-wrap space-x-5 border-b mb-5 justify-center mt-10">
                {statusFilters.map(status => (
                    <button
                        key={status}
                        className={`py-2 px-4 ${statusFilter === status ? 'border-b-2 border-blue-500 text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
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
                    {console.log("Rendering tasks:", filteredTasks)}
                    {filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onUpdateStatus={handleUpdateStatus}
                            showStatusDropdown={showStatusDropdown}
                            setShowStatusDropdown={setShowStatusDropdown}
                            statusLoading={statusLoading}
                            showCommentsSection={showCommentsSection}
                            setShowCommentsSection={setShowCommentsSection}
                            commentLoading={commentLoading}
                            comments={comments}
                            newCommentText={newCommentText}
                            setNewCommentText={setNewCommentText}
                            loadComments={loadComments}
                            handleAddComment={handleAddComment}
                            handleDeleteComment={handleDeleteComment}
                            username={username}
                            onShareTask={handleShareTask}
                            replyingToCommentId={replyingToCommentId} // ✅ Pass reply state
                            setReplyingToCommentId={setReplyingToCommentId} // ✅ Pass reply state
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
                    onSubmit={handleFormSubmit}
                    onCancel={handleCancelTaskForm}
                />
            )}
        </div>
    );
};

export default Dashboard;