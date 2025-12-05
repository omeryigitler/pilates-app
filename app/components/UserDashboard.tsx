"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Calendar, Clock, Zap, Home } from 'lucide-react';
import { UserType, Slot } from '../types';
import { getTodayDate, isPastDate, formatDateDisplay } from '../utils/helpers';
import { useConfirm } from '../context/ConfirmContext';
import { BookingCalendar } from './BookingCalendar';
import { UserHistory } from './UserHistory';

export const UserDashboard = ({
    loggedInUser,
    slots,
    handleBookSlot,
    handleCancelBooking,
    onLogout,
    navigateToHome
}: {
    loggedInUser: UserType,
    slots: Slot[],
    handleBookSlot: (date: string, time: string) => void,
    handleCancelBooking: (date: string, time: string) => void,
    onLogout: () => void,
    navigateToHome: () => void
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
                <div className="flex justify-between items-start md:items-center border-b border-[#CE8E94]/20 pb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#CE8E94] flex items-center gap-3"><User className="w-8 h-8" />
                        <span className="flex flex-col md:flex-row md:gap-2">
                            <span>Hi,</span>
                            <span>{loggedInUser.firstName}</span>
                        </span>
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <Button
                            onClick={navigateToHome}
                            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-100 transition duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <Home className="w-4 h-4" /> Home
                        </Button>
                        <Button
                            onClick={onLogout}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-500 transition duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
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
                                            <div className="space-y-3 w-full sm:w-auto">
                                                <div className="space-y-1">
                                                    <span className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5 text-[#CE8E94]" /> {slot.time}</span>
                                                    <span className="text-sm text-gray-500 block ml-7">{formatDateDisplay(slot.date)}</span>
                                                </div>

                                                {/* Calendar Buttons */}
                                                <div className="flex gap-2 ml-7">
                                                    <Button
                                                        className="h-7 text-xs px-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm"
                                                        onClick={() => {
                                                            const startTime = `${slot.date.replace(/-/g, '')}T${slot.time.replace(':', '')}00`;
                                                            const endTime = `${slot.date.replace(/-/g, '')}T${parseInt(slot.time.split(':')[0]) + 1}${slot.time.split(':')[1]}00`;
                                                            const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Pilates+Session&dates=${startTime}/${endTime}&details=Reformer+Pilates+Malta+Session&location=Reformer+Pilates+Malta`;
                                                            window.open(url, '_blank');
                                                        }}
                                                    >
                                                        G-Cal
                                                    </Button>
                                                    <Button
                                                        className="h-7 text-xs px-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 shadow-sm"
                                                        onClick={() => {
                                                            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.origin}
DTSTART:${slot.date.replace(/-/g, '')}T${slot.time.replace(':', '')}00
DTEND:${slot.date.replace(/-/g, '')}T${parseInt(slot.time.split(':')[0]) + 1}${slot.time.split(':')[1]}00
SUMMARY:Pilates Session
DESCRIPTION:Reformer Pilates Malta Session
LOCATION:Reformer Pilates Malta
END:VEVENT
END:VCALENDAR`;
                                                            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                                            const link = document.createElement('a');
                                                            link.href = window.URL.createObjectURL(blob);
                                                            link.setAttribute('download', 'pilates_session.ics');
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                    >
                                                        Apple
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => showConfirm('Please contact your instructor to cancel this booking.', () => { }, 'Contact Instructor', undefined, 'OK', false)}
                                                className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg mt-3 sm:mt-0"
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
