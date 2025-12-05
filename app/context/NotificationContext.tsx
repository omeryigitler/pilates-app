"use client";

import React, { createContext, useContext, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationType, NotificationState } from '../types';

type NotificationModalState = NotificationState & {
    hideNotification: () => void;
};

const NotificationContext = createContext({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showNotification: (_message: string, _type: NotificationType) => { },
});

export const useNotification = () => useContext(NotificationContext);

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

    return createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-300 space-y-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                        {icon}
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-gray-600 leading-relaxed px-2">{message}</p>
                <div className="flex justify-center pt-4">
                    <Button
                        onClick={hideNotification}
                        className="px-6 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-lg transform active:scale-95"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
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
