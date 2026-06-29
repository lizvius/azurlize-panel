import React, { useState, useEffect } from 'react';
// Pastikan path import ini sesuai dengan struktur folder Anda
import { SCRIPT_URL, formatToDDMMYYYY } from '../utils'; 

export const ExecutiveDashboard = ({authUser}) => {
    const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, failed: 0, recruiters: 0, thisWeek: 0 });
    const [alerts, setAlerts] = useState({ highRisk: 0, mediumRisk: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [countdownStr, setCountdownStr] = useState("");

    const isPrivileged = authUser && ['Superadmin', 'Admin'].includes(authUser.role);

    const getMondayStr = (dateInput) => { if (!dateInput) return ""; const d = new Date(dateInput); if (isNaN(d.getTime())) return ""; const localDay = d.getDay() || 7; const target = new Date(d.getTime()); target.setDate(d.getDate() - localDay + 1); return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`; };
    const getOffsetMondayStr = (offsetWeeks = 0) => { const d = new Date(); const day = d.getDay() || 7; d.setHours(0,0,0,0); d.setDate(d.getDate() - day + 1 + (offsetWeeks * 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    const getSundayStr = (mondayStr) => {
        if (!mondayStr) return "";
        try {
            const d = new Date(mondayStr);
            d.setDate(d.getDate() + 6);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch (e) { return mondayStr; }
    };

    const getPayrollDateOfMonday = (mondayStr) => {
        if (!mondayStr) return null;
        try {
            const d = new Date(mondayStr);
            d.setDate(d.getDate() + 11);
            return d;
        } catch (e) { return null; }
    };

    const getWeekId = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const currentMondayStr = getOffsetMondayStr(0);
    const currentSundayStr = getSundayStr(currentMondayStr);
    const activePayrollDate = getPayrollDateOfMonday(currentMondayStr);

    useEffect(() => {
        const updateCountdown = () => {
            if (!activePayrollDate) return;
            const now = new Date();
            const target = new Date(activePayrollDate);
            target.setHours(0, 0, 0, 0);
            
            const diffMs = target.getTime() - now.getTime();
            if (diffMs <= 0) {
                setCountdownStr("Hari Pembayaran!");
                return;
            }
            
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            setCountdownStr(`${days}h ${hours}j ${minutes}m ${seconds}d`);
        };
        
        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [activePayrollDate]);

    useEffect(() => {
        let isMounted = true;
        const fetchDashboardStats = async (showLoading = false) => {
            if (showLoading) setIsLoading(true);
            try {
                // Fetch Users untuk Recruiter Aktif
                const resUsers = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
                const dataUsers = await resUsers.json();
                let activeRecruiters = 0; 
                if (dataUsers && dataUsers.status === 'success') { 
                    const safeUsers = Array.isArray(dataUsers.data) ? dataUsers.data : []; 
                    activeRecruiters = safeUsers.filter(u => u.role === 'Staff' && (u.status === 'Aktif' || u.status === 'Online')).length; 
                }

                // Fetch Daily Data
                const resData = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getDailyData', role: authUser ? authUser.role : null, username: authUser ? authUser.username : null, name: authUser ? authUser.name : null }) });
                const resultData = await resData.json();

                if (resultData && resultData.status === 'success' && isMounted) {
                    let rawData = Array.isArray(resultData.data) ? resultData.data : [];
                    
                    // --- PERBAIKAN DI SINI: SANITASI DATA ---
                    // Membuang baris kosong atau data yang tidak memiliki field penting seperti 'tanggal'
                    let filteredData = rawData.filter(d => {
                        return d && Object.keys(d).length > 0 && d.tanggal && String(d.tanggal).trim() !== '';
                    });
                    
                    // Filter berdasarkan Role User yang sedang login
                    if (!isPrivileged && authUser) {
                        filteredData = filteredData.filter(d => d.recruiter === authUser.username || d.recruiter === authUser.name);
                    }

                    const thisWeekMonday = getOffsetMondayStr(0); 
                    const today = new Date(); 
                    today.setHours(0,0,0,0);
                    
                    // Perhitungan total sekarang menggunakan filteredData yang sudah bersih
                    let sTotal = filteredData.length, sPending = 0, sActive = 0, sFailed = 0, sThisWeek = 0, aHighRisk = 0, aMediumRisk = 0; 

                    filteredData.forEach(d => {
                        if (d.results === 'Pending') sPending++; 
                        if (d.results === 'Acc') sActive++; 
                        if (d.results === 'Reject') sFailed++;
                        if (getMondayStr(d.tanggal) === thisWeekMonday) sThisWeek++;
                        
                        if (d.results === 'Pending' && d.tanggal) {
                            const inputDate = new Date(d.tanggal);
                            if (!isNaN(inputDate.getTime())) {
                                inputDate.setHours(0,0,0,0); 
                                const diffDays = Math.ceil(Math.abs(today.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays > 7) aHighRisk++; else if (diffDays > 3) aMediumRisk++;
                            }
                        }
                    });
                    
                    setStats({ total: sTotal, pending: sPending, active: sActive, failed: sFailed, recruiters: activeRecruiters, thisWeek: sThisWeek });
                    setAlerts({ highRisk: aHighRisk, mediumRisk: aMediumRisk });
                } else if (resultData && resultData.status !== 'success') {
                    console.warn("API returned non-success status for dashboard stats:", resultData);
                }
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally { 
                if (isMounted) {
                    setIsLoading(false); 
                }
            }
        };
        
        fetchDashboardStats(false);
        
        const handleSync = () => {
            fetchDashboardStats(false);
        };
        
        window.addEventListener('refreshActiveTab', handleSync);
        
        return () => {
            isMounted = false;
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, [authUser, isPrivileged]);

    const funnelDihubungi = stats.total, funnelWawancara = stats.active + stats.failed, funnelDiterima = stats.active;
    const pctDihubungi = stats.total > 0 ? 100 : 0, pctWawancara = stats.total > 0 ? Math.round((funnelWawancara / stats.total) * 100) : 0, pctDiterima = stats.total > 0 ? Math.round((funnelDiterima / stats.total) * 100) : 0;

    const statCards = [
        { label: `Total Leads ${!isPrivileged ? 'Anda' : ''}`, value: stats.total, icon: 'ph-users', color: 'blue', grad: 'from-blue-500 to-indigo-600' },
        { label: 'Pending', value: stats.pending, icon: 'ph-clock', color: 'amber', grad: 'from-amber-400 to-orange-500' },
        { label: 'Aktif/Yes', value: stats.active, icon: 'ph-check-circle', color: 'emerald', grad: 'from-emerald-400 to-teal-500' },
        { label: 'Gugur/No', value: stats.failed, icon: 'ph-warning-circle', color: 'rose', grad: 'from-rose-400 to-red-500' },
        { label: 'Recruiter Aktif', value: stats.recruiters, icon: 'ph-user-gear', color: 'indigo', grad: 'from-indigo-400 to-purple-500' },
        { label: 'Minggu Ini', value: stats.thisWeek, icon: 'ph-trend-up', color: 'violet', grad: 'from-violet-400 to-fuchsia-500' }
    ];

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-8">
            
            {/* Header Dashboard Responsif */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 sm:gap-4 bg-white/60 dark:bg-gray-800/60 p-4 sm:p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm">
                <div className="w-full md:w-auto">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="ph-fill ph-squares-four text-indigo-500 animate-pulse"></i> Overview
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-1.5 leading-relaxed">
                        Ringkasan performa rekrutmen {isPrivileged ? 'seluruh tim' : 'pribadi Anda'} secara *real-time*.
                    </p>
                </div>
                <div className="w-full md:w-auto text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center bg-white/80 dark:bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-200/80 dark:border-gray-700/80 shadow-inner">
                    <i className="ph-bold ph-calendar-blank mr-1.5 text-indigo-500"></i> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Widget Informasi Periode Rekrutmen & Payroll */}
            <div className="bg-gradient-to-br from-[#1e1b4b] via-[#111827] to-[#0f172a] rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-bl-full blur-2xl pointer-events-none text-right"></div>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-indigo-300 font-black text-[10px] uppercase tracking-widest bg-indigo-950/50 px-3 py-1.5 rounded-full border border-indigo-800/50">
                            <i className="ph-bold ph-calendar text-xs animate-pulse"></i> Periode Rekrutmen Aktif
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                            Week {getWeekId(currentMondayStr)}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Periode berjalan dari <span className="font-bold text-white">{formatToDDMMYYYY(currentMondayStr)}</span> s/d <span className="font-bold text-white">{formatToDDMMYYYY(currentSundayStr)}</span> (Senin 00:00:00 - Minggu 23:59:59)
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Status Periode</div>
                            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-black uppercase tracking-widest">
                                ACTIVE
                            </span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <div className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Tanggal Payroll</div>
                            <span className="text-sm font-black text-indigo-300">
                                {activePayrollDate ? formatToDDMMYYYY(activePayrollDate.toISOString().split('T')[0]) : "-"}
                            </span>
                        </div>
                        <div className="bg-white/5 border border-indigo-500/20 rounded-2xl p-3 text-center col-span-2">
                            <div className="text-[9px] font-black uppercase text-indigo-300 tracking-widest mb-1">Countdown Payroll</div>
                            <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                                {countdownStr || "00h 00j 00m 00d"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Kartu Statistik */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                {statCards.map((card, idx) => (
                    <div key={idx} className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-20 flex justify-center items-center">
                                <i className={`ph-bold ph-spinner ph-spin text-2xl text-${card.color}-500`}></i>
                            </div>
                        )}
                        
                        <div className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-gradient-to-r ${card.grad}`}></div>
                        
                        <div className="p-3 sm:p-4 lg:p-5 flex flex-col justify-between h-full relative z-10">
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <span className="text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold leading-tight break-words max-w-[70%]">
                                    {card.label}
                                </span>
                                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-500 dark:text-${card.color}-400 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                                    <i className={`ph-fill ${card.icon} text-base sm:text-lg lg:text-xl`}></i>
                                </div>
                            </div>
                            <div className="flex items-end justify-between mt-1 sm:mt-0">
                                <span className={`text-2xl sm:text-3xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br ${card.grad} drop-shadow-sm`}>
                                    {isLoading ? '-' : card.value}
                                </span>
                                <i className={`ph-fill ${card.icon} absolute -bottom-3 -right-2 sm:-bottom-4 sm:-right-2 text-5xl sm:text-6xl lg:text-7xl opacity-[0.04] dark:opacity-[0.03] group-hover:scale-125 transition-transform duration-500`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bagian Bawah: Funnel & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                
                {/* Recruitment Funnel Card */}
                <div className="lg:col-span-2 relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col min-h-[300px]">
                    <div className="absolute -top-16 -right-16 sm:-top-24 sm:-right-24 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md z-20 flex justify-center items-center">
                            <div className="flex flex-col items-center gap-2 sm:gap-3">
                                <i className="ph-bold ph-spinner ph-spin text-indigo-500 text-3xl sm:text-4xl"></i>
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-500">Menganalisis...</span>
                            </div>
                        </div>
                    )}

                    <div className="p-4 sm:p-6 lg:p-8 flex-1 relative z-10 flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 border-b border-gray-100 dark:border-gray-700/50 pb-4">
                            <h3 className="font-black text-base sm:text-lg lg:text-xl flex items-center text-gray-800 dark:text-white">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-2 sm:mr-3 text-indigo-600 dark:text-indigo-400">
                                    <i className="ph-fill ph-funnel text-lg sm:text-xl"></i>
                                </div>
                                Recruitment Funnel {isPrivileged ? '(Global)' : '(Personal)'}
                            </h3>
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-inner w-max">
                                All Time
                            </span>
                        </div>

                        <div className="space-y-5 sm:space-y-6 flex-1 flex flex-col justify-center">
                            
                            {/* Step 1: Leads */}
                            <div className="w-full group">
                                <div className="flex justify-between items-end text-[10px] sm:text-xs lg:text-sm mb-1.5 sm:mb-2">
                                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center flex-wrap">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 mr-1.5 sm:mr-2 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0"></span>
                                        <span className="mr-1">Total Leads</span> 
                                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded font-black text-[9px] sm:text-xs">({funnelDihubungi})</span>
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-black">{pctDihubungi}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 sm:h-3 lg:h-4 overflow-hidden shadow-inner relative">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 ease-out relative overflow-hidden group-hover:brightness-110" style={{ width: `${pctDihubungi}%` }}>
                                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Proses */}
                            <div className="w-[90%] sm:w-[92%] ml-[10%] sm:ml-[8%] group relative">
                                <div className="absolute -left-3 sm:-left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-2.5 sm:w-3 lg:w-5 border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div>
                                
                                <div className="flex justify-between items-end text-[10px] sm:text-xs lg:text-sm mb-1.5 sm:mb-2 border-l-2 border-dashed border-gray-200 dark:border-gray-700 pl-3 sm:pl-4 lg:pl-6 -ml-3 sm:-ml-4 lg:-ml-6">
                                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center flex-wrap">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 mr-1.5 sm:mr-2 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0"></span>
                                        <span className="mr-1">Diproses</span> 
                                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded font-black text-[9px] sm:text-xs">({funnelWawancara})</span>
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400 font-black">{pctWawancara}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 sm:h-3 lg:h-4 overflow-hidden shadow-inner relative ml-0 border-l-2 border-transparent">
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-out delay-150 relative overflow-hidden group-hover:brightness-110" style={{ width: `${pctWawancara}%` }}>
                                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite_0.5s]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Diterima */}
                            <div className="w-[80%] sm:w-[84%] ml-[20%] sm:ml-[16%] group relative">
                                <div className="absolute -left-3 sm:-left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-2.5 sm:w-3 lg:w-5 border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div>
                                
                                <div className="flex justify-between items-end text-[10px] sm:text-xs lg:text-sm mb-1.5 sm:mb-2 border-l-2 border-dashed border-gray-200 dark:border-gray-700 pl-3 sm:pl-4 lg:pl-6 -ml-3 sm:-ml-4 lg:-ml-6">
                                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center flex-wrap">
                                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mr-1.5 sm:mr-2 shadow-[0_0_8px_rgba(16,185,129,0.6)] shrink-0"></span>
                                        <span className="mr-1">Diterima (ACC)</span> 
                                        <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded font-black text-[9px] sm:text-xs">({funnelDiterima})</span>
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black">{pctDiterima}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 sm:h-3 lg:h-4 overflow-hidden shadow-inner relative ml-0 border-l-2 border-transparent">
                                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out delay-300 relative overflow-hidden group-hover:brightness-110" style={{ width: `${pctDiterima}%` }}>
                                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite_1s]"></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Follow Up Alerts Card */}
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col max-h-[350px] lg:max-h-none">
                    <div className="absolute top-0 right-0 w-full h-1.5 sm:h-2 bg-gradient-to-r from-rose-500 to-amber-500"></div>
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md z-20 flex justify-center items-center">
                             <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    <div className="p-4 sm:p-5 lg:p-6 flex flex-col h-full relative z-10">
                        <h3 className="font-black text-base sm:text-lg mb-4 sm:mb-6 flex items-center text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700/50 pb-3 sm:pb-4 shrink-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mr-2 sm:mr-3 text-rose-500 animate-pulse">
                                <i className="ph-fill ph-warning-circle text-lg sm:text-xl"></i>
                            </div>
                            Follow Up Alerts
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-3 sm:space-y-4">
                            {alerts.highRisk === 0 && alerts.mediumRisk === 0 ? (
                                <div className="h-full min-h-[150px] lg:min-h-[200px] flex flex-col items-center justify-center text-gray-400 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30 p-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-2 sm:mb-3 text-emerald-500 shadow-inner">
                                        <i className="ph-fill ph-check-circle text-3xl sm:text-4xl"></i>
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-500 text-center">Semua Data Aman!</p>
                                    <p className="text-[9px] sm:text-[10px] mt-1 text-center opacity-70">Tidak ada kandidat pending melewati batas kritis.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4 pb-2">
                                    {alerts.highRisk > 0 && (
                                        <div className="p-3 sm:p-4 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-gray-800/50 rounded-xl sm:rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-rose-500/10 rounded-bl-full"></div>
                                            <div className="flex items-start gap-2.5 sm:gap-3 relative z-10">
                                                <div className="bg-rose-100 dark:bg-rose-900/50 p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                                                    <i className="ph-fill ph-siren text-lg sm:text-xl animate-pulse"></i>
                                                </div>
                                                <div>
                                                    <span className="text-rose-700 dark:text-rose-400 font-black text-xs sm:text-sm block mb-0.5 sm:mb-1">
                                                        {alerts.highRisk} Kandidat &gt; 7 Hari
                                                    </span>
                                                    <span className="text-rose-600/80 dark:text-rose-400/80 text-[9px] sm:text-xs font-medium leading-relaxed block">
                                                        Risiko sangat tinggi. Segera eksekusi di menu <b className="underline decoration-dashed cursor-help">Follow Up</b>.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {alerts.mediumRisk > 0 && (
                                        <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-800/50 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-bl-full"></div>
                                            <div className="flex items-start gap-2.5 sm:gap-3 relative z-10">
                                                <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                                                    <i className="ph-fill ph-clock-countdown text-lg sm:text-xl"></i>
                                                </div>
                                                <div>
                                                    <span className="text-amber-700 dark:text-amber-400 font-black text-xs sm:text-sm block mb-0.5 sm:mb-1">
                                                        {alerts.mediumRisk} Kandidat &gt; 3 Hari
                                                    </span>
                                                    <span className="text-amber-600/80 dark:text-amber-400/80 text-[9px] sm:text-xs font-medium leading-relaxed block">
                                                        {isPrivileged ? 'Arahkan staf terkait untuk update kepastian.' : 'Segera follow up dan update status kandidat ini.'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
