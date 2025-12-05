"use client";

import React from 'react';
import { Award, Clock } from 'lucide-react';
import { Slot } from '../types';
import { isPastDate, formatDateDisplay } from '../utils/helpers';

export const UserHistory = ({ slots, userName }: { slots: Slot[], userName: string }) => {
    const pastBookings = slots
        .filter(slot => slot.bookedBy === userName && isPastDate(slot.date))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const totalSessions = pastBookings.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
