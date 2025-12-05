"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Slot } from "../types";
import { getTodayDate, isPastDate } from "../utils/helpers";

export const BookingCalendar = ({ slots, onSelectDate, selectedDate }: { slots: Slot[], onSelectDate: (date: string) => void, selectedDate: string }) => {
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
