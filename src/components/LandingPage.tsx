import React, { useState } from 'react';

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

// Data manual (hardcoded)
const landingData = {
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

export const LandingPage = ({ onOpenAuth, isDark, onToggleDark }: LandingPageProps) => {
    const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const openWizardAt = (index: number) => {
        setCurrentStepIndex(index);
        setShowWorkflowWizard(true);
    };

    return (
        <div id="landing-page" className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors duration-300 relative overflow-x-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Navigation Header */}
            <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L3 21H7.5L12 11L16.5 21H21L12 2Z" fill="currentColor"/>
                                <path d="M9.5 15H14.5L12 9.5L9.5 15Z" fill="currentColor" fillOpacity="0.4"/>
                            </svg>
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                            Team<span className="text-indigo-600 dark:text-indigo-400">AzurLize</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Integrated Light/Dark Theme Toggle */}
                        <button 
                            onClick={onToggleDark}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm transition-transform active:scale-95"
                            title="Ganti Mode Tema"
                        >
                            <i className={`ph-bold ${isDark ? 'ph-sun' : 'ph-moon'} text-lg`}></i>
                        </button>
                        
                        <button 
                            onClick={() => onOpenAuth('login')}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-95"
                        >
                            Masuk Portal
                        </button>
                        <button 
                            onClick={() => onOpenAuth('register')}
                            className="hidden sm:inline-flex px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-bold transition-all active:scale-95"
                        >
                            Daftar Akun
                        </button>
                    </div>
                </div>
            </header>

            {/* Workflow Wizard vs Standard Main Content */}
            {showWorkflowWizard ? (
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 flex flex-col items-center">
                    {/* Back Button */}
                    <div className="w-full flex justify-start mb-8">
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
                <>
                    {/* Hero Section */}
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center relative z-10">
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
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => onOpenAuth('login')}
                                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] flex items-center justify-center gap-2"
                                >
                                    <i className="ph-bold ph-sign-in text-xl"></i> Buka Dashboard Tim
                                </button>
                                <button 
                                    onClick={() => openWizardAt(0)}
                                    className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2"
                                >
                                    Pelajari Alur Kerja <i className="ph-bold ph-sparkles text-lg"></i>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Alur Kerja Section */}
                    <section id="alur-kerja" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200/50 dark:border-gray-800/50 relative z-10 scroll-mt-20">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-3">Alur Kerja & Operasional</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl mx-auto font-medium">Langkah demi langkah sistematis rekrutmen. Klik langkah manapun untuk melihat penjelasan detail satu per satu.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {landingData.steps.map((step: WorkflowStep, index: number) => (
                                <div 
                                    key={step.id || index} 
                                    onClick={() => openWizardAt(index)}
                                    className="bg-white dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group duration-300 cursor-pointer relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg mb-5 border border-indigo-100/50 dark:border-indigo-900/30 group-hover:scale-110 transition-transform">
                                        {index + 1}
                                    </div>
                                    <h3 className="font-black text-lg text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                                        {step.title}
                                        <i className="ph-bold ph-arrow-up-right text-sm opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500"></i>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium line-clamp-3">{step.desc}</p>
                                    <div className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:underline">
                                        Pelajari Langkah <i className="ph-bold ph-caret-right"></i>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Media/Gallery Section */}
                    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200/50 dark:border-gray-800/50 relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-3">Dokumentasi & Galeri Operasional</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl mx-auto font-medium">Gambaran kegiatan dan pencapaian tim recruiter dalam mendukung aktivitas rekrutmen AzurLize.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {landingData.images.map((img: UploadedImage, index: number) => (
                                <div key={img.id || index} className="bg-white dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="aspect-[16/9] w-full overflow-hidden relative bg-gray-100 dark:bg-gray-800">
                                        <img 
                                            src={img.url} 
                                            alt={img.title} 
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                                        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                                            <h3 className="font-black text-lg drop-shadow">{img.title}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {landingData.images.length === 0 && (
                                <div className="col-span-2 text-center py-16 bg-white dark:bg-gray-800/20 border border-gray-200 dark:border-gray-800 rounded-2xl">
                                    <i className="ph-bold ph-image-square text-4xl text-gray-400 mb-2 block"></i>
                                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">Belum ada gambar yang diunggah.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

            {/* Footer */}
            <footer className="border-t border-gray-200/50 dark:border-gray-800/50 py-12 relative z-10 text-center">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">© 2026 Team AzurLize • All Rights Reserved</p>
            </footer>
        </div>
    );
};
