"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserType } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Modal } from './Modal';

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedPassword = userForm.password.trim();
        const trimmedConfirmPassword = userForm.confirmPassword.trim();
        const trimmedEmail = userForm.email.trim();
        let cleanPhone = userForm.phone.replace(/\D/g, ''); // Remove non-digits

        if (!userForm.firstName || !userForm.lastName || !cleanPhone || !trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
            showNotification('All fields are required!', 'error');
            return;
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }

        // Password Validation
        if (trimmedPassword.length < 6) {
            showNotification('Password must be at least 6 characters long.', 'error');
            return;
        }

        if (trimmedPassword !== trimmedConfirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }

        // Phone Validation (Malta Format)
        // If 8 digits, assume Malta local and add +356
        if (cleanPhone.length === 8) {
            cleanPhone = '356' + cleanPhone;
        }

        // Must be 11 digits (356 + 8 digits)
        if (cleanPhone.length !== 11 || !cleanPhone.startsWith('356')) {
            showNotification('Please enter a valid Malta phone number (8 digits).', 'error');
            return;
        }

        const formattedPhone = '+' + cleanPhone;

        if (existingUsers.some((u: UserType) => u.email === trimmedEmail)) {
            showNotification('This email is already registered!', 'error');
            return;
        }

        const newUser: UserType = {
            email: trimmedEmail,
            password: trimmedPassword,
            role: 'user',
            firstName: userForm.firstName,
            lastName: userForm.lastName,
            phone: formattedPhone,
            registered: new Date().toISOString().substring(0, 10)
        };

        try {
            await addUser(newUser);
            showNotification('Registration successful! Logging you in...', 'success');
            onLogin(newUser); // Otomatik giriş yap
            setActiveUserPanel(null);
            setUserForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
        } catch (error) {
            console.error(error);
            showNotification('Registration failed. Please try again.', 'error');
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const enteredEmail = loginForm.email.trim().toLowerCase();
        const enteredPassword = loginForm.password.trim();

        if (existingUsers.length === 0) {
            showNotification('System is still loading data. Please wait a moment and try again.', 'info');
            return;
        }

        const found = existingUsers.find((u: UserType) =>
            u.email.toLowerCase() === enteredEmail &&
            u.password === enteredPassword
        );

        if (!found) {
            showNotification('Invalid email or password!', 'error');
            return;
        }
        onLogin(found);
        showNotification(`Welcome back, ${found.firstName}!`, 'success');
        setActiveUserPanel(null);
        setLoginForm({ email: '', password: '' });
    };

    return (
        <>
            <div className="flex gap-3">
                <Button
                    onClick={() => setActiveUserPanel('login')}
                    className="px-6 py-2 border-2 border-[#CE8E94] text-[#CE8E94] bg-white rounded-xl text-sm font-bold hover:bg-[#CE8E94] hover:text-white transition duration-300"
                >
                    Login
                </Button>
                <Button
                    onClick={() => setActiveUserPanel('register')}
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
                                    placeholder="Phone (e.g. 99123456)"
                                    value={userForm.phone}
                                    onChange={e => {
                                        // Only allow digits to be typed
                                        const val = e.target.value;
                                        if (/^\d*$/.test(val)) {
                                            setUserForm(prev => ({ ...prev, phone: val }));
                                        }
                                    }}
                                    maxLength={8}
                                    className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700"
                                />
                                <input type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                <input type="password" placeholder="Password (min 6 chars)" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                                <input type="password" placeholder="Confirm Password" value={userForm.confirmPassword} onChange={e => setUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700" />
                            </div>
                            <Button type="submit" className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95">Create Account</Button>
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
                            <Button type="submit" className="w-full py-4 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95">Login</Button>
                        </form>
                    )}
                </Modal>
            )}
        </>
    );
}
