"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Users, TrendingUp, Edit3, Star, Award, Mail, Database, Clock, Upload, Trash2, Plus, X } from 'lucide-react';
import { Slot, UserType, ManagementState } from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatDateDisplay, getTodayDate } from '../utils/helpers';
import { BookingCalendar } from './BookingCalendar';
import { AdminAnalytics } from './AdminAnalytics';
import { FileUploadInput } from './FileUploadInput';

interface AdminPanelProps {
    loggedInUser: UserType;
    slots: Slot[];
    users: UserType[];
    managementState: ManagementState;
    setManagementState: React.Dispatch<React.SetStateAction<ManagementState>>;
    handleLogout: () => void;
}

export const AdminPanel = ({
    loggedInUser,
    slots,
    users,
    managementState,
    setManagementState,
    handleLogout
}: AdminPanelProps) => {
    const { showNotification } = useNotification();
    const { showConfirm } = useConfirm();
    const [activeTab, setActiveTab] = useState<'bookings' | 'members' | 'management' | 'analytics'>('bookings');

    const [newSlotTime, setNewSlotTime] = useState('');
    const [newSlotDate, setNewSlotDate] = useState(getTodayDate());

    const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
    const [editFormData, setEditFormData] = useState({ date: '', time: '' });

    const standardInputClass = "w-full p-4 border border-gray-100 rounded-2xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700 shadow-sm";

    // --- HANDLERS ---
    const handleUpload = (field: string, file: File) => {
        if (!file) return;
        try {
            const url = URL.createObjectURL(file);
            setManagementState(prev => ({ ...prev, [field]: url }));
        } catch (err) {
            console.error('Error creating object URL', err);
            showNotification('File preview failed.', 'error');
        }
    };

    const handleCampaignImage = (index: number, file: File) => {
        if (!file) return;
        try {
            const url = URL.createObjectURL(file);
            setManagementState(prev => {
                const newCamps = [...prev.campaigns];
                newCamps[index] = { ...newCamps[index], image: url };
                return { ...prev, campaigns: newCamps };
            });
        } catch (err) {
            console.error('Error creating object URL', err);
            showNotification('File preview failed.', 'error');
        }
    };

    const handleSaveManagement = async () => {
        try {
            await setDoc(doc(db, "management", "settings"), managementState);
            showNotification('Site Settings Saved!', 'success');
        } catch (e) {
            console.error(e);
            showNotification('Error saving settings', 'error');
        }
    };

    const handleDeleteUser = (email: string) => {
        const userToDelete = users.find(u => u.email === email);
        if (!userToDelete) return;

        showConfirm(
            `Are you sure you want to delete the user: ${userToDelete.firstName} ${userToDelete.lastName} (${email})?`,
            async () => {
                try {
                    await deleteDoc(doc(db, "users", email));
                    showNotification(`User ${email} deleted.`, 'success');
                } catch (e) {
                    showNotification('Error deleting user', 'error');
                }
            },
            `Confirm User Deletion`
        );
    };

    const handleToggleSlotStatus = async (slotDate: string, slotTime: string) => {
        const slot = slots.find(s => s.date === slotDate && s.time === slotTime);
        if (!slot) return;

        const newStatus = slot.status === 'Booked' ? 'Available' : 'Booked';
        const newBookedBy = newStatus === 'Booked' ? `Admin Action - ${loggedInUser?.firstName}` : null;

        try {
            await updateDoc(doc(db, "slots", `${slotDate}_${slotTime}`), {
                status: newStatus,
                bookedBy: newBookedBy
            });
            showNotification(`Slot status toggled for ${slotTime} on ${formatDateDisplay(slotDate)}`, 'info');
        } catch (e) {
            showNotification('Error toggling status', 'error');
        }
    };

    const handleDeleteSlot = async (slot: Slot) => {
        showConfirm(
            "Are you sure you want to delete this slot? This action cannot be undone.",
            async () => {
                try {
                    const slotId = `${slot.date}_${slot.time}`;
                    await deleteDoc(doc(db, "slots", slotId));
                    showNotification("Slot deleted successfully", "success");
                } catch (error) {
                    console.error("Error deleting slot:", error);
                    showNotification("Failed to delete slot", "error");
                }
            },
            "Delete Slot",
            undefined,
            "Delete",
            true
        );
    };

    const handleDownloadBackup = () => {
        const backupData = {
            timestamp: new Date().toISOString(),
            users,
            slots,
            managementState
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `pilates_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        showNotification("Backup downloaded successfully!", "success");
    };

    const handleAddSlot = async () => {
        const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$/i;

        if (!newSlotTime || !timeRegex.test(newSlotTime.trim())) {
            showNotification('Please enter a valid time (e.g., 09:00 AM or 15:30).', 'error');
            return;
        }
        if (!newSlotDate) {
            showNotification('Please select a date for the slot.', 'error');
            return;
        }
        if (slots.some(s => s.date === newSlotDate && s.time.toLowerCase() === newSlotTime.trim().toLowerCase())) {
            showNotification(`A slot for ${newSlotDate} at ${newSlotTime.trim()} already exists.`, 'error');
            return;
        }

        const normalizedTime = newSlotTime.trim();

        const newSlot: Slot = { date: newSlotDate, time: normalizedTime, status: 'Available', bookedBy: null };
        try {
            await setDoc(doc(db, "slots", `${newSlotDate}_${normalizedTime}`), newSlot);
            setNewSlotTime('');
            showNotification('New slot added!', 'success');
        } catch (e) {
            showNotification('Error adding slot', 'error');
        }
    };

    const handleUpdateSlot = async () => {
        if (!editingSlot) return;

        const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$/i;
        if (!editFormData.time || !timeRegex.test(editFormData.time.trim())) {
            showNotification('Please enter a valid time.', 'error');
            return;
        }
        if (!editFormData.date) {
            showNotification('Please select a date.', 'error');
            return;
        }

        const isCollision = slots.some(s =>
            s.date === editFormData.date &&
            s.time.toLowerCase() === editFormData.time.trim().toLowerCase() &&
            !(s.date === editingSlot.date && s.time === editingSlot.time)
        );

        if (isCollision) {
            showNotification(`A slot for ${editFormData.date} at ${editFormData.time} already exists.`, 'error');
            return;
        }

        try {
            if (editingSlot.date !== editFormData.date || editingSlot.time !== editFormData.time.trim()) {
                await deleteDoc(doc(db, "slots", `${editingSlot.date}_${editingSlot.time}`));
                const newSlot: Slot = { ...editingSlot, date: editFormData.date, time: editFormData.time.trim() };
                await setDoc(doc(db, "slots", `${newSlot.date}_${newSlot.time}`), newSlot);
            }

            setEditingSlot(null);
            showNotification('Slot updated successfully!', 'success');
        } catch (e) {
            showNotification('Error updating slot', 'error');
        }
    };

    const openEditSlotModal = (slot: Slot) => {
        setEditingSlot(slot);
        setEditFormData({ date: slot.date, time: slot.time });
    };

    return (
        <div className="pilates-root min-h-screen flex flex-col items-center p-4 md:p-10 space-y-10 font-sans bg-[#FFF0E5]">
            <div className="w-full max-w-6xl px-8 md:px-16 py-10 bg-white/60 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/50 space-y-12">
                <div className="flex justify-between items-center border-b border-[#CE8E94]/20 pb-6">
                    <h1 className="text-4xl font-bold text-[#CE8E94]">Admin Panel</h1>
                    <button
                        onClick={handleLogout}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-500 transition duration-300 flex items-center gap-2"
                    >
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-4xl mx-auto">
                    {/* Tabs */}
                    {(['bookings', 'members', 'analytics', 'management'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${activeTab === tab ? 'bg-white border-[#CE8E94] shadow-lg scale-105' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-md'}`}
                        >
                            <div className={`p-3 rounded-full mb-2 ${activeTab === tab ? 'bg-[#CE8E94] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {tab === 'bookings' && <Calendar className="w-6 h-6" />}
                                {tab === 'members' && <Users className="w-6 h-6" />}
                                {tab === 'analytics' && <TrendingUp className="w-6 h-6" />}
                                {tab === 'management' && <Edit3 className="w-6 h-6" />}
                            </div>
                            <span className={`font-bold capitalize ${activeTab === tab ? 'text-[#CE8E94]' : 'text-gray-500'}`}>{tab}</span>
                        </button>
                    ))}
                </div>

                {activeTab === 'analytics' && (
                    <AdminAnalytics slots={slots} users={users} currentLogo={managementState.logo} />
                )}

                {activeTab === 'management' && (
                    <div className="space-y-10 p-6 md:p-8 rounded-[2rem] bg-white/50 border border-white/40">
                        {/* Hero Section */}
                        <div>
                            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 border-b pb-2"><Edit3 className="w-6 h-6 text-[#CE8E94]" /> Hero Section Content</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Main Title</label>
                                    <input
                                        type="text"
                                        value={managementState.heroTitle}
                                        onChange={e => setManagementState(prev => ({ ...prev, heroTitle: e.target.value }))}
                                        className={standardInputClass}
                                    />
                                    <label className="block text-sm font-bold text-gray-600 pt-4 mb-2">Subtitle</label>
                                    <input
                                        type="text"
                                        value={managementState.heroSubtitle}
                                        onChange={e => setManagementState(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                                        className={standardInputClass}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <FileUploadInput
                                        label="Hero Image"
                                        previewUrl={managementState.heroImage}
                                        onChange={(file) => handleUpload('heroImage', file)}
                                    />
                                    <FileUploadInput
                                        label="Logo Image"
                                        previewUrl={managementState.logo}
                                        onChange={(file) => handleUpload('logo', file)}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Trust Signals */}
                        <div>
                            <h3 className="text-2xl font-bold my-6 text-gray-800 flex items-center gap-3 border-b pb-2"><Star className="w-6 h-6 text-[#CE8E94]" /> Trust Signals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {managementState.trustSignals.map((signal, idx) => (
                                    <div key={idx} className="p-4 bg-white rounded-xl shadow-sm space-y-3 border border-gray-100">
                                        <h4 className="text-lg font-bold text-[#CE8E94]">Signal {idx + 1}</h4>
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={signal.title}
                                            onChange={e => setManagementState(prev => {
                                                const newSignals = [...prev.trustSignals];
                                                newSignals[idx] = { ...newSignals[idx], title: e.target.value };
                                                return { ...prev, trustSignals: newSignals };
                                            })}
                                            className={standardInputClass}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Subtitle"
                                            value={signal.sub}
                                            onChange={e => setManagementState(prev => {
                                                const newSignals = [...prev.trustSignals];
                                                newSignals[idx] = { ...newSignals[idx], sub: e.target.value };
                                                return { ...prev, trustSignals: newSignals };
                                            })}
                                            className={standardInputClass}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Campaigns */}
                        <div>
                            <h3 className="text-2xl font-bold my-6 text-gray-800 flex items-center gap-3 border-b pb-2"><Award className="w-6 h-6 text-[#CE8E94]" /> Campaigns</h3>
                            <div className="space-y-6">
                                {managementState.campaigns.map((camp, idx) => (
                                    <div key={idx} className="p-6 bg-white rounded-xl shadow-md space-y-4 border border-gray-100">
                                        <h4 className="text-xl font-bold text-[#CE8E94]">Campaign {idx + 1}</h4>
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={camp.title}
                                            onChange={e => setManagementState(prev => {
                                                const newCamps = [...prev.campaigns];
                                                newCamps[idx] = { ...newCamps[idx], title: e.target.value };
                                                return { ...prev, campaigns: newCamps };
                                            })}
                                            className={standardInputClass}
                                        />
                                        <textarea
                                            placeholder="Description"
                                            rows={3}
                                            value={camp.description}
                                            onChange={e => setManagementState(prev => {
                                                const newCamps = [...prev.campaigns];
                                                newCamps[idx] = { ...newCamps[idx], description: e.target.value };
                                                return { ...prev, campaigns: newCamps };
                                            })}
                                            className={standardInputClass}
                                        />
                                        <FileUploadInput
                                            label="Campaign Image"
                                            previewUrl={camp.image}
                                            onChange={(file) => handleCampaignImage(idx, file)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className="text-2xl font-bold my-6 text-gray-800 flex items-center gap-3 border-b pb-2"><Mail className="w-6 h-6 text-[#CE8E94]" /> Contact & Social</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={managementState.contactInfo.email}
                                        onChange={e => setManagementState(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, email: e.target.value } }))}
                                        className={standardInputClass}
                                    />
                                    <label className="block text-sm font-bold text-gray-600 pt-4 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={managementState.contactInfo.phone}
                                        onChange={e => setManagementState(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, phone: e.target.value } }))}
                                        className={standardInputClass}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Facebook URL</label>
                                    <input
                                        type="url"
                                        value={managementState.socialLinks.facebook}
                                        onChange={e => setManagementState(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, facebook: e.target.value } }))}
                                        className={standardInputClass}
                                    />
                                    <label className="block text-sm font-bold text-gray-600 pt-4 mb-2">Instagram URL</label>
                                    <input
                                        type="url"
                                        value={managementState.socialLinks.instagram}
                                        onChange={e => setManagementState(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, instagram: e.target.value } }))}
                                        className={standardInputClass}
                                    />
                                    <label className="block text-sm font-bold text-gray-600 pt-4 mb-2">X/Twitter URL</label>
                                    <input
                                        type="url"
                                        value={managementState.socialLinks.x}
                                        onChange={e => setManagementState(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, x: e.target.value } }))}
                                        className={standardInputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mt-10">
                            <Button
                                onClick={handleSaveManagement}
                                className="flex-1 py-5 bg-[#CE8E94] hover:bg-[#B57A80] text-white rounded-xl font-bold shadow-lg transition-colors text-xl transform active:scale-95"
                            >
                                Save All Changes
                            </Button>
                            <Button
                                onClick={handleDownloadBackup}
                                className="flex-1 py-5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold shadow-lg transition-colors text-xl transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Database className="w-6 h-6" /> Download Backup
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="space-y-10 p-6 md:p-8 rounded-[2rem] bg-white/50 border border-white/40">
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 border-b pb-2"><Clock className="w-6 h-6 text-[#CE8E94]" /> Class Schedule Management</h3>

                        <h4 className="text-xl font-bold text-[#CE8E94] mb-4">Add New Slot</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <div className="lg:col-span-1 space-y-4">
                                <BookingCalendar
                                    slots={slots}
                                    onSelectDate={setNewSlotDate}
                                    selectedDate={newSlotDate}
                                />
                            </div>
                            <div className="lg:col-span-1 flex flex-col justify-center space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Selected Date</label>
                                    <div className="text-2xl font-bold text-gray-800 border-b pb-2 border-gray-200">
                                        {formatDateDisplay(newSlotDate)}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Time</label>
                                    <input
                                        type="text"
                                        value={newSlotTime}
                                        onChange={e => setNewSlotTime(e.target.value)}
                                        placeholder="09:00 AM or 15:30"
                                        className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 text-xl font-medium focus:outline-none focus:border-[#CE8E94] transition"
                                    />
                                    <p className="text-xs text-gray-400">Supported formats: 9:00 AM or 09:00</p>
                                </div>
                                <Button
                                    onClick={handleAddSlot}
                                    className="w-full py-4 bg-[#CE8E94] text-white rounded-xl font-bold shadow-lg hover:bg-[#B57A80] transition transform active:scale-95"
                                >
                                    <Plus className="w-5 h-5 mr-2" /> Add Session Slot
                                </Button>
                            </div>
                        </div>

                        <h4 className="text-xl font-bold text-[#CE8E94] mt-10 mb-4">Manage Slots</h4>
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                {slots.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">No slots created yet.</p>
                                ) : (
                                    slots.map((slot, idx) => (
                                        <div key={idx} className={`flex flex-col sm:flex-row justify-between items-center p-4 rounded-2xl border transition ${slot.status === 'Booked' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                                <div className={`p-3 rounded-full ${slot.status === 'Booked' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-700 block">{formatDateDisplay(slot.date)}</span>
                                                    <span className="text-sm text-gray-500">{slot.time}</span>
                                                    {slot.bookedBy && <span className="text-xs font-bold text-[#CE8E94] block mt-1">Booked by: {slot.bookedBy}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => openEditSlotModal(slot)}
                                                    className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200"
                                                    title="Edit Slot"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    onClick={() => handleToggleSlotStatus(slot.date, slot.time)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition w-24 ${slot.status === 'Available' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                                                >
                                                    {slot.status}
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteSlot(slot)}
                                                    className="p-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-100 hover:text-red-500 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="space-y-10 p-6 md:p-8 rounded-[2rem] bg-white/50 border border-white/40">
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 border-b pb-2"><Users className="w-6 h-6 text-[#CE8E94]" /> Members Management</h3>
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[#CE8E94]/10 text-[#CE8E94] font-bold">
                                    <tr>
                                        <th className="p-5">Name</th>
                                        <th className="p-5">Email</th>
                                        <th className="p-5">Phone</th>
                                        <th className="p-5">Role</th>
                                        <th className="p-5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    {users.map((u, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="p-5 font-bold">{u.firstName} {u.lastName}</td>
                                            <td className="p-5">{u.email}</td>
                                            <td className="p-5">{u.phone}</td>
                                            <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span></td>
                                            <td className="p-5">
                                                <Button onClick={() => handleDeleteUser(u.email)} className="text-red-400 hover:text-red-600 font-bold text-sm">Delete</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Slot Modal */}
            {editingSlot && (
                <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-2xl font-bold text-[#CE8E94]">Edit Slot</h3>
                            <button onClick={() => setEditingSlot(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">New Date</label>
                                <input type="date" value={editFormData.date} onChange={e => setEditFormData(prev => ({ ...prev, date: e.target.value }))} className={standardInputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">New Time</label>
                                <input type="text" value={editFormData.time} onChange={e => setEditFormData(prev => ({ ...prev, time: e.target.value }))} className={standardInputClass} />
                            </div>
                        </div>
                        <Button onClick={handleUpdateSlot} className="w-full py-4 bg-[#CE8E94] text-white rounded-xl font-bold shadow-lg hover:bg-[#B57A80]">Save Changes</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
