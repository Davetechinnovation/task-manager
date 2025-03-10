import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // ✅ Import Link
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            console.log('Displaying toast for missing fields'); // Debugging log
            toast.error('Please fill in all fields');
            return;
        }

        console.log('Displaying toast for login promise'); // Debugging log
        toast.promise(
            loginRequest({ username, password }),
            {
                pending: 'Logging in...',
                success: 'Login successful! Redirecting...',
                error: {
                    render({ data }) {
                        return data?.error || 'Login failed. Please try again.';
                    },
                },
            }
        );
    };

    const loginRequest = async ({ username, password }) => {
        const response = await fetch('https://task-manager-91g9.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            const token = data.token;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);

            // Calculate token expiration time (1 hour from now)
            const expirationTime = new Date().getTime() + 60 * 60 * 1000; // 1 hour in milliseconds
            localStorage.setItem('tokenExpiration', expirationTime.toString());

            await new Promise((resolve) => setTimeout(resolve, 100));
            setupAutomaticLogout(expirationTime); // Set up automatic logout timer
            navigate('/');
            return 'Login Successful';
        } else {
            throw { error: data.error || 'Login failed. Please try again.' };
        }
    };

    const setupAutomaticLogout = (expirationTime) => {
        const currentTime = new Date().getTime();
        const timeLeft = expirationTime - currentTime;

        if (timeLeft > 0) {
            setTimeout(() => {
                handleAutomaticLogout(); // Call logout function after timeout
            }, timeLeft);
        }
    };

    const handleAutomaticLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('tokenExpiration');
        toast.info('Your session has expired. Please log in again.');
        navigate('/login');
    };


    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <ToastContainer />
            <div className="flex flex-col md:flex-row w-full max-w-4xl mx-4 my-10 md:my-0 bg-white shadow-lg rounded-lg overflow-hidden">
                {/* Left Side: Login Form */}
                <div className="w-full md:w-1/2 flex items-center justify-center py-10 md:py-20 bg-slate-100">
                    <div className="max-w-md w-full px-4">
                        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Sign In</h1>
                        <p className="text-sm text-center text-gray-600 mb-6">Sign in to your account</p>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                                    Email/Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="Enter your email or username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Sign In
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <a href="#" className="text-sm text-blue-600 hover:underline">
                                Forgot password?
                            </a>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-blue-600 hover:underline"> {/* ✅ Changed to Link */}
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Welcome Message */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-blue-800 text-white">
                    <div className="text-center px-4">
                        <h1 className="text-2xl font-bold">Hello, Friend</h1>
                        <p className="mt-2 text-sm">
                            Sign in back to your account and keep enjoying your unlimited space to create unlimited tasks which is stored across your devices.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
