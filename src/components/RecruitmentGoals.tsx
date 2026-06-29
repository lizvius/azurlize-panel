import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const RecruitmentGoals = ({ authUser }) => {
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    const isPrivileged = authUser && hasEditAccess('goals', authUser.role);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async (showLoading = false) => {
            if (showLoading) setIsLoading(true);
            try {
                const res = await fetch(SCRIPT_URL, { 
                    method: 'POST', 
                    body: JSON.stringify({ action: 'getDailyData', role: authUser?.role, username: authUser?.username, name: authUser?.name }) 
                });
                const result = await res.json();
                
                const resUsers = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
                const userResult = await resUsers.json();
                if (userResult.status === 'success' && isMounted) {
                    setUsers(Array.isArray(userResult.data) ? userResult.data : []);
                }

                if (result.status === 'success' && isMounted) { 
                    let fetchedData = Array.isArray(result.data) ? result.data : [];
                    if (!isPrivileged) {
                        fetchedData = fetchedData.filter(d => d.recruiter === authUser?.username || d.recruiter === authUser?.name);
                    }
                    setData(fetchedData); 
                }
            } catch (error) {
                console.error(error);
            } finally { 
                if (showLoading && isMounted) setIsLoading(false); 
            }
        };
        
        fetchData(false);
        
        const handleSync = () => {
            fetchData(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        
        return () => {
            isMounted = false;
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, [authUser, isPrivileged]);

    // ========================================================
    // LOGIKA PERIODE AKTIF (Senin - Minggu, Reset Senin 16:00)
    // ========================================================
    const getActiveWeekDates = () => {
        const now = new Date();
        const currentDay = now.getDay(); 

        let referenceDate = new Date(now);
        referenceDate.setHours(0, 0, 0, 0);

        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        referenceDate.setDate(referenceDate.getDate() + diffToMonday);

        const activeDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(referenceDate);
            d.setDate(d.getDate() + i);
            activeDates.push(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
        }
        return activeDates;
    };

    const activeDates = getActiveWeekDates();

    // ========================================================
    // LOGIKA TARGET BERSUMBER DARI USER ACCOUNT
    // ========================================================
    
    // 1. Ambil HANYA daftar staf dari Akun yang Aktif
    const activeStaffs = users.filter(u => u.role === 'Staff' && u.status === 'Aktif');
    
    // 2. Tentukan Target Tim (3/Hari * 7 Hari = 21 per Staf)
    const targetPerRecruiter = 21; 
    // FIX: Target murni berdasarkan jumlah staf aktif. Jika 0 staf = 0 target
    const targetCompany = activeStaffs.length * targetPerRecruiter; 

    // 3. Hanya ambil data berstatus 'Acc' dan masuk periode minggu ini
    // 3. Hanya ambil data berstatus 'Acc' dan masuk periode minggu ini (Timezone Safe)
    const validData = data.filter(d => {
    // Pastikan status Acc
        const isAcc = d.results && d.results.trim().toLowerCase() === 'acc';
        if (!isAcc) return false;

        let datePart = '';
        if (d.tanggal) {
            // Konversi ke objek Date JavaScript
            const dObj = new Date(d.tanggal);
        
            // Jika valid, ubah ke waktu lokal (WIB/WITA/WIT) lalu ambil format YYYY-MM-DD
            if (!isNaN(dObj.getTime())) {
                datePart = new Date(dObj.getTime() - (dObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            } else {
             // Fallback jika berupa teks murni
                datePart = d.tanggal.split('T')[0];
            }
        }

        // Cocokkan dengan array activeDates minggu ini
        return activeDates.includes(datePart);
    });

    // 4. Siapkan Wadah (Map) berdasarkan Username Akun
    const progressMap: Record<string, any> = {};
    activeStaffs.forEach(u => {
        if (isPrivileged || u.username === authUser?.username || u.name === authUser?.name) {
            progressMap[u.username] = { 
                username: u.username,
                fullName: u.name, 
                role: u.role, 
                acc: 0 
            };
        }
    });

    // 5. Cocokkan data ACC dengan Akun
    validData.forEach(curr => { 
        const rec = (curr.recruiter || '').trim().toLowerCase(); 
        
        const matchedUser = activeStaffs.find(u => 
            (u.username && u.username.toLowerCase() === rec) || 
            (u.name && u.name.toLowerCase() === rec)
        );

        if (matchedUser) {
            if (progressMap[matchedUser.username]) {
                progressMap[matchedUser.username].acc += 1;
            }
        } else {
            const originalRec = curr.recruiter || 'Unknown';
            if (isPrivileged || originalRec === authUser?.username || originalRec === authUser?.name) {
                if (!progressMap[originalRec]) {
                    progressMap[originalRec] = { 
                        username: originalRec, 
                        fullName: originalRec, 
                        role: 'Non-Staff / Arsip', 
                        acc: 0 
                    };
                }
                progressMap[originalRec].acc += 1;
            }
        }
    });

    // 6. Urutkan berdasarkan pencapaian tertinggi
    const progressArray = Object.values(progressMap).sort((a, b) => b.acc - a.acc);

    // Kalkulasi Angka di Banner Utama
    const totalAcc = progressArray.reduce((sum, staff) => sum + staff.acc, 0);
    const activeTarget = isPrivileged ? targetCompany : targetPerRecruiter;
    // FIX: Cegah error pembagian oleh 0 (NaN) jika activeTarget adalah 0
    const companyProgress = activeTarget > 0 ? Math.min(Math.round((totalAcc / activeTarget) * 100), 100) : 0;

    // Fungsi Pengambilan Gaya Role
    const getRoleStyle = (role) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { avatarBg: 'bg-[#e73a4b]', icon: 'ph-fill ph-crown text-[#e73a4b]', badge: 'bg-[#e73a4b]/10 text-[#e73a4b] border-[#e73a4b]/20' };
        if (r === 'admin') return { avatarBg: 'bg-[#2563eb]', icon: 'ph-fill ph-shield-check text-[#2563eb]', badge: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20' };
        if (r === 'non-staff / arsip') return { avatarBg: 'bg-gray-500', icon: 'ph-fill ph-archive text-gray-500', badge: 'bg-gray-100 text-gray-500 border-gray-200' };
        return { avatarBg: 'bg-[#f59e0b]', icon: 'ph-fill ph-user text-[#f59e0b]', badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' };
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* 1. MAIN BANNER (Premium Glassmorphism) */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-6 sm:p-8 lg:p-10 rounded-[32px] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden gap-8 md:gap-12 border border-indigo-500/20">
                
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none"></div>
                <i className="ph-fill ph-target absolute -right-10 md:right-10 top-1/2 -translate-y-1/2 opacity-[0.03] text-[200px] md:text-[300px] pointer-events-none"></i>
                
                <div className="z-10 w-full md:w-auto text-center md:text-left flex flex-col items-center md:items-start">
                    <div className="inline-flex items-center gap-2 text-indigo-300 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-4 bg-indigo-950/50 px-3 py-1.5 rounded-full border border-indigo-800/50">
                        <i className="ph-bold ph-flag-banner text-sm"></i>
                        Target {isPrivileged ? 'Keseluruhan Tim' : 'Individu Pribadi'}
                    </div>
                    <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-2 md:mb-4 tracking-tight drop-shadow-lg flex items-baseline gap-2">
                        {totalAcc} <span className="text-2xl sm:text-3xl text-indigo-400 font-medium">/ {activeTarget}</span>
                    </div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest border shadow-lg backdrop-blur-sm ${companyProgress >= 100 && activeTarget > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-indigo-500/20'}`}>
                        <i className={`ph-bold ${companyProgress >= 100 && activeTarget > 0 ? 'ph-check-circle' : 'ph-trend-up'} mr-2 text-base sm:text-lg`}></i> 
                        {companyProgress >= 100 && activeTarget > 0 ? 'Target Terpenuhi!' : 'Sedang Berjalan'}
                    </div>
                </div>
                
                <div className="z-10 w-full md:w-1/2 bg-white/5 p-5 sm:p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-end text-sm mb-3 font-black text-gray-300 uppercase tracking-widest">
                        <span>Pencapaian Mingguan</span>
                        <span className="text-xl sm:text-2xl text-white">{companyProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-900/80 rounded-full h-4 sm:h-5 overflow-hidden shadow-inner p-0.5 border border-white/5">
                        <div 
                            className={`h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out ${companyProgress >= 100 && activeTarget > 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                            style={{ width: `${companyProgress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gray-400 mt-3">
                        <span>0 ACC</span>
                        <span>{activeTarget} ACC</span>
                    </div>
                    {isPrivileged && (
                        <div className="text-[9px] text-indigo-300 mt-3 pt-2 border-t border-white/10 text-right">
                            *Dihitung dari total {activeStaffs.length} Staf Aktif x 3 perhari = 21 ACC
                        </div>
                    )}
                </div>
            </div>

            {/* 2. LOADING & KOSONG */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
                    <i className="ph-bold ph-spinner ph-spin text-5xl mb-4 drop-shadow-md"></i>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">Memuat Data Target...</span>
                </div>
            )}

            {!isLoading && progressArray.length === 0 && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <i className="ph-fill ph-target text-4xl"></i>
                    </div>
                    <h3 className="text-gray-900 dark:text-white font-black text-lg mb-1">Belum Ada Staf/Data</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-sm">Daftar staf aktif masih kosong atau target belum tercapai minggu ini.</p>
                </div>
            )}

            {/* 3. GRID KARTU STAF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {!isLoading && progressArray.map((staff, i) => {
                    const pct = Math.min(Math.round((staff.acc / targetPerRecruiter) * 100) || 0, 100);
                    const isDone = pct >= 100;
                    const style = getRoleStyle(staff.role);
                    
                    const initialLetter = (staff.fullName && typeof staff.fullName === 'string' && staff.fullName.trim() !== '') 
                        ? staff.fullName.charAt(0).toUpperCase() 
                        : (staff.username && typeof staff.username === 'string' && staff.username.trim() !== '')
                            ? staff.username.charAt(0).toUpperCase()
                            : <i className="ph-bold ph-user"></i>;

                    return (
                        <div key={i} className="bg-white/90 dark:bg-[#151a23]/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-[24px] p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                            
                            {isDone && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>}

                            <div className="flex items-center gap-3 sm:gap-4 mb-6">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl text-white shrink-0 shadow-sm ${style.avatarBg} relative`}>
                                    {initialLetter}
                                    {isDone && (
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                                            <div className="bg-emerald-500 text-white rounded-full p-1 shadow-sm">
                                                <i className="ph-bold ph-check text-[10px]"></i>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="font-black text-gray-900 dark:text-white text-sm sm:text-base truncate flex items-center flex-wrap gap-1.5 mb-1">
                                        <i className={`${style.icon} text-sm`}></i>
                                        <span className="truncate">{staff.fullName}</span>
                                        <span className={`px-2 py-0.5 text-[8px] sm:text-[9px] rounded uppercase tracking-widest border ${style.badge} shrink-0`}>
                                            {staff.role}
                                        </span>
                                    </div>
                                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-[#f23d5b] dark:text-[#f23d5b] truncate">
                                        {staff.username}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-4 bg-gray-50/50 dark:bg-gray-900/30 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                <div>
                                    <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        Total ACC
                                    </div>
                                    <div className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white flex items-baseline gap-1.5">
                                        {staff.acc} <span className="text-sm text-gray-400 font-bold">/ {targetPerRecruiter}</span>
                                    </div>
                                </div>
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                                    <i className={`ph-fill ${isDone ? 'ph-medal' : 'ph-target'} text-xl sm:text-2xl ${isDone ? 'animate-bounce' : ''}`}></i>
                                </div>
                            </div>

                            <div className="w-full">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                    <span className={isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>
                                        {isDone ? 'Tercapai Penuh!' : 'Progress Target'}
                                    </span>
                                    <span className={isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}>
                                        {pct}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner p-[1px] border border-gray-200 dark:border-gray-700/50">
                                    <div 
                                        className={`h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} 
                                        style={{ width: `${pct}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
};
