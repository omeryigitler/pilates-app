/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Calendar,
    Mail,
    Phone,
    Lock,
    Star,
    Award,
    Heart,
    Facebook,
    Instagram,
    Twitter,
    Upload,
    Edit3,
    X,
    Plus,
    Trash2,
    Clock,
    Users,
    LogOut,
    User,
    Zap,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertTriangle,
    Info,
    AlertCircle,
    Database,
    TrendingUp,
    Download,
} from "lucide-react";
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, query } from "firebase/firestore";

// --- TYPE DEFINITIONS ---
type Slot = {
    date: string; // YYYY-MM-DD format
    time: string;
    status: 'Available' | 'Booked';
    bookedBy: string | null;
}

type UserType = {
    email: string;
    password: string;
    role: 'admin' | 'user';
    firstName: string;
    lastName: string;
    phone: string;
    registered: string;
}

type NotificationType = 'success' | 'error' | 'info';

type NotificationState = {
    message: string;
    type: NotificationType;
    visible: boolean;
};

// --- HELPER FUNCTIONS ---

const getTodayDate = () => new Date().toISOString().substring(0, 10);

const sortSlots = (slots: Slot[]) => {
    if (!Array.isArray(slots)) return [];
    return [...slots].sort((a, b) => {
        if (!a.time || !b.time || !a.date || !b.date) return 0;
        const dateTimeA = `${a.date} ${a.time.replace('AM', 'a').replace('PM', 'p')}`;
        const dateTimeB = `${b.date} ${b.time.replace('AM', 'a').replace('PM', 'p')}`;
        return dateTimeA.localeCompare(dateTimeB);
    });
};

const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

const isPastDate = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date(getTodayDate()).getTime();
    const target = new Date(dateString).getTime();
    return !isNaN(target) && target < today;
}

// --- INITIAL DATA CONSTANTS ---
const defaultHero = '/default-hero.jpg';
const defaultLogo = '/icon.jpg';

const initialData = {
    heroTitle: 'Breathe. Move. Transform.',
    heroSubtitle: 'Your personal sanctuary for holistic wellness.',
    heroFont: 'font-extrabold',
    campaigns: [
        { title: 'Special Offers', description: 'Discounts for new members.', image: '' },
        { title: 'New Member Deal', description: 'Get 20% off your first 3 sessions pack.', image: '' }
    ],
    trustSignals: [
        { title: 'Certified Expert', sub: 'Professional guidance' },
        { title: 'Premium Studio', sub: 'Top-tier equipment' },
        { title: 'Holistic Care', sub: 'Mind & Body focus' }
    ],
    heroImage: defaultHero,
    logo: defaultLogo,
    socialLinks: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: 'https://twitter.com' },
    contactInfo: { email: 'info@pilatesmalta.com', phone: '+356 1234 5678' }
};

const today = getTodayDate();
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = tomorrow.toISOString().substring(0, 10);
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 6);
const futureDateString = futureDate.toISOString().substring(0, 10);

const initialSlots: Slot[] = [];

const initialUsers: UserType[] = [
    { email: 'omer@mail.com', password: '123456', role: 'admin', firstName: 'Omer', lastName: 'Yigitler', phone: '+356 555 1234', registered: '2025-11-20' },
    // Diğer test kullanıcısını kaldırdık, sadece Admin kalsın.
];

// -----------------------------------------------------
// --- BİLDİRİM SİSTEMİ (MODAL REPLACEMENT) ---
// -----------------------------------------------------

// Notification Modal için yeni Context yapısı
type NotificationModalState = NotificationState & {
    hideNotification: () => void;
};

const NotificationContext = createContext({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showNotification: (_message: string, _type: NotificationType) => { },
});

const useNotification = () => useContext(NotificationContext);

/**
 * Yeni Bildirim Modal'ı: Tüm bildirimleri (success/error/info) ConfimModal gibi ortada,
 * düz beyaz bir modal içinde gösterir. Otomatik kapanma yoktur, kullanıcı kapatmalıdır.
 */
const NotificationDisplayModal = ({ message, type, visible, hideNotification }: NotificationModalState) => {
    if (!visible) return null;

    let icon = null;
    let title = '';

    switch (type) {
        case 'success':
            icon = <CheckCircle className="w-10 h-10 text-green-500" />;
            title = 'Success!';
            break;
        case 'error':
            icon = <AlertTriangle className="w-10 h-10 text-red-500" />;
            title = 'Error!';
            break;
        case 'info':
        default:
            icon = <Info className="w-10 h-10 text-[#CE8E94]" />;
            title = 'Information';
            break;
    }

    // Modal'ın görünümünü ConfirmModal'a benzetiyoruz.
    return (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-300 space-y-6 text-center">

                {/* İkon Bölümü */}
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                        {icon}
                    </div>
                </div>

                {/* Başlık ve Mesaj */}
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-gray-600 leading-relaxed px-2">{message}</p>

                {/* Kapat Butonu */}
                <div className="flex justify-center pt-4">
                    <Button
                        onClick={hideNotification}
                        className="px-6 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-lg transform active:scale-95"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notification, setNotification] = useState<NotificationState>({ message: '', type: 'info', visible: false });

    const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
        setNotification({ message, type, visible: true });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <NotificationDisplayModal {...notification} hideNotification={hideNotification} />
        </NotificationContext.Provider>
    );
};

// -----------------------------------------------------
// --- ONAY SİSTEMİ (WINDOW.CONFIRM REPLACEMENT) ---
// -----------------------------------------------------

type ConfirmState = {
    visible: boolean;
    message: string;
    action: (() => void) | null;
    onCancel: (() => void) | null;
    title: string;
    confirmText: string;
    showCancel: boolean;
};

const ConfirmContext = createContext({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showConfirm: (_message: string, _action: () => void, _title: string = "Confirm Action", _onCancel?: () => void, _confirmText: string = "OK", _showCancel: boolean = true) => { }
});

const useConfirm = () => useContext(ConfirmContext);

const ConfirmModal = ({ state, hideConfirm }: { state: ConfirmState, hideConfirm: () => void }) => {
    if (!state.visible) return null;

    const handleConfirm = () => {
        if (state.action) state.action();
        hideConfirm();
    };

    const handleCancel = () => {
        if (state.onCancel) state.onCancel();
        hideConfirm();
    };

    return (
        // ConfirmModal yapısı (düz beyaz, AlertCircle ikonlu modal) korunmuştur.
        <div className="fixed inset-0 flex items-center justify-center z-[10001] p-4 bg-black/30 backdrop-blur-sm transition-all duration-300">
            {/* Modal Container: Yuvarlak köşeler ve gölge */}
            <div className="relative bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-300 space-y-6 text-center">

                {/* İkon Bölümü */}
                <div className="flex justify-center mb-4">
                    {/* Görseldeki pembe/kırmızı renkteki ünlem işareti */}
                    <div className="p-4 bg-[#CE8E94]/10 rounded-full">
                        <AlertCircle className="w-10 h-10 text-[#CE8E94]" />
                    </div>
                </div>

                {/* Başlık ve Mesaj */}
                <h2 className="text-2xl font-bold text-gray-800">{state.title}</h2>
                <p className="text-gray-600 leading-relaxed px-2">{state.message}</p>

                {/* Butonlar */}
                <div className="flex justify-center gap-4 pt-4">
                    {state.showCancel && (
                        <Button
                            onClick={handleCancel}
                            // Cancel butonu: Beyaz arka plan, yuvarlak köşeler ve ince kenarlık
                            className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-xl font-bold hover:bg-gray-100 transition shadow-sm"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirm}
                        // OK butonu: Temanızdaki renk, yuvarlak köşeler ve hafif gölge
                        className="px-6 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-lg transform active:scale-95"
                    >
                        {state.confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        visible: false,
        message: '',
        action: null,
        onCancel: null,
        title: '',
        confirmText: 'OK',
        showCancel: true
    });

    const showConfirm = useCallback((message: string, action: () => void, title: string = "Confirm Action", onCancel?: () => void, confirmText: string = "OK", showCancel: boolean = true) => {
        setConfirmState({
            visible: true,
            message,
            action,
            onCancel: onCancel || null,
            title,
            confirmText,
            showCancel
        });
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <ConfirmContext.Provider value={{ showConfirm }}>
            {children}
            <ConfirmModal state={confirmState} hideConfirm={hideConfirm} />
        </ConfirmContext.Provider>
    );
};


// ------------------------------------
// --- KOMPONENTLER ---
// ------------------------------------

import { createPortal } from "react-dom";

// ... (previous imports)



const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Modal açıldığında arka planın kaymasını engelle
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            {/* Arka plan overlay - tıklayınca kapanır */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 md:p-10 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto z-10">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>
                {children}
            </div>
        </div>,
        document.body
    );
}

const BookingCalendar = ({ slots, onSelectDate, selectedDate }: { slots: Slot[], onSelectDate: (date: string) => void, selectedDate: string }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));

    const datesWithSlots = useMemo(() => {
        return slots
            .filter(slot => slot.status === 'Available' && !isPastDate(slot.date))
            .map(slot => slot.date);
    }, [slots]);

    const { year, monthIndex, firstDayOfMonth, daysInMonth } = useMemo(() => {
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1;
        const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        return { year, monthIndex, firstDayOfMonth, daysInMonth };
    }, [currentMonth]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentMonth(prevMonth => {
            const [yearStr, monthStr] = prevMonth.split('-');
            let year = parseInt(yearStr);
            let month = parseInt(monthStr);

            if (direction === 'next') {
                month += 1;
                if (month > 12) {
                    month = 1;
                    year += 1;
                }
            } else {
                month -= 1;
                if (month < 1) {
                    month = 12;
                    year -= 1;
                }
            }

            // Yeni YYYY-MM string'ini oluştur ve döndür
            const newMonthStr = String(month).padStart(2, '0');
            return `${year}-${newMonthStr}`;
        });
    };

    const todayDate = getTodayDate();

    const renderDays = () => {
        const days = [];
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const offset = startDay;

        for (let i = 0; i < offset; i++) {
            days.push(<div key={`empty-${i}`} className="text-center p-3 opacity-0 cursor-default"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayDate;
            const hasSlots = datesWithSlots.includes(dateStr);
            const isSelected = dateStr === selectedDate;
            const isPast = isPastDate(dateStr);

            const baseClass = "p-1 md:p-3 rounded-full text-center font-bold transition-all duration-200 text-sm md:text-base flex items-center justify-center aspect-square";
            let colorClass = 'text-gray-700 hover:bg-gray-100 cursor-pointer';

            if (isPast) {
                colorClass = 'text-gray-400 cursor-not-allowed';
            } else if (isSelected) {
                colorClass = 'bg-[#CE8E94] text-white shadow-lg ring-2 md:ring-4 ring-[#CE8E94]/30 transform scale-105';
            } else if (hasSlots) {
                colorClass = 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer border-2 border-green-300';
            } else if (isToday) {
                colorClass = 'text-[#CE8E94] border-2 border-[#CE8E94]/50 hover:bg-gray-100 cursor-pointer';
            }

            const handleClick = () => {
                if (!isPast) {
                    onSelectDate(dateStr);
                }
            };

            days.push(
                <div
                    key={day}
                    className={`${baseClass} ${colorClass} relative`}
                    onClick={handleClick}
                >
                    {day}
                    {hasSlots && !isSelected && !isPast && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></span>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-white/50 space-y-2 md:space-y-4">
            <div className="flex justify-between items-center mb-2 md:mb-4">
                <Button onClick={() => handleMonthChange('prev')} className="p-2 md:p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-[#CE8E94] hover:text-white transition shadow-md hover:shadow-lg">
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <h3 className="text-lg md:text-xl font-bold text-[#CE8E94]">{monthNames[monthIndex]} {year}</h3>
                <Button onClick={() => handleMonthChange('next')} className="p-2 md:p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-[#CE8E94] hover:text-white transition shadow-md hover:shadow-lg">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {renderDays()}
            </div>
            <div className="pt-4 flex justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>Slot Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-[#CE8E94] rounded-full"></span>
                    <span>Today</span>
                </div>
            </div>
        </div>
    );
};

interface UserPanelProps {
    existingUsers: UserType[];
    addUser: (user: UserType) => void;
    onLogin: (user: UserType) => void;
}

const UserPanel = ({ existingUsers, addUser, onLogin }: UserPanelProps) => {
    const { showNotification } = useNotification();
    const [activeUserPanel, setActiveUserPanel] = useState<string | null>(null);
    const [userForm, setUserForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });

    // alert() yerine showNotification kullanıldı
    const handleRegister = (e: React.FormEvent) => {
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

        addUser(newUser);
        showNotification('Registration successful! Please log in.', 'success');
        setActiveUserPanel(null);
        setUserForm({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
    };

    // alert() yerine showNotification kullanıldı
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const enteredEmail = loginForm.email.trim();
        const enteredPassword = loginForm.password.trim();

        const found = existingUsers.find((u: UserType) =>
            u.email === enteredEmail &&
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

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ------------------------------------
// --- RAPORLAMA & ANALİZ BİLEŞENLERİ ---
// ------------------------------------

const UserHistory = ({ slots, userName }: { slots: Slot[], userName: string }) => {
    // Geçmiş dersleri bul ve sırala (En yeniden eskiye)
    const pastBookings = slots
        .filter(slot => slot.bookedBy === userName && isPastDate(slot.date))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const totalSessions = pastBookings.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#CE8E94]/20 text-center">
                    <h3 className="text-4xl font-bold text-[#CE8E94]">{totalSessions}</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">Total Sessions Completed</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-[#CE8E94]/20 text-center flex flex-col items-center justify-center">
                    <Award className="w-10 h-10 text-[#CE8E94] mb-2" />
                    <p className="text-gray-500 text-sm font-medium">Keep it up!</p>
                </div>
            </div>

            {/* Geçmiş Ders Listesi */}
            <div className="bg-white rounded-3xl shadow-lg border border-white/50 p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" /> Session History
                </h3>

                {pastBookings.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {pastBookings.map((slot, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 opacity-75 hover:opacity-100 transition">
                                <div>
                                    <span className="font-bold text-gray-700 block">{formatDateDisplay(slot.date)}</span>
                                    <span className="text-sm text-gray-500">{slot.time}</span>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    Completed
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-10">No past sessions found.</p>
                )}
            </div>
        </div>
    );
};

const AdminAnalytics = ({ slots, users, currentLogo }: { slots: Slot[], users: UserType[], currentLogo: string }) => {
    // 1. Genel İstatistikler
    const totalBookings = slots.filter(s => s.status === 'Booked').length;
    const totalSlots = slots.length;
    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;
    const totalUsers = users.length;

    // 2. Aylık Dağılım
    const monthlyStats = slots.reduce((acc, slot) => {
        if (slot.status === 'Booked') {
            const monthKey = slot.date.substring(0, 7); // YYYY-MM
            acc[monthKey] = (acc[monthKey] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Sıralı aylar
    const sortedMonths = Object.keys(monthlyStats).sort().reverse();

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const brandColor = [206, 142, 148] as [number, number, number]; // #CE8E94

        // Helper to load image
        const loadImage = (url: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(e);
            });
        };

        try {
            // 1. Logo Ekle (Sol Üst)
            const logo = await loadImage(currentLogo);
            const logoX = 14;
            const logoY = 10;
            const logoSize = 24;

            doc.addImage(logo, 'JPEG', logoX, logoY, logoSize, logoSize);
        } catch (e) {
            console.error("Logo yüklenemedi:", e);
        }

        // 2. Başlık ve Kurumsal Bilgi (Header)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(...brandColor);
        doc.text("Reformer Pilates Malta", 42, 22);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Monthly Performance & Analytics Report", 42, 29);

        // Sağ Üst Tarih
        doc.setFontSize(10);
        doc.setTextColor(150);
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(dateStr, pageWidth - 14, 22, { align: 'right' });

        // Ayırıcı Çizgi
        doc.setDrawColor(...brandColor);
        doc.setLineWidth(0.5);
        doc.line(14, 38, pageWidth - 14, 38);

        // 3. Genel İstatistikler (Overview Section)
        doc.setFontSize(16);
        doc.setTextColor(60);
        doc.text("Executive Summary", 14, 50);

        // İstatistik Kutuları (Basit çizim)
        const statY = 58;
        const boxWidth = (pageWidth - 28 - 10) / 3; // 3 kutu, aralarında 5mm boşluk

        // Kutu 1: Bookings
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(14, statY, boxWidth, 25, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("Total Bookings", 14 + 5, statY + 8);
        doc.setFontSize(16);
        doc.setTextColor(...brandColor);
        doc.setFont("helvetica", "bold");
        doc.text(totalBookings.toString(), 14 + 5, statY + 18);

        // Kutu 2: Members
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14 + boxWidth + 5, statY, boxWidth, 25, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.setFont("helvetica", "normal");
        doc.text("Total Members", 14 + boxWidth + 10, statY + 8);
        doc.setFontSize(16);
        doc.setTextColor(...brandColor);
        doc.setFont("helvetica", "bold");
        doc.text(totalUsers.toString(), 14 + boxWidth + 10, statY + 18);

        // Kutu 3: Occupancy
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14 + (boxWidth + 5) * 2, statY, boxWidth, 25, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.setFont("helvetica", "normal");
        doc.text("Occupancy Rate", 14 + (boxWidth + 5) * 2 + 5, statY + 8);
        doc.setFontSize(16);
        doc.setTextColor(...brandColor);
        doc.setFont("helvetica", "bold");
        doc.text(`%${occupancyRate}`, 14 + (boxWidth + 5) * 2 + 5, statY + 18);

        // 4. Tablo Verisi Hazırlama
        const tableData = sortedMonths.map(month => [
            new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            `${monthlyStats[month]} sessions`,
            'Active',
            // Basit bir bar grafik temsili (text olarak)
            '|'.repeat(Math.min(monthlyStats[month], 20))
        ]);

        // 5. Tabloyu Çiz
        autoTable(doc, {
            startY: 95,
            head: [['Month', 'Total Sessions', 'Status', 'Activity Level']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: brandColor,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: 80 },
                3: { textColor: brandColor, fontStyle: 'bold' } // Activity Level rengi
            },
            styles: {
                fontSize: 10,
                cellPadding: 6,
                lineColor: [240, 240, 240],
                lineWidth: 0.1
            },
            alternateRowStyles: {
                fillColor: [255, 250, 250] // Çok hafif pembe/beyaz
            },
            margin: { top: 90 }
        });

        // 6. Footer (Alt Bilgi)
        const footerY = pageHeight - 15;

        // Footer Çizgisi
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);

        // Site Linki
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.setFont("helvetica", "normal");
        doc.text("www.reformerpilatesmalta.com", pageWidth / 2, footerY, { align: 'center' });

        // Telif Hakkı / Ek Bilgi
        doc.setFontSize(8);
        doc.setTextColor(180);
        doc.text("Confidential Report • Generated by ReformerPilatesMalta", pageWidth / 2, footerY + 5, { align: 'center' });

        // Kaydet
        doc.save(`pilates-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Download Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800">Performance Overview</h3>
                <Button
                    onClick={handleDownloadPDF}
                    className="bg-[#CE8E94] hover:bg-[#B57A80] text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg transition transform active:scale-95"
                >
                    <Download className="w-5 h-5" /> Download Report
                </Button>
            </div>

            {/* Üst Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Total Bookings</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalBookings}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Total Members</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalUsers}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Users className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Occupancy Rate</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-1">%{occupancyRate}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Aylık Tablo */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800">Monthly Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                            <tr>
                                <th className="p-4 pl-6">Month</th>
                                <th className="p-4">Total Sessions</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedMonths.map(month => (
                                <tr key={month} className="hover:bg-gray-50 transition">
                                    <td className="p-4 pl-6 font-bold text-gray-700">
                                        {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-gray-600 font-medium">{monthlyStats[month]} sessions</td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                                    </td>
                                </tr>
                            ))}
                            {sortedMonths.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400">No data available yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------
// --- ANA SAYFA BİLEŞENLERİ ---
// ------------------------------------

const UserDashboard = ({
    loggedInUser,
    slots,
    handleBookSlot,
    handleCancelBooking,
    onLogout
}: {
    loggedInUser: UserType,
    slots: Slot[],
    handleBookSlot: (date: string, time: string) => void,
    handleCancelBooking: (date: string, time: string) => void,
    onLogout: () => void
}) => {
    const userName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
    const { showConfirm } = useConfirm();
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

    const futureSlots = slots.filter(slot => !isPastDate(slot.date));

    const userBookings = futureSlots
        .filter(slot => slot.bookedBy === userName)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const availableSlotsForSelectedDate = futureSlots
        .filter(slot => slot.date === selectedDate && slot.status === 'Available')
        .sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div className="pilates-root min-h-screen flex flex-col items-center p-4 md:p-10 space-y-10 font-sans bg-[#FFF0E5]">
            <div className="w-full max-w-6xl px-8 md:px-16 py-10 bg-white/60 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/50 space-y-12">
                <div className="flex justify-between items-center border-b border-[#CE8E94]/20 pb-6">
                    <h1 className="text-4xl font-bold text-[#CE8E94] flex items-center gap-3"><User className="w-8 h-8" /> Hi, {loggedInUser.firstName}</h1>
                    <div className="flex gap-3">
                        <Button
                            onClick={onLogout}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-500 transition duration-300 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </Button>
                    </div>
                </div>

                {/* Tab Toggle */}
                <div className="flex justify-center">
                    <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200 inline-flex">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-[#CE8E94] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[#CE8E94] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {activeTab === 'upcoming' ? (
                    <>
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><Calendar className="w-6 h-6 text-[#CE8E94]" /> Your Active Bookings ({userBookings.length})</h2>
                            {userBookings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userBookings.map((slot, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white rounded-2xl shadow-md transition border border-[#CE8E94]/20">
                                            <div className="space-y-1">
                                                <span className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5 text-[#CE8E94]" /> {slot.time}</span>
                                                <span className="text-sm text-gray-500 block ml-7">{formatDateDisplay(slot.date)}</span>
                                            </div>
                                            <Button
                                                onClick={() => showConfirm('Please contact your instructor to cancel this booking.', () => { }, 'Contact Instructor', undefined, 'OK', false)}
                                                className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg"
                                                title="Contact Instructor"
                                            >
                                                Contact
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-gray-600">You currently have no active bookings. Time to book a session!</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                                <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><Zap className="w-6 h-6 text-[#CE8E94]" /> Book a Class</h2>
                                <BookingCalendar
                                    slots={futureSlots}
                                    onSelectDate={setSelectedDate}
                                    selectedDate={selectedDate}
                                />
                            </div>

                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-xl font-bold text-gray-700 border-b pb-2">{formatDateDisplay(selectedDate)}</h3>
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {availableSlotsForSelectedDate.length > 0 ? (
                                        availableSlotsForSelectedDate.map((slot, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-5 bg-white/60 rounded-2xl hover:bg-white hover:shadow-md transition border border-white/40 hover:border-[#CE8E94]/30 gap-4">
                                                <span className="text-xl font-medium text-gray-800 flex items-center gap-3"><Clock className="w-5 h-5 text-green-600" /> {slot.time}</span>
                                                <Button
                                                    onClick={() => handleBookSlot(slot.date, slot.time)}
                                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-colors"
                                                >
                                                    Book
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="p-4 bg-red-50 border border-red-200 rounded-xl text-gray-600">No available slots on this date. Please choose another day from the calendar.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <UserHistory slots={slots} userName={userName} />
                )}
            </div>
        </div>
    );
}


// --- HELPER COMPONENT ---

const FileUploadInput = ({ label, onChange, previewUrl }: { label: string, onChange: (file: File) => void, previewUrl: string }) => {
    const inputId = `file-input-${label.replace(/\s/g, '-')}`;
    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-600 mb-2">{label}</label>
            <div className="flex items-center space-x-4">
                <label
                    htmlFor={inputId}
                    className="flex-shrink-0 cursor-pointer bg-[#CE8E94] hover:bg-[#B57A80] text-white py-3 px-6 rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
                >
                    <Upload className="w-5 h-5 mr-1" />
                    Choose File
                </label>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            onChange(e.target.files[0]);
                        }
                    }}
                    className="hidden"
                />
                {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-4 border-[#CE8E94]/30 shadow-md" />
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT WRAPPER ---
// Bildirim sisteminin tüm uygulamayı sarmalaması için NotificationProvider ve ConfirmProvider birlikte kullanılır.
export default function PilatesMaltaApp() {
    return (
        <NotificationProvider>
            <ConfirmProvider>
                <PilatesMaltaByGozde />
            </ConfirmProvider>
        </NotificationProvider>
    )
}

// --- MAIN COMPONENT ---

function PilatesMaltaByGozde() {
    const { showNotification } = useNotification();
    const { showConfirm } = useConfirm();
    const [currentView, setCurrentView] = useState<'main' | 'admin' | 'user-dashboard'>('main');
    const [activeTab, setActiveTab] = useState<'bookings' | 'members' | 'management' | 'analytics'>('bookings');
    const [isClient, setIsClient] = useState(false);

    const [newSlotTime, setNewSlotTime] = useState('');

    const [newSlotDate, setNewSlotDate] = useState(getTodayDate());

    const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
    const [editFormData, setEditFormData] = useState({ date: '', time: '' });

    const [loggedInUser, setLoggedInUser] = useState<UserType | null>(null);

    const [managementState, setManagementState] = useState(initialData);
    const [users, setUsers] = useState<UserType[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- LOAD DATA FROM FIRESTORE ON STARTUP ---
    useEffect(() => {
        setIsClient(true);

        // Subscribe to Slots
        const slotsUnsub = onSnapshot(collection(db, "slots"), (snapshot) => {
            const loadedSlots: Slot[] = [];
            snapshot.forEach((doc) => {
                loadedSlots.push(doc.data() as Slot);
            });
            setSlots(sortSlots(loadedSlots));
            setIsLoading(false); // Slotlar gelince yüklemeyi bitir
        }, (error) => {
            console.error("Slots subscription error:", error);
            showNotification("Error loading slots", "error");
            setIsLoading(false);
        });

        // Subscribe to Users
        const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const loadedUsers: UserType[] = [];
            let adminFound = false;

            snapshot.forEach((doc) => {
                const userData = doc.data() as UserType;
                loadedUsers.push(userData);

                if (userData.email === 'omer@mail.com') {
                    adminFound = true;
                    // Admin şifresi 123456 değilse düzelt
                    if (userData.password !== '123456') {
                        updateDoc(doc.ref, { password: '123456' });
                    }
                }
            });

            // Admin yoksa oluştur (Kurtarıcı Kod)
            if (!adminFound) {
                const adminUser = initialUsers.find(u => u.email === 'omer@mail.com');
                if (adminUser) {
                    setDoc(doc(db, "users", 'omer@mail.com'), adminUser);
                    loadedUsers.push(adminUser); // UI'da hemen görünsün diye
                }
            }

            setUsers(loadedUsers);
        }, (error) => {
            console.error("Users subscription error:", error);
            showNotification("Error loading users", "error");
        });

        // Subscribe to Management
        const mgmtUnsub = onSnapshot(doc(db, "management", "settings"), (docSnap) => {
            if (docSnap.exists()) {
                setManagementState(docSnap.data() as typeof initialData);
            }
            // Ayarlar yoksa varsayılan state zaten initialData, veritabanına yazmaya gerek yok.
        }, (error) => {
            console.error("Management subscription error:", error);
            showNotification("Error loading management settings", "error");
        });

        // Session Persistence
        const savedEmail = localStorage.getItem('pilates_user_email');
        if (savedEmail) {
            // Kullanıcı eşleşmesi alttaki useEffect'te yapılacak
        }

        return () => {
            slotsUnsub();
            usersUnsub();
            mgmtUnsub();
        };
    }, []);

    // Effect to restore session when users are loaded
    useEffect(() => {
        const savedEmail = localStorage.getItem('pilates_user_email');
        if (savedEmail && users.length > 0 && !loggedInUser) {
            const found = users.find(u => u.email === savedEmail);
            if (found) {
                setLoggedInUser(found);
                if (found.role === 'admin') setCurrentView('admin');
                else setCurrentView('user-dashboard');
            }
        }
    }, [users, loggedInUser]);


    // --- EARLY RETURN FOR CLIENT SIDE RENDERING & LOADING ---
    // Sayfa yüklenirken veya veriler çekilirken Loading ekranını göster
    if (!isClient || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF0E5]">
                <div className="relative w-32 h-32 animate-pulse rounded-full overflow-hidden shadow-xl border-2 border-white">
                    <img
                        src="/icon.jpg"
                        alt="Loading..."
                        className="w-full h-full object-cover"
                    />
                </div>
                <p className="mt-4 text-[#CE8E94] font-bold text-lg tracking-widest animate-pulse">LOADING</p>
            </div>
        );
    }


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

    const handleSetLoggedInUser = (user: UserType) => {
        setLoggedInUser(user);
        localStorage.setItem('pilates_user_email', user.email);
        if (user.role === 'user') {
            setCurrentView('user-dashboard');
        } else if (user.role === 'admin') {
            setCurrentView('admin');
        }
    }

    const handleLogout = () => {
        setLoggedInUser(null);
        localStorage.removeItem('pilates_user_email');
        setCurrentView('main');
        showNotification('Successfully logged out.', 'info');
    }

    const addUser = async (user: UserType) => {
        const newUserWithDate = { ...user, registered: new Date().toISOString().substring(0, 10) };
        try {
            await setDoc(doc(db, "users", user.email), newUserWithDate);
        } catch (e) {
            console.error(e);
            showNotification('Error adding user', 'error');
        }
    };

    // window.confirm() yerine showConfirm kullanıldı
    const handleDeleteUser = (email: string) => {
        const userToDelete = users.find(u => u.email === email);
        if (!userToDelete) return;

        showConfirm(
            `Are you sure you want to delete the user: ${userToDelete.firstName} ${userToDelete.lastName} (${email})?`,
            async () => { // On Confirm Action
                try {
                    await deleteDoc(doc(db, "users", email));
                    showNotification(`User ${email} deleted.`, 'success');
                } catch (e) {
                    showNotification('Error deleting user', 'error');
                }
            },
            `Confirm User Deletion`
        );
    }

    const handleBookSlot = async (slotDate: string, slotTime: string) => {
        if (!loggedInUser) return showNotification('Please login first!', 'error');

        const userName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;

        const isAlreadyBooked = slots.some(slot =>
            slot.date === slotDate &&
            slot.bookedBy === userName
        );

        if (isAlreadyBooked) {
            showNotification('You already have a booking on this date. You can only book one session per day.', 'error');
            return;
        }

        try {
            await updateDoc(doc(db, "slots", `${slotDate}_${slotTime}`), {
                status: 'Booked',
                bookedBy: userName
            });
            showNotification(`Booking confirmed for ${slotTime} on ${formatDateDisplay(slotDate)}!`, 'success');
        } catch (e) {
            showNotification('Error booking slot', 'error');
        }
    };

    // window.confirm() yerine showConfirm kullanıldı
    const handleCancelBooking = (slotDate: string, slotTime: string) => {
        if (!loggedInUser) return;

        const userName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;
        const bookingDateDisplay = formatDateDisplay(slotDate);

        showConfirm(
            `Are you sure you want to cancel your booking for ${slotTime} on ${bookingDateDisplay}?`,
            async () => { // On Confirm Action (Kullanıcı OK dediğinde)
                try {
                    await updateDoc(doc(db, "slots", `${slotDate}_${slotTime}`), {
                        status: 'Available',
                        bookedBy: null
                    });
                    showNotification('Booking cancelled successfully.', 'success');
                } catch (e) {
                    showNotification('Error cancelling booking', 'error');
                }
            },
            `Confirm Cancellation`
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
        document.body.appendChild(downloadAnchorNode); // required for firefox
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

        // Check for collision, excluding the slot being edited (if time/date didn't change, it's fine)
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
            // If date or time changed, we need to delete old doc and create new one
            if (editingSlot.date !== editFormData.date || editingSlot.time !== editFormData.time.trim()) {
                await deleteDoc(doc(db, "slots", `${editingSlot.date}_${editingSlot.time}`));
                const newSlot: Slot = { ...editingSlot, date: editFormData.date, time: editFormData.time.trim() };
                await setDoc(doc(db, "slots", `${newSlot.date}_${newSlot.time}`), newSlot);
            } else {
                // If only other properties (like status/bookedBy) were editable, we'd update here.
                // But since only date/time are editable in this context, if they didn't change, no action needed.
                // For robustness, we could update the existing doc with current editingSlot data if it changed.
                // For now, assuming only date/time changes trigger a Firestore write.
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



    const standardInputClass = "w-full p-4 border border-gray-100 rounded-2xl bg-gray-50 focus:outline-none focus:border-[#CE8E94] focus:bg-white transition placeholder-gray-400 text-gray-700 shadow-sm";

    // --- RENDERING ---

    if (currentView === 'user-dashboard' && loggedInUser?.role === 'user') {
        return (
            <UserDashboard
                loggedInUser={loggedInUser}
                slots={slots}
                handleBookSlot={handleBookSlot}
                handleCancelBooking={handleCancelBooking}
                onLogout={handleLogout}
            />
        );
    }

    if (currentView === 'admin' && loggedInUser?.role === 'admin') {
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
                        <button onClick={() => setActiveTab('bookings')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${activeTab === 'bookings' ? 'bg-white border-[#CE8E94] shadow-lg scale-105' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-md'}`}>
                            <div className={`p-3 rounded-full mb-2 ${activeTab === 'bookings' ? 'bg-[#CE8E94] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <Calendar className="w-6 h-6" />
                            </div>
                            <span className={`font-bold ${activeTab === 'bookings' ? 'text-[#CE8E94]' : 'text-gray-500'}`}>Bookings</span>
                        </button>
                        <button onClick={() => setActiveTab('members')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${activeTab === 'members' ? 'bg-white border-[#CE8E94] shadow-lg scale-105' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-md'}`}>
                            <div className={`p-3 rounded-full mb-2 ${activeTab === 'members' ? 'bg-[#CE8E94] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <span className={`font-bold ${activeTab === 'members' ? 'text-[#CE8E94]' : 'text-gray-500'}`}>Members</span>
                        </button>
                        <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${activeTab === 'analytics' ? 'bg-white border-[#CE8E94] shadow-lg scale-105' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-md'}`}>
                            <div className={`p-3 rounded-full mb-2 ${activeTab === 'analytics' ? 'bg-[#CE8E94] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className={`font-bold ${activeTab === 'analytics' ? 'text-[#CE8E94]' : 'text-gray-500'}`}>Analytics</span>
                        </button>
                        <button onClick={() => setActiveTab('management')} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${activeTab === 'management' ? 'bg-white border-[#CE8E94] shadow-lg scale-105' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-md'}`}>
                            <div className={`p-3 rounded-full mb-2 ${activeTab === 'management' ? 'bg-[#CE8E94] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <Edit3 className="w-6 h-6" />
                            </div>
                            <span className={`font-bold ${activeTab === 'management' ? 'text-[#CE8E94]' : 'text-gray-500'}`}>Management</span>
                        </button>
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

                            <div className="space-y-4">
                                <h4 className="text-xl font-bold text-gray-700">Current Slots ({slots.length})</h4>

                                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_3fr_1.5fr] text-sm font-medium text-gray-600 pb-2 border-b border-gray-200 gap-4">
                                    <div className="col-span-1">Date</div>
                                    <div className="col-span-1">Time</div>
                                    <div className="col-span-1 text-center">Status</div>
                                    <div className="col-span-1">Booked By</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                </div>

                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                    {slots.map((slot, idx) => (
                                        <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[1.5fr_0.8fr_1fr_3fr_1.5fr] items-center p-5 bg-white/60 rounded-2xl hover:bg-gray-50 shadow-sm transition border border-white/40 hover:border-[#CE8E94]/30 gap-3 sm:gap-4">

                                            <div className="col-span-1 w-full sm:w-auto">
                                                <span className="text-sm font-semibold text-gray-800 block sm:hidden">Date:</span>
                                                <span className="text-base text-gray-800 block">{formatDateDisplay(slot.date)}</span>
                                            </div>

                                            <div className="col-span-1 w-full sm:w-auto">
                                                <span className="text-sm font-semibold text-gray-800 block sm:hidden">Time:</span>
                                                <span className="text-base font-bold text-gray-800 block">{slot.time}</span>
                                            </div>

                                            <div className="col-span-1 w-full sm:w-auto flex justify-center">
                                                <span className="text-sm font-semibold text-gray-800 block sm:hidden mr-2">Status:</span>
                                                <span className={`text-sm font-bold px-3 py-1 rounded-full min-w-24 text-center ${slot.status === 'Booked' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                                                    {slot.status}
                                                </span>
                                            </div>

                                            <div className="col-span-1 w-full sm:w-auto">
                                                <span className="text-sm font-semibold text-gray-800 block sm:hidden">Booked By:</span>
                                                <span className="text-sm text-gray-600 block truncate" title={slot.bookedBy || ''}>{slot.bookedBy || 'N/A'}</span>
                                            </div>

                                            <div className="col-span-1 w-full sm:w-auto flex items-center justify-end gap-4 mt-2 sm:mt-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${slot.status === 'Booked' ? 'text-gray-400' : 'text-green-600'}`}>
                                                        {slot.status === 'Booked' ? 'Blocked' : 'Active'}
                                                    </span>
                                                    <Switch
                                                        checked={slot.status === 'Available'}
                                                        onCheckedChange={() => handleToggleSlotStatus(slot.date, slot.time)}
                                                        disabled={slot.status === 'Booked' && slot.bookedBy !== `Admin Action - ${loggedInUser?.firstName}`}
                                                    />
                                                </div>

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
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="space-y-10 p-6 md:p-8 rounded-[2rem] bg-white/50 border border-white/40">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 border-b pb-2"><Users className="w-6 h-6 text-[#CE8E94]" /> Member Management</h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-6 text-sm font-bold uppercase text-gray-500 pb-2 border-b border-gray-200">
                                    <div className="col-span-2">Name / Email</div>
                                    <div className="col-span-1 hidden sm:block">Phone</div>
                                    <div className="col-span-1 hidden sm:block">Role</div>
                                    <div className="col-span-1 hidden md:block">Registered</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                </div>

                                {users.map((user, idx) => (
                                    <div key={idx} className="grid grid-cols-6 items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">

                                        <div className="col-span-2 space-y-1">
                                            <span className="font-bold text-gray-800">{user.firstName} {user.lastName}</span>
                                            <span className="text-sm text-gray-500 block truncate">{user.email}</span>
                                        </div>

                                        <div className="col-span-1 hidden sm:block text-sm text-gray-600">{user.phone || '-'}</div>

                                        <div className="col-span-1 hidden sm:block">
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="col-span-1 hidden md:block text-sm text-gray-500">{user.registered}</div>

                                        <div className="col-span-1 text-right">
                                            <Button
                                                onClick={() => handleDeleteUser(user.email)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-sm"
                                                disabled={user.role === 'admin'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>


                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                                Note: Admin users cannot be deleted from this panel.
                            </div>
                        </div>
                    )}

                    {/* Edit Slot Modal */}
                    {editingSlot && (
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
                    )}

                </div>
            </div>
        );
    }

    // --- MAIN LANDING PAGE ---
    return (
        <div className="pilates-root min-h-screen flex flex-col items-center p-4 md:p-10 space-y-16 font-sans bg-[#FFF0E5]">

            <div className="w-full max-w-7xl px-8 md:px-16 py-16 md:py-20 bg-white/60 backdrop-blur-md rounded-[3rem] shadow-2xl border border-white/50">

                {/* HEADER SECTION (Logo + Login/Register) - Moved to top for mobile */}
                <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-10 border-b border-[#CE8E94]/20 pb-6 gap-6 sm:gap-0">
                    <div className="border-2 border-white rounded-full shadow-lg inline-block hover:rotate-3 transition duration-500 overflow-hidden">
                        <img src={managementState.logo} alt="Logo" className="w-20 h-20 rounded-full object-cover" />
                    </div>

                    <div>
                        {loggedInUser ? (
                            <div className="flex gap-3 items-center">
                                <span className="font-bold text-[#CE8E94] text-lg hidden sm:inline">Hi, {loggedInUser.firstName}</span>
                                <Button
                                    onClick={() => loggedInUser.role === 'user' ? setCurrentView('user-dashboard') : setCurrentView('admin')}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-green-700 hover:shadow-lg transition duration-300 flex items-center gap-2"
                                >
                                    {loggedInUser.role === 'user' ? <User className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    {loggedInUser.role === 'user' ? 'My Dashboard' : 'Admin Panel'}
                                </Button>
                                <Button
                                    onClick={handleLogout}
                                    className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-500 transition duration-300"
                                >
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        ) : (
                            <UserPanel existingUsers={users} addUser={addUser} onLogin={handleSetLoggedInUser} />
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">

                    <div className="w-full lg:w-1/2 flex justify-center">
                        <div className="relative group w-full max-w-md lg:max-w-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#CE8E94] to-pink-200 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            {managementState.heroImage && (
                                <img
                                    src={managementState.heroImage || defaultHero}
                                    alt="Hero"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = defaultHero;
                                    }}
                                    className="relative w-full h-auto max-h-[600px] object-contain rounded-[2rem] shadow-2xl transform transition duration-500 hover:scale-[1.01]"
                                />
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start h-full justify-center py-4 text-center lg:text-left">

                        <div className="space-y-8 w-full">
                            <div>
                                <h1 className={`text-6xl lg:text-8xl ${managementState.heroFont} text-[#CE8E94] mb-4 leading-none tracking-tight drop-shadow-sm`}>
                                    {managementState.heroTitle}
                                </h1>
                                <p className={`text-xl text-gray-600 ${managementState.heroFont} leading-relaxed font-light max-w-md mx-auto lg:mx-0`}>
                                    {managementState.heroSubtitle}
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-6">
                                {managementState.trustSignals.map((signal, idx) => (
                                    <div key={idx} className="flex items-start gap-3 group cursor-default text-left">
                                        <div className="bg-[#CE8E94]/20 p-3 rounded-full text-[#CE8E94] shadow-sm group-hover:bg-[#CE8E94] group-hover:text-white transition-colors duration-300">
                                            {idx === 0 && <Award className="w-6 h-6" />}
                                            {idx === 1 && <Star className="w-6 h-6" />}
                                            {idx === 2 && <Heart className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#CE8E94] text-lg leading-tight">{signal.title}</h4>
                                            <p className="text-sm text-gray-600">{signal.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>

                <div className="mt-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {managementState.campaigns.map((camp, idx) => (
                            <Card key={idx} className="rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 bg-white border border-gray-100 overflow-hidden group h-full">
                                <CardContent className="p-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <h2 className="text-3xl font-bold text-[#CE8E94] group-hover:text-[#B57A80] transition-colors">{camp.title}</h2>
                                            <div className="bg-[#FFF0E5] p-3 rounded-full text-[#CE8E94] group-hover:bg-[#CE8E94] group-hover:text-white transition-colors">
                                                <Calendar className="w-8 h-8" />
                                            </div>
                                        </div>
                                        {camp.image && <img src={camp.image} alt={camp.title} className="w-full h-56 object-cover rounded-2xl mb-6 shadow-md" />}
                                        <p className="text-gray-600 text-xl leading-relaxed">{camp.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-7xl mt-12 mb-6 px-10 py-12 bg-white/60 backdrop-blur-md rounded-[3rem] shadow-xl border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-10 md:gap-0">
                <div className="text-center md:text-left w-full md:w-auto">
                    <h2 className="text-2xl font-bold mb-6 text-[#CE8E94] tracking-tight">Follow Us</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                        {managementState.socialLinks.facebook && (
                            <a href={managementState.socialLinks.facebook} className="flex items-center space-x-3 text-gray-600 font-medium hover:text-[#CE8E94] transition group bg-white/50 px-4 py-3 rounded-full shadow-sm hover:shadow-md">
                                <Facebook className="w-5 h-5 text-[#CE8E94]" />
                                <span className="hidden sm:inline">Facebook</span>
                            </a>
                        )}
                        {managementState.socialLinks.instagram && (
                            <a href={managementState.socialLinks.instagram} className="flex items-center space-x-3 text-gray-600 font-medium hover:text-[#CE8E94] transition group bg-white/50 px-4 py-3 rounded-full shadow-sm hover:shadow-md">
                                <Instagram className="w-5 h-5 text-[#CE8E94]" />
                                <span className="hidden sm:inline">Instagram</span>
                            </a>
                        )}
                        {managementState.socialLinks.x && (
                            <a href={managementState.socialLinks.x} className="flex items-center space-x-3 text-gray-600 font-medium hover:text-[#CE8E94] transition group bg-white/50 px-4 py-3 rounded-full shadow-sm hover:shadow-md">
                                <Twitter className="w-5 h-5 text-[#CE8E94]" />
                                <span className="hidden sm:inline">X</span>
                            </a>
                        )}
                    </div>
                </div>

                <div className="text-center md:text-right flex flex-col items-center md:items-end w-full md:w-auto">
                    <h2 className="text-2xl font-bold mb-6 text-[#CE8E94] tracking-tight">Contact</h2>
                    <div className="space-y-3">
                        <a href={`mailto:${managementState.contactInfo.email}`} className="flex items-center justify-center md:justify-end text-gray-600 text-lg group hover:text-[#CE8E94] transition cursor-pointer">
                            <Mail className="w-5 h-5 mr-3 text-[#CE8E94]" />{managementState.contactInfo.email}
                        </a>
                        <a href={`tel:${managementState.contactInfo.phone}`} className="flex items-center justify-center md:justify-end text-gray-600 text-lg group hover:text-[#CE8E94] transition cursor-pointer">
                            <Phone className="w-5 h-5 mr-3 text-[#CE8E94]" />{managementState.contactInfo.phone}
                        </a>
                    </div>

                </div>
            </div>

            {/* Developer Credit */}
            <div className="w-full text-center pb-8 text-gray-400 text-sm font-medium">
                <p>
                    Designed & Developed by <span className="text-[#CE8E94]">Omer Yigitler</span>
                </p>
            </div>
        </div>
    );
}
