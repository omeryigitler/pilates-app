"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => {
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#CE8E94]/10 backdrop-blur-md transition-opacity duration-300">
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
