import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const ChannelPerformance = ({ authUser }) => {
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Instagram');

    const isPrivileged = authUser && hasEditAccess('channels', authUser.role);

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

    // Konfigurasi Tab Platform
    const TAB_CHANNELS = [
        { id: 'Instagram', name: 'Instagram', icon: 'ph-instagram-logo', grad: 'from-pink-500 to-rose-500', bgGlow: 'bg-pink-500/10' },
        { id: 'TikTok', name: 'TikTok', icon: 'ph-tiktok-logo', grad: 'from-gray-700 to-black dark:from-gray-400 dark:to-gray-500', bgGlow: 'bg-gray-500/10' },
        { id: 'Facebook', name: 'Facebook', icon: 'ph-facebook-logo', grad: 'from-blue-500 to-blue-700', bgGlow: 'bg-blue-500/10' },
        { id: 'WhatsApp', name: 'WhatsApp', icon: 'ph-whatsapp-logo', grad: 'from-emerald-500 to-teal-600', bgGlow: 'bg-emerald-500/10' },
        { id: 'Telegram', name: 'Telegram', icon: 'ph-telegram-logo', grad: 'from-sky-400 to-blue-500', bgGlow: 'bg-sky-500/10' },
        { id: 'S Lemon App', name: 'S Lemon App', icon: 'ph-lemon', grad: 'from-amber-400 to-orange-500', bgGlow: 'bg-amber-500/10' },
        { id: 'Other', name: 'X', icon: 'ph-x-logo', grad: 'from-gray-800 to-black', bgGlow: 'bg-gray-800/10' }
    ];

    // Fungsi Pengambilan Gaya Sesuai Role (Sesuai Screenshot User Account + Badge)
    const getRoleStyle = (role) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { 
            avatarBg: 'bg-[#e73a4b]', 
            icon: 'ph-fill ph-crown text-[#e73a4b]', 
            cardBorder: 'border-[#e73a4b]/40 dark:border-[#e73a4b]/30',
            badge: 'bg-[#e73a4b]/10 text-[#e73a4b] border-[#e73a4b]/20'
        };
        if (r === 'admin') return { 
            avatarBg: 'bg-[#2563eb]', 
            icon: 'ph-fill ph-shield-check text-[#2563eb]', 
            cardBorder: 'border-[#2563eb]/40 dark:border-[#2563eb]/30',
            badge: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20'
        };
        // Default untuk Staff / User
        return { 
            avatarBg: 'bg-[#f59e0b]', 
            icon: 'ph-fill ph-user text-[#f59e0b]', 
            cardBorder: 'border-[#f59e0b]/40 dark:border-[#f59e0b]/30',
            badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
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

    const getLeaderboardData = (channelId) => {
        const currentWeekMonday = getOffsetMondayStr(0);
        const filteredLeads = data.filter(d => {
            if (!d || !d.tanggal || getMondayStr(d.tanggal) !== currentWeekMonday) return false;
            const ch = (d.channels || '').toLowerCase().trim();
            if (channelId === 'Instagram') return ch === 'instagram' || ch === 'ig';
            if (channelId === 'TikTok') return ch === 'tiktok' || ch === 'tt';
            if (channelId === 'Facebook') return ch === 'facebook' || ch === 'fb';
            if (channelId === 'WhatsApp') return ch === 'whatsapp' || ch === 'wa';
            if (channelId === 'Telegram') return ch === 'telegram' || ch === 'tele';
            if (channelId === 'S Lemon App') return ch === 's lemon app' || ch === 'lemon';
            if (channelId === 'Other') {
                const known = ['instagram', 'ig', 'tiktok', 'tt', 'facebook', 'fb', 'whatsapp', 'wa', 'telegram', 'tele', 's lemon app', 'lemon'];
                return !known.includes(ch);
            }
            return false;
        });

        const staffMap = {};
        filteredLeads.forEach(lead => {
            const rec = lead.recruiter || 'Unknown';
            if (!staffMap[rec]) staffMap[rec] = { count: 0, acc: 0 };
            staffMap[rec].count += 1;
            if (lead.results === 'Acc') staffMap[rec].acc += 1;
        });

        return Object.keys(staffMap).map(username => {
            const userDb = users.find(u => u.username === username);
            const fullName = userDb ? userDb.name : username;
            const role = userDb ? userDb.role : 'Staff'; 
            
            const sData = staffMap[username];
            const convRate = sData.count > 0 ? Math.round((sData.acc / sData.count) * 100) : 0;
            
            return { username, fullName, role, ...sData, convRate };
        }).sort((a, b) => b.acc - a.acc || b.count - a.count);
    };

    const leaderboard = getLeaderboardData(activeTab);
    const activeTabInfo = TAB_CHANNELS.find(t => t.id === activeTab);

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">
            
            <div className="bg-white/60 dark:bg-gray-800/60 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 lg:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                        <i className="ph-bold ph-ranking text-base sm:text-xl"></i>
                    </div>
                    Platform Leaderboard
                </h2>
                <p className="text-[11px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2 leading-relaxed">
                    Peringkat efektivitas tim berdasarkan platform. Tampilan terhubung dengan data akun staf.
                </p>
            </div>

            <div className="flex bg-white/80 dark:bg-gray-800/80 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-x-auto hide-scrollbar shadow-sm gap-1 w-full snap-x">
                {TAB_CHANNELS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-black whitespace-nowrap transition-all duration-300 snap-center ${
                                isActive 
                                    ? `bg-gradient-to-r ${tab.grad} text-white shadow-md transform scale-[1.02]` 
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/40'
                            }`}
                        >
                            <i className={`ph-bold ${tab.icon} text-sm sm:text-lg`}></i>
                            {tab.name}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white/90 dark:bg-[#151a23]/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden relative min-h-[400px]">
                <div className={`absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 ${activeTabInfo.bgGlow} rounded-full blur-3xl pointer-events-none transition-all duration-500`}></div>

                <div className="p-4 sm:p-5 lg:p-6 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 sm:mb-6 border-b border-gray-100 dark:border-gray-700/50 pb-3 sm:pb-4 gap-2">
                        <h3 className="font-black text-sm sm:text-base lg:text-lg flex items-center text-gray-800 dark:text-white uppercase tracking-wider">
                            <i className={`ph-fill ${activeTabInfo.icon} mr-2 text-lg sm:text-xl lg:text-2xl`}></i>
                            Jalur {activeTabInfo.name}
                        </h3>
                        <span className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-inner w-max">
                            {leaderboard.length} Staf Bersaing
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <i className="ph-bold ph-spinner ph-spin text-4xl mb-3 text-indigo-500"></i>
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Kalkulasi Peringkat...</p>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <i className="ph-fill ph-ghost text-5xl mb-3 opacity-40"></i>
                            <p className="text-xs sm:text-sm font-bold px-4">Belum ada pergerakan / staf yang input data di jalur ini.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            {leaderboard.map((staff, index) => {
                                const rank = index + 1;
                                const isTopThree = rank <= 3;
                                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                                
                                const style = getRoleStyle(staff.role);

                                return (
                                    <div 
                                        key={staff.username} 
                                        className={`flex flex-col md:flex-row items-start md:items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 gap-3 sm:gap-4 relative overflow-hidden shadow-sm hover:-translate-y-0.5 bg-white dark:bg-[#1a202c]/50 ${style.cardBorder}`}
                                    >
                                        {/* BAGIAN KIRI: Rank & Profil */}
                                        <div className="flex items-center gap-2.5 sm:gap-4 w-full md:w-auto min-w-0">
                                            
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
                                                {isTopThree ? (
                                                    <span className="text-xl sm:text-2xl drop-shadow-md select-none">{medal}</span>
                                                ) : (
                                                    <span className="text-[10px] sm:text-xs font-black text-gray-500 font-mono">#{rank}</span>
                                                )}
                                            </div>

                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl text-white shrink-0 shadow-sm ${style.avatarBg}`}>
                                                {(staff.fullName && typeof staff.fullName === 'string' && staff.fullName.trim() !== '') 
                                                    ? staff.fullName.charAt(0).toUpperCase() 
                                                    : (staff.username && typeof staff.username === 'string' && staff.username.trim() !== '')
                                                        ? staff.username.charAt(0).toUpperCase()
                                                        : <i className="ph-bold ph-user"></i>}
                                            </div>

                                            <div className="min-w-0 flex-1 ml-1">
                                                <div className="font-black text-gray-900 dark:text-white text-xs sm:text-sm lg:text-base truncate flex items-center flex-wrap gap-1.5 mb-0.5">
                                                    <i className={`${style.icon} text-[14px]`}></i>
                                                    <span className="truncate">{staff.fullName}</span>
                                                    
                                                    {/* ================================== */}
                                                    {/* BADGE ROLE BARU DITAMBAHKAN DI SINI */}
                                                    {/* ================================== */}
                                                    <span className={`px-2 py-0.5 text-[8px] sm:text-[9px] rounded uppercase tracking-widest border ${style.badge} shrink-0`}>
                                                        {staff.role}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] sm:text-xs font-mono font-bold text-[#f23d5b] dark:text-[#f23d5b] truncate mt-0.5">
                                                    {staff.username}
                                                </div>
                                            </div>
                                        </div>

                                        {/* BAGIAN KANAN: Statistik Responsif */}
                                        <div className="flex flex-row items-center justify-between w-full md:w-auto border-t md:border-0 border-gray-100 dark:border-gray-700/50 pt-2.5 md:pt-0 gap-3 sm:gap-6 lg:gap-8">
                                            
                                            <div className="hidden sm:block w-24 md:w-32 lg:w-48 text-left">
                                                <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">
                                                    <span>Konversi</span>
                                                    <span className="font-black text-gray-700 dark:text-gray-300">{staff.convRate}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 sm:h-1.5 overflow-hidden shadow-inner">
                                                    <div className={`h-full bg-gradient-to-r ${activeTabInfo.grad} transition-all duration-1000`} style={{ width: `${staff.convRate}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4 text-right w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="flex flex-col items-start sm:items-end">
                                                    <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Leads</div>
                                                    <div className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300 mt-0.5">{staff.count}</div>
                                                </div>
                                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-center shadow-sm">
                                                    <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Goal ACC</div>
                                                    <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{staff.acc}</div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
