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
