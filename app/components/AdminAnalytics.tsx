"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Download, ChevronDown, Check } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Slot, UserType } from "../types";

export const AdminAnalytics = ({ slots, users, currentLogo }: { slots: Slot[], users: UserType[], currentLogo: string }) => {
    // 1. Genel İstatistikler
    const activeBookings = slots.filter(s => s.status === 'Booked' || s.status === 'Active').length;
    const completedBookings = slots.filter(s => s.status === 'Completed').length;
    const totalBookings = activeBookings + completedBookings;

    const totalSlots = slots.length;
    const occupancyRate = totalSlots > 0 ? Math.round((totalBookings / totalSlots) * 100) : 0;
    const totalUsers = users.length;

    const [reportFilter, setReportFilter] = React.useState<'All' | 'Active' | 'Completed'>('All');
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);

    const filterOptions = [
        { value: 'All', label: 'All Statuses' },
        { value: 'Active', label: 'Active Only' },
        { value: 'Completed', label: 'Completed Only' }
    ];

    // 2. Aylık Dağılım
    const monthlyStats = slots.reduce((acc, slot) => {
        if (slot.status === 'Booked' || slot.status === 'Active' || slot.status === 'Completed') {
            const monthKey = slot.date.substring(0, 7); // YYYY-MM
            acc[monthKey] = (acc[monthKey] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Sıralı aylar
    const sortedMonths = Object.keys(monthlyStats).sort().reverse();

    // Filtered months logic for table could be more complex if we want to filter specific months,
    // but here we filter the breakdown inside the table rows potentially on status?
    // Actually the table shows aggregate data per month.
    // So let's add a "Status Breakdown" per month or just filter the aggregate calculation.

    const filteredMonthlyStats = slots.reduce((acc, slot) => {
        // Filter based on reportFilter
        const isActive = slot.status === 'Booked' || slot.status === 'Active';
        const isCompleted = slot.status === 'Completed';

        const matchesFilter =
            (reportFilter === 'All' && (isActive || isCompleted)) ||
            (reportFilter === 'Active' && isActive) ||
            (reportFilter === 'Completed' && isCompleted);

        if (matchesFilter) {
            const monthKey = slot.date.substring(0, 7);
            acc[monthKey] = (acc[monthKey] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Use filtered stats for the table
    const tableMonths = Object.keys(filteredMonthlyStats).sort().reverse();

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const brandColor = [206, 142, 148] as [number, number, number]; // #CE8E94

        // Helper to load image as Base64
        const loadImage = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; // CORS sorunlarını önlemek için
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Yuvarlak Kırpma İşlemi
                        ctx.beginPath();
                        ctx.arc(img.width / 2, img.height / 2, Math.min(img.width, img.height) / 2, 0, Math.PI * 2, true);
                        ctx.closePath();
                        ctx.clip();

                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png')); // PNG formatı şeffaflık (yuvarlak kenarlar) için gereklidir
                    } else {
                        reject(new Error('Canvas context failed'));
                    }
                };
                img.onerror = (e) => reject(e);
            });
        };

        try {
            // 1. Logo Ekle (Sol Üst)
            const logoBase64 = await loadImage(currentLogo);
            const logoX = 14;
            const logoY = 10;
            const logoSize = 24;

            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
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
        doc.text(`Monthly Performance & Analytics Report (${reportFilter})`, 42, 29);

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
        const tableData = tableMonths.map(month => [
            new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            `${filteredMonthlyStats[month]} sessions`,
            reportFilter === 'All' ? 'Mixed' : reportFilter,
            // Basit bir bar grafik temsili (text olarak)
            '|'.repeat(Math.min(filteredMonthlyStats[month], 20))
        ]);

        // 5. Tabloyu Çiz (Aylık Özet)
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

        // --- NEW: Detailed Booking Breakdown Table ---
        // 6. Detaylı Liste Başlığı
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setTextColor(80);
        doc.text("Detailed Session Breakdown", 14, finalY);

        // Filter and sort bookings for the detailed list
        const detailedBookings = slots
            .filter(slot => {
                const isActive = slot.status === 'Booked' || slot.status === 'Active';
                const isCompleted = slot.status === 'Completed';
                return (reportFilter === 'All' && (isActive || isCompleted)) ||
                    (reportFilter === 'Active' && isActive) ||
                    (reportFilter === 'Completed' && isCompleted);
            })
            // Sort by Date then Time
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        const detailedData = detailedBookings.map(slot => [
            slot.date,
            slot.time,
            slot.bookedBy || 'Unknown User',
            slot.status === 'Booked' ? 'Active' : slot.status
        ]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Date', 'Time', 'Client Name', 'Status']],
            body: detailedData,
            theme: 'grid',
            headStyles: {
                fillColor: [100, 100, 100], // Darker gray for detail table
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [230, 230, 230],
                lineWidth: 0.1
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            // Add page break logic automatically handled by autoTable
        });


        // 7. Footer (Alt Bilgi)
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-2xl font-bold text-gray-800">Performance Overview</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-[200px] group">
                        {/* Custom Dropdown Trigger */}
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-100 rounded-xl px-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#CE8E94]/20"
                        >
                            <span className="text-gray-800 truncate">
                                {filterOptions.find(f => f.value === reportFilter)?.label}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-[#CE8E94] flex-shrink-0 ml-2 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                    {filterOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={() => {
                                                setReportFilter(option.value as any);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors duration-200
                                                ${reportFilter === option.value
                                                    ? 'bg-[#CE8E94]/10 text-[#CE8E94] font-bold'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <span className="text-sm">{option.label}</span>
                                            {reportFilter === option.value && <Check className="w-4 h-4 text-[#CE8E94]" />}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <Button
                        onClick={handleDownloadPDF}
                        className="bg-[#CE8E94] hover:bg-[#B57A80] text-white h-12 w-full sm:w-[200px] rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 text-base font-semibold"
                    >
                        <Download className="w-5 h-5" /> <span>Download Report</span>
                    </Button>
                </div>
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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Monthly Performance ({reportFilter})</h3>
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
                            {tableMonths.map(month => (
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
