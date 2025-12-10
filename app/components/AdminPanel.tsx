"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Users, TrendingUp, Edit3, Star, Award, Mail, Database, Clock, Plus, Trash2, SwitchCamera, Home, UserPlus, ShieldCheck, ChevronDown, Check, Search, FileText, ExternalLink, BadgeCheck, MessageSquareText, Phone, CalendarPlus } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Slot, UserType, ManagementState } from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatDateDisplay, getTodayDate, convertTime12to24 } from '../utils/helpers';
import { BookingCalendar } from './BookingCalendar';
import { updateExpiredSlots } from '../services/pilatesService';
import { AdminAnalytics } from './AdminAnalytics';
import { FileUploadInput } from './FileUploadInput';
import { Modal } from './Modal';
import emailjs from '@emailjs/browser';

interface AdminPanelProps {
    loggedInUser: UserType;
    slots: Slot[];
    users: UserType[];
    managementState: ManagementState;
    setManagementState: React.Dispatch<React.SetStateAction<ManagementState>>;
    handleLogout: () => void;
    navigateToHome: () => void;
}

export const AdminPanel = ({
    loggedInUser,
    slots,
    users,
    managementState,
    setManagementState,
    handleLogout,
    navigateToHome
}: AdminPanelProps) => {
    const { showNotification } = useNotification();
    const { showConfirm } = useConfirm();
    const [activeTab, setActiveTab] = useState<'bookings' | 'members' | 'management' | 'analytics'>('bookings');

    const [newSlotTime, setNewSlotTime] = useState('');
    const [newSlotDate, setNewSlotDate] = useState('');

    React.useEffect(() => {
        setNewSlotDate(getTodayDate());
    }, []);

    // NEW: Auto-update expired slots
    React.useEffect(() => {
        if (slots.length > 0) {
            updateExpiredSlots(slots);
        }
    }, [slots]);

    // NEW: Date Filter State
    const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Week' | 'Month' | 'Custom'>('All');
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);

    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'Available'>('All');
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

    const filteredSlots = React.useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        return slots.filter(slot => {
            // 1. Status Filter
            let statusMatch = true;
            if (statusFilter === 'All') statusMatch = true;
            else if (statusFilter === 'Active') statusMatch = slot.status === 'Booked' || slot.status === 'Active';
            else statusMatch = slot.status === statusFilter;

            // 2. Date Filter
            let dateMatch = true;
            const slotDate = slot.date;

            if (dateFilter === 'All') dateMatch = true;
            else if (dateFilter === 'Today') dateMatch = slotDate === todayStr;
            else if (dateFilter === 'Week') {
                const sDate = new Date(slotDate);
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
                endOfWeek.setHours(23, 59, 59, 999);

                dateMatch = sDate >= startOfWeek && sDate <= endOfWeek;
            }
            else if (dateFilter === 'Month') {
                dateMatch = slotDate.substring(0, 7) === todayStr.substring(0, 7);
            }
            else if (dateFilter === 'Custom') {
                if (customStartDate && customEndDate) {
                    dateMatch = slotDate >= customStartDate && slotDate <= customEndDate;
                }
            }

            return statusMatch && dateMatch;
        });
    }, [slots, statusFilter, dateFilter, customStartDate, customEndDate]);

    const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
    const [editFormData, setEditFormData] = useState({ date: '', time: '' });

    // NEW state for Assigning Slot
    const [assigningSlot, setAssigningSlot] = useState<Slot | null>(null);
    const [selectedUserEmailToAssign, setSelectedUserEmailToAssign] = useState('');

    // NEW CRM States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<UserType | null>(null);
    const [memberNotes, setMemberNotes] = useState('');
    const [bookingForMember, setBookingForMember] = useState<UserType | null>(null);

    const standardInputClass = "w-full p-4 border border-gray-100 rounded-2xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700 shadow-sm";

    // --- HANDLERS ---
    // Unified Booking Logic
    const performBooking = async (slot: Slot, user: UserType) => {
        const fullName = `${user.firstName} ${user.lastName}`;
        const slotId = `${slot.date}_${slot.time}`;

        // CHECK: Prevent Double Booking
        const isSlotTaken = slots.some(s =>
            s.date === slot.date &&
            s.time === slot.time &&
            (s.status === 'Booked' || s.status === 'Active')
        );

        if (isSlotTaken) {
            showNotification('This slot is already booked! Please refresh or choose another.', 'error');
            return false;
        }

        try {
            // 1. Assign in Firestore
            await setDoc(doc(db, 'slots', slotId), {
                ...slot,
                status: 'Booked',
                bookedBy: `${fullName} (Admin)`
            });

            // 2. Send Email Notification
            showNotification('Slot assigned! Sending email...', 'info');

            await emailjs.send(
                'service_335c8mj',   // Service ID
                'template_lsuq5bc',  // Template ID
                {
                    to_name: user.firstName,
                    to_email: user.email,
                    studio_name: 'Reformer Pilates Malta',
                    class_name: 'Reformer Pilates',
                    class_date: formatDateDisplay(slot.date),
                    class_time: slot.time,
                    instructor_name: 'Ömer YİĞİTLER',
                    studio_address: 'Triq Il-Hgejjeg, San Giljan, Malta',
                    maps_link: 'https://maps.app.goo.gl/YourGoogleMapsLinkHere',
                    website_url: 'https://www.reformerpilatesmalta.com'
                },
                'pqtdmtV_1xQxlCa0T'  // Public Key
            );

            showNotification(`Slot assigned and email sent to ${user.firstName}!`, 'success');
            return true;
        } catch (error) {
            console.error(error);
            showNotification('Slot assigned purely locally (Network Error?)', 'error');
            return true; // Still return true as DB update likely succeeded or we want to clear modal
        }
    };

    const handleAssignSlot = async () => {
        if (!assigningSlot || !selectedUserEmailToAssign) return;
        const userToAssign = users.find(u => u.email === selectedUserEmailToAssign);
        if (!userToAssign) return;

        const success = await performBooking(assigningSlot, userToAssign);
        if (success) {
            setAssigningSlot(null);
            setSelectedUserEmailToAssign('');
        }
    };

    const handleBookForMember = async (slot: Slot) => {
        if (!bookingForMember) return;

        showConfirm(
            `Book ${formatDateDisplay(slot.date)} at ${slot.time} for ${bookingForMember.firstName}?`,
            async () => {
                const success = await performBooking(slot, bookingForMember);
                if (success) {
                    setBookingForMember(null); // Close modal on success
                }
            },
            "Confirm Booking"
        );
    };
    const handleUpload = (field: string, file: File) => {
        if (!file) return;
        if (file.size > 800 * 1024) {
            showNotification('Image is too large! Please use an image under 800KB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // @ts-ignore - dynamic key access
            setManagementState(prev => ({ ...prev, [field]: base64String }));
        };
        reader.onerror = () => {
            showNotification('Failed to read file.', 'error');
        };
        reader.readAsDataURL(file);
    };

    const handleCampaignImage = (index: number, file: File) => {
        if (!file) return;
        if (file.size > 800 * 1024) {
            showNotification('Image is too large! Please use an image under 800KB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setManagementState(prev => {
                const newCamps = [...prev.campaigns];
                newCamps[index] = { ...newCamps[index], image: base64String };
                return { ...prev, campaigns: newCamps };
            });
        };
        reader.onerror = () => {
            showNotification('Failed to read file.', 'error');
        };
        reader.readAsDataURL(file);
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

    // CRM HANDLERS
    const handleUpdateAdminNotes = async () => {
        if (!selectedMember) return;
        try {
            await updateDoc(doc(db, 'users', selectedMember.email), {
                adminNotes: memberNotes
            });
            // Update local state to reflect change immediately without reload if needed, 
            // though listener might handle it. For now, manual update ensures UI feels snappy.
            // Actually, since we are using 'users' prop which comes from a listener in parent, 
            // it WILL update automatically. We just need to wait.
            showNotification('Notes saved successfully!', 'success');
        } catch (error) {
            console.error(error);
            showNotification('Error saving notes', 'error');
        }
    };

    const handleSendWhatsApp = (phone: string, firstName: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            showNotification('Invalid phone number', 'error');
            return;
        }
        const message = `Hi ${firstName}, regarding your Pilates sessions...`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSendEmail = (email: string) => {
        window.open(`mailto:${email}`, '_blank');
    };

    // CRM HELPERS
    const getMemberStats = (email: string) => {
        const userSlots = slots.filter(s => s.bookedBy && s.bookedBy.includes(users.find(u => u.email === email)?.firstName || ''));
        // A more robust check might be needed if names are not unique, but ID logic isn't fully there yet for 'bookedBy'.
        // Current logic relies on string containing Name.
        // Let's improve: The 'bookedBy' field stores "First Last" or "First Last (Admin)".
        // We should find user by email, get their full name, and match.
        const user = users.find(u => u.email === email);
        if (!user) return { total: 0, active: 0, completed: 0, history: [] };

        const fullName = `${user.firstName} ${user.lastName}`;
        const mySlots = slots.filter(s => s.bookedBy && s.bookedBy.includes(fullName));

        return {
            total: mySlots.length,
            active: mySlots.filter(s => s.status === 'Booked' || s.status === 'Active').length,
            completed: mySlots.filter(s => s.status === 'Completed').length,
            history: mySlots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
        };
    };

    const getMemberBadges = (user: UserType, stats: { total: number }) => {
        const badges = [];
        const regDate = new Date(user.registered);
        const daysSinceReg = (new Date().getTime() - regDate.getTime()) / (1000 * 3600 * 24);

        if (daysSinceReg < 7) badges.push({ label: 'New', color: 'bg-blue-100 text-blue-600' });
        if (stats.total > 10) badges.push({ label: 'VIP', color: 'bg-yellow-100 text-yellow-700' });
        if (stats.total === 0 && daysSinceReg > 30) badges.push({ label: 'Inactive', color: 'bg-gray-100 text-gray-500' });

        return badges;
    };

    // Filter Users
    const filteredUsers = users.filter(user => {
        const search = searchTerm.toLowerCase();
        return (
            user.firstName.toLowerCase().includes(search) ||
            user.lastName.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search)
        );
    });

    const handleToggleSlotStatus = async (slotDate: string, slotTime: string) => {
        const slot = slots.find(s => s.date === slotDate && s.time === slotTime);
        if (!slot) return;

        const isOccupied = slot.status === 'Booked' || slot.status === 'Active' || slot.status === 'Completed';
        const newStatus = isOccupied ? 'Available' : 'Active';
        const newBookedBy = !isOccupied ? `Admin Action - ${loggedInUser?.firstName}` : null;

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
            !(s.date === editingSlot.date && s.time === editingSlot.time) &&
            (s.status === 'Booked' || s.status === 'Active' || s.status === 'Completed')
        );

        if (isCollision) {
            showNotification(`A slot for ${editFormData.date} at ${editFormData.time} already exists.`, 'error');
            return;
        }

        try {
            if (editingSlot.date !== editFormData.date || editingSlot.time !== editFormData.time.trim()) {
                // Attempt to delete with standard underscore format
                await deleteDoc(doc(db, "slots", `${editingSlot.date}_${editingSlot.time}`));
                // Attempt to delete with hyphen format (legacy/bug fix)
                await deleteDoc(doc(db, "slots", `${editingSlot.date}-${editingSlot.time}`));

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
                {/* ... header ... */}

                {/* Added reset button near header for easy access during debug */}

                <div className="flex justify-between items-start md:items-center border-b border-[#CE8E94]/20 pb-6">
                    <h1 className="text-4xl font-bold text-[#CE8E94] flex items-center gap-3">
                        Admin Panel
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <Button
                            onClick={navigateToHome}
                            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-100 transition duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <Home className="w-4 h-4" /> Home
                        </Button>
                        <Button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-500 transition duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-4xl mx-auto">
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
                                        placeholder="e.g., 10:30 AM"
                                        value={newSlotTime}
                                        onChange={e => setNewSlotTime(e.target.value)}
                                        className={`${standardInputClass} block text-lg py-4`}
                                    />
                                    <p className="text-xs text-gray-400">Format: HH:MM AM/PM (e.g. 09:30 AM)</p>
                                </div>
                                <Button
                                    onClick={handleAddSlot}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-md transition-colors text-lg flex items-center justify-center"
                                >
                                    <Plus className="w-6 h-6 mr-2" /> Add Slot
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6 mt-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2">
                                <h4 className="text-xl font-bold text-gray-700">Current Slots ({filteredSlots.length})</h4>
                                <div className="flex flex-col md:flex-row gap-3 w-full sm:w-auto">
                                    {/* Date Filter Dropdown */}
                                    <div className="relative w-full sm:w-[200px] group">
                                        <button
                                            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                                            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-100 rounded-xl px-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#CE8E94]/20"
                                        >
                                            <span className="text-gray-800 truncate">
                                                {dateFilter === 'Custom' && customStartDate ? 'Custom Range' : dateFilter === 'All' ? 'All Dates' : dateFilter}
                                            </span>
                                            <Calendar className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-[#CE8E94] flex-shrink-0 ml-2 ${isDateFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isDateFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsDateFilterOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    {(['All', 'Today', 'Week', 'Month', 'Custom'] as const).map((option) => (
                                                        <div
                                                            key={option}
                                                            onClick={() => {
                                                                if (option === 'Custom') {
                                                                    setShowCustomDateModal(true);
                                                                    setIsDateFilterOpen(false);
                                                                } else {
                                                                    setDateFilter(option);
                                                                    setIsDateFilterOpen(false);
                                                                }
                                                            }}
                                                            className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors duration-200
                                                                ${dateFilter === option && option !== 'Custom'
                                                                    ? 'bg-[#CE8E94]/10 text-[#CE8E94] font-bold'
                                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                                }`}
                                                        >
                                                            <span className="text-sm">{option === 'All' ? 'All Dates' : option}</span>
                                                            {dateFilter === option && option !== 'Custom' && <Check className="w-4 h-4 text-[#CE8E94]" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Status Filter Dropdown */}
                                    <div className="relative w-full sm:w-[200px] group">
                                        <button
                                            onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                                            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-100 rounded-xl px-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#CE8E94]/20"
                                        >
                                            <span className="text-gray-800 truncate">
                                                {statusFilter === 'All' ? 'All Statuses' : statusFilter === 'Completed' ? 'Completed Only' : statusFilter === 'Active' ? 'Active Only' : 'Available Only'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-[#CE8E94] flex-shrink-0 ml-2 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isStatusFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsStatusFilterOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    {(['All', 'Active', 'Available', 'Completed'] as const).map((option) => (
                                                        <div
                                                            key={option}
                                                            onClick={() => {
                                                                setStatusFilter(option);
                                                                setIsStatusFilterOpen(false);
                                                            }}
                                                            className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors duration-200
                                                                ${statusFilter === option
                                                                    ? 'bg-[#CE8E94]/10 text-[#CE8E94] font-bold'
                                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                                }`}
                                                        >
                                                            <span className="text-sm">
                                                                {option === 'All' ? 'All Statuses' : option === 'Completed' ? 'Completed Only' : option === 'Active' ? 'Active Only' : 'Available Only'}
                                                            </span>
                                                            {statusFilter === option && <Check className="w-4 h-4 text-[#CE8E94]" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {filteredSlots.map((slot, idx) => (
                                    <div key={idx} className="grid grid-cols-2 items-center p-5 bg-white/60 rounded-2xl hover:bg-gray-50 shadow-sm transition border border-white/40 hover:border-[#CE8E94]/30 gap-4 relative overflow-hidden">

                                        {/* 1. Date & Status (Top Row) */}
                                        <div className="col-span-2 pb-2 border-b border-gray-100 mb-2 flex flex-wrap justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</span>
                                                <span className="text-lg font-bold text-gray-800 block">{formatDateDisplay(slot.date)}</span>
                                            </div>

                                            <div>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${slot.status === 'Booked' || slot.status === 'Active' ? 'bg-red-100 text-red-500' : slot.status === 'Completed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                                                    {slot.status === 'Booked' ? 'Active' : slot.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 2. Time (Left) */}
                                        <div className="col-span-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Time</span>
                                            <span className="text-xl font-bold text-gray-800 block">{slot.time}</span>
                                        </div>

                                        {/* 3. Booked By (Right) */}
                                        <div className="col-span-1 text-right">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Booked By</span>
                                            <div className="flex items-center justify-end gap-2">
                                                {slot.bookedBy && slot.bookedBy.includes('(Admin)') ? (
                                                    <div className="flex items-center gap-1 text-blue-600" title="Assigned by Admin">
                                                        <span className="text-sm font-bold block truncate">
                                                            {slot.bookedBy.replace(' (Admin)', '')}
                                                        </span>
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-700 block truncate" title={slot.bookedBy || ''}>
                                                        {slot.bookedBy || 'Available'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 4. Actions (Bottom - Centered) */}
                                        <div className="col-span-2 flex items-center justify-center gap-6 mt-2 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={slot.status === 'Available'}
                                                    onCheckedChange={() => handleToggleSlotStatus(slot.date, slot.time)}
                                                    disabled={(slot.status === 'Booked' || slot.status === 'Active' || slot.status === 'Completed') && slot.bookedBy !== `Admin Action - ${loggedInUser?.firstName}`}
                                                />
                                            </div>
                                            <div className="h-4 w-px bg-gray-300"></div>
                                            <div className="flex items-center gap-2">
                                                {slot.status === 'Available' && (
                                                    <button
                                                        onClick={() => setAssigningSlot(slot)}
                                                        className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50"
                                                        title="Assign to Member"
                                                    >
                                                        <UserPlus className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditSlotModal(slot)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50"
                                                    title="Edit Slot"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSlot(slot)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                                                    title="Delete Slot"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="space-y-6 p-6 md:p-8 rounded-[2rem] bg-white/50 border border-white/40">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200/50 pb-6">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Users className="w-6 h-6 text-[#CE8E94]" /> Member Management</h3>
                            <div className="relative w-full md:w-72">
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CE8E94]/20 shadow-sm"
                                />
                                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-12 text-xs font-bold uppercase text-gray-400 pb-2 px-4">
                                <div className="col-span-4 md:col-span-3">User info</div>
                                <div className="col-span-3 md:col-span-2 hidden sm:block">Status</div>
                                <div className="col-span-2 hidden md:block text-center">Stats</div>
                                <div className="col-span-5 md:col-span-5 text-right">Actions</div>
                            </div>

                            <div className="space-y-3">
                                {filteredUsers.map((user, idx) => {
                                    const stats = getMemberStats(user.email);
                                    const badges = getMemberBadges(user, stats);

                                    return (
                                        <div key={idx} className="grid grid-cols-12 items-center p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                                            {/* User Info */}
                                            <div className="col-span-4 md:col-span-3 flex items-center gap-3 overflow-hidden">
                                                <div className={`hidden lg:flex w-10 h-10 rounded-full items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${user.role === 'admin' ? 'from-purple-400 to-indigo-500' : 'from-[#CE8E94] to-pink-400'}`}>
                                                    {user.firstName[0]}{user.lastName[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-gray-800 truncate text-sm md:text-base">{user.firstName} {user.lastName}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            {/* Status / Badges */}
                                            <div className="col-span-3 md:col-span-2 hidden sm:flex flex-wrap gap-2">
                                                {user.role === 'admin' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">ADMIN</span>}
                                                {badges.map((b, i) => (
                                                    <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border border-transparent ${b.color}`}>{b.label}</span>
                                                ))}
                                                {user.role !== 'admin' && badges.length === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-50 text-gray-400">Member</span>}
                                            </div>

                                            {/* Stats */}
                                            <div className="col-span-2 hidden md:block text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold text-gray-700">{stats.total}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase">Bookings</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-8 sm:col-span-5 md:col-span-5 flex items-center justify-end gap-2">
                                                <Button
                                                    className="hidden sm:flex hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-full h-8 w-8 p-0 bg-transparent shadow-none"
                                                    onClick={() => handleSendWhatsApp(user.phone, user.firstName)}
                                                    title="WhatsApp"
                                                >
                                                    <MessageSquareText className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    className="hidden sm:flex hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full h-8 w-8 p-0 bg-transparent shadow-none"
                                                    onClick={() => handleSendEmail(user.email)}
                                                    title="Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    className="hidden sm:flex hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full h-8 w-8 p-0 bg-transparent shadow-none"
                                                    onClick={() => handleSendEmail(user.email)}
                                                    title="Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    className="hidden sm:flex hover:bg-purple-50 text-gray-400 hover:text-purple-600 rounded-full h-8 w-8 p-0 bg-transparent shadow-none"
                                                    onClick={() => setBookingForMember(user)}
                                                    title="Book Class"
                                                >
                                                    <CalendarPlus className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedMember(user);
                                                        setMemberNotes(user.adminNotes || '');
                                                    }}
                                                    className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 h-auto rounded-lg shadow-sm"
                                                >
                                                    Details
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteUser(user.email)}
                                                    className={`hover:bg-red-50 text-red-500 hover:text-red-600 h-8 w-8 p-0 rounded-full bg-transparent shadow-none ${user.role === 'admin' ? 'opacity-20 pointer-events-none' : ''}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}

                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        No members found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    )
}
                )}

{/* Book For Member Modal (Reverse Flow) */ }
{
    bookingForMember && (
        <Modal onClose={() => setBookingForMember(null)}>
            <div className="space-y-6">
                <div className="text-center border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Book for {bookingForMember.firstName}</h2>
                    <p className="text-xs text-gray-400">Select an available slot below</p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {slots.filter(s => s.status === 'Available').length === 0 && (
                        <div className="text-center py-8 text-gray-400">No available slots found.</div>
                    )}

                    {slots
                        .filter(s => s.status === 'Available')
                        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                        .map((slot, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-green-50/50 hover:bg-green-100/50 border border-green-100 rounded-xl transition-all group">
                                <div>
                                    <div className="font-bold text-gray-800">{formatDateDisplay(slot.date)}</div>
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-green-600" /> {slot.time}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleBookForMember(slot)}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-md rounded-lg h-auto py-2 px-4 text-xs font-bold"
                                >
                                    Book
                                </Button>
                            </div>
                        ))}
                </div>
            </div>
        </Modal>
    )
}

{/* Member Details CRM Modal */ }
{
    selectedMember && (
        <Modal onClose={() => setSelectedMember(null)}>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Header Profile */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl bg-gradient-to-br ${selectedMember.role === 'admin' ? 'from-purple-400 to-indigo-500' : 'from-[#CE8E94] to-pink-400'} shadow-lg`}>
                        {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{selectedMember.firstName} {selectedMember.lastName}</h2>
                        <p className="text-gray-500 flex items-center gap-2 text-sm"><Mail className="w-3 h-3" /> {selectedMember.email}</p>
                        {selectedMember.phone && <p className="text-gray-500 flex items-center gap-2 text-sm"><Phone className="w-3 h-3" /> {selectedMember.phone}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                        <div className="text-2xl font-bold text-blue-600">{getMemberStats(selectedMember?.email ?? '').total}</div>
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Total</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                        <div className="text-2xl font-bold text-green-600">{getMemberStats(selectedMember?.email ?? '').active}</div>
                        <div className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Active</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                        <div className="text-2xl font-bold text-gray-600">{getMemberStats(selectedMember?.email ?? '').completed}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Done</div>
                    </div>
                </div>

                {/* Admin Notes CRM */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#CE8E94]" /> Private Notes
                    </label>
                    <textarea
                        value={memberNotes}
                        onChange={(e) => setMemberNotes(e.target.value)}
                        placeholder="Add private notes about this member (injuries, preferences, payments)..."
                        className="w-full p-3 rounded-xl border border-gray-200 bg-yellow-50/50 focus:bg-white focus:ring-2 focus:ring-[#CE8E94]/20 focus:border-[#CE8E94] text-sm min-h-[100px] outline-none transition-all placeholder:text-gray-400"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleUpdateAdminNotes} className="bg-[#CE8E94] hover:bg-[#B57A80] text-white py-2 px-4 text-xs h-auto rounded-lg">
                            Save Note
                        </Button>
                    </div>
                </div>

                {/* Booking History */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-700 border-b pb-2">Recent Activity</h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {getMemberStats(selectedMember?.email ?? '').history.length > 0 ? (
                            getMemberStats(selectedMember?.email ?? '').history.map((slot, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span className="font-bold text-gray-700">{formatDateDisplay(slot.date)}</span>
                                        <span className="text-gray-500">{slot.time}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${slot.status === 'Completed' ? 'bg-gray-200 text-gray-600' :
                                        slot.status === 'Booked' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {slot.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic text-center py-4">No booking history available.</p>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <Button onClick={() => setSelectedMember(null)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl">
                        Close Profile
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

{/* Edit Slot Modal */ }
{
    editingSlot && (
        <Modal onClose={() => setEditingSlot(null)}>
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-[#CE8E94] mb-2">Edit Slot</h2>
                    <p className="text-gray-500">Update date and time for this slot.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Date</label>
                        <input
                            type="date"
                            value={editFormData.date}
                            onChange={e => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                            className={standardInputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Time</label>
                        <input
                            type="text"
                            value={editFormData.time}
                            onChange={e => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                            className={standardInputClass}
                            placeholder="e.g. 09:00 AM"
                        />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <Button
                        onClick={() => setEditingSlot(null)}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdateSlot}
                        className="flex-1 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-md"
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

{/* Assign Slot Modal */ }
{
    assigningSlot && (
        <Modal onClose={() => { setAssigningSlot(null); setSelectedUserEmailToAssign(''); }}>
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-[#CE8E94] mb-2">Assign Slot</h2>
                    <p className="text-gray-500">
                        Assign <strong>{formatDateDisplay(assigningSlot.date)}</strong> at <strong>{assigningSlot.time}</strong> to a member.
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Select Member</label>
                        <select
                            value={selectedUserEmailToAssign}
                            onChange={(e) => setSelectedUserEmailToAssign(e.target.value)}
                            className={standardInputClass}
                        >
                            <option value="">-- Choose a Member --</option>
                            {users.filter(u => u.role !== 'admin').map((user) => (
                                <option key={user.email} value={user.email}>
                                    {user.firstName} {user.lastName} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <Button
                        onClick={() => { setAssigningSlot(null); setSelectedUserEmailToAssign(''); }}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssignSlot}
                        disabled={!selectedUserEmailToAssign}
                        className="flex-1 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Assign Member
                    </Button>
                </div>
            </div>
        </Modal>
    )
}


{/* Custom Date Range Modal for Admin Slots Filtering */ }
{
    showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Select Date Range</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#CE8E94]/20 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#CE8E94]/20 outline-none"
                        />
                    </div>
                </div>
                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={() => {
                            setShowCustomDateModal(false);
                            setDateFilter('All');
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (customStartDate && customEndDate) {
                                setDateFilter('Custom');
                                setShowCustomDateModal(false);
                            }
                        }}
                        className="flex-1 bg-[#CE8E94] hover:bg-[#B57A80] text-white"
                    >
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    )
}
            </div >
        </div >
    );
};
