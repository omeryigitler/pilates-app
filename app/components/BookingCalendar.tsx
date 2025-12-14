"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slot } from "../types";
import { getTodayDate, isPastDate } from "../utils/helpers";

export const BookingCalendar = ({ slots, onSelectDate, selectedDate }: { slots: Slot[], onSelectDate: (date: string) => void, selectedDate: string }) => {
    const [currentMonth, setCurrentMonth] = useState("");
    const [todayDate, setTodayDate] = useState("");

    React.useEffect(() => {
        const maltaToday = getTodayDate();
        setTodayDate(maltaToday);
        setCurrentMonth(maltaToday.substring(0, 7));
    }, []);

    const datesWithSlots = useMemo(() => {
        return slots
            .filter(slot => slot.status === 'Available' && !isPastDate(slot.date))
            .map(slot => slot.date);
    }, [slots]);

    const { year, monthIndex, daysInMonth, startOffset } = useMemo(() => {
        if (!currentMonth) return { year: 0, monthIndex: 0, daysInMonth: 0, startOffset: 0 };
        const [yearStr, monthStr] = currentMonth.split('-');
        const y = parseInt(yearStr);
        const m = parseInt(monthStr) - 1; // 0-indexed

        // Use UTC to avoid local timezone shifts affecting the "day of week" of the 1st
        const firstDay = new Date(Date.UTC(y, m, 1));
        const lastDay = new Date(Date.UTC(y, m + 1, 0));

        // 0=Sun, 1=Mon, ..., 6=Sat (in UTC)
        const dayOfWeekUTC = firstDay.getUTCDay();

        // Monday Start Logic:
        // Mon(1) -> 0 offset
        // ...
        // Sun(0) -> 6 offset
        const startOffset = dayOfWeekUTC === 0 ? 6 : dayOfWeekUTC - 1;

        return {
            year: y,
            monthIndex: m,
            daysInMonth: lastDay.getUTCDate(),
            startOffset
        };
    }, [currentMonth]);

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

            const newMonthStr = String(month).padStart(2, '0');
            return `${year}-${newMonthStr}`;
        });
    };

    if (!currentMonth) return null;

    const renderDays = () => {
        const days = [];

        // Empty slots for offset
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="text-center p-3 opacity-0 cursor-default"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            // Construct YYYY-MM-DD
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // ... rest of logic uses string comparison, safe ...
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
        <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border border-white/50 space-y-4 h-full">
            <div className="flex justify-between items-center mb-2 md:mb-4">
                <Button onClick={() => handleMonthChange('prev')} className="p-2 md:p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-[#CE8E94] hover:text-white transition shadow-md hover:shadow-lg">
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <h3 className="text-lg md:text-xl font-bold text-[#CE8E94]">{monthNames[monthIndex]} {year}</h3>
                <Button onClick={() => handleMonthChange('next')} className="p-2 md:p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-[#CE8E94] hover:text-white transition shadow-md hover:shadow-lg">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
            </div>

            {/* HARDCODED HEADERS (FORCE RE-RENDER) TO ENSURE MON START */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Mon</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Tue</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Wed</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Thu</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Fri</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Sat</div>
                <div className="text-center text-xs md:text-sm font-bold text-gray-500 py-1 md:py-2 border-b-2 border-[#CE8E94]/30">Sun</div>
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
            {/* DEBUG INFO - REMOVE AFTER FIX */}
            {/* <div className="text-[10px] text-center text-gray-300 font-mono">
                V3-FINAL | Offset: {startOffset} | Mon: {monthIndex + 1} | Yr: {year} | Today: {todayDate}
            </div> */}
        </div>
    );
};
