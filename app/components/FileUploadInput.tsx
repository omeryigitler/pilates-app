"use client";

import React from 'react';
import { Upload } from 'lucide-react';

export const FileUploadInput = ({ label, onChange, previewUrl }: { label: string, onChange: (file: File) => void, previewUrl: string }) => {
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
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-4 border-[#CE8E94]/30 shadow-md" />
                )}
            </div>
        </div>
    );
};
