import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();

        toast.promise(
            signupRequest({ username, email, password }), // Call the signupRequest function within toast.promise
            {
                pending: 'Signing up...',
                success: 'Signup successful! Redirecting to login...',
                error: {
                    render({ data }) { // data here is the error object from signupRequest
                        return data?.error || 'Registration failed. Please try again.';
                    }
                }
            }
        );
    };


    // Encapsulate the signup fetch request in a separate async function
    const signupRequest = async ({ username, email, password }) => {
        const response = await fetch('https://task-manager-91g9.onrender.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            // Throw an error to trigger the error toast
            throw { error: data.error || 'Registration failed' }; // Pass error data to toast
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
            navigate('/login'); // Redirect to login page after successful signup
            return data.message || 'Registration successful'; // Success message for toast.promise
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <ToastContainer />
            <div className="flex flex-col md:flex-row w-full max-w-4xl mx-4 my-10 md:my-0 bg-white shadow-lg rounded-lg overflow-hidden">
                {/* Left Side: Sign In Form */}
                <div className="w-full md:w-1/2 flex items-center justify-center py-10 md:py-20 bg-slate-100">
                    <div className="max-w-md w-full px-4">
                        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Sign Up</h1>
                        <p className="text-sm text-center text-gray-600 mb-6">Create an account</p>

                        {/* Sign Up Form */}
                        <form onSubmit={handleSignup}>
                            {/* Username Field */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email Field */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Enter your Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Password Field */}
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

                            {/* Sign Up Button */}
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Sign Up
                            </button>
                        </form>

                        {/* Forgot Password Link */}
                        <div className="mt-4 text-center">
                            <a href="#" className="text-sm text-blue-600 hover:underline">
                                Forgot password?
                            </a>
                        </div>

                        {/* Sign In Link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Already have an account?{' '}
                                <a href="/login" className="text-blue-600 hover:underline">
                                    Sign in
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Welcome Message */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-blue-800 text-white">
                    <div className="text-center px-4">
                        <h1 className="text-2xl font-bold">Hello, Friend</h1>
                        <p className="mt-2 text-sm">
                            Sign up and get unlimited space to create and store unlimited tasks which will be stored across all your devices. Sign up now and enjoy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;