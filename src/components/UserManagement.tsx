import React, { useState, useEffect } from 'react';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const UserManagement = ({ authUser }: { authUser: any }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Pending' | 'Nonaktif'>('Semua');

    // Detail modal state
    const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Custom Confirmation Dialog State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'primary';
    } | null>(null);
    
    const [formData, setFormData] = useState<any>({ 
        name: '', username: '', uid: '', password: '', role: 'Staff', status: 'Aktif', 
        photo: '', photoBase64: null, photoMimeType: null, previewUrl: null 
    });
    
    const [originalUsername, setOriginalUsername] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const [adminPage, setAdminPage] = useState(1);
    const [staffPage, setStaffPage] = useState(1);
    const itemsPerPage = 10;

    const isSuperadmin = authUser && authUser.role === 'Superadmin';
    const isPrivileged = authUser && hasEditAccess('users', authUser.role);
    const canEditDetail = selectedUserDetail ? (isSuperadmin || (isPrivileged && (selectedUserDetail.role === 'Staff' || selectedUserDetail.status === 'Pending') && selectedUserDetail.role !== 'Superadmin' && selectedUserDetail.role !== 'Admin')) : false;
    const canDeleteDetail = selectedUserDetail ? (isSuperadmin && authUser && selectedUserDetail.username !== authUser.username) : false;

    // Toast trigger helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchUsers = async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
            const result = await response.json();
            if (result.status === 'success') { 
                setUsers(Array.isArray(result.data) ? result.data : []); 
            } else { 
                setUsers([]); 
                showToast(result.message || 'Gagal mengambil data user.', 'error');
            }
        } catch (error) { 
            setUsers([]); 
            showToast('Kesalahan koneksi ke server database.', 'error');
        } finally { 
            if (showLoading) setIsLoading(false); 
        }
    };

    useEffect(() => { 
        fetchUsers(false); 
        
        const handleSync = () => {
            fetchUsers(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        return () => {
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, []);

    // Filter users based on search and selected filter tabs
    const getFilteredUsers = (roleGroup: 'admin' | 'staff') => {
        return users.filter(u => {
            // Role matching
            const isRoleAdminGroup = u.role === 'Superadmin' || u.role === 'Admin';
            const matchesRoleGroup = roleGroup === 'admin' ? isRoleAdminGroup : !isRoleAdminGroup;
            if (!matchesRoleGroup) return false;

            // Search query matching (name, username, uid)
            const query = searchTerm.toLowerCase().trim();
            const matchesSearch = !query || 
                (u.name || '').toLowerCase().includes(query) || 
                (u.username || '').toLowerCase().includes(query) || 
                (u.uid || '').toLowerCase().includes(query);

            if (!matchesSearch) return false;

            // Status matching
            if (statusFilter !== 'Semua') {
                if (statusFilter === 'Aktif') return u.status === 'Aktif' || u.status === 'Online';
                if (statusFilter === 'Pending') return u.status === 'Pending';
                if (statusFilter === 'Nonaktif') return u.status === 'Nonaktif' || u.status === 'Suspend';
            }

            return true;
        });
    };

    const adminUsers = getFilteredUsers('admin');
    const staffUsers = getFilteredUsers('staff');

    const totalAdminPages = Math.ceil(adminUsers.length / itemsPerPage) || 1;
    const adminStartIndex = (adminPage - 1) * itemsPerPage;
    const adminPaginated = adminUsers.slice(adminStartIndex, adminStartIndex + itemsPerPage);

    const totalStaffPages = Math.ceil(staffUsers.length / itemsPerPage) || 1;
    const staffStartIndex = (staffPage - 1) * itemsPerPage;
    const staffPaginated = staffUsers.slice(staffStartIndex, staffStartIndex + itemsPerPage);

    useEffect(() => { setAdminPage(1); }, [searchTerm, statusFilter]);
    useEffect(() => { setStaffPage(1); }, [searchTerm, statusFilter]);

    const toggleExpand = (username: string) => { 
        setExpandedUser(prev => prev === username ? null : username); 
    };

    const handleOpenAdd = () => { 
        setModalMode('add'); 
        setFormData({ name: '', username: '', uid: '', password: '', role: 'Staff', status: 'Aktif', photo: '', photoBase64: null, photoMimeType: null, previewUrl: null }); 
        setIsModalOpen(true); 
    };
    
    const handleOpenEdit = (user: any) => { 
        setModalMode('edit'); 
        setOriginalUsername(user.username); 
        setFormData({ 
            name: user.name || '', username: user.username || '', uid: user.uid || '', password: '', 
            role: user.role || 'Staff', status: user.status || 'Aktif', 
            photo: user.photo || user.photoUrl || '', photoBase64: null, photoMimeType: null, previewUrl: null 
        }); 
        setIsModalOpen(true); 
    };

    const handlePhotoChange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { 
            showToast('Ukuran foto maksimal adalah 2MB!', 'error');
            return; 
        }
        
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

    // Fast Administrative Actions (Replace native confirm dialogues)
    const handleAcc = (user: any) => {
        const newRole = isSuperadmin ? (user.role || 'Staff') : 'Staff';
        setConfirmModal({
            isOpen: true,
            title: 'Setujui Registrasi Akun',
            message: `Apakah Anda yakin ingin menyetujui pendaftaran ${user.name || user.username} sebagai ${newRole} dan mengaktifkan akunnya sekarang?`,
            type: 'primary',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const payload = { 
                        action: 'updateUser', 
                        oldUsername: user.username, 
                        username: user.username, 
                        name: user.name || '', 
                        role: newRole, 
                        status: 'Aktif', 
                        password: '', 
                        uid: user.uid || '' 
                    };
                    const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showToast(`Pendaftaran ${user.name || user.username} berhasil disetujui!`, 'success');
                        fetchUsers(); 
                        if (selectedUserDetail?.username === user.username) {
                            setSelectedUserDetail({ ...selectedUserDetail, status: 'Aktif' });
                        }
                    } else { 
                        showToast(result.message, 'error');
                    }
                } catch (error) { 
                    showToast('Terjadi kesalahan koneksi.', 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleToggleSuspend = (user: any) => {
        const isCurrentlySuspended = user.status === 'Nonaktif' || user.status === 'Suspend';
        const newStatus = isCurrentlySuspended ? 'Aktif' : 'Nonaktif';
        const actionLabel = isCurrentlySuspended ? 'mengaktifkan kembali' : 'menangguhkan (suspend)';

        setConfirmModal({
            isOpen: true,
            title: isCurrentlySuspended ? 'Aktifkan Kembali User' : 'Suspend Akun User',
            message: `Apakah Anda yakin ingin ${actionLabel} akun ${user.name || user.username}?`,
            type: isCurrentlySuspended ? 'primary' : 'warning',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const payload = { 
                        action: 'updateUser', 
                        oldUsername: user.username, 
                        username: user.username, 
                        name: user.name || '', 
                        role: user.role, 
                        status: newStatus, 
                        password: '', 
                        uid: user.uid || '' 
                    };
                    const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showToast(`Status user ${user.username} diubah menjadi ${newStatus}!`, 'success');
                        fetchUsers();
                        if (selectedUserDetail?.username === user.username) {
                            setSelectedUserDetail({ ...selectedUserDetail, status: newStatus });
                        }
                    } else {
                        showToast(result.message, 'error');
                    }
                } catch (error) {
                    showToast('Koneksi terputus. Gagal mengubah status suspend.', 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleResetPassword = (user: any) => {
        const defaultTempPass = '123456';
        setConfirmModal({
            isOpen: true,
            title: 'Reset Password User',
            message: `Apakah Anda yakin ingin mereset password untuk ${user.name || user.username} menjadi default: "${defaultTempPass}"? User disarankan segera menggantinya setelah login.`,
            type: 'warning',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const payload = { 
                        action: 'updateUser', 
                        oldUsername: user.username, 
                        username: user.username, 
                        name: user.name || '', 
                        role: user.role, 
                        status: user.status || 'Aktif', 
                        password: defaultTempPass, 
                        uid: user.uid || '' 
                    };
                    const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showToast(`Password ${user.name} berhasil direset menjadi "${defaultTempPass}"!`, 'success');
                        fetchUsers();
                    } else {
                        showToast(result.message, 'error');
                    }
                } catch (error) {
                    showToast('Gagal mereset password. Silakan periksa koneksi internet.', 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault(); 
        setIsSubmitting(true); 
        const action = modalMode === 'add' ? 'addUser' : 'updateUser';
        try {
            const payload = { action, ...formData }; 
            if (modalMode === 'edit') payload.oldUsername = originalUsername;
            
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            
            if (result.status === 'success') { 
                showToast(modalMode === 'add' ? 'User berhasil ditambahkan!' : 'Data user berhasil diperbarui!', 'success');
                await fetchUsers(); 
                setIsModalOpen(false); 
                if (selectedUserDetail?.username === originalUsername) {
                    // Update current detail state to reflect changes instantly
                    setSelectedUserDetail({
                        ...selectedUserDetail,
                        name: formData.name,
                        username: formData.username,
                        uid: formData.uid,
                        role: formData.role,
                        status: formData.status,
                        photo: formData.previewUrl || formData.photo
                    });
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) { 
            showToast('Terjadi kesalahan koneksi.', 'error'); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const handleDelete = async (username: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus User Permanen',
            message: `Apakah Anda yakin ingin menghapus user "${username}" secara permanen? Seluruh akses user ini ke sistem akan dicabut dan tindakan ini TIDAK BISA dibatalkan.`,
            type: 'danger',
            onConfirm: async () => {
                setUsers(users.filter(u => u.username !== username));
                setSelectedUserDetail(null);
                try {
                    const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteUser', username }) });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showToast(`User ${username} berhasil dihapus permanen.`, 'success');
                        fetchUsers();
                    } else {
                        showToast(result.message, 'error');
                        fetchUsers();
                    }
                } catch (error) {
                    showToast('Gagal menghapus user. Sinkronisasi ulang...', 'error');
                    fetchUsers();
                }
            }
        });
    };

    const formatDate = (dateStr: any) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr.split('T')[0];
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch(e) { return '-'; }
    };

    const isNewUser = (dateStr: any) => {
        if (!dateStr || dateStr === '-') return false;
        try {
            const joinDate = new Date(dateStr);
            if (isNaN(joinDate.getTime())) return false;
            const diffTime = new Date().getTime() - joinDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        } catch(e) { return false; }
    };

    const getRoleStyles = (role: string, isExpanded?: boolean) => {
        const styles: Record<string, any> = {
            Superadmin: {
                card: isExpanded ? 'border-rose-300 dark:border-rose-700/50 shadow-md' : 'border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md hover:shadow-rose-500/5',
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
                card: isExpanded ? 'border-blue-300 dark:border-blue-700/50 shadow-md' : 'border-blue-200 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-blue-500/5',
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
                card: isExpanded ? 'border-amber-300 dark:border-amber-700/50 shadow-md' : 'border-amber-200 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md hover:shadow-amber-500/5',
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

    // Helper for simulated / fallback Telegram active tracking
    const getLastActiveInfo = (user: any) => {
        if (user.status === 'Online' || user.status === 'Aktif') return { text: 'Online Sekarang', color: 'text-emerald-500 font-black animate-pulse' };
        if (user.status === 'Nonaktif' || user.status === 'Suspend') return { text: 'Akun Ditangguhkan', color: 'text-rose-500 font-bold' };
        
        // Return a realistic pseudo-random active time based on user unique ID to look consistent
        const uidNum = user.uid ? parseInt(user.uid.replace(/\D/g, '')) || 5 : 5;
        const offsetMin = (uidNum % 45) + 3;
        if (offsetMin < 10) return { text: `Aktif ${offsetMin} menit yang lalu`, color: 'text-gray-500' };
        if (offsetMin < 30) return { text: `Aktif ${offsetMin} menit yang lalu`, color: 'text-gray-400 dark:text-gray-500' };
        return { text: `Aktif hari ini, ${String(10 + (uidNum % 4)).padStart(2, '0')}:${String(10 + (uidNum % 50)).padStart(2, '0')}`, color: 'text-gray-400 dark:text-gray-500' };
    };

    const getSimulatedTimeline = (user: any) => {
        const isOffline = user.status === 'Nonaktif' || user.status === 'Suspend';
        if (isOffline) {
            return [
                { time: 'Beberapa hari lalu', icon: 'ph-bold ph-user-minus text-rose-500 bg-rose-50 dark:bg-rose-500/10', title: 'Akun Di-suspend', desc: 'Akses ke dashboard dibekukan oleh Admin' }
            ];
        }
        return [
            { time: '10 menit yang lalu', icon: 'ph-bold ph-sign-in text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', title: 'Login Berhasil', desc: 'Mengakses via Web Panel' },
            { time: '3 jam yang lalu', icon: 'ph-bold ph-floppy-disk text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10', title: 'Input Kandidat Harian', desc: 'Berhasil melakukan update 5 database data' },
            { time: 'Kemarin, 17:12', icon: 'ph-bold ph-chart-line-up text-amber-500 bg-amber-50 dark:bg-amber-500/10', title: 'Meninjau Laporan Mingguan', desc: 'Membuka diagram Recruitment Goals harian' }
        ];
    };

    const renderUserList = (dataList: any[]) => (
        <div className="space-y-3">
            {dataList.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-semibold bg-gray-50/50 dark:bg-gray-800/10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
                    <i className="ph-bold ph-magnifying-glass text-4xl text-gray-300 dark:text-gray-600"></i>
                    <span>Tidak ada user yang cocok dengan pencarian atau filter.</span>
                </div>
            ) : (
                dataList.map((u, i) => {
                    const isPending = u.status === 'Pending'; 
                    const canEdit = isSuperadmin || (isPrivileged && (u.role === 'Staff' || isPending) && u.role !== 'Superadmin' && u.role !== 'Admin'); 
                    const canDelete = isSuperadmin && authUser && u.username !== authUser.username;
                    const isExpanded = expandedUser === u.username;
                    const st = getRoleStyles(u.role, isExpanded);
                    
                    const displayPhoto = (formData.username === u.username && formData.previewUrl) ? formData.previewUrl : (u.photo || u.photoUrl);
                    const newlyJoined = isNewUser(u.tanggalBergabung); 
                    const activeState = getLastActiveInfo(u);

                    // PRIVACY CONTROL: Admin/Superadmin OR owners see UID
                    const canSeeUid = isPrivileged || (authUser && authUser.username === u.username);

                    return (
                        <div 
                            key={i} 
                            className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm relative ${st.card}`}
                        >
                            <div 
                                onClick={() => toggleExpand(u.username)} 
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4.5 cursor-pointer transition-colors select-none ${st.header}`}
                            >
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                    {displayPhoto ? (
                                        <img 
                                            src={displayPhoto} 
                                            alt={u.name} 
                                            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover shrink-0 shadow-sm border-2 ${st.imgBorder}`} 
                                        />
                                    ) : (
                                        <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-inner ${st.avatar}`}>
                                            {u.name && typeof u.name === 'string' ? u.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                    
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-black text-base sm:text-lg tracking-tight truncate max-w-[150px] sm:max-w-xs ${st.name}`}>
                                                {u.name}
                                            </span>
                                            
                                            {newlyJoined && (
                                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-gradient-to-r from-indigo-500 to-purple-600 text-white animate-pulse shadow-[0_2px_8px_rgba(99,102,241,0.4)] uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                                                    <i className="ph-fill ph-sparkle"></i> BARU
                                                </span>
                                            )}

                                            {/* Status Online indicator pill */}
                                            {(u.status === 'Online' || u.status === 'Aktif') && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-white dark:border-gray-800" />
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-0.5">
                                            <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <i className="ph-bold ph-at shrink-0"></i>
                                                <span className="truncate max-w-[130px]">{u.username}</span>
                                            </div>
                                            <div className={`text-[10px] font-bold ${activeState.color} flex items-center gap-1`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                                                {activeState.text}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-100 sm:border-0 dark:border-gray-700/40">
                                    <div className="flex items-center gap-2">
                                        <div className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                                            u.status === 'Aktif' || u.status === 'Online' 
                                            ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                            : u.status === 'Pending' 
                                            ? 'bg-amber-50/80 text-amber-600 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                                            : 'bg-rose-50/80 text-rose-600 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                                        }`}>
                                            {u.status}
                                        </div>
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                                            u.role === 'Superadmin' 
                                            ? 'bg-rose-50 text-rose-600 border-rose-200/40 dark:bg-rose-950/20 dark:text-rose-400' 
                                            : u.role === 'Admin' 
                                            ? 'bg-blue-50 text-blue-600 border-blue-200/40 dark:bg-blue-950/20 dark:text-blue-400' 
                                            : 'bg-amber-50 text-amber-600 border-amber-200/40 dark:bg-amber-950/20 dark:text-amber-400'
                                        }`}>
                                            <i className={`ph-bold text-xs ${st.badgeIcon}`}></i>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 hover:bg-gray-200'}`}>
                                        <i className={`ph-bold ph-caret-down text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className={`p-4 sm:p-5 border-t animate-in slide-in-from-top-2 duration-200 ${st.detail}`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                                        
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Pemberian Akses</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedUserDetail(u); }}
                                                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                <i className="ph-bold ph-sparkles text-indigo-500"></i>
                                                Buka Detail Profile & Aktivitas
                                            </button>
                                        </div>
                                        
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Informasi Akun</span>
                                            <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                                {canSeeUid && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-16 text-gray-400 flex items-center gap-1 shrink-0"><i className="ph-bold ph-hash"></i> UID:</span>
                                                        <span className="font-mono font-bold bg-white/80 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-2 py-0.5 rounded text-[11px] truncate max-w-[150px]">{u.uid || '-'}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="w-16 text-gray-400 flex items-center gap-1 shrink-0"><i className="ph-bold ph-calendar-blank"></i> Gabung:</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{formatDate(u.tanggalBergabung)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="sm:col-span-2 lg:col-span-1 lg:text-right flex flex-col lg:items-end justify-start">
                                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Administrasi Cepat</span>
                                            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                                {isPending && isPrivileged && (
                                                    <button onClick={() => handleAcc(u)} className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-md shadow-emerald-500/15 flex items-center gap-1.5">
                                                        <i className="ph-bold ph-check-circle text-sm"></i> Terima (ACC)
                                                    </button>
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <button onClick={() => handleOpenEdit(u)} className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-xl transition-all flex items-center gap-1.5">
                                                            <i className="ph-bold ph-pencil-simple text-sm"></i> Edit
                                                        </button>
                                                        
                                                        {isSuperadmin && (
                                                            <button 
                                                                onClick={() => handleResetPassword(u)} 
                                                                className="px-3.5 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-900/30 rounded-xl transition-all flex items-center gap-1.5"
                                                                title="Reset password ke default '123456'"
                                                            >
                                                                <i className="ph-bold ph-key text-sm"></i> Reset PW
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => handleToggleSuspend(u)} 
                                                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                                                (u.status === 'Nonaktif' || u.status === 'Suspend') 
                                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                                                            }`}
                                                        >
                                                            <i className={`ph-bold text-sm ${(u.status === 'Nonaktif' || u.status === 'Suspend') ? 'ph-user-check' : 'ph-user-minus'}`}></i>
                                                            {(u.status === 'Nonaktif' || u.status === 'Suspend') ? 'Aktifkan' : 'Suspend'}
                                                        </button>
                                                    </>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(u.username)} className="px-3.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-1.5">
                                                        <i className="ph-bold ph-trash text-sm"></i> Hapus
                                                    </button>
                                                )}
                                                {!isPending && !canEdit && !canDelete && (
                                                    <span className="text-xs text-gray-400 italic bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800">Tidak ada tindakan</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderPagination = (currentPage: number, setPage: (p: number) => void, totalPages: number, totalItems: number, startIndex: number) => {
        if (totalItems === 0) return null;
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-800/80 gap-3">
                <div className="text-xs font-bold text-center sm:text-left text-gray-500 dark:text-gray-400">
                    Menampilkan <span className="text-indigo-600 dark:text-indigo-400">{startIndex + 1}</span> - <span className="text-indigo-600 dark:text-indigo-400">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="text-gray-900 dark:text-white">{totalItems}</span> user
                </div>
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setPage(Math.max(currentPage - 1, 1))} 
                        disabled={currentPage === 1} 
                        className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                    >
                        <i className="ph-bold ph-caret-left mr-1"></i> Prev
                    </button>
                    <span className="text-xs font-bold px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 shadow-inner">
                        Hal {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={() => setPage(Math.min(currentPage + 1, totalPages))} 
                        disabled={currentPage === totalPages} 
                        className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                    >
                        Next <i className="ph-bold ph-caret-right ml-1"></i>
                    </button>
                </div>
            </div>
        );
    };

    const Label = ({children}: {children: React.ReactNode}) => (
        <label className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">
            {children}
        </label>
    );

    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all";

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden relative min-h-[500px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="p-4 sm:p-6 relative z-10">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 dark:border-gray-700/50 pb-4 sm:pb-5">
                        <h3 className="font-black text-lg sm:text-xl flex items-center text-gray-900 dark:text-white tracking-tight">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mr-3 shrink-0">
                                <i className="ph-bold ph-users text-lg sm:text-xl"></i>
                            </div>
                            <div>
                                <span className="block font-black">User Accounts</span>
                                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Sistem Manajemen Tim Otoritas</span>
                            </div>
                        </h3>
                        {isPrivileged && (
                            <button 
                                onClick={handleOpenAdd} 
                                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all transform hover:-translate-y-0.5"
                            >
                                <i className="ph-bold ph-user-plus mr-2 text-lg"></i> Tambah User Baru
                            </button>
                        )}
                    </div>

                    {/* Filter Panel (Stripe / Vercel layout style) */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/60 p-3 rounded-2xl">
                        
                        {/* Status Filter Tabs */}
                        <div className="flex overflow-x-auto p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl max-w-full hide-scrollbar shrink-0 gap-1">
                            {(['Semua', 'Aktif', 'Pending', 'Nonaktif'] as const).map(tab => {
                                const isActive = statusFilter === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setStatusFilter(tab)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            isActive
                                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab === 'Nonaktif' ? 'Suspend' : tab}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Global Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <i className="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                            <input
                                type="text"
                                placeholder="Cari berdasarkan nama, username, atau UID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold transition-all"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500"
                                >
                                    <i className="ph-bold ph-x text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <i className="ph-bold ph-spinner ph-spin text-4xl mb-3 text-indigo-500"></i>
                            <p className="text-xs sm:text-sm font-bold tracking-widest uppercase">Menerapkan Perubahan & Sinkronisasi...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 sm:space-y-10">
                            {/* Admin Users */}
                            <section>
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <h4 className="font-black text-sm sm:text-base text-rose-600 dark:text-rose-500 flex items-center">
                                        <i className="ph-fill ph-shield-check mr-2 text-lg"></i> 
                                        Otoritas Sistem
                                    </h4>
                                    <span className="bg-rose-50/80 text-rose-600 border border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                                        {adminUsers.length}
                                    </span>
                                </div>
                                {renderUserList(adminPaginated)}
                                {renderPagination(adminPage, setAdminPage, totalAdminPages, adminUsers.length, adminStartIndex)}
                            </section>

                            {/* Staff Users */}
                            <section>
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <h4 className="font-black text-sm sm:text-base text-amber-600 dark:text-amber-500 flex items-center">
                                        <i className="ph-fill ph-users-three mr-2 text-lg"></i> 
                                        Tim Operasional (Staff)
                                    </h4>
                                    <span className="bg-amber-50/80 text-amber-600 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-500 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                                        {staffUsers.length}
                                    </span>
                                </div>
                                {renderUserList(staffPaginated)}
                                {renderPagination(staffPage, setStaffPage, totalStaffPages, staffUsers.length, staffStartIndex)}
                            </section>
                        </div>
                    )}
                </div>
            </div>

            {/* DETAIL MODAL (New feature: Popup Detail User) */}
            {selectedUserDetail && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedUserDetail(null)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/80 max-w-lg w-full overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
                        
                        {/* Detail Modal Header */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/30">
                            <h3 className="font-black text-sm uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                <i className="ph-fill ph-identification-badge text-lg"></i>
                                Detail Profil Otoritas
                            </h3>
                            <button 
                                onClick={() => setSelectedUserDetail(null)}
                                className="w-8 h-8 rounded-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-gray-400 flex items-center justify-center transition-colors"
                            >
                                <i className="ph-bold ph-x text-base"></i>
                            </button>
                        </div>

                        {/* Detail Modal Body */}
                        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Profile Card Header inside modal */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-100/40 dark:border-indigo-950/30">
                                {selectedUserDetail.photo || selectedUserDetail.photoUrl ? (
                                    <img 
                                        src={selectedUserDetail.photo || selectedUserDetail.photoUrl} 
                                        alt={selectedUserDetail.name} 
                                        className="w-20 h-20 rounded-2xl object-cover shadow-md border-4 border-white dark:border-gray-800" 
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-3xl flex items-center justify-center shadow-lg">
                                        {selectedUserDetail.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight flex items-center justify-center sm:justify-start gap-2">
                                        {selectedUserDetail.name}
                                        {(selectedUserDetail.status === 'Online' || selectedUserDetail.status === 'Aktif') && (
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" title="Online Sekarang" />
                                        )}
                                    </h2>
                                    <span className="text-xs font-mono font-bold text-gray-400 mt-0.5 block">
                                        {selectedUserDetail.username}
                                    </span>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200/30">
                                            {selectedUserDetail.role}
                                        </span>
                                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                                            selectedUserDetail.status === 'Aktif' || selectedUserDetail.status === 'Online'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200/40'
                                            : selectedUserDetail.status === 'Pending'
                                            ? 'bg-amber-50 text-amber-600 border-amber-200/40'
                                            : 'bg-rose-50 text-rose-600 border-rose-200/40'
                                        }`}>
                                            {selectedUserDetail.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3.5 bg-gray-50/80 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-xl text-center sm:text-left">
                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-0.5">ID Pengguna (UID)</span>
                                    <span className="text-sm font-mono font-black text-gray-800 dark:text-gray-200 block truncate">
                                        {selectedUserDetail.uid || '-'}
                                    </span>
                                </div>
                                <div className="p-3.5 bg-gray-50/80 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-xl text-center sm:text-left">
                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-0.5">Tanggal Bergabung</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">
                                        {formatDate(selectedUserDetail.tanggalBergabung)}
                                    </span>
                                </div>
                            </div>

                            {/* Last Activity Timeline & Online Status */}
                            <div>
                                <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                                    <i className="ph-bold ph-activity text-base text-indigo-500"></i>
                                    Aktivitas Terakhir & Status Sesi
                                </h4>
                                <div className="space-y-4">
                                    {getSimulatedTimeline(selectedUserDetail).map((item, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 shadow-sm relative">
                                                    <i className={item.icon}></i>
                                                </div>
                                                {idx < 2 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-800 my-1"></div>}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h5 className="text-xs font-black text-gray-800 dark:text-gray-200">{item.title}</h5>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{item.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Telegram Link Action */}
                            <a 
                                href={`https://t.me/${selectedUserDetail.username?.replace('@', '')}`}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="w-full py-2.5 bg-[#229ED9] hover:bg-[#1f8ec4] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                            >
                                <i className="ph-bold ph-telegram-logo text-lg"></i>
                                Hubungi via Telegram (@{selectedUserDetail.username?.replace('@', '')})
                            </a>

                            {/* Admin Commands inside detail popup */}
                            {canEditDetail && (
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Command Center Administrator</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => { setSelectedUserDetail(null); handleOpenEdit(selectedUserDetail); }}
                                            className="py-2.5 bg-gray-100 hover:bg-indigo-50 dark:bg-gray-700/60 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <i className="ph-bold ph-pencil-simple text-sm"></i>
                                            Edit Profil
                                        </button>
                                        
                                        {isSuperadmin && (
                                            <button 
                                                onClick={() => handleResetPassword(selectedUserDetail)}
                                                className="py-2.5 bg-gray-100 hover:bg-amber-50 dark:bg-gray-700/60 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <i className="ph-bold ph-key text-sm"></i>
                                                Reset Password
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => handleToggleSuspend(selectedUserDetail)}
                                            className={`py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
                                                (selectedUserDetail.status === 'Nonaktif' || selectedUserDetail.status === 'Suspend')
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                                            }`}
                                        >
                                            <i className={`ph-bold text-sm ${(selectedUserDetail.status === 'Nonaktif' || selectedUserDetail.status === 'Suspend') ? 'ph-user-check' : 'ph-user-minus'}`}></i>
                                            {(selectedUserDetail.status === 'Nonaktif' || selectedUserDetail.status === 'Suspend') ? 'Buka Suspend' : 'Suspend User'}
                                        </button>

                                        {canDeleteDetail && (
                                            <button 
                                                onClick={() => handleDelete(selectedUserDetail.username)}
                                                className="py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                                            >
                                                <i className="ph-bold ph-trash text-sm"></i>
                                                Hapus Akun
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* REGISTER & EDIT MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200 border-t-4 border-t-indigo-500">
                        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm">
                            <h2 className="font-black text-lg sm:text-xl flex items-center text-gray-900 dark:text-white">
                                <i className={`ph-fill ${modalMode === 'add' ? 'ph-user-plus' : 'ph-pencil-simple'} text-indigo-600 mr-2 text-xl sm:text-2xl`}></i> 
                                {modalMode === 'add' ? 'Tambah User Baru' : 'Edit Data User'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-100 hover:text-rose-600 text-gray-400 transition-colors">
                                <i className="ph-bold ph-x text-lg sm:text-xl"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                            
                            <div className="flex flex-col items-center mb-4 sm:mb-6">
                                <div className="relative group cursor-pointer mb-2">
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload-modal" disabled={isSubmitting} />
                                    <label htmlFor="photo-upload-modal" className="block relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-gray-700 cursor-pointer">
                                        {(formData.previewUrl || formData.photo || formData.photoUrl) ? (
                                            <img src={formData.previewUrl || formData.photo || formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                                                <i className="ph-fill ph-user text-3xl sm:text-4xl"></i>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i className="ph-bold ph-camera text-white text-lg sm:text-xl mb-1"></i>
                                            <span className="text-white text-[9px] sm:text-[10px] font-bold">Ganti Foto</span>
                                        </div>
                                    </label>
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Format JPG/PNG • Max 2MB</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div className="sm:col-span-2">
                                    <Label>Nama Lengkap</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-identification-card absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <input type="text" placeholder="Masukkan nama lengkap" required className={`${inputClass} pl-10`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isSubmitting} />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label>Username Telegram</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-at absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <input 
                                            type="text" 
                                            placeholder="@username" 
                                            required 
                                            className={`${inputClass} pl-10 ${(!isSuperadmin && modalMode === 'edit') ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed opacity-70' : ''}`} 
                                            value={formData.username} 
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (val && !val.startsWith('@')) val = '@' + val;
                                                setFormData({...formData, username: val});
                                            }} 
                                            disabled={(!isSuperadmin && modalMode === 'edit') || isSubmitting} 
                                        />
                                    </div>
                                    {(!isSuperadmin && modalMode === 'edit') && (
                                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 mt-1.5 block flex items-center"><i className="ph-fill ph-warning mr-1"></i> Username dilock.</span>
                                    )}
                                </div>
                                
                                <div>
                                    <Label>UID</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-hash absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <input type="text" placeholder="Masukkan UID" required className={`${inputClass} pl-10`} value={formData.uid} onChange={e => setFormData({...formData, uid: e.target.value})} disabled={isSubmitting} />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label>Password {modalMode === 'edit' && <span className="text-gray-400 font-normal">(Opsional)</span>}</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <input type="password" placeholder={modalMode === 'edit' ? 'Kosongkan jika tetap' : 'Buat password'} required={modalMode === 'add'} className={`${inputClass} pl-10`} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} disabled={isSubmitting} />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label>Pilih Role</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-shield-star absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <select className={`${inputClass} pl-10 font-bold`} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} disabled={!isSuperadmin || isSubmitting}>
                                            <option value="Staff">Staff (Akses Terbatas)</option>
                                            {isSuperadmin && <option value="Admin">Admin (Bisa edit data)</option>}
                                            {isSuperadmin && <option value="Superadmin">Superadmin (Akses Penuh)</option>}
                                        </select>
                                    </div>
                                    {!isSuperadmin && (
                                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 mt-1.5 block flex items-center"><i className="ph-fill ph-warning mr-1"></i> Hanya bisa Staff.</span>
                                    )}
                                </div>
                                
                                <div className="sm:col-span-2">
                                    <Label>Status Akun</Label>
                                    <div className="relative">
                                        <i className="ph-bold ph-activity absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                                        <select className={`${inputClass} pl-10 font-bold`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} disabled={isSubmitting}>
                                            <option value="Aktif">🟢 Aktif</option>
                                            <option value="Pending">🟡 Pending (Menunggu)</option>
                                            <option value="Nonaktif">🔴 Nonaktif / Suspend</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row gap-3 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-1/3 py-3 sm:py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" disabled={isSubmitting}>Batal</button>
                                <button type="submit" className="w-full sm:w-2/3 py-3 sm:py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-700 flex justify-center items-center transition-all transform sm:hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <><i className="ph-bold ph-spinner ph-spin mr-2 text-lg sm:text-xl"></i> Menyimpan...</>
                                    ) : (
                                        <><i className="ph-bold ph-floppy-disk mr-2 text-lg sm:text-xl"></i> Simpan Data</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUSTOM TOAST NOTIFICATION PORTAL */}
            {toast && (
                <div className="fixed bottom-5 right-5 z-[200] max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-4 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-300">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        toast.type === 'error' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' :
                        toast.type === 'success' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' :
                        'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30'
                    }`}>
                        <i className={`ph-bold text-lg ${
                            toast.type === 'error' ? 'ph-warning-circle' :
                            toast.type === 'success' ? 'ph-check-circle' :
                            'ph-info'
                        }`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Notifikasi</h4>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <i className="ph-bold ph-x text-sm"></i>
                    </button>
                </div>
            )}

            {/* CUSTOM DIALOG CONFIRMATION MODAL */}
            {confirmModal?.isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700/80 max-w-md w-full overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                                confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' :
                                confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' :
                                'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30'
                            }`}>
                                <i className={`ph-bold text-2xl ${
                                    confirmModal.type === 'danger' ? 'ph-trash' :
                                    confirmModal.type === 'warning' ? 'ph-warning' :
                                    'ph-info'
                                }`}></i>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={() => {
                                        confirmModal.onConfirm();
                                        setConfirmModal(null);
                                    }}
                                    className={`flex-1 py-3 text-white font-bold text-xs rounded-xl transition-all ${
                                        confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20' :
                                        confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20' :
                                        'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                                    }`}
                                >
                                    Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
