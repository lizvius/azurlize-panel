export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDrmJ8WbMTy5RBKNdmBfMXIL0CKYT8xTteOqGolCPDoD8G5Ra65Yzh3N-sjLuKlRpg/exec';

export const formatToDDMMYYYY = (dateStr: any) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const parts = dateStr.split('T')[0].split('-');
        if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch(e) {
        return dateStr;
    }
};

export const getSavedPermissions = () => {
    try {
        const saved = localStorage.getItem('recruitOps_permissions_v2');
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
        dashboard: { name: 'Dashboard', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        announcement: { name: 'Pemberitahuan Dan Chat', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        follow_up: { name: 'Follow Up', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin', 'Staff'] },
        performance: { name: 'Recruiter Performance', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        goals: { name: 'Recruitment Goals', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        channels: { name: 'Channel Performance', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        daily_data: { name: 'Daily Data', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin', 'Staff'] },
        daily_stats: { name: 'Daily Stats', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin', 'Staff'] },
        payroll: { name: 'Payroll', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin', 'Admin'] },
        users: { name: 'User Accounts', view: ['Superadmin', 'Admin', 'Staff'], edit: ['Superadmin'] },
        settings: { name: 'Settings', view: ['Superadmin'], edit: ['Superadmin'] }
    };
};

export const hasViewAccess = (pageId: string, role: string) => {
    if (!role) return false;
    const r = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (r === 'Superadmin') return true;
    const perms: any = getSavedPermissions();
    const pagePerms = perms[pageId];
    if (!pagePerms) return true;
    return pagePerms.view.map((x: string) => x.toLowerCase()).includes(r.toLowerCase());
};

export const hasEditAccess = (pageId: string, role: string) => {
    if (!role) return false;
    const r = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (r === 'Superadmin') return true;
    const perms: any = getSavedPermissions();
    const pagePerms = perms[pageId];
    if (!pagePerms) return false;
    return pagePerms.edit.map((x: string) => x.toLowerCase()).includes(r.toLowerCase());
};
