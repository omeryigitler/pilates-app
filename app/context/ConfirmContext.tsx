"use client";

import React, { createContext, useContext, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

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

export const useConfirm = () => useContext(ConfirmContext);

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
        <div className="fixed inset-0 flex items-center justify-center z-[10001] p-4 bg-black/30 backdrop-blur-sm transition-all duration-300">
            <div className="relative bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-300 space-y-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-[#CE8E94]/10 rounded-full">
                        <AlertCircle className="w-10 h-10 text-[#CE8E94]" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{state.title}</h2>
                <p className="text-gray-600 leading-relaxed px-2">{state.message}</p>
                <div className="flex justify-center gap-4 pt-4">
                    {state.showCancel && (
                        <Button
                            onClick={handleCancel}
                            className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-xl font-bold hover:bg-gray-100 transition shadow-sm"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirm}
                        className="px-6 py-3 bg-[#CE8E94] text-white rounded-xl font-bold hover:bg-[#B57A80] transition shadow-lg transform active:scale-95"
                    >
                        {state.confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
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
