import React, { useState, useEffect } from 'react';

interface WorkflowStep {
    id: string;
    title: string;
    desc: string;
}

interface UploadedImage {
    id: string;
    url: string;
    title: string;
}

interface LandingPageProps {
    onOpenAuth: (view: 'login' | 'register') => void;
    isDark: boolean;
    onToggleDark: () => void;
}

export const LandingPage = ({ onOpenAuth, isDark, onToggleDark }: LandingPageProps) => {
    const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const [landingData, setLandingData] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('recruitOps_landing_data_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            heroTitle: "AzurLize Recruitment & Performance Hub",
            heroSubtitle: "Sistem terpadu untuk koordinasi, evaluasi, dan rekapitulasi performa tim recruiter AzurLize secara real-time. Kelola target harian dan optimalkan efisiensi kerja tim dalam satu platform modern.",
            steps: [
                { id: "1", title: "Promosi & Pencarian", desc: "Mencari dan menjaring kandidat baru melalui berbagai platform media sosial seperti Instagram, TikTok, WhatsApp, dll." },
                { id: "2", title: "Pelaporan Harian", desc: "Melaporkan data pelamar, postingan, kunjungan, dan pengujian harian secara mandiri sebelum batas waktu pelaporan." },
                { id: "3", title: "Validasi Laporan (Acc)", desc: "Superadmin & Admin memvalidasi data pelamar yang masuk, menandai data yang Acc, serta mengunci laporan kerja." },
                { id: "4", title: "Evaluasi & Payroll", desc: "Sistem menghitung otomatis denda keterlambatan lapor, denda missed-target, insentif harian, serta akumulasi bonus bulanan." }
            ],
            images: [
                { id: "img1", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80", title: "Kolaborasi Tim Recruiter" },
                { id: "img2", url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80", title: "Analisis Target Bulanan" }
            ]
        };
    });

    useEffect(() => {
        const handleLandingUpdate = () => {
            try {
                const saved = localStorage.getItem('recruitOps_landing_data_v2');
                if (saved) setLandingData(JSON.parse(saved));
            } catch (e) {}
        };
        window.addEventListener('landingUpdated', handleLandingUpdate);
        return () => window.removeEventListener('landingUpdated', handleLandingUpdate);
    }, []);

    const openWizardAt = (index: number) => {
        setCurrentStepIndex(index);
        setShowWorkflowWizard(true);
    };

    return (
        <div id="landing-page" className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors duration-300 relative overflow-x-hidden flex flex-col justify-between">
            {/* Background Orbs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Navigation Header */}
            <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                            <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L3 21H7.5L12 11L16.5 21H21L12 2Z" fill="currentColor"/>
                                <path d="M9.5 15H14.5L12 9.5L9.5 15Z" fill="currentColor" fillOpacity="0.4"/>
                            </svg>
                        </div>
                        <span className="text-base sm:text-xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                            Team<span className="text-indigo-600 dark:text-indigo-400">AzurLize</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Integrated Light/Dark Theme Toggle */}
                        <button 
                            onClick={onToggleDark}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm transition-transform active:scale-95 shrink-0"
                            title="Ganti Mode Tema"
                        >
                            <i className={`ph-bold ${isDark ? 'ph-sun' : 'ph-moon'} text-base sm:text-lg`}></i>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col justify-center">
                {showWorkflowWizard ? (
                    <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10 flex flex-col items-center">
                        {/* Back Button */}
                        <div className="w-full flex justify-start mb-6">
                            <button 
                                onClick={() => setShowWorkflowWizard(false)}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <i className="ph-bold ph-arrow-left"></i> Kembali ke Beranda
                            </button>
                        </div>

                        {/* Wizard Card */}
                        <div className="w-full bg-white dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/80 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            {/* Progress Header */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                    Langkah {currentStepIndex + 1} dari {landingData.steps.length}
                                </span>
                                
                                {/* Step Dots */}
                                <div className="flex items-center gap-2">
                                    {landingData.steps.map((_: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentStepIndex(idx)}
                                            className={`h-2 rounded-full transition-all ${
                                                idx === currentStepIndex 
                                                    ? 'w-8 bg-indigo-600' 
                                                    : 'w-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                                {/* Big Visual Icon */}
                                <div className="md:col-span-4 flex justify-center">
                                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-5xl shadow-inner relative overflow-hidden ${
                                        currentStepIndex === 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' :
                                        currentStepIndex === 1 ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600' :
                                        currentStepIndex === 2 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' :
                                        'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                                    }`}>
                                        <i className={`ph-fill ${
                                            currentStepIndex === 0 ? 'ph-megaphone' :
                                            currentStepIndex === 1 ? 'ph-note-pencil' :
                                            currentStepIndex === 2 ? 'ph-shield-check' :
                                            'ph-coins'
                                        } text-6xl`}></i>
                                    </div>
                                </div>

                                {/* Text Explanation */}
                                <div className="md:col-span-8 text-center md:text-left">
                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-4">
                                        {landingData.steps[currentStepIndex].title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                        {landingData.steps[currentStepIndex].desc}
                                    </p>
                                </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentStepIndex === 0}
                                    className="px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                                >
                                    <i className="ph-bold ph-caret-left"></i> Sebelumnya
                                </button>

                                {currentStepIndex < landingData.steps.length - 1 ? (
                                    <button
                                        onClick={() => setCurrentStepIndex(prev => Math.min(landingData.steps.length - 1, prev + 1))}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-500/10 flex items-center gap-2"
                                    >
                                        Selanjutnya <i className="ph-bold ph-caret-right"></i>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onOpenAuth('login')}
                                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        Selesai & Masuk Portal <i className="ph-bold ph-sign-in"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center relative z-10">
                        <div className="max-w-3xl mx-auto">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-6 border border-indigo-100/50 dark:border-indigo-900/30">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                Sistem Terpadu Recruiter
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
                                {landingData.heroTitle}
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-10">
                                {landingData.heroSubtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
                                <button 
                                    onClick={() => onOpenAuth('login')}
                                    className="w-full sm:w-auto flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] flex items-center justify-center gap-2"
                                >
                                    <i className="ph-bold ph-sign-in text-xl"></i> Buka Dashboard
                                </button>
                                <button 
                                    onClick={() => openWizardAt(0)}
                                    className="w-full sm:w-auto flex-1 px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    Pelajari Alur Kerja <i className="ph-bold ph-sparkles text-lg text-indigo-500"></i>
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200/50 dark:border-gray-800/50 py-10 relative z-10 text-center bg-white/30 dark:bg-transparent">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">© 2026 Team AzurLize • All Rights Reserved</p>
            </footer>
        </div>
    );
};
