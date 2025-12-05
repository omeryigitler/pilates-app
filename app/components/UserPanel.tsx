"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Modal } from './Modal';
import { registerUserAuth, loginUserAuth, resetPasswordAuth, getUserProfile } from '../services/pilatesService';

interface UserPanelProps {
    existingUsers: UserType[];
    addUser: (user: UserType) => Promise<void>;
    onLogin: (user: UserType) => void;
}

export const UserPanel = ({ existingUsers, addUser, onLogin }: UserPanelProps) => {
    const { showNotification } = useNotification();
    const [activeUserPanel, setActiveUserPanel] = useState<string | null>(null);
    const [userForm, setUserForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [forgotEmail, setForgotEmail] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterError(null);

        const trimmedPassword = userForm.password.trim();
        const trimmedConfirmPassword = userForm.confirmPassword.trim();
        const trimmedEmail = userForm.email.trim();
        const phoneInput = userForm.phone.trim();

        if (!userForm.firstName || !userForm.lastName || !phoneInput || !trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
            setRegisterError('All fields are required!');
            return;
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setRegisterError('Please enter a valid email address.');
            return;
        }

        // Password Validation
        if (trimmedPassword.length < 6) {
            setRegisterError('Password must be at least 6 characters long.');
            return;
        }

        if (trimmedPassword !== trimmedConfirmPassword) {
            setRegisterError('Passwords do not match!');
            return;
        }

        // Auth handles reuse checks, but we can do a soft check if we want.
        // For now, let Auth throw error if email exists.

        setIsRegistering(true);

        const newUser: UserType = {
            email: trimmedEmail.toLowerCase(),
            password: trimmedPassword, // Auth handles hashing, passing raw for consistency
            role: 'user',
            firstName: userForm.firstName.trim(),
            lastName: userForm.lastName.trim(),
            phone: phoneInput,
            registered: new Date().toISOString().substring(0, 10)
        };

        try {
            await registerUserAuth(newUser);

            showNotification('Registration successful! Logging you in...', 'success');
            // Check session manually to update UI immediately
            onLogin(newUser);
            setActiveUserPanel(null);
            setUserForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
        } catch (error: any) {
            console.error("Registration Error:", error);
            let msg = 'Registration failed.';
            if (error.code === 'auth/email-already-in-use') {
                msg = 'This email is already registered.';
            } else {
                msg = error.message;
            }
            setRegisterError(msg);
        } finally {
            setIsRegistering(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);

        const enteredEmail = loginForm.email.trim().toLowerCase();
        const enteredPassword = loginForm.password.trim();

        if (!enteredEmail || !enteredPassword) {
            setLoginError('Please enter both email and password.');
            return;
        }

        setIsLoggingIn(true);

        try {
            await loginUserAuth(enteredEmail, enteredPassword);

            // Fetch profile for immediate UI update
            const userProfile = await getUserProfile(enteredEmail);

            if (userProfile) {
                showNotification(`Welcome back, ${userProfile.firstName}!`, 'success');
                onLogin(userProfile);
                setActiveUserPanel(null);
                setLoginForm({ email: '', password: '' });
            } else {
                // Should not happen if registered correctly
                showNotification('User profile not found in database.', 'error');
            }

        } catch (error: any) {
            console.error("Login error:", error);
            let msg = 'Connection error. Please try again.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = 'Invalid email or password.';
            }
            setLoginError(msg);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError(null);
        setResetSuccess(null);

        if (!forgotEmail) {
            setResetError('Please enter your email.');
            return;
        }

        setIsResetting(true);
        try {
            await resetPasswordAuth(forgotEmail);
            setResetSuccess('Reset link sent! Please check your inbox and SPAM folder.');
            setForgotEmail('');
        } catch (error: any) {
            console.error("Reset error:", error);
            if (error.code === 'auth/user-not-found') {
                setResetError('No user found with this email address.');
            } else if (error.code === 'auth/invalid-email') {
                setResetError('Invalid email format. Please check your email.');
            } else {
                setResetError('Error sending email. Please try again later.');
            }
        } finally {
            setIsResetting(false);
        }
    }

    return (
        <>
            <div className="flex gap-3">
                <Button
                    onClick={() => { setActiveUserPanel('login'); setLoginError(null); }}
                    className="px-6 py-2 border-2 border-[#CE8E94] text-[#CE8E94] bg-white rounded-xl text-sm font-bold hover:bg-[#CE8E94] hover:text-white transition duration-300"
                >
                    Login
                </Button>
                <Button
                    onClick={() => { setActiveUserPanel('register'); setRegisterError(null); }}
                    className="px-6 py-2 bg-[#CE8E94] text-white rounded-xl text-sm font-bold shadow-md
                        hover:bg-white hover:text-[#CE8E94] hover:border-2 hover:border-[#CE8E94] transition duration-300"
                >
                    Register
                </Button>
            </div>

            {activeUserPanel && (
                <Modal onClose={() => setActiveUserPanel(null)}>
                    {activeUserPanel === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-[#CE8E94] mb-2">Join Us</h2>
                                <p className="text-gray-500 font-light">Start your Pilates journey today.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="First Name" value={userForm.firstName} onChange={e => setUserForm(prev => ({ ...prev, firstName: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                    <input type="text" placeholder="Last Name" value={userForm.lastName} onChange={e => setUserForm(prev => ({ ...prev, lastName: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="Phone"
                                    value={userForm.phone}
                                    onChange={e => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700"
                                />
                                <input type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                <input type="password" placeholder="Password (min 6 chars)" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                <input type="password" placeholder="Confirm Password" value={userForm.confirmPassword} onChange={e => setUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                            </div>

                            {registerError && (
                                <p className="text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{registerError}</p>
                            )}

                            <Button type="submit" disabled={isRegistering} className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isRegistering ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </form>
                    )}

                    {activeUserPanel === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-[#CE8E94] mb-2">Welcome Back</h2>
                                <p className="text-gray-500 font-light">Log in to manage your bookings.</p>
                            </div>
                            <div className="space-y-4">
                                <input type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />

                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setActiveUserPanel('forgot-password'); setResetError(null); setResetSuccess(null); }}
                                        className="text-sm font-semibold text-gray-500 hover:text-[#CE8E94] underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>

                            {loginError && (
                                <p className="text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{loginError}</p>
                            )}

                            <Button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isLoggingIn ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    )}

                    {activeUserPanel === 'forgot-password' && (
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-[#CE8E94] mb-2">Reset Password</h2>
                                <p className="text-gray-500 font-light">Enter your email to receive a reset link.</p>
                            </div>
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                    className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700"
                                />
                            </div>

                            {resetError && (
                                <p className="text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{resetError}</p>
                            )}
                            {resetSuccess && (
                                <p className="text-green-600 text-center font-medium bg-green-50 p-2 rounded-lg">{resetSuccess}</p>
                            )}

                            <Button type="submit" disabled={isResetting} className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isResetting ? 'Sending...' : 'Send Reset Link'}
                            </Button>

                            <button
                                type="button"
                                onClick={() => { setActiveUserPanel('login'); setLoginError(null); }}
                                className="w-full text-center text-gray-500 hover:text-[#CE8E94] underline mt-4"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}
                </Modal>
            )}
        </>
    );
}

