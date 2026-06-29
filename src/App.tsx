import React, { useState, useEffect } from 'react';
import { Login, Register } from './components/Auth';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AnnouncementCenter } from './components/AnnouncementCenter';
import { FollowUpCenter } from './components/FollowUpCenter';
import { RecruiterPerformance } from './components/RecruiterPerformance';
import { RecruitmentGoals } from './components/RecruitmentGoals';
import { ChannelPerformance } from './components/ChannelPerformance';
import { DailyData } from './components/DailyData';
import { DailyStats } from './components/DailyStats';
import { Payroll } from './components/Payroll';
import { UserManagement } from './components/UserManagement';
import { SystemSettings } from './components/SystemSettings';
import { InstallPWA } from './components/InstallPWA';
import { BannerGenerator } from './components/BannerGenerator';
import { LandingPage } from './components/LandingPage';
import { SuperadminTools } from './components/SuperadminTools';
import { getSavedPermissions } from './utils';

export default function App() {
    const [authUser, setAuthUser] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('recruitOps_session');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            return null;
        }
    });
    const [authView, setAuthView] = useState('landing');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => localStorage.getItem('recruitOps_theme') === 'dark');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [lastSynced, setLastSynced] = useState<Date>(new Date());
    const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
    const [permissions, setPermissions] = useState(() => getSavedPermissions());

    useEffect(() => {
        const handlePermsUpdated = () => {
            setPermissions(getSavedPermissions());
        };
        window.addEventListener('permissionsUpdated', handlePermsUpdated);
        return () => window.removeEventListener('permissionsUpdated', handlePermsUpdated);
    }, []);

    const triggerGlobalSync = () => {
        setIsSyncingGlobal(true);
        window.dispatchEvent(new Event('refreshActiveTab'));
        setTimeout(() => {
            setLastSynced(new Date());
            setIsSyncingGlobal(false);
        }, 1000);
    };

    useEffect(() => {
        if (!authUser) return;
        const syncInterval = setInterval(() => {
            triggerGlobalSync();
        }, 25000);
        return () => clearInterval(syncInterval);
    }, [authUser]);

    useEffect(() => {
        try {
            const isFramed = window.self !== window.top;
            if (isFramed) {
                const referrer = document.referrer || "";
                const isTrusted = referrer.includes("ai.studio") || 
                                  referrer.includes("localhost") || 
                                  referrer.includes("google.com");
                if (!isTrusted && window.top) {
                    window.top.location.href = window.self.location.href;
                }
            }
        } catch (e) {
            console.warn("Anti-frame breakout bypassed by browser policy:", e);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        setTimeout(() => setIsCheckingSession(false), 300);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('recruitOps_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('recruitOps_theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        if (authUser)
            setActiveTab(authUser.role === 'Staff' ? 'daily_stats' : 'dashboard');
        }, [authUser]);
    
    useEffect(() => {
        const changeTab = (tab: string) => () => setActiveTab(tab);
        
        const listeners: Record<string, () => void> = {
            openDashboard: changeTab("dashboard"),
            openAnnouncement: changeTab("announcement"),
            openFollowUp: changeTab("follow_up"),
            openPerformance: changeTab("performance"),
            openGoals: changeTab("goals"),
            openChannels: changeTab("channels"),
            openDailyData: changeTab("daily_data"),
            openDailyStats: changeTab("daily_stats"),
            openPayroll: changeTab("payroll"),
            openUsers: changeTab("users"),
            openSettings: changeTab("settings")
        };
        
        Object.entries(listeners).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
        });
        
        return () => {
            Object.entries(listeners).forEach(([event, handler]) => {
                window.removeEventListener(event, handler);
            });
        };
    }, []);

    useEffect(() => {
        const checkUnread = () => {
            if (!authUser) return;
            try {
                const savedPosts = localStorage.getItem('recruitOps_announcements');
                const savedReads = localStorage.getItem(`recruitOps_read_${authUser.username}`);
                
                if (savedPosts) {
                    const posts = JSON.parse(savedPosts);
                    const readPosts = savedReads ? JSON.parse(savedReads) : [];
                    
                    const unreadCount = posts.filter((p: any) => !readPosts.includes(p.id)).length;
                    setUnreadAnnouncements(unreadCount);
                }
            } catch (e) {}
        };
        
        checkUnread(); 
        const intv = setInterval(checkUnread, 1000); 
        return () => clearInterval(intv);
    }, [authUser]);

    const login = (user: any) => { 
        let validRole = user.role ? user.role.toString().trim() : 'Staff'; 
        validRole = validRole.charAt(0).toUpperCase() + validRole.slice(1).toLowerCase(); 
        if (!['Superadmin', 'Admin', 'Staff'].includes(validRole)) validRole = 'Staff'; 
        const finalUser = { ...user, role: validRole }; 
        setAuthUser(finalUser); 
        localStorage.setItem('recruitOps_session', JSON.stringify(finalUser)); 
    };
    
    const logout = () => { 
        setAuthUser(null); 
        localStorage.removeItem('recruitOps_session'); 
        setAuthView('login'); 
    };
    
    const changeTab = (id: string) => { 
        setActiveTab(id); 
        if(isMobile) setSidebarOpen(false); 
    };

    if (isCheckingSession) return (<div className={`h-dvh flex items-center justify-center ${isDark ? 'dark bg-gray-900' : 'bg-[#F8FAFC]'}`}><div className="flex flex-col items-center"><i className="ph-bold ph-spinner ph-spin text-4xl text-indigo-600 dark:text-indigo-400 mb-4"></i><span className="text-gray-500 dark:text-gray-400 font-bold text-sm">Memuat ruang kerja...</span></div></div>);
    
    if (!authUser) return (
        <div className={isDark ? 'dark' : ''}>
            {authView === 'landing' ? (
                <LandingPage 
                    onOpenAuth={(view: any) => setAuthView(view)} 
                    isDark={isDark} 
                    onToggleDark={() => setIsDark(!isDark)} 
                />
            ) : authView === 'login' ? (
                <Login 
                    onLogin={login} 
                    onNavigateRegister={() => setAuthView('register')} 
                    onBack={() => setAuthView('landing')} 
                    isDark={isDark} 
                    onToggleDark={() => setIsDark(!isDark)} 
                />
            ) : (
                <Register 
                    onRegister={login} 
                    onNavigateLogin={() => setAuthView('login')} 
                    onBack={() => setAuthView('login')} 
                    isDark={isDark} 
                    onToggleDark={() => setIsDark(!isDark)} 
                />
            )}
        </div>
    );

    const NAVIGATION = [
        { s: 'Overview', allowed: ['Superadmin', 'Admin', 'Staff'], items: [
            { id: 'dashboard', l: 'Dashboard', i: 'ph-squares-four', roles: permissions.dashboard?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'announcement', l: 'Pemberitahuan Dan Chat', i: 'ph-megaphone', roles: permissions.announcement?.view || ['Superadmin', 'Admin', 'Staff'], badge: unreadAnnouncements }, 
            { id: 'follow_up', l: 'Follow Up', i: 'ph-bell-ringing', roles: permissions.follow_up?.view || ['Superadmin', 'Admin', 'Staff'] }
        ] },
        { s: 'Performance', allowed: ['Superadmin', 'Admin', 'Staff'], items: [
            { id: 'performance', l: 'Recruiter Performance', i: 'ph-medal', roles: permissions.performance?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'goals', l: 'Recruitment Goals', i: 'ph-target', roles: permissions.goals?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'channels', l: 'Channel Performance', i: 'ph-megaphone', roles: permissions.channels?.view || ['Superadmin', 'Admin', 'Staff'] }
        ] },
        { s: 'Management', allowed: ['Superadmin', 'Admin', 'Staff'], items: [
            { id: 'daily_data', l: 'Daily Data', i: 'ph-address-book', roles: permissions.daily_data?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'daily_stats', l: 'Daily Stats', i: 'ph-chart-bar', roles: permissions.daily_stats?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'payroll', l: 'Payroll', i: 'ph-currency-circle-dollar', roles: permissions.payroll?.view || ['Superadmin', 'Admin', 'Staff'] }, 
            { id: 'users', l: 'User Accounts', i: 'ph-user-gear', roles: permissions.users?.view || ['Superadmin', 'Admin', 'Staff'] }
        ] },
        { s: 'System', allowed: ['Superadmin'], items: [
            { id: 'settings', l: 'Settings', i: 'ph-gear', roles: permissions.settings?.view || ['Superadmin'] },
            { id: 'superadmin_tools', l: 'Superadmin Tools', i: 'ph-shield-check', roles: ['Superadmin'] }
        ] }
    ].map(sec => ({
        ...sec,
        items: sec.items.filter(item => item.roles.map((r: string) => r.toLowerCase()).includes(authUser.role.toLowerCase()))
    })).filter(sec => sec.items.length > 0 && sec.allowed.map((r: string) => r.toLowerCase()).includes(authUser.role.toLowerCase()));

    let pageTitle = 'Dashboard'; NAVIGATION.forEach(sec => sec.items.forEach(item => { if(item.id === activeTab) pageTitle = item.l; }));

    const renderPageContent = () => {
        switch(activeTab) {
            case 'dashboard': return <ExecutiveDashboard authUser={authUser} />;
            case 'announcement': return <AnnouncementCenter authUser={authUser} />;
            case 'follow_up': return <FollowUpCenter authUser={authUser} />;
            case 'performance': return <RecruiterPerformance authUser={authUser} />;
            case 'goals': return <RecruitmentGoals authUser={authUser} />;
            case 'channels': return <ChannelPerformance authUser={authUser} />;
            case 'daily_data': return <DailyData authUser={authUser} />;
            case 'daily_stats': return <DailyStats authUser={authUser} />;
            case 'payroll': return <Payroll authUser={authUser} />;
            case 'users': return <UserManagement authUser={authUser} />;
            case 'settings': return <SystemSettings />;
            case 'superadmin_tools': return <SuperadminTools authUser={authUser} />;
            default: return <ExecutiveDashboard authUser={authUser} />;
        }
    };

    const bottomNavItems = [...(authUser.role !== 'Staff' ? [{ id: 'dashboard', label: 'Home', icon: 'ph-house' }] : []), { id: 'announcement', label: 'Comm', icon: 'ph-megaphone', badge: unreadAnnouncements }, { id: 'daily_data', label: 'Input', icon: 'ph-address-book' }, { id: 'daily_stats', label: 'Stats', icon: 'ph-chart-bar' }, { id: 'follow_up', label: 'Follow', icon: 'ph-bell-ringing' }];

    const getRoleStyle = (role: string) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { avatarBg: 'bg-[#e73a4b]', textRole: 'text-[#e73a4b]' };
        if (r === 'admin') return { avatarBg: 'bg-[#2563eb]', textRole: 'text-[#2563eb]' };
        return { avatarBg: 'bg-[#f59e0b]', textRole: 'text-[#f59e0b]' };
    };
    
    const roleStyle = getRoleStyle(authUser.role);

    return (
        <div className={`${isDark ? 'dark' : ''} h-dvh overflow-hidden flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors selection:bg-indigo-500/30 w-full max-w-full relative overflow-x-hidden`}>
            {/* Background Ambient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <InstallPWA />
            <div className="flex flex-1 overflow-hidden relative w-full max-w-full overflow-x-hidden">
                
                {/* Mobile Sidebar Overlay */}
                {isMobile && isSidebarOpen && (
                    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
                )}
            
                {/* MODERN SIDEBAR (Desktop & Laptop) */}
                <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl border-r border-gray-200/50 dark:border-gray-800/50 transform transition-transform duration-500 ease-out flex flex-col shadow-[20px_0_40px_rgba(0,0,0,0.05)] lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    
                    {/* Header Logo Sidebar */}
                    <div className="h-20 flex items-center px-6 border-b border-gray-200/50 dark:border-gray-800/50 shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30 shrink-0 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <svg className="w-6 h-6 text-white relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L3 21H7.5L12 11L16.5 21H21L12 2Z" fill="currentColor"/>
                                <path d="M9.5 15H14.5L12 9.5L9.5 15Z" fill="currentColor" fillOpacity="0.4"/>
                            </svg>
                        </div>
                        <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                            Team<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">AzurLize</span>
                        </span>
                        {isMobile && (
                            <button onClick={()=>setSidebarOpen(false)} className="ml-auto w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-rose-500 transition-colors">
                                <i className="ph-bold ph-x"></i>
                            </button>
                        )}
                    </div>
                    
                    {/* Menu Items */}
                    <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar pb-24 lg:pb-6">
                        {NAVIGATION.map((group, idx) => (
                            <div key={idx} className="mb-8">
                                <h4 className="px-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-3">
                                    {group.s}
                                    <div className="flex-1 h-px bg-gray-200/50 dark:bg-gray-800/50"></div>
                                </h4>
                                <nav className="space-y-1.5">
                                    {group.items.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button key={item.id} onClick={()=>changeTab(item.id)} 
                                                className={`w-full relative flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group overflow-hidden ${
                                                    isActive 
                                                    ? 'text-white shadow-md shadow-indigo-500/20 transform scale-[1.02]' 
                                                    : 'text-gray-500 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                                }`}>
                                                
                                                {/* Active Background Component */}
                                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 opacity-95"></div>}
                                                {isActive && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>}
                                                
                                                <div className="relative flex items-center w-full z-10">
                                                    <i className={`${isActive ? 'ph-fill' : 'ph-bold'} ${item.i} text-[22px] mr-3 transition-transform duration-300 ${isActive ? 'scale-110 text-white drop-shadow-sm' : 'group-hover:scale-110 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}></i>
                                                    <span className="tracking-wide text-[13px]">{item.l}</span>
                                                </div>
                                                
                                                {/* Badges */}
                                                {item.badge > 0 && (
                                                    <span className={`absolute right-3 z-10 text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm flex items-center justify-center min-w-[20px] ${
                                                        isActive 
                                                        ? 'bg-white text-indigo-600' 
                                                        : 'bg-rose-500 text-white animate-pulse'
                                                    }`}>
                                                        {item.badge > 99 ? '99+' : item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}
                    </div>
                    
                    {/* Profil Bawah Sidebar Card */}
                    <div className="p-4 mx-4 mb-4 mt-2 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl bg-white/50 dark:bg-[#1a202c]/50 backdrop-blur-md shadow-sm flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
                        <div className="flex items-center min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-white shrink-0 shadow-md ${roleStyle.avatarBg} relative`}>
                                {authUser.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                            </div>
                            <div className="ml-3 min-w-0 pr-2">
                                <p className="text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{authUser.name || 'User'}</p>
                                <p className={`text-[9px] uppercase font-black tracking-widest truncate ${roleStyle.textRole}`}>{authUser.role || 'Staff'}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all shadow-sm shrink-0 bg-gray-50 dark:bg-gray-800">
                            <i className="ph-bold ph-sign-out text-lg"></i>
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-24 lg:pb-0">
                    {/* Modern Top Header */}
                    <header className="h-20 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-4 sm:px-6 lg:px-10 z-10 shrink-0 sticky top-0">
                        <div className="flex items-center min-w-0 mr-2">
                            {isMobile && (
                                <button onClick={()=>setSidebarOpen(true)} className="mr-3 text-gray-500 hover:text-indigo-600 bg-gray-100 dark:bg-gray-800 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0">
                                    <i className="ph-bold ph-list text-xl"></i>
                                </button>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">{pageTitle}</h1>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest hidden sm:block mt-0.5">AzurLize Management System</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            {/* Visual Sync Status (hidden on very small phones, beautiful on tablet & desktop) */}
                            <div className="flex flex-col items-end mr-1 font-bold text-gray-400 dark:text-gray-500 leading-tight">
                                <span className="text-[8px] uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none hidden md:inline">Auto Sync</span>
                                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 text-[10px] sm:text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <button onClick={triggerGlobalSync} disabled={isSyncingGlobal} 
                                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl sm:rounded-2xl transition-all shadow-sm group disabled:opacity-75 shrink-0">
                                <i className={`ph-bold ph-arrows-clockwise text-lg sm:text-xl ${isSyncingGlobal ? 'animate-spin text-indigo-500' : 'group-hover:rotate-180 duration-500'}`}></i>
                            </button>

                            <button onClick={()=>setIsDark(!isDark)} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl sm:rounded-2xl transition-all shadow-sm group shrink-0">
                                <i className={`ph-fill ${isDark ? 'ph-moon text-indigo-400' : 'ph-sun text-amber-500'} text-lg sm:text-xl group-hover:rotate-12 transition-transform`}></i>
                            </button>
                        </div>
                    </header>
                    
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar">
                        <div className="max-w-[1400px] mx-auto pb-6 print:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {renderPageContent()}
                        </div>
                    </div>
                </main>
            </div>

            {/* FLOATING BOTTOM NAV (Modern iOS Style for Mobile & Tablet) */}
            {isMobile && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-40 animate-in slide-in-from-bottom-6 duration-500">
                    <nav className="bg-white/95 dark:bg-[#1a202c]/95 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 rounded-[28px] flex justify-around items-center h-[72px] px-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                        {bottomNavItems.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <button key={item.id} onClick={() => changeTab(item.id)} 
                                    className="relative flex flex-col items-center justify-center w-full h-full group">
                                    
                                    {/* Active Pill Indicator */}
                                    {isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-[20px] transition-all duration-300 scale-100"></div>
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col items-center transition-transform duration-300 group-active:scale-95">
                                        <div className="relative">
                                            <i className={`${isActive ? 'ph-fill text-indigo-600 dark:text-indigo-400 scale-110 drop-shadow-sm' : 'ph-bold text-gray-400 dark:text-gray-500'} ${item.icon} text-[22px] transition-all duration-300`}></i>
                                            {item.badge > 0 && (
                                                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#1a202c] shadow-sm animate-bounce">
                                                    {item.badge > 99 ? '!' : item.badge}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                        <button onClick={() => setSidebarOpen(true)} className="relative flex flex-col items-center justify-center w-full h-full group">
                            <div className="relative z-10 flex flex-col items-center transition-transform duration-300 group-active:scale-95">
                                <i className="ph-bold ph-list text-[22px] text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors"></i>
                                <span className="text-[9px] font-black uppercase tracking-widest mt-1 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors">Menu</span>
                            </div>
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
}
