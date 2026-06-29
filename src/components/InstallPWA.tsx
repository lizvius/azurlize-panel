import React, { useState, useEffect, useRef } from 'react';

import { SCRIPT_URL, formatToDDMMYYYY } from '../utils';

export const InstallPWA = () => {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Registrasi Service Worker (Wajib untuk PWA)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.log('SW fail:', err));
        }

        // Deteksi Standalone & iOS
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(checkStandalone);

        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Tangkap event PWA Install
        const handler = e => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async (e) => {
        e.preventDefault();
        if (!promptInstall) return;
        promptInstall.prompt(); 
        const { outcome } = await promptInstall.userChoice;
        if (outcome === 'accepted') {
            setSupportsPWA(false); 
        }
    };

    if (isStandalone) return null;
    if (!supportsPWA && !isIOS) return null;

    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl flex items-center justify-between shadow-sm mx-4 mt-4 md:mx-8 mb-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-700 shrink-0">
                    <i className="ph-fill ph-app-window text-xl"></i>
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">Install AzurLize</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">
                        {isIOS 
                            ? "Ketuk ikon Share di bawah, lalu pilih 'Add to Home Screen'." 
                            : "Akses lebih cepat langsung dari layar utama Anda."}
                    </p>
                </div>
            </div>
            
            {supportsPWA && !isIOS && (
                <button onClick={handleInstall} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 shrink-0 ml-2">
                    Install App
                </button>
            )}

            {isIOS && (
                <div className="flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 ml-2 animate-bounce">
                    <i className="ph-bold ph-export text-xl"></i>
                </div>
            )}
        </div>
    );
};
