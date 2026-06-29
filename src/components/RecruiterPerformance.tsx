import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const RecruiterPerformance = ({ authUser }) => {
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    const isPrivileged = authUser && hasEditAccess('performance', authUser.role);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async (showLoading = false) => {
            if (showLoading) setIsLoading(true);
            try {
                const res = await fetch(SCRIPT_URL, { 
                    method: 'POST', 
                    body: JSON.stringify({ action: 'getDailyData', role: authUser ? authUser.role : null, username: authUser ? authUser.username : null, name: authUser ? authUser.name : null }) 
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
                        fetchedData = fetchedData.filter(d => d.recruiter === authUser.username || d.recruiter === authUser.name);
                    }
                    setData(fetchedData); 
                }
            } catch (error) {} finally { if (showLoading && isMounted) setIsLoading(false); }
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

    const getRoleStyle = (role) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { 
            avatarBg: 'bg-[#e73a4b]', 
            icon: 'ph-fill ph-crown text-[#e73a4b]', 
            badge: 'bg-[#e73a4b]/10 text-[#e73a4b] border-[#e73a4b]/20',
            borderGlow: 'border-[#e73a4b]/30'
        };
        if (r === 'admin') return { 
            avatarBg: 'bg-[#2563eb]', 
            icon: 'ph-fill ph-shield-check text-[#2563eb]', 
            badge: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20',
            borderGlow: 'border-[#2563eb]/30'
        };
        return { 
            avatarBg: 'bg-[#f59e0b]', 
            icon: 'ph-fill ph-user text-[#f59e0b]', 
            badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
            borderGlow: 'border-[#f59e0b]/30'
        };
    };

    const getMondayStr = (dateInput) => {
        if (!dateInput) return "";
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "";
        const localDay = d.getDay() || 7;
        const target = new Date(d.getTime());
        target.setDate(d.getDate() - localDay + 1);
        return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    };

    const getOffsetMondayStr = (offsetWeeks = 0) => {
        const d = new Date();
        const day = d.getDay() || 7;
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - day + 1 + (offsetWeeks * 7));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const currentWeekMonday = getOffsetMondayStr(0);

    const performanceMap = data.filter(d => d && d.tanggal && getMondayStr(d.tanggal) === currentWeekMonday).reduce((acc, curr) => {
        const rec = curr.recruiter || 'Unknown';
        if (!acc[rec]) acc[rec] = { total: 0, acc: 0 };
        acc[rec].total += 1;
        if (curr.results === 'Acc') acc[rec].acc += 1;
        return acc;
    }, {});

    const performanceArray = Object.keys(performanceMap).map(username => {
        const userDb = users.find(u => u.username === username);
        const fullName = userDb ? userDb.name : username;
        const role = userDb ? userDb.role : 'Staff';
        const stats = performanceMap[username];
        const convRate = stats.total > 0 ? Math.round((stats.acc / stats.total) * 100) : 0;
        return { username, fullName, role, ...stats, convRate };
    }).sort((a, b) => b.acc - a.acc || b.total - a.total); 

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12 w-full">
            
            {/* HEADER BANNER */}
            <div className="bg-white/60 dark:bg-gray-800/60 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm w-full mx-auto">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                <i className="ph-bold ph-medal text-xl sm:text-2xl"></i>
                            </div>
                            Kinerja Recruiter
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed max-w-2xl">
                            Analisis efektivitas konversi setiap anggota tim operasi. Data diurutkan berdasarkan jumlah kandidat ACC terbanyak ke terendah secara otomatis.
                        </p>
                    </div>
                    {!isLoading && performanceArray.length > 0 && (
                        <div className="flex gap-3 mt-2 md:mt-0">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-4 py-2.5 rounded-xl">
                                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Total Staf Terdata</div>
                                <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">{performanceArray.length} <span className="text-sm font-bold text-indigo-400 dark:text-indigo-500">Orang</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* STATE LOADING / KOSONG */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-500 w-full">
                    <i className="ph-bold ph-spinner ph-spin text-5xl mb-4 drop-shadow-md"></i>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">Mengkalkulasi Kinerja...</span>
                </div>
            ) : performanceArray.length === 0 ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center shadow-sm w-full mx-auto">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <i className="ph-fill ph-users-three text-4xl"></i>
                    </div>
                    <h3 className="text-gray-900 dark:text-white font-black text-lg mb-1">Data Belum Tersedia</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-sm">Belum ada aktivitas konversi pelamar yang masuk ke sistem kami.</p>
                </div>
            ) : (
                /* PERBAIKAN: Mengatur Grid Responsif. 
                   Satu kolom (full width) di HP.
                   Dua kolom di layar menengah (Tablet).
                   Tiga kolom di Desktop.
                   Serta menambahkan p-2 (padding) agar shadow/bayangan kartu tidak terpotong. */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 p-2 w-full mx-auto">
                    {performanceArray.map((staff, i) => {
                        const rank = i + 1;
                        const isTopThree = rank <= 3;
                        const style = getRoleStyle(staff.role);
                        const initialLetter = (staff.fullName && typeof staff.fullName === 'string' && staff.fullName.trim() !== '') 
                            ? staff.fullName.charAt(0).toUpperCase() 
                            : (staff.username && typeof staff.username === 'string' && staff.username.trim() !== '')
                                ? staff.username.charAt(0).toUpperCase()
                                : <i className="ph-bold ph-user"></i>;

                        return (
                            <div key={i} className={`bg-white dark:bg-[#151a23] backdrop-blur-xl border rounded-[24px] p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group ${isTopThree ? 'border-amber-200 dark:border-amber-900/40' : 'border-gray-200/80 dark:border-gray-700/60 hover:' + style.borderGlow}`}>
                                
                                <i className={`ph-fill ${isTopThree ? 'ph-crown' : 'ph-lightning'} absolute -top-4 -right-4 text-8xl opacity-[0.03] dark:opacity-[0.04] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700 pointer-events-none ${isTopThree ? 'text-amber-500' : 'text-indigo-500'}`}></i>

                                {isTopThree && (
                                    <div className={`absolute top-0 right-0 px-3 py-1.5 text-[10px] font-black text-white rounded-bl-2xl shadow-sm z-10 flex items-center ${rank === 1 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : rank === 2 ? 'bg-gradient-to-r from-gray-400 to-slate-400' : 'bg-gradient-to-r from-amber-700 to-orange-800'}`}>
                                        <i className="ph-fill ph-medal mr-1"></i> Peringkat #{rank}
                                    </div>
                                )}

                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl text-white shrink-0 shadow-sm border-2 ${isTopThree ? 'border-amber-100 dark:border-amber-500/30' : 'border-transparent'} ${style.avatarBg}`}>
                                        {initialLetter}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-black text-gray-900 dark:text-white text-base truncate flex items-center flex-wrap gap-1.5 mb-1">
                                            <i className={`${style.icon} text-sm`}></i>
                                            <span className="truncate max-w-[120px] sm:max-w-xs">{staff.fullName}</span>
                                            <span className={`px-2 py-0.5 text-[9px] rounded uppercase tracking-widest border ${style.badge} shrink-0`}>
                                                {staff.role}
                                            </span>
                                        </div>
                                        <div className="text-[11px] font-mono font-bold text-[#f23d5b] dark:text-[#f23d5b] truncate">
                                            {staff.username}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center"><i className="ph-bold ph-users mr-1"></i> Total Leads</div>
                                        <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{staff.total}</div>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/40 flex flex-col justify-center shadow-sm">
                                        <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1 flex items-center"><i className="ph-bold ph-check-circle mr-1"></i> Goal ACC</div>
                                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{staff.acc}</div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversion Rate</div>
                                        <div className={`text-base font-black ${staff.convRate >= 30 ? 'text-emerald-500' : staff.convRate >= 10 ? 'text-indigo-500' : 'text-gray-500'}`}>
                                            {staff.convRate}%
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner p-[1px] border border-gray-200 dark:border-gray-700/50">
                                        <div 
                                            className={`h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out ${
                                                staff.convRate >= 30 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 
                                                staff.convRate >= 10 ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 
                                                'bg-gradient-to-r from-gray-400 to-gray-500'
                                            }`} 
                                            style={{ width: `${staff.convRate}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 text-right mt-2">
                                        Rasio (ACC / Leads)
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
