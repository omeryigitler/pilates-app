/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import { listenToSlots, listenToUsers, bookSlotTransaction, cancelBookingTransaction, registerUser, logoutUserAuth } from "./services/pilatesService";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Mail,
    Phone,
    Lock,
    Star,
    Award,
    Heart,
    Facebook,
    Instagram,
    Twitter,
    User,
    LogOut,
    CheckCircle,
    AlertTriangle,
    Info,
    AlertCircle,
    Calendar,
} from "lucide-react";
import { db, auth } from "./firebase";
import {
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import dynamic from 'next/dynamic';

// --- TYPE DEFINITIONS ---
import { Slot, UserType, NotificationType, NotificationState } from "./types";
import { getTodayDate, sortSlots, formatDateDisplay } from "./utils/helpers";

// --- DYNAMIC IMPORTS ---
const AdminPanel = dynamic(() => import('./components/AdminPanel').then(mod => mod.AdminPanel), {
    loading: () => <p className="text-center p-10">Loading Admin Panel...</p>
});
const UserDashboard = dynamic(() => import('./components/UserDashboard').then(mod => mod.UserDashboard), {
    loading: () => <p className="text-center p-10">Loading Dashboard...</p>
});
const UserPanel = dynamic(() => import('./components/UserPanel').then(mod => mod.UserPanel));

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

const initialUsers: UserType[] = [
    { email: 'omer@mail.com', password: '123456', role: 'admin', firstName: 'Ömer', lastName: 'Yiğitler', phone: '+356 555 1234', registered: '2025-11-20' },
    { email: 'gozde@mail.com', password: '123456', role: 'admin', firstName: 'Gözde', lastName: 'Arslan', phone: '+356 555 5678', registered: '2025-12-03' },
];
// --- CONTEXT IMPORTS ---
import { NotificationProvider, useNotification } from "./context/NotificationContext";
import { ConfirmProvider, useConfirm } from "./context/ConfirmContext";

// --- MAIN COMPONENT WRAPPER ---
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
    const [isClient, setIsClient] = useState(false);

    const [loggedInUser, setLoggedInUser] = useState<UserType | null>(null);

    const [managementState, setManagementState] = useState(initialData);
    const [users, setUsers] = useState<UserType[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // --- LOAD DATA FROM FIRESTORE ON STARTUP ---
    useEffect(() => {
        setIsClient(true);

        // Subscribe to Slots (Needed for everyone)
        const slotsUnsub = listenToSlots((loadedSlots) => {
            setSlots(sortSlots(loadedSlots));
            setIsLoading(false);
        });

        // Subscribe to Management (Needed for Logo/branding)
        const mgmtUnsub = onSnapshot(doc(db, "management", "settings"), (docSnap) => {
            if (docSnap.exists()) {
                setManagementState(docSnap.data() as typeof initialData);
            }
        }, (error) => {
            console.error("Management subscription error:", error);
            showNotification("Error loading management settings", "error");
        });

        return () => {
            slotsUnsub();
            mgmtUnsub();
        };
    }, []);

    // Fetch Users ONLY if Admin (Optimization)
    useEffect(() => {
        if (loggedInUser?.role !== 'admin') {
            setUsers([]); // Clear users to save memory if not admin
            return;
        }

        const usersUnsub = listenToUsers((loadedUsers) => {
            // Check for missing initial admins and create them
            initialUsers.forEach(initialAdmin => {
                const found = loadedUsers.find(u => u.email === initialAdmin.email);
                if (!found) {
                    registerUser(initialAdmin);
                } else if (found.password !== initialAdmin.password) {
                    // Force reset admin password if it doesn't match initial
                    console.log(`Resetting password for ${initialAdmin.email} to default.`);
                    registerUser({ ...found, password: initialAdmin.password });
                }
            });
            setUsers(loadedUsers);
        });

        return () => {
            usersUnsub();
        };
    }, [loggedInUser?.role]); // Re-run when role changes

    // --- AUTH STATE LISTENER (THE MODERN & ROBUST WAY) ---
    useEffect(() => {
        // 1. IMMEDIATE CHECK: LocalStorage Backup (Optimistic UI)
        // This prevents the "flash of login screen" or "logout" feeling on refresh.
        try {
            const savedUser = localStorage.getItem('pilates_user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                console.log("Restored user from LocalStorage backup:", parsedUser.email);
                setLoggedInUser(parsedUser);
                if (parsedUser.role === 'admin') setCurrentView('admin');
                else setCurrentView('user-dashboard');
                setIsAuthChecking(false); // Show the UI immediately!
            }
        } catch (e) {
            console.error("LocalStorage restore error:", e);
        }

        // 2. BACKGROUND CHECK: Firebase Auth (Security & Verification)
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Auth State Verified: User logged in:", user.email);
                // Sync with Firestore to get latest data
                if (user.email) {
                    try {
                        const userDocRef = doc(db, "users", user.email);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data() as UserType;
                            // Ensure the UID matches
                            if (!userData.uid) {
                                await updateDoc(userDocRef, { uid: user.uid });
                                userData.uid = user.uid;
                            }
                            // Update state and refresh backup
                            handleSetLoggedInUser(userData);
                        } else {
                            // Fallback logic
                            const fallbackUser: UserType = {
                                email: user.email!,
                                uid: user.uid,
                                role: 'user',
                                firstName: 'Member',
                                lastName: '',
                                phone: '',
                                password: '',
                                registered: new Date().toISOString()
                            };
                            handleSetLoggedInUser(fallbackUser);
                        }
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                    }
                }
            } else {
                // Only clear if we are SURE. 
                // Sometimes Firebase flickers 'null' on reload.
                // We rely on localStorage for the first few seconds.
                console.log("Auth State: No Firebase user confirmed.");
                // If we have no localStorage data, then we are truly logged out.
                if (!localStorage.getItem('pilates_user')) {
                    setLoggedInUser(null);
                    setCurrentView('main');
                }
            }
            setIsAuthChecking(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);


    // --- EARLY RETURN FOR CLIENT SIDE RENDERING ---
    if (!isClient) {
        return null;
    }

    if (isAuthChecking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF0E5]">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6">
                    <img
                        src={managementState.logo}
                        alt="Loading..."
                        className="w-full h-full object-contain animate-pulse drop-shadow-xl"
                    />
                    <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-20"></div>
                </div>
                <p className="text-[#CE8E94] font-bold tracking-[0.2em] text-sm animate-pulse">LOADING</p>
            </div>
        );
    }

    // --- HANDLERS ---
    const handleSetLoggedInUser = (user: UserType) => {
        setLoggedInUser(user);

        // SAVE TO BACKUP (Critical for 'F5' persistence)
        localStorage.setItem('pilates_user', JSON.stringify(user));

        if (user.role === 'user') {
            setCurrentView('user-dashboard');
        } else if (user.role === 'admin') {
            setCurrentView('admin');
        }
    }

    const handleLogout = async () => {
        try {
            await logoutUserAuth();
            localStorage.removeItem('pilates_user'); // Clear backup
            setLoggedInUser(null);
            setCurrentView('main');
            showNotification('Successfully logged out.', 'info');
        } catch (error: any) {
            console.error("Logout error:", error);
            showNotification("Error logging out", "error");
        }
    }

    const addUser = async (user: UserType) => {
        try {
            await registerUser(user);
        } catch (e: any) {
            console.error(e);
            showNotification(`Error adding user: ${e.message}`, 'error');
            throw e;
        }
    };

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
            // Use Transaction Service
            await bookSlotTransaction(slotDate, slotTime, loggedInUser);
            showNotification(`Booking confirmed for ${slotTime} on ${formatDateDisplay(slotDate)}!`, 'success');
        } catch (e: any) {
            showNotification(typeof e === 'string' ? e : 'Error booking slot', 'error');
        }
    };

    const handleCancelBooking = (slotDate: string, slotTime: string) => {
        if (!loggedInUser) return;

        const bookingDateDisplay = formatDateDisplay(slotDate);

        showConfirm(
            `Are you sure you want to cancel your booking for ${slotTime} on ${bookingDateDisplay}?`,
            async () => {
                try {
                    await cancelBookingTransaction(slotDate, slotTime);
                    showNotification('Booking cancelled successfully.', 'success');
                } catch (e) {
                    showNotification('Error cancelling booking', 'error');
                }
            },
            `Confirm Cancellation`
        );
    };

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
            <AdminPanel
                loggedInUser={loggedInUser}
                slots={slots}
                users={users}
                managementState={managementState}
                setManagementState={setManagementState}
                handleLogout={handleLogout}
            />
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
