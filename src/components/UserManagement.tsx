import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const UserManagement = ({ authUser }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({ 
        name: '', username: '', uid: '', password: '', role: 'Staff', status: 'Aktif', 
        photo: '', photoBase64: null, photoMimeType: null, previewUrl: null 
    });
    
    const [originalUsername, setOriginalUsername] = useState('');
    const [expandedUser, setExpandedUser] = useState(null);

    const [adminPage, setAdminPage] = useState(1);
    const [staffPage, setStaffPage] = useState(1);
    const itemsPerPage = 10;

    const isSuperadmin = authUser && authUser.role === 'Superadmin';
    const isPrivileged = authUser && hasEditAccess('users', authUser.role);

    const fetchUsers = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
            const result = await response.json();
            if (result.status === 'success') { setUsers(Array.isArray(result.data) ? result.data : []); } else { setUsers([]); }
        } catch (error) { setUsers([]); } finally { if (showLoading) setIsLoading(false); }
    };

    useEffect(() => { 
        fetchUsers(true); 
        
        const handleSync = () => {
            fetchUsers(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        return () => {
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, []);

    const adminUsers = users.filter(u => u.role === 'Superadmin' || u.role === 'Admin');
    const staffUsers = users.filter(u => u.role === 'Staff');

    const totalAdminPages = Math.ceil(adminUsers.length / itemsPerPage) || 1;
    const adminStartIndex = (adminPage - 1) * itemsPerPage;
    const adminPaginated = adminUsers.slice(adminStartIndex, adminStartIndex + itemsPerPage);

    const totalStaffPages = Math.ceil(staffUsers.length / itemsPerPage) || 1;
    const staffStartIndex = (staffPage - 1) * itemsPerPage;
    const staffPaginated = staffUsers.slice(staffStartIndex, staffStartIndex + itemsPerPage);

    useEffect(() => { setAdminPage(1); }, [adminUsers.length]);
    useEffect(() => { setStaffPage(1); }, [staffUsers.length]);

    const toggleExpand = (username) => { setExpandedUser(prev => prev === username ? null : username); };

    const handleOpenAdd = () => { 
        setModalMode('add'); 
        setFormData({ name: '', username: '', uid: '', password: '', role: 'Staff', status: 'Aktif', photo: '', photoBase64: null, photoMimeType: null, previewUrl: null }); 
        setIsModalOpen(true); 
    };
    
    const handleOpenEdit = (user) => { 
        setModalMode('edit'); 
        setOriginalUsername(user.username); 
        setFormData({ 
            name: user.name || '', username: user.username || '', uid: user.uid || '', password: '', 
            role: user.role || 'Staff', status: user.status || 'Aktif', 
            photo: user.photo || user.photoUrl || '', photoBase64: null, photoMimeType: null, previewUrl: null 
        }); 
        setIsModalOpen(true); 
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Ukuran foto maksimal 2MB!'); return; }
        
        const reader = new FileReader();
        reader.onloadend = () => { 
            const base64String = (reader.result as string).split(',')[1];
            setFormData({ 
                ...formData, 
                photoBase64: base64String, 
                photoMimeType: file.type, 
                previewUrl: reader.result 
            }); 
        };
        reader.readAsDataURL(file);
    };

    const handleAcc = async (user) => {
        const newRole = isSuperadmin ? (user.role || 'Staff') : 'Staff';
        if (!window.confirm(`Setujui ${user.name || user.username} sebagai ${newRole} dan Aktifkan akunnya?`)) return;
        setIsLoading(true);
        try {
            const payload = { action: 'updateUser', oldUsername: user.username, username: user.username, name: user.name || '', role: newRole, status: 'Aktif', password: '', uid: user.uid || '' };
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.status === 'success') fetchUsers(); else { alert(result.message); setIsLoading(false); }
        } catch (error) { alert('Terjadi kesalahan koneksi.'); setIsLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true); 
        const action = modalMode === 'add' ? 'addUser' : 'updateUser';
        try {
            const payload = { action, ...formData }; 
            if (modalMode === 'edit') payload.oldUsername = originalUsername;
            
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            
            if (result.status === 'success') { 
                await fetchUsers(); 
                setIsModalOpen(false); 
            } else alert(result.message);
        } catch (error) { alert('Terjadi kesalahan koneksi.'); } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (username) => {
        if (!window.confirm(`Yakin ingin menghapus user ${username}? Tindakan ini tidak bisa dibatalkan.`)) return;
        setUsers(users.filter(u => u.username !== username));
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteUser', username }) });
            const result = await response.json();
            if (result.status !== 'success') { alert(result.message); fetchUsers(); }
        } catch (error) { alert('Terjadi kesalahan saat menghapus.'); fetchUsers(); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr.split('T')[0];
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch(e) { return '-'; }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all";
    const Label = ({children}) => <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{children}</label>;

    const isNewUser = (dateStr) => {
        if (!dateStr || dateStr === '-') return false;
        try {
            const joinDate = new Date(dateStr);
            if (isNaN(joinDate.getTime())) return false;
            const diffTime = new Date().getTime() - joinDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        } catch(e) { return false; }
    };

    const getRoleStyles = (role, isExpanded) => {
        const styles = {
            Superadmin: {
                card: isExpanded ? 'border-rose-300 dark:border-rose-700/50 shadow-md' : 'border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700',
                header: isExpanded ? 'bg-rose-50/80 dark:bg-rose-950/40' : 'bg-white dark:bg-gray-800/80 hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
                avatar: 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-rose-500/40 border-rose-400',
                imgBorder: 'border-rose-400',
                name: 'text-rose-600 dark:text-rose-500',
                badge: 'bg-gradient-to-b from-rose-500 to-red-700 border-rose-400/50 shadow-[0_2px_10px_rgba(225,29,72,0.4)]',
                badgeText: 'SUPERADMIN',
                badgeIcon: 'ph-user-gear',
                detail: 'border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20',
                grad: ['#FDE047', '#F59E0B', '#B45309'], 
                glow: 'drop-shadow-[0_2px_4px_rgba(225,29,72,0.6)]',
                iconPath: 'M3.75 21h16.5a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v1.5c0 .41.34.75.75.75zm16.7-9.41l-3.8-5.33a.75.75 0 00-1.26.13l-3.39 6.78-3.39-6.78a.75.75 0 00-1.26-.13l-3.8 5.33A.75.75 0 003.88 16.5h16.24a.75.75 0 00.58-1.21z' 
            },
            Admin: {
                card: isExpanded ? 'border-blue-300 dark:border-blue-700/50 shadow-md' : 'border-blue-200 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700',
                header: isExpanded ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'bg-white dark:bg-gray-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
                avatar: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-500/40 border-blue-400',
                imgBorder: 'border-blue-400',
                name: 'text-blue-600 dark:text-blue-400',
                badge: 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400/50 shadow-[0_2px_10px_rgba(59,130,246,0.4)]',
                badgeText: 'ADMIN',
                badgeIcon: 'ph-shield-check',
                detail: 'border-blue-100 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/20',
                grad: ['#93C5FD', '#3B82F6', '#1E3A8A'], 
                glow: 'drop-shadow-[0_2px_4px_rgba(59,130,246,0.6)]',
                iconPath: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z' 
            },
            Staff: {
                card: isExpanded ? 'border-amber-300 dark:border-amber-700/50 shadow-md' : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700',
                header: isExpanded ? 'bg-amber-50/80 dark:bg-amber-950/40' : 'bg-white dark:bg-gray-800/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
                avatar: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/40 border-amber-400',
                imgBorder: 'border-amber-400',
                name: 'text-amber-600 dark:text-amber-500',
                badge: 'bg-gradient-to-b from-amber-500 to-orange-600 border-amber-400/50 shadow-[0_2px_10px_rgba(245,158,11,0.4)]',
                badgeText: 'STAFF',
                badgeIcon: 'ph-users',
                detail: 'border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20',
                grad: ['#FEF08A', '#EAB308', '#854D0E'], 
                glow: 'drop-shadow-[0_2px_4px_rgba(245,158,11,0.6)]',
                iconPath: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' 
            }
        };
        return styles[role] || styles['Staff'];
    };

    const renderUserList = (dataList) => (
        <div className="space-y-3">
            {dataList.length === 0 ? <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">Belum ada data di kategori ini.</div> : dataList.map((u, i) => {
                const isPending = u.status === 'Pending'; 
                const canEdit = isSuperadmin || (isPrivileged && (u.role === 'Staff' || isPending) && u.role !== 'Superadmin' && u.role !== 'Admin'); 
                const canDelete = isSuperadmin && authUser && u.username !== authUser.username;
                const isExpanded = expandedUser === u.username;
                const st = getRoleStyles(u.role, isExpanded);
                
                const displayPhoto = (formData.username === u.username && formData.previewUrl) ? formData.previewUrl : (u.photo || u.photoUrl);
                const newlyJoined = isNewUser(u.tanggalBergabung); 

                // LOGIKA PRIVASI UID: Tampilkan UID jika yang login adalah Admin/Superadmin ATAU jika staf mengklik akunnya sendiri
                const canSeeUid = isPrivileged || (authUser && authUser.username === u.username);

                return (
                    <div key={i} className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${st.card}`}>
                        
                        <div onClick={() => toggleExpand(u.username)} className={`flex items-center justify-between p-3 sm:p-4 cursor-pointer transition-colors select-none ${st.header}`}>
                            
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                {displayPhoto ? (
                                    <img src={displayPhoto} alt={typeof u.name === 'string' ? u.name : String(u.name || '')} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0 shadow-sm border-2 ${st.imgBorder}`} />
                                ) : (
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-inner ${st.avatar}`}>
                                        {u.name && typeof u.name === 'string' ? u.name.charAt(0).toUpperCase() : (u.name && typeof u.name !== 'object' ? String(u.name).charAt(0).toUpperCase() : '?')}
                                    </div>
                                )}
                                
                                <div className="min-w-0 flex-1">
                                    <div className={`font-black flex items-center gap-1.5 drop-shadow-sm text-base sm:text-lg flex-wrap ${st.name}`}>
                                        <svg className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${st.glow} animate-pulse`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <linearGradient id={`grad-${u.username}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor={st.grad[0]} />
                                                    <stop offset="50%" stopColor={st.grad[1]} />
                                                    <stop offset="100%" stopColor={st.grad[2]} />
                                                </linearGradient>
                                            </defs>
                                            <path d={st.iconPath} fill={`url(#grad-${u.username})`} />
                                        </svg>
                                        
                                        <span className="truncate max-w-[120px] sm:max-w-xs">{typeof u.name === 'string' ? u.name : (u.name && typeof u.name !== 'object' ? String(u.name) : 'Unknown')}</span>

                                        {newlyJoined && (
                                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[8px] sm:text-[9px] font-black bg-gradient-to-r from-rose-500 to-red-600 text-white animate-pulse shadow-[0_2px_10px_rgba(244,63,94,0.4)] border border-rose-400/50 uppercase tracking-widest shrink-0 flex items-center gap-1">
                                                <i className="ph-fill ph-sparkle text-[10px]"></i> NEW
                                            </span>
                                        )}
                                    </div>
                                    <div className={`text-[10px] sm:text-xs font-mono mt-0.5 flex items-center font-bold opacity-80 truncate ${st.name}`}>
                                        <i className="ph-bold ph-at mr-1 shrink-0"></i><span className="truncate">{u.username || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                                <div className={`hidden sm:block text-xs font-bold px-2 py-1 rounded border ${u.status === 'Aktif' || u.status === 'Online' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : u.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                    {u.status}
                                </div>
                                <div className={`w-3 h-3 rounded-full shadow-sm sm:hidden relative ${u.status === 'Aktif' || u.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : u.status === 'Pending' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-rose-500'}`}></div>
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                                    <i className={`ph-bold ph-caret-down text-sm sm:text-base transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className={`p-4 sm:p-5 border-t animate-in slide-in-from-top-2 duration-200 ${st.detail}`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                                    
                                    <div>
                                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2.5">Otoritas Sistem</span>
                                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest border ${st.badge}`}>
                                            <i className={`ph-fill ${st.badgeIcon} mr-1.5 text-sm drop-shadow-md`}></i> {st.badgeText}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 sm:mb-2.5">Informasi Data</span>
                                        <div className="space-y-1.5 sm:space-y-2 text-xs text-gray-700 dark:text-gray-300">
                                            {/* PENGKONDISIAN UID */}
                                            {canSeeUid && (
                                                <div className="flex items-center"><span className="w-20 text-gray-400 flex items-center"><i className="ph-bold ph-hash mr-1.5"></i> UID</span><span className="font-mono font-bold bg-white/60 dark:bg-gray-800/60 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700 truncate max-w-[120px] sm:max-w-[200px]">{u.uid || '-'}</span></div>
                                            )}
                                            <div className="flex items-center"><span className="w-20 text-gray-400 flex items-center"><i className="ph-bold ph-calendar-blank mr-1.5"></i> Gabung</span><span className="font-bold">{formatDate(u.tanggalBergabung)}</span></div>
                                        </div>
                                    </div>
                                    
                                    <div className="sm:col-span-2 lg:col-span-1 lg:text-right flex flex-col lg:items-end justify-start mt-2 sm:mt-0">
                                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 lg:mb-2.5">Tindakan</span>
                                        <div className="flex flex-col sm:flex-row lg:flex-row flex-wrap gap-2 w-full lg:w-auto">
                                            {isPending && isPrivileged && (
                                                <button onClick={() => handleAcc(u)} className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center transform sm:hover:-translate-y-0.5">
                                                    <i className="ph-bold ph-check-circle mr-1.5 text-base"></i> Terima (ACC)
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button onClick={() => handleOpenEdit(u)} className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-500 hover:text-white dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl transition-all shadow-sm flex items-center transform sm:hover:-translate-y-0.5">
                                                    <i className="ph-bold ph-pencil-simple mr-1.5 text-base"></i> Edit Profil
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => handleDelete(u.username)} className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-500 hover:text-white dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white rounded-xl transition-all shadow-sm flex items-center transform sm:hover:-translate-y-0.5">
                                                    <i className="ph-bold ph-trash mr-1.5 text-base"></i> Hapus
                                                </button>
                                            )}
                                            {!isPending && !canEdit && !canDelete && (
                                                <span className="w-full lg:w-auto text-center text-xs text-gray-400 italic bg-white/50 dark:bg-gray-800/50 px-3 py-2 sm:py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">Tidak ada aksi tersedia</span>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderPagination = (currentPage, setPage, totalPages, totalItems, startIndex) => {
        if (totalItems === 0) return null;
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 gap-3">
                <div className="text-xs font-bold text-center sm:text-left text-gray-500 dark:text-gray-400">
                    Menampilkan <span className="text-indigo-600 dark:text-indigo-400">{startIndex + 1}</span> - <span className="text-indigo-600 dark:text-indigo-400">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="text-gray-900 dark:text-white">{totalItems}</span> data
                </div>
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center shadow-sm"><i className="ph-bold ph-caret-left mr-1"></i> Prev</button>
                    <span className="text-xs font-bold px-3 py-2 sm:py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 shadow-inner">Hal {currentPage} / {totalPages}</span>
                    <button onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center shadow-sm">Next <i className="ph-bold ph-caret-right ml-1"></i></button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden relative min-h-[500px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="p-4 sm:p-6 relative z-10">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 dark:border-gray-700/50 pb-4 sm:pb-5">
                        <h3 className="font-black text-lg sm:text-xl flex items-center text-gray-900 dark:text-white tracking-tight">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mr-3"><i className="ph-bold ph-users text-lg sm:text-xl"></i></div>
                            User Management
                        </h3>
                        {/* PENGKONDISIAN TOMBOL TAMBAH USER: Hanya tampil untuk Admin/Superadmin */}
                        {isPrivileged && (
                            <button onClick={handleOpenAdd} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all transform hover:-translate-y-0.5">
                                <i className="ph-bold ph-user-plus mr-2 text-lg"></i> Tambah User
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400"><i className="ph-bold ph-spinner ph-spin text-4xl mb-3 text-indigo-500"></i><p className="text-xs sm:text-sm font-bold tracking-widest uppercase">Sinkronisasi Data...</p></div>
                    ) : (
                        <div className="space-y-8 sm:space-y-10">
                            <section>
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <h4 className="font-black text-base sm:text-lg text-rose-600 dark:text-rose-500 flex items-center"><i className="ph-fill ph-shield-check mr-2 text-lg sm:text-xl"></i> Otoritas Sistem</h4>
                                    <span className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">{adminUsers.length}</span>
                                </div>
                                {renderUserList(adminPaginated)}
                                {renderPagination(adminPage, setAdminPage, totalAdminPages, adminUsers.length, adminStartIndex)}
                            </section>

                            <section>
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <h4 className="font-black text-base sm:text-lg text-amber-600 dark:text-amber-500 flex items-center"><i className="ph-fill ph-users-three mr-2 text-lg sm:text-xl"></i> Tim Operasional (Staff)</h4>
                                    <span className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">{staffUsers.length}</span>
                                </div>
                                {renderUserList(staffPaginated)}
                                {renderPagination(staffPage, setStaffPage, totalStaffPages, staffUsers.length, staffStartIndex)}
                            </section>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={()=>setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200 border-t-4 border-t-indigo-500">
                        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm">
                            <h2 className="font-black text-lg sm:text-xl flex items-center text-gray-900 dark:text-white"><i className={`ph-fill ${modalMode === 'add' ? 'ph-user-plus' : 'ph-pencil-simple'} text-indigo-600 mr-2 text-xl sm:text-2xl`}></i> {modalMode === 'add' ? 'Tambah User Baru' : 'Edit Data User'}</h2>
                            <button onClick={()=>setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-100 hover:text-rose-600 text-gray-400 transition-colors"><i className="ph-bold ph-x text-lg sm:text-xl"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                            
                            <div className="flex flex-col items-center mb-4 sm:mb-6">
                                <div className="relative group cursor-pointer mb-2">
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" disabled={isSubmitting} />
                                    <label htmlFor="photo-upload" className="block relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-gray-700 cursor-pointer">
                                        {(formData.previewUrl || formData.photo || formData.photoUrl) ? (
                                            <img src={formData.previewUrl || formData.photo || formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500"><i className="ph-fill ph-user text-3xl sm:text-4xl"></i></div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="ph-bold ph-camera text-white text-lg sm:text-xl mb-1"></i><span className="text-white text-[9px] sm:text-[10px] font-bold">Ganti Foto</span></div>
                                    </label>
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Format JPG/PNG • Max 2MB</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div className="sm:col-span-2"><Label>Nama Lengkap</Label><div className="relative"><i className="ph-bold ph-identification-card absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><input type="text" placeholder="Masukkan nama lengkap" required className={`${inputClass} pl-10`} value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} disabled={isSubmitting} /></div></div>
                                <div><Label>Username Telegram</Label><div className="relative"><i className="ph-bold ph-at absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><input type="text" placeholder="@username" required className={`${inputClass} pl-10 ${(!isSuperadmin && modalMode === 'edit') ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed opacity-70' : ''}`} value={formData.username} onChange={e=>setFormData({...formData, username: e.target.value})} disabled={(!isSuperadmin && modalMode === 'edit') || isSubmitting} /></div>{(!isSuperadmin && modalMode === 'edit') && <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 mt-1.5 block flex items-center"><i className="ph-fill ph-warning mr-1"></i> Username dilock.</span>}</div>
                                <div><Label>UID</Label><div className="relative"><i className="ph-bold ph-hash absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><input type="text" placeholder="Masukkan UID" required className={`${inputClass} pl-10`} value={formData.uid} onChange={e=>setFormData({...formData, uid: e.target.value})} disabled={isSubmitting} /></div></div>
                                <div><Label>Password {modalMode === 'edit' && <span className="text-gray-400 font-normal">(Opsional)</span>}</Label><div className="relative"><i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><input type="password" placeholder={modalMode === 'edit' ? 'Kosongkan jika tetap' : 'Buat password'} required={modalMode === 'add'} className={`${inputClass} pl-10`} value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} disabled={isSubmitting} /></div></div>
                                <div>
                                    <Label>Pilih Role</Label><div className="relative"><i className="ph-bold ph-shield-star absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><select className={`${inputClass} pl-10 font-bold`} value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} disabled={!isSuperadmin || isSubmitting}><option value="Staff">Staff (Akses Terbatas)</option>{isSuperadmin && <option value="Admin">Admin (Bisa edit data)</option>}{isSuperadmin && <option value="Superadmin">Superadmin (Akses Penuh)</option>}</select></div>
                                    {!isSuperadmin && <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 mt-1.5 block flex items-center"><i className="ph-fill ph-warning mr-1"></i> Hanya bisa Staff.</span>}
                                </div>
                                <div className="sm:col-span-2"><Label>Status Akun</Label><div className="relative"><i className="ph-bold ph-activity absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i><select className={`${inputClass} pl-10 font-bold`} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} disabled={isSubmitting}><option value="Aktif">🟢 Aktif</option><option value="Pending">🟡 Pending (Menunggu)</option><option value="Nonaktif">🔴 Nonaktif / Suspend</option></select></div></div>
                            </div>
                            <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row gap-3 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="w-full sm:w-1/3 py-3 sm:py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" disabled={isSubmitting}>Batal</button>
                                <button type="submit" className="w-full sm:w-2/3 py-3 sm:py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-700 flex justify-center items-center transition-all transform sm:hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none" disabled={isSubmitting}>{isSubmitting ? <><i className="ph-bold ph-spinner ph-spin mr-2 text-lg sm:text-xl"></i> Menyimpan...</> : <><i className="ph-bold ph-floppy-disk mr-2 text-lg sm:text-xl"></i> Simpan Data</>}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
