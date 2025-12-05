"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Modal } from './Modal';
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);

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

        if (existingUsers.some((u: UserType) => u.email === trimmedEmail)) {
            setRegisterError('This email is already registered!');
            return;
        }

        setIsRegistering(true);

        const newUser: UserType = {
            email: trimmedEmail,
            password: trimmedPassword,
            role: 'user',
            firstName: userForm.firstName,
            lastName: userForm.lastName,
            phone: phoneInput,
            registered: new Date().toISOString().substring(0, 10)
        };

        try {
            await addUser(newUser);
            showNotification('Registration successful! Logging you in...', 'success');
            onLogin(newUser);
            setActiveUserPanel(null);
            setUserForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
        } catch (error: any) {
            console.error(error);
            setRegisterError(`Registration failed: ${error.message || 'Unknown error'}`);
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
            // Query Firestore directly for the user
            const q = query(collection(db, "users"), where("email", "==", enteredEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setLoginError('User not found. Please register first.');
                setIsLoggingIn(false);
                return;
            }

            // User found, check password
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as UserType;

            if (userData.password !== enteredPassword) {
                setLoginError('Invalid password!');
                setIsLoggingIn(false);
                return;
            }

            // Login successful
            onLogin(userData);
            showNotification(`Welcome back, ${userData.firstName}!`, 'success');
            setActiveUserPanel(null);
            setLoginForm({ email: '', password: '' });

        } catch (error: any) {
            console.error("Login error:", error);
            setLoginError('Connection error. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };

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
                            </div>

                            {loginError && (
                                <p className="text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">{loginError}</p>
                            )}

                            <Button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isLoggingIn ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    )}
                </Modal>
            )}
        </>
    );
}
