import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY } from '../utils';

export const DailyData = ({ authUser }) => {
    // Menghitung indeks hari kemarin (1-7) secara otomatis
    const getYesterdayIndex = () => {
        const day = (() => { try { return new Date().getDay(); } catch(e){ return 0; } })();
        if (day === 0) return 6; 
        if (day === 1) return 7; 
        return day - 1; 
    };

    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); // STATE BARU: Custom Modal Hapus
    const [modalMode, setModalMode] = useState('add');
    const [activeTab, setActiveTab] = useState('thisWeek'); 
    const [historyFilter, setHistoryFilter] = useState(-1); 
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState(''); 
    const [toast, setToast] = useState(null); 
    
    // Default otomatis memilih hari kemarin
    const [selectedDay, setSelectedDay] = useState(getYesterdayIndex());
    const itemsPerPage = 10;
    
    const getTodaySafe = () => {
        try { return new Date().toISOString().split('T')[0]; } 
        catch (e) { return '2024-01-01'; }
    };

    const initialForm = { id: '', tanggal: getTodaySafe(), recruiter: '', channels: 'Instagram', email: '', wa: '', uid: '', username: '', results: 'Pending', grup: 'T0-SANDI' };
    const [formData, setFormData] = useState(initialForm);

    const isPrivileged = authUser && ['Superadmin', 'Admin'].includes(authUser?.role);

    // Array Hari dilengkapi Icon Modern
    const daysOfWeek = [
        { name: 'Senin', value: 1, icon: 'ph-coffee' }, 
        { name: 'Selasa', value: 2, icon: 'ph-fire' }, 
        { name: 'Rabu', value: 3, icon: 'ph-drop' },
        { name: 'Kamis', value: 4, icon: 'ph-lightning' }, 
        { name: 'Jumat', value: 5, icon: 'ph-star' }, 
        { name: 'Sabtu', value: 6, icon: 'ph-game-controller' }, 
        { name: 'Minggu', value: 7, icon: 'ph-sun' }
    ];

    const getMondayStr = (dateInput) => {
        if (!dateInput) return "INVALID";
        try {
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return "INVALID";
            const localDay = d.getDay() || 7;
            const target = new Date(d.getTime());
            target.setDate(d.getDate() - localDay + 1);
            return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
        } catch (e) { return "INVALID"; }
    };

    const getOffsetMondayStr = (offsetWeeks = 0) => {
        try {
            const d = new Date();
            const day = d.getDay() || 7;
            d.setHours(0,0,0,0);
            d.setDate(d.getDate() - day + 1 + (offsetWeeks * 7));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch (e) { return "1970-01-01"; }
    };

    const getSundayStr = (mondayStr) => {
        if (!mondayStr || mondayStr === "INVALID") return "INVALID";
        try {
            const d = new Date(mondayStr);
            d.setDate(d.getDate() + 6);
            return d.toISOString().split('T')[0];
        } catch (e) { return mondayStr; }
    };

    const formatToDDMMYYYY = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? String(dateStr) : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch (e) { return '-'; }
    };

    const safeGetDayIndex = (dateStr) => {
        if (!dateStr) return 0;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 0; 
            return d.getDay() || 7; 
        } catch (e) { return 0; }
    };

    const getDateNumberForDay = (dayValue) => {
        if (!thisWeekMonday || thisWeekMonday === "INVALID") return "";
        const parts = thisWeekMonday.split('-');
        if (parts.length !== 3) return "";
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + (dayValue - 1));
        return d.getDate();
    };

    const thisWeekMonday = getOffsetMondayStr(0);
    const thisWeekSunday = getSundayStr(thisWeekMonday);
    
    const isThursday = (() => { try { return new Date().getDay() === 4; } catch(e){ return false; } })();

    const showToastMessage = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const resUsers = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
            const dataUsers = await resUsers.json();
            if (dataUsers?.status === 'success') { setUsers(Array.isArray(dataUsers?.data) ? dataUsers.data : []); }

            const resData = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getDailyData', role: authUser?.role || null, username: authUser?.username || null, name: authUser?.name || null }) });
            const resultData = await resData.json();
            if (resultData?.status === 'success') { setData(Array.isArray(resultData?.data) ? resultData.data : []); }
        } catch (error) { 
            console.error("Gagal menarik data dari server:", error); 
        } finally { 
            if (showLoading) setIsLoading(false); 
        }
    };

    useEffect(() => { 
        fetchData(true); 
        
        const handleSync = () => {
            fetchData(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        return () => {
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, [authUser]);
    
    useEffect(() => { setCurrentPage(1); }, [activeTab, historyFilter, selectedDay, data?.length, searchQuery]);

    const handleOpenAdd = () => {
        setModalMode('add');
        setFormData({ ...initialForm, recruiter: (authUser && authUser?.role === 'Staff') ? authUser?.username : '' });
        setIsModalOpen(true);
    };
    
    const handleOpenEdit = (item) => { 
        if (!item) return;
        setModalMode('edit'); 
        let safeDate = getTodaySafe();
        try { 
            if(item?.tanggal) { 
                const d = new Date(item.tanggal); 
                if(!isNaN(d.getTime())) safeDate = new Date(d.getTime() - (d.getTimezoneOffset()*60*1000)).toISOString().split('T')[0]; 
            } 
        } catch(e) {}
        setFormData({ ...item, tanggal: safeDate }); 
        setIsModalOpen(true); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        
        if (modalMode === 'add') {
            const isDuplicate = safeDataArray.some(d => String(d?.uid) === String(formData.uid));
            if (isDuplicate) {
                showToastMessage('error', `UID ${formData.uid} sudah terdaftar di sistem!`);
                return;
            }
        }

        setIsSaving(true); 
        const action = modalMode === 'add' ? 'addDailyData' : 'updateDailyData'; 
        const payload = { ...formData, id: modalMode === 'add' ? Date.now() : formData?.id };
        
        try { 
            await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action, ...payload }) }); 
            fetchData(); 
            
            if (modalMode === 'add') {
                showToastMessage('success', `Data @${formData.username} berhasil disimpan!`);
                setFormData(prev => ({
                    ...prev,
                    username: '',
                    uid: '',
                    wa: '',
                    email: ''
                }));
            } else {
                showToastMessage('success', 'Perubahan data berhasil disimpan!');
                setIsModalOpen(false); 
            }
        } catch (error) { 
            showToastMessage('error', 'Terjadi kesalahan jaringan. Coba lagi.');
        } finally {
            setIsSaving(false); 
        }
    };

    // EKSEKUSI HAPUS SETELAH KONFIRMASI DARI CUSTOM MODAL
    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        
        try { 
            await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteDailyData', id: deleteConfirmId }) }); 
            fetchData(); 
            showToastMessage('success', 'Data pelamar berhasil dihapus.');
        } catch (error) { 
            showToastMessage('error', 'Gagal menghapus data dari server.');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const safeDataArray = Array.isArray(data) ? data : [];
    const thisWeekDataOnly = safeDataArray.filter(d => d && d?.tanggal && getMondayStr(d?.tanggal) === thisWeekMonday);

    const baseDisplayData = safeDataArray.filter(d => {
        if (!d || !d?.tanggal) return false; 
        const itemMonday = getMondayStr(d?.tanggal);
        const isThisWeek = itemMonday === thisWeekMonday;
        
        if (activeTab === 'thisWeek') {
            if (!isThisWeek) return false; 
            return safeGetDayIndex(d?.tanggal) === selectedDay; 
        } else {
            if (historyFilter === 'all') {
                return itemMonday < thisWeekMonday; 
            } else {
                return itemMonday === getOffsetMondayStr(historyFilter); 
            }
        }
    });

    const currentDisplayData = baseDisplayData.filter(d => {
        if (!searchQuery) return true;
        const q = String(searchQuery).toLowerCase();
        return (
            String(d?.username || '').toLowerCase().includes(q) ||
            String(d?.uid || '').toLowerCase().includes(q) ||
            String(d?.wa || '').toLowerCase().includes(q) ||
            String(d?.recruiter || '').toLowerCase().includes(q)
        );
    });

    const statTotal = currentDisplayData.length;
    const statPending = currentDisplayData.filter(d => d?.results === 'Pending').length;
    const statAcc = currentDisplayData.filter(d => d?.results === 'Acc').length;
    const statReject = currentDisplayData.filter(d => d?.results === 'Reject').length;

    const totalPages = Math.max(1, Math.ceil(currentDisplayData.length / itemsPerPage) || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = currentDisplayData.slice(startIndex, startIndex + itemsPerPage);

    const inputClass = "w-full px-4 py-3 sm:py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all text-gray-700 dark:text-gray-200";
    const Label = ({children, icon}) => <label className="flex items-center text-[10px] font-black text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest"><i className={`ph-bold ${icon} mr-1.5 text-indigo-500`}></i> {children}</label>;

    const renderStatusBadge = (status) => {
        let colors = "bg-gray-100 text-gray-600 border-gray-200";
        if (status === 'Acc') colors = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
        if (status === 'Reject') colors = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
        if (status === 'Pending') colors = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border shadow-sm ${colors}`}>{status || 'Unset'}</span>;
    };

    const statCards = [
        { l: 'Total', v: statTotal, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-500', txtColor: 'text-blue-600 dark:text-blue-400', i: 'ph-files' },
        { l: 'Pending', v: statPending, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', txtColor: 'text-amber-600 dark:text-amber-400', i: 'ph-clock' },
        { l: 'Acc', v: statAcc, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', txtColor: 'text-emerald-600 dark:text-emerald-400', i: 'ph-check-circle' },
        { l: 'Reject', v: statReject, bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-500', txtColor: 'text-rose-600 dark:text-rose-400', i: 'ph-x-circle' }
    ];

    return (
        <div className="pb-10 md:pb-4 font-sans w-full relative">
            
            {/* TOAST NOTIFICATION COMPONENT */}
            {toast && (
                <div className="fixed z-[999] top-4 left-4 right-4 md:top-auto md:bottom-10 md:left-auto md:right-10 md:w-[340px] animate-in fade-in slide-in-from-top-4 md:slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${toast.type === 'error' ? 'bg-rose-50/95 dark:bg-[#2b161b]/95 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-50/95 dark:bg-[#162b1f]/95 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'error' ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'}`}>
                            <i className={`ph-fill ${toast.type === 'error' ? 'ph-warning-circle' : 'ph-check-circle'} text-xl`}></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-0.5">{toast.type === 'error' ? 'Peringatan Sistem' : 'Aksi Berhasil'}</span>
                            <span className="text-xs font-bold leading-snug">{toast.message}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS DATA (Menggantikan window.confirm) */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#161a2b] p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-white/10 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="ph-bold ph-warning text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Hapus Data Pelamar?</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Data ini akan dihapus secara permanen dan tidak dapat dikembalikan lagi. Anda yakin ingin melanjutkan?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Batal</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-700 transition-colors">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar (Search & Button) */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mb-4 md:mb-6 pt-2 w-full">
                
                {/* Search Input Modern */}
                <div className="relative w-full sm:w-[280px] shrink-0">
                    <i className="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg"></i>
                    <input 
                        type="text" 
                        placeholder="Cari Username, UID, WA..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 h-[44px] md:h-[40px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl md:rounded-full text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors z-10">
                            <i className="ph-bold ph-x-circle text-lg"></i>
                        </button>
                    )}
                </div>

                {isPrivileged && (
                    <button onClick={handleOpenAdd} type="button" className="w-full md:w-auto px-6 h-[44px] md:h-[40px] bg-indigo-600 text-white rounded-xl md:rounded-full font-bold text-sm md:text-xs flex items-center justify-center shadow-md hover:bg-indigo-700 transition-all active:scale-95 shrink-0 relative z-10">
                        <i className="ph-bold ph-plus text-lg md:text-base mr-1.5"></i> Input Manual
                    </button>
                )}
            </div>

            {/* Tab Pill Modern & Info Card Tipis */}
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <button onClick={() => { setActiveTab('thisWeek'); setSelectedDay(getYesterdayIndex()); }} className={`px-4 py-1.5 h-[36px] rounded-full text-[11px] md:text-xs font-bold transition-all shadow-sm flex items-center justify-center shrink-0 gap-1.5 ${activeTab === 'thisWeek' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'}`}>
                        <i className="ph-bold ph-tray-arrow-down text-sm"></i> Batch Aktif
                    </button>
                    <button onClick={() => { setActiveTab('lastWeek'); setHistoryFilter(-1); }} className={`px-4 py-1.5 h-[36px] rounded-full text-[11px] md:text-xs font-bold transition-all shadow-sm flex items-center justify-center shrink-0 gap-1.5 ${activeTab === 'lastWeek' && historyFilter !== 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'}`}>
                        <i className="ph-bold ph-folder-open text-sm"></i> Batch Pemeriksaan
                        {isThursday && <span className="flex w-1.5 h-1.5 ml-1 bg-rose-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button onClick={() => { setActiveTab('lastWeek'); setHistoryFilter('all'); }} className={`px-4 py-1.5 h-[36px] rounded-full text-[11px] md:text-xs font-bold transition-all shadow-sm flex items-center justify-center shrink-0 gap-1.5 ${activeTab === 'lastWeek' && historyFilter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'}`}>
                        <i className="ph-bold ph-books text-sm"></i> Riwayat
                    </button>
                </div>

                <div className="bg-white dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className={`ph-fill ${activeTab === 'thisWeek' ? 'ph-clock' : 'ph-archive'} text-indigo-500`}></i>
                        <span>{activeTab === 'thisWeek' ? 'Rentang Terbuka' : 'Rentang Arsip'}</span>
                    </div>
                    <span className="text-[11px] md:text-xs">
                        {activeTab === 'thisWeek' 
                            ? `${formatToDDMMYYYY(thisWeekMonday)} — ${formatToDDMMYYYY(thisWeekSunday)}` 
                            : historyFilter === 'all' 
                                ? `Semua Data Riwayat` 
                                : `${formatToDDMMYYYY(getOffsetMondayStr(historyFilter))} — ${formatToDDMMYYYY(getSundayStr(getOffsetMondayStr(historyFilter)))}`}
                    </span>
                </div>
            </div>

            {/* Statistik Cards Ringkas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
                {statCards.map((s, idx) => (
                    <div key={idx} className="bg-white dark:bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                            <div className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.l}</div>
                            <i className={`ph-fill ${s.i} text-sm md:text-lg ${s.text}`}></i>
                        </div>
                        <div className={`text-xl md:text-2xl font-black ${s.txtColor}`}>{s.v}</div>
                    </div>
                ))}
            </div>

            {/* Filter Hari Horizontal (Chip) */}
            {activeTab === 'thisWeek' && !searchQuery && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-2 custom-scrollbar">
                    {daysOfWeek.map((day) => {
                        const count = thisWeekDataOnly.filter(d => safeGetDayIndex(d?.tanggal) === day.value).length;
                        return (
                            <button 
                                key={day.value}
                                onClick={() => setSelectedDay(day.value)} 
                                type="button"
                                className={`h-[36px] px-4 rounded-full text-[11px] font-bold transition-all shrink-0 flex items-center gap-2 border relative z-10 ${selectedDay === day.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                            >
                                <span>{day.name.substring(0, 3)} {getDateNumberForDay(day.value)}</span>
                                <span className={`text-[9px] px-1.5 rounded-md font-mono ${selectedDay === day.value ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Filter Arsip Select Box */}
            {activeTab === 'lastWeek' && historyFilter !== 'all' && !searchQuery && (
                <div className="mb-4">
                    <select value={historyFilter} onChange={(e) => setHistoryFilter(Number(e.target.value))} className="w-full md:w-auto bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[40px] text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer relative z-10">
                        <option value={-1}>1 Minggu Lalu</option>
                        <option value={-2}>2 Minggu Lalu</option>
                        <option value={-3}>3 Minggu Lalu</option>
                    </select>
                </div>
            )}

            {/* Jika sedang mencari, tampilkan info pencarian */}
            {searchQuery && (
                <div className="mb-4 text-xs font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                    <i className="ph-bold ph-info"></i> Menampilkan hasil pencarian untuk "{searchQuery}"
                </div>
            )}

            {/* Area Data Utama */}
            <div className="w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <i className="ph-bold ph-spinner ph-spin text-3xl mb-2 text-indigo-500"></i>
                        <p className="text-[10px] font-bold tracking-widest uppercase">Memuat Database...</p>
                    </div>
                ) : (
                    <>
                        {/* TAMPILAN MOBILE (Card List Native-Like) */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginatedData.length === 0 ? (
                                <div className="text-center py-10 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm text-gray-400">
                                    <i className="ph-fill ph-folder-open text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>
                                    <span className="text-xs font-bold">{searchQuery ? 'Pencarian tidak ditemukan.' : 'KOSONG. Belum ada entri.'}</span>
                                </div>
                            ) : paginatedData.map((d, i) => (
                                <div key={d?.id || i} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col relative">
                                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 dark:border-white/5 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-sm shrink-0"><i className="ph-fill ph-user"></i></div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900 dark:text-white leading-tight">@{d?.username || '-'}</div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">UID {d?.uid || '-'}</div>
                                            </div>
                                        </div>
                                        <div>{renderStatusBadge(d?.results)}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] mb-3">
                                        <div><span className="flex items-center text-gray-400 mb-0.5"><i className="ph-bold ph-calendar-blank mr-1"></i> Terdaftar</span><span className="font-bold text-gray-700 dark:text-gray-300">{formatToDDMMYYYY(d?.tanggal)}</span></div>
                                        <div><span className="flex items-center text-gray-400 mb-0.5"><i className="ph-bold ph-identification-card mr-1"></i> Recruiter</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{d?.recruiter || '-'}</span></div>
                                        <div><span className="flex items-center text-gray-400 mb-0.5"><i className="ph-bold ph-whatsapp-logo mr-1"></i> Kontak</span><span className="font-bold text-gray-700 dark:text-gray-300">{d?.wa || '-'}</span></div>
                                        <div><span className="flex items-center text-gray-400 mb-0.5"><i className="ph-bold ph-users-three mr-1"></i> Grup / Jalur</span><span className="font-bold text-gray-700 dark:text-gray-300">{d?.grup || '-'} • {d?.channels || '-'}</span></div>
                                    </div>
                                    
                                    {isPrivileged && (
                                        <div className="flex gap-2 pt-3 mt-auto border-t border-gray-100 dark:border-white/5 relative z-10">
                                            {/* TOMBOL EDIT PADA ANDROID */}
                                            <button type="button" onClick={() => handleOpenEdit(d)} className="flex-1 py-2 h-[40px] bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[11px] font-bold text-gray-600 dark:text-gray-300 transition-colors flex justify-center items-center gap-1 active:scale-95">
                                                <i className="ph-bold ph-pencil-simple text-sm"></i> Edit
                                            </button>
                                            
                                            {/* TOMBOL HAPUS PADA ANDROID MENGGUNAKAN CUSTOM MODAL */}
                                            <button type="button" onClick={() => setDeleteConfirmId(d?.id)} className="flex-1 py-2 h-[40px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 transition-colors flex justify-center items-center gap-1 active:scale-95">
                                                <i className="ph-bold ph-trash text-sm"></i> Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* TAMPILAN TABLET/DESKTOP (Table Normal) */}
                        <div className="hidden md:block bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                                    <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="px-5 py-4">Data Pelamar</th>
                                            <th className="px-5 py-4">Informasi Kontak</th>
                                            <th className="px-5 py-4">Recruiter & Jalur</th>
                                            <th className="px-5 py-4">Status Akhir</th>
                                            {isPrivileged && <th className="px-5 py-4 text-right">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {paginatedData.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-10 text-gray-400">
                                                    <i className="ph-fill ph-folder-open text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>
                                                    <span className="text-xs font-bold">{searchQuery ? 'Pencarian tidak ditemukan.' : 'KOSONG. Belum ada entri pelamar.'}</span>
                                                </td>
                                            </tr>
                                        ) : paginatedData.map((d, i) => (
                                            <tr key={d?.id || i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0"><i className="ph-fill ph-user"></i></div>
                                                        <div>
                                                            <div className="font-bold text-xs text-gray-900 dark:text-white mb-0.5">@{d?.username || '-'}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">UID: {d?.uid || '-'} • <i className="ph-bold ph-calendar-blank"></i> {formatToDDMMYYYY(d?.tanggal)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-xs text-gray-700 dark:text-gray-300 mb-0.5 flex items-center"><i className="ph-bold ph-whatsapp-logo text-emerald-500 mr-1.5"></i> {d?.wa || '-'}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center pl-1"><i className="ph-bold ph-envelope-simple mr-1.5"></i> {d?.email || 'Tidak ada email'}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mb-0.5 flex items-center"><i className="ph-fill ph-identification-card mr-1.5"></i> {d?.recruiter || '-'}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center"><i className="ph-bold ph-broadcast mr-1.5"></i> {d?.channels || '-'}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="mb-1">{renderStatusBadge(d?.results)}</div>
                                                    <div className="text-[9px] text-gray-500 font-bold flex items-center"><i className="ph-bold ph-users-three mr-1"></i> Grup: {d?.grup || '-'}</div>
                                                </td>
                                                {isPrivileged && (
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex justify-end gap-2 relative z-10">
                                                            <button type="button" onClick={() => handleOpenEdit(d)} className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:text-indigo-600 hover:border-indigo-300 dark:hover:bg-white/10 text-gray-500 transition-colors flex items-center justify-center shadow-sm"><i className="ph-bold ph-pencil-simple"></i></button>
                                                            <button type="button" onClick={() => setDeleteConfirmId(d?.id)} className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-white/10 text-gray-500 transition-colors flex items-center justify-center shadow-sm"><i className="ph-bold ph-trash"></i></button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Paginasi Responsive */}
                        {totalPages > 0 && (
                            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-white/5 p-3 sm:px-5 sm:py-3 rounded-2xl sm:rounded-xl border border-gray-200 dark:border-white/10 shadow-sm gap-3">
                                <div className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                                    Hal <span className="text-indigo-600 dark:text-indigo-400">{currentPage}</span> / {totalPages} • Total <span className="text-gray-900 dark:text-white">{currentDisplayData.length}</span> entri
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto relative z-10">
                                    <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="flex-1 sm:flex-none justify-center px-4 py-2.5 h-[36px] rounded-xl sm:rounded-lg border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center shadow-sm"><i className="ph-bold ph-caret-left mr-1 pointer-events-none"></i> Prev</button>
                                    <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="flex-1 sm:flex-none justify-center px-4 py-2.5 h-[36px] rounded-xl sm:rounded-lg border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center shadow-sm">Next <i className="ph-bold ph-caret-right ml-1 pointer-events-none"></i></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL PENUH */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-gray-900/80 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#161a2b] w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col sm:rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 sm:border-t-4 sm:border-t-indigo-500">
                        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/80 dark:bg-black/20 shrink-0">
                            <h2 className="font-black text-lg sm:text-xl flex items-center text-gray-900 dark:text-white">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-3">
                                    <i className={`ph-bold ${modalMode === 'add' ? 'ph-plus' : 'ph-pencil-simple'} text-xl`}></i>
                                </div>
                                {modalMode === 'add' ? 'Input Data Baru' : 'Edit Formulir'}
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-rose-100 hover:text-rose-600 text-gray-400 transition-colors bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                                <i className="ph-bold ph-x text-lg"></i>
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/30 dark:bg-transparent">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
                                <div className="space-y-4 bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                                    <h4 className="font-black text-xs text-indigo-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/10 pb-2 mb-4 flex items-center"><i className="ph-bold ph-identification-card mr-2"></i> Identitas & Penanggung Jawab</h4>
                                    <div><Label icon="ph-calendar">Tanggal Terdaftar</Label><input type="date" required className={inputClass} value={formData.tanggal} onChange={e=>setFormData({...formData, tanggal: e.target.value})}/></div>
                                    <div>
                                        <Label icon="ph-user-gear">Recruiter (Agen)</Label>
                                        <select required className={inputClass} value={formData.recruiter} onChange={e=>setFormData({...formData, recruiter: e.target.value})} disabled={authUser && authUser?.role === 'Staff'}>
                                            <option value="" disabled>-- Pilih Agen Bertugas --</option>
                                            {(Array.isArray(users) ? users : []).filter(u => u?.status === 'Aktif' && u?.role === 'Staff').map((u, i) => <option key={i} value={u?.username}>{u?.name} ({u?.username})</option>)}
                                            {formData.recruiter && !(Array.isArray(users) ? users : []).find(u => u?.username === formData.recruiter) && (<option value={formData.recruiter}>{formData.recruiter} (Legacy/Non-Aktif)</option>)}
                                        </select>
                                    </div>
                                    <div><Label icon="ph-user">Nama Pelamar (Username Tele)</Label><input type="text" placeholder="Ketik nama panggilan/username..." required className={inputClass} value={formData.username} onChange={e=>setFormData({...formData, username: e.target.value})}/></div>
                                    <div><Label icon="ph-hash">UID Sistem (Wajib Angka)</Label><input type="text" placeholder="Contoh: 8371928" required className={inputClass} value={formData.uid} onChange={e=>setFormData({...formData, uid: e.target.value})}/></div>
                                </div>

                                <div className="space-y-4 bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                                    <h4 className="font-black text-xs text-emerald-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/10 pb-2 mb-4 flex items-center"><i className="ph-bold ph-phone-call mr-2"></i> Kontak & Penempatan</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><Label icon="ph-whatsapp-logo">WhatsApp Pelamar</Label><input type="text" placeholder="08xxx..." required className={inputClass} value={formData.wa} onChange={e=>setFormData({...formData, wa: e.target.value})}/></div>
                                        <div><Label icon="ph-envelope-simple">Email (Opsional)</Label><input type="email" placeholder="mail@domain.com" className={inputClass} value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})}/></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label icon="ph-broadcast">Jalur Kedatangan (Channel)</Label>
                                            <select className={inputClass} value={formData.channels} onChange={e=>setFormData({...formData, channels: e.target.value})}>
                                                <option value="Instagram">Instagram</option>
                                                <option value="TikTok">TikTok</option>
                                                <option value="Facebook">Facebook</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                                <option value="Telegram">Telegram</option>
                                                <option value="S Lemon App">S Lemon App</option>
                                                <option value="X">X</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label icon="ph-users-three">Alokasi Grup</Label>
                                            <select className={inputClass} value={formData.grup} onChange={e=>setFormData({...formData, grup: e.target.value})}>
                                                <option>T0-MAHA</option><option>T0-LADDY</option><option>T0-SANDI</option><option>T0-MARK</option><option>V0</option><option>T3</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <Label icon="ph-gavel">Keputusan Final (Result)</Label>
                                        <select className={`${inputClass} font-black text-base py-3 sm:py-3 ${formData.results === 'Acc' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : formData.results === 'Reject' ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'}`} value={formData.results} onChange={e=>setFormData({...formData, results: e.target.value})}>
                                            <option value="Pending">⚠️ Pending (Menunggu)</option>
                                            <option value="Acc">✅ Acc (Diterima)</option>
                                            <option value="Reject">❌ Reject (Ditolak)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 sm:px-6 bg-white dark:bg-black/20 border-t border-gray-200 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 shrink-0 pb-6 sm:pb-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors shadow-sm disabled:opacity-50">
                                Batal
                            </button>
                            <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-500/30 hover:bg-indigo-700 flex justify-center items-center transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSaving ? (
                                    <><i className="ph-bold ph-spinner ph-spin mr-2 text-xl"></i> Menyimpan...</>
                                ) : (
                                    <><i className="ph-bold ph-floppy-disk mr-2 text-xl"></i> {modalMode === 'add' ? 'Simpan & Lanjut' : 'Simpan Perubahan'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
