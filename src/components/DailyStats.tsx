import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const DailyStats = ({ authUser }) => {
    // -------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------
    const [users, setUsers] = useState([]);
    const [dailyCandidates, setDailyCandidates] = useState([]);
    const [perfData, setPerfData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [activeTab, setActiveTab] = useState('input');
    const [harianDate, setHarianDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    });
    const [arsipOffset, setArsipOffset] = useState(-1);

    const [filterTanggalKerja, setFilterTanggalKerja] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    });
    const [riwayatBulan, setRiwayatBulan] = useState(() => new Date().toISOString().slice(0, 7));
    const [riwayatUsername, setRiwayatUsername] = useState('');

    // STATE BARU: Untuk membuka/menutup daftar staf yang sudah lapor
    const [showSelesaiInput, setShowSelesaiInput] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [formData, setFormData] = useState({ 
        id: '', tanggalKerja: '', tanggalLapor: '', username: '', postingan: '', kunjungan: '', pelamar: '', pengujian: '' 
    });

    const isPrivileged = authUser && hasEditAccess('daily_stats', authUser.role);

    const getOffsetMondayStr = (offset) => { 
        const d = new Date(); const day = d.getDay() || 7; d.setHours(0,0,0,0); d.setDate(d.getDate() - day + 1 + (offset * 7)); 
        const tzOffset = d.getTimezoneOffset() * 60000; 
        return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]; 
    };

    const formatToDDMMYYYY = (dateStr) => {
        if (!dateStr) return '-'; const d = new Date(dateStr); return isNaN(d.getTime()) ? dateStr : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; 
    };

    // -------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------
    const fetchData = async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const resUsers = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
            const dataUsers = await resUsers.json();
            if (dataUsers.status === 'success') { setUsers(Array.isArray(dataUsers.data) ? dataUsers.data : []); }

            const resCands = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getDailyData', role: authUser ? authUser.role : null, username: authUser ? authUser.username : null, name: authUser ? authUser.name : null }) });
            const dataCands = await resCands.json();
            if (dataCands.status === 'success') { setDailyCandidates(Array.isArray(dataCands.data) ? dataCands.data : []); }

            try {
                const resPerf = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getPerfData' }) });
                const dataPerf = await resPerf.json();
                if (dataPerf.status === 'success' && dataPerf.data) {
                    const mappedData = dataPerf.data.map(d => ({
                        ...d,
                        tanggalKerja: d.tanggalKerja || d.tanggal,
                        tanggalLapor: d.tanggalLapor || d.tanggal
                    }));
                    setPerfData(mappedData); 
                    localStorage.setItem('recruitOps_perfData', JSON.stringify(mappedData));
                }
            } catch (e) { const saved = localStorage.getItem('recruitOps_perfData'); if (saved) setPerfData(JSON.parse(saved)); }
        } catch (error) {} finally { if (showLoading) setIsLoading(false); }
    };

    useEffect(() => { 
        fetchData(false); 
        
        const handleSync = () => {
            fetchData(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        return () => {
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, []);

    // -------------------------------------------------------------
    // ENGINE BISNIS H+1 REPORTING
    // -------------------------------------------------------------
    const computeT0V0 = (username, dateStr) => {
        const cands = dailyCandidates.filter(c => {
            if (c.recruiter !== username || c.results !== 'Acc') return false;
            let dStr = "";
            try { 
                if (c.tanggal) {
                    const d = new Date(c.tanggal);
                    if (!isNaN(d.getTime())) dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                }
            } catch(e){}
            return dStr === dateStr;
        });
        let t0 = 0, v0 = 0; cands.forEach(c => { if ((c.grup || '').toUpperCase().includes('V0')) v0++; else t0++; });
        return { t0, v0, totalHarian: t0 + v0 };
    };

    const evaluateH1 = (tanggalKerja, tanggalLapor, totalHarian, postingan) => {
        let dendaTelat = 0, dendaTarget = 0;
        let statusLapor = 'Aman', statusTarget = 'Sesuai Target';
        const tk = new Date(tanggalKerja); tk.setHours(0,0,0,0);
        const today = new Date(); today.setHours(0,0,0,0);
        const deadline = new Date(tk); deadline.setDate(deadline.getDate() + 1);

        if (!tanggalLapor) {
            if (today > deadline) { statusLapor = 'Belum Lapor (Telat)'; dendaTelat = 5000; } 
            else { statusLapor = 'Belum Lapor (Aman)'; }
        } else {
            const tl = new Date(tanggalLapor); tl.setHours(0,0,0,0);
            if (tl > deadline) { statusLapor = 'Telat Lapor'; dendaTelat = 5000; } 
            else { statusLapor = 'Tepat Waktu'; }
        }

        let reqPosting = 0;
        if (totalHarian >= 3) reqPosting = 0; else if (totalHarian === 2) reqPosting = 30; else if (totalHarian === 1) reqPosting = 60; else reqPosting = 90;
        
        if (Number(postingan || 0) < reqPosting) {
            statusTarget = 'Kurang Target';
            if (tanggalLapor || today > deadline) dendaTarget = 5000;
        }

        const denda = dendaTelat + dendaTarget;
        const isMet = (dendaTarget === 0);
        return { reqPosting, isMet, denda, statusLapor, statusTarget, dendaTelat };
    };

    const generateWeeklySummary = (offset, listToProcess) => {
        const monday = getOffsetMondayStr(offset);
        const weekDays = [0,1,2,3,4,5,6].map(i => { const d = new Date(monday); d.setDate(d.getDate() + i); return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; });

        return listToProcess.map(staff => {
            const username = staff.username || staff.name;
            let joinDateObj = new Date(0);
            if (staff.tanggalBergabung && staff.tanggalBergabung !== '-') {
                const jd = new Date(staff.tanggalBergabung);
                if (!isNaN(jd.getTime())) { jd.setHours(0,0,0,0); joinDateObj = jd; }
            }

            let stats = { username, posts:0, kunjungan:0, pelamar:0, pengujian:0, t0:0, v0:0, totalHarian:0, missCount:0, denda:0, dapatBonus: false };
            let evaluatedDays = 0;
            
            weekDays.forEach(dateStr => {
                const currentEvalDate = new Date(dateStr); currentEvalDate.setHours(0,0,0,0);
                if (currentEvalDate.getTime() > new Date().setHours(0,0,0,0)) return; 
                if (currentEvalDate.getTime() < joinDateObj.getTime()) return;

                evaluatedDays++;
                const t0v0 = computeT0V0(username, dateStr); 
                const p = perfData.find(x => x.username === username && x.tanggalKerja === dateStr);
                const posts = p && p.postingan ? Number(p.postingan) : 0;
                
                const evalDay = evaluateH1(dateStr, p ? p.tanggalLapor : null, t0v0.totalHarian, posts);

                stats.posts += posts; stats.kunjungan += p && p.kunjungan ? Number(p.kunjungan) : 0; stats.pelamar += p && p.pelamar ? Number(p.pelamar) : 0; stats.pengujian += p && p.pengujian ? Number(p.pengujian) : 0;
                stats.t0 += t0v0.t0; stats.v0 += t0v0.v0; stats.totalHarian += t0v0.totalHarian; stats.denda += evalDay.denda;
                if (!evalDay.isMet || evalDay.dendaTelat > 0) stats.missCount++;
            });
            
            stats.dapatBonus = (evaluatedDays > 0 && stats.missCount === 0);
            return stats;
        }).sort((a,b) => b.totalHarian - a.totalHarian).map((s, idx) => ({ ...s, rank: idx + 1 }));
    };

    const globalStaffList = users.filter(u => u.role === 'Staff' && u.status === 'Aktif');
    const viewableStaffList = isPrivileged ? globalStaffList : globalStaffList.filter(u => u.username === authUser.username);

    const activeFormStats = computeT0V0(formData.username, formData.tanggalKerja);
    const evalForm = evaluateH1(formData.tanggalKerja, formData.tanggalLapor || new Date().toISOString().split('T')[0], activeFormStats.totalHarian, formData.postingan);

    const handleSavePerf = (e) => {
        e.preventDefault();
        const payload = { 
            id: modalMode === 'add' ? Date.now() : formData.id, 
            tanggalKerja: formData.tanggalKerja, 
            tanggalLapor: modalMode === 'add' ? new Date().toISOString().split('T')[0] : formData.tanggalLapor,
            tanggal: formData.tanggalKerja, 
            username: formData.username, 
            postingan: parseInt(formData.postingan) || 0, kunjungan: parseInt(formData.kunjungan) || 0, pelamar: parseInt(formData.pelamar) || 0, pengujian: parseInt(formData.pengujian) || 0 
        };
        let newData = [...perfData];
        if (modalMode === 'add') { newData.push(payload); } else { newData = newData.map(p => p.id === payload.id ? payload : p); }
        setPerfData(newData); localStorage.setItem('recruitOps_perfData', JSON.stringify(newData));
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addPerfData', ...payload }) }).catch(()=>{});
        setIsModalOpen(false);
    };

    const handleDelete = (id) => { 
        if(!window.confirm("Hapus data stats ini?")) return; 
        const newData = perfData.filter(p => p.id !== id); 
        setPerfData(newData); localStorage.setItem('recruitOps_perfData', JSON.stringify(newData)); 
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deletePerfData', id: id }) }).catch(()=>{}); 
    };
    
    const exportCSV = (dataRows, filename) => { const csv = dataRows.map(row => row.join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.setAttribute('href', url); a.setAttribute('download', filename); a.click(); };
    const handlePrint = () => window.print();

    // Data List Setup
    const globalWeeklySummary = generateWeeklySummary(0, globalStaffList);
    const arsipSummary = isPrivileged ? generateWeeklySummary(arsipOffset, globalStaffList) : [];
    const displayWeekly = isPrivileged ? globalWeeklySummary : globalWeeklySummary.filter(s => s.username === authUser.username || s.username === authUser.name);
    
    const displayHarian = viewableStaffList.map(staff => {
        const username = staff.username || staff.name; 
        let joinDateObj = new Date(0);
        if (staff.tanggalBergabung && staff.tanggalBergabung !== '-') {
            const jd = new Date(staff.tanggalBergabung);
            if (!isNaN(jd.getTime())) { jd.setHours(0,0,0,0); joinDateObj = jd; }
        }
        const currentEvalDate = new Date(harianDate); currentEvalDate.setHours(0,0,0,0);
        const isBeforeJoin = currentEvalDate.getTime() < joinDateObj.getTime();

        const t0v0 = computeT0V0(username, harianDate); 
        const p = perfData.find(x => x.username === username && x.tanggalKerja === harianDate);
        const hasInput = !!p; const posts = p && p.postingan ? Number(p.postingan) : 0;
        
        let evalDay = evaluateH1(harianDate, p ? p.tanggalLapor : null, t0v0.totalHarian, posts);
        let statusHarian = '';

        if (isBeforeJoin) {
            statusHarian = 'Belum Bergabung';
        } else {
            if (!hasInput && evalDay.dendaTelat === 0) { statusHarian = 'Belum Lapor'; } 
            else if (evalDay.denda === 0) { statusHarian = 'Sesuai Target'; } 
            else { statusHarian = 'Kurang Target'; }
        }

        return { username, posts, kunjungan: p && p.kunjungan ? Number(p.kunjungan) : 0, pelamar: p && p.pelamar ? Number(p.pelamar) : 0, pengujian: p && p.pengujian ? Number(p.pengujian) : 0, ...t0v0, denda: evalDay.denda, statusHarian, reqPosting: evalDay.reqPosting, telat: evalDay.statusLapor };
    }).filter(s => s.statusHarian !== 'Belum Bergabung'); 

    const totalWeekly = displayWeekly.reduce((acc, curr) => ({ posts: acc.posts + curr.posts, pelamar: acc.pelamar + curr.pelamar, pengujian: acc.pengujian + curr.pengujian, t0: acc.t0 + curr.t0, v0: acc.v0 + curr.v0, denda: acc.denda + curr.denda }), { posts: 0, pelamar: 0, pengujian: 0, t0: 0, v0: 0, denda: 0 });
    const InputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all";

    // -------------------------------------------------------------
    // RENDER: Kartu Tabel Harian
    // -------------------------------------------------------------
    const renderHarianCard = (s) => (
        <div key={s.username} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-black text-gray-600 dark:text-gray-300 shadow-inner shrink-0 border border-gray-300 dark:border-gray-600">
                        {s.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-black text-sm text-gray-900 dark:text-white truncate">{s.username}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{s.username}</div>
                    </div>
                </div>
                <div className="shrink-0 ml-2">
                    {s.statusHarian === 'Sesuai Target' && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center"><i className="ph-bold ph-check mr-1 text-emerald-500"></i> Aman</span>}
                    {s.statusHarian === 'Kurang Target' && <span className="bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center" title={`Butuh ${s.reqPosting} post`}><i className="ph-bold ph-warning mr-1 text-rose-500"></i> Denda {(s.denda/1000)}K</span>}
                    {s.statusHarian === 'Belum Lapor' && <span className="bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center"><i className="ph-bold ph-clock mr-1 text-gray-400"></i> Kosong</span>}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="text-center border-r border-gray-200 dark:border-gray-700"><div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Rekrut</div><div className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{s.totalHarian}</div></div>
                <div className="text-center border-r border-gray-200 dark:border-gray-700"><div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Posts</div><div className="font-black text-gray-700 dark:text-gray-300 text-lg">{s.posts}</div></div>
                <div className="text-center"><div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">T0 / V0</div><div className="font-black text-gray-700 dark:text-gray-300 text-lg">{s.t0} <span className="text-gray-300 text-sm">/</span> {s.v0}</div></div>
            </div>
            {s.telat.includes('Telat') && <div className="text-[9px] font-bold text-rose-500 text-center uppercase tracking-widest mt-1 animate-pulse">⚠️ Terlambat Lapor</div>}
        </div>
    );

    const renderMobileWeeklyCard = (s, isArsip) => (
        <div key={s.username} className="bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg border bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:border-purple-800/50 shadow-inner shrink-0">
                    {s.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1">
                        {s.username}
                    </div>
                    <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-2 py-0.5 rounded-md w-max mt-1">
                        Total Leads: {s.totalHarian}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="text-center"><div className="text-[9px] text-gray-400 font-bold mb-1 uppercase">PST</div><div className="text-sm font-black">{s.posts}</div></div>
                <div className="text-center"><div className="text-[9px] text-gray-400 font-bold mb-1 uppercase">KNJ</div><div className="text-sm font-black">{s.kunjungan}</div></div>
                <div className="text-center"><div className="text-[9px] text-gray-400 font-bold mb-1 uppercase">PLM</div><div className="text-sm font-black">{s.pelamar}</div></div>
                <div className="text-center"><div className="text-[9px] text-gray-400 font-bold mb-1 uppercase">UJI</div><div className="text-sm font-black">{s.pengujian}</div></div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-3">
                <div className="flex flex-col gap-1.5">
                    <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-black border border-emerald-100 dark:border-emerald-800/50">T0 (Acc): {s.t0}</span>
                    <span className="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 px-2 py-1 rounded text-[10px] font-black border border-purple-100 dark:border-purple-800/50">V0 (ELIT): {s.v0}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {s.denda > 0 ? (
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded shadow-sm border border-rose-100 dark:border-rose-800/50">Denda: Rp {(s.denda).toLocaleString('id-ID')}</span>
                    ) : (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded shadow-sm border border-emerald-100 dark:border-emerald-800/50">Bebas Denda</span>
                    )}
                    {s.dapatBonus && <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded flex items-center shadow-sm"><i className="ph-fill ph-star mr-1"></i> Bonus 50K Cair</span>}
                </div>
            </div>
        </div>
    );

    // -------------------------------------------------------------
    // RENDER: Helper Komponen Tab Input (Memisahkan Belum & Sudah Lapor)
    // -------------------------------------------------------------
    const renderInputRow = (item, isSelesai = false) => {
        const { staff, username, p, auto, evalP } = item;
        return (
            <tr key={username} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group ${evalP.dendaTelat > 0 && !p ? 'bg-rose-50/30' : ''} ${isSelesai ? 'opacity-80 hover:opacity-100 bg-gray-50/50 dark:bg-gray-900/20' : ''}`}>
                <td className="px-5 py-4"><div className="font-black text-sm text-gray-900 dark:text-white flex items-center"><i className="ph-fill ph-user-circle mr-2 text-gray-400 text-lg"></i>{staff.name}</div><div className="text-[10px] text-gray-500 mt-1 font-bold bg-gray-100 dark:bg-gray-800 w-max px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700"><i className="ph-bold ph-at mr-1"></i>{username}</div></td>
                <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p ? p.postingan : '-'}</td>
                <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p ? p.kunjungan : '-'}</td>
                <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p ? p.pelamar : '-'}</td>
                <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p ? p.pengujian : '-'}</td>
                <td className="px-5 py-4 text-center text-[10px] font-black"><div className="flex items-center justify-center gap-2"><span className="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 px-2 py-1 rounded shadow-sm">T0: {auto.t0}</span><span className="bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/30 px-2 py-1 rounded shadow-sm">V0: {auto.v0}</span></div></td>
                <td className="px-5 py-4 text-center">
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mb-1.5">{auto.totalHarian} Leads</div>
                    {evalP.dendaTelat > 0 && !p ? <span className="bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Telat Lapor</span> : 
                     p ? (evalP.totalDenda > 0 ? <span className="bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Denda {evalP.totalDenda/1000}K</span> : <span className="bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Aman</span>) :
                     <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Tertunda</span>}
                </td>
                <td className="px-5 py-4 text-right">
                    {p ? (
                        <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>{setModalMode('edit'); setFormData(p); setIsModalOpen(true);}} className="w-8 h-8 flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg shadow-sm transition-all"><i className="ph-bold ph-pencil-simple"></i></button>
                            {isPrivileged && <button onClick={()=>handleDelete(p.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg shadow-sm transition-all"><i className="ph-bold ph-trash"></i></button>}
                        </div>
                    ) : (
                        <button onClick={()=>{setModalMode('add'); setFormData({ id: '', tanggalKerja: filterTanggalKerja, tanggalLapor: '', username: username, postingan: '', kunjungan: '', pelamar: '', pengujian: '' }); setIsModalOpen(true);}} className="px-4 py-2 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-sm transition">Input Laporan</button>
                    )}
                </td>
            </tr>
        );
    };

    const renderInputCard = (item, isSelesai = false) => {
        const { staff, username, p, auto, evalP } = item;
        return (
            <div key={username} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm relative ${isSelesai ? 'opacity-80 border-dashed bg-gray-50/50 dark:bg-gray-900/20' : ''}`}>
                {evalP.dendaTelat > 0 && !p && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-widest animate-pulse">Terlambat</span>}
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><i className="ph-fill ph-user-circle text-gray-400 text-lg"></i>{staff.name}</div>
                        <div className="text-[10px] text-gray-500 mt-1 font-bold bg-gray-100 dark:bg-gray-700 w-max px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{username}</div>
                    </div>
                    {p && (
                        <div className="flex gap-2">
                            <button onClick={()=>{setModalMode('edit'); setFormData(p); setIsModalOpen(true);}} className="w-8 h-8 flex items-center justify-center text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><i className="ph-bold ph-pencil-simple text-lg"></i></button>
                            {isPrivileged && <button onClick={()=>handleDelete(p.id)} className="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-lg"><i className="ph-bold ph-trash text-lg"></i></button>}
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
                    <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Posts</div><div className="font-black text-sm">{p ? p.postingan : '-'}</div></div>
                    <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Kunj</div><div className="font-black text-sm">{p ? p.kunjungan : '-'}</div></div>
                    <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Plmr</div><div className="font-black text-sm">{p ? p.pelamar : '-'}</div></div>
                    <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Uji</div><div className="font-black text-sm">{p ? p.pengujian : '-'}</div></div>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-3">
                    <div className="flex gap-1">
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black border border-emerald-100">T0: {auto.t0}</span>
                        <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-[10px] font-black border border-purple-100">V0: {auto.v0}</span>
                    </div>
                    {!p ? (
                        <button onClick={()=>{setModalMode('add'); setFormData({ id: '', tanggalKerja: filterTanggalKerja, tanggalLapor: '', username: username, postingan: '', kunjungan: '', pelamar: '', pengujian: '' }); setIsModalOpen(true);}} className="px-3 py-1.5 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-lg shadow-sm">Input</button>
                    ) : (
                        <div className="text-right">
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{auto.totalHarian} Leads</div>
                            {evalP.totalDenda > 0 ? <span className="text-[9px] font-black text-rose-600">Denda {evalP.totalDenda/1000}K</span> : <span className="text-[9px] font-black text-emerald-600">Aman</span>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* 1. KARTU KPI UTAMA */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                {[ 
                    { l:'Total Posts', v: totalWeekly.posts, i:'ph-file-text', c:'blue', grad:'from-blue-500 to-indigo-600' }, 
                    { l:'Pelamar', v: totalWeekly.pelamar, i:'ph-users', c:'indigo', grad:'from-indigo-500 to-violet-600' }, 
                    { l:'Pengujian', v: totalWeekly.pengujian, i:'ph-exam', c:'amber', grad:'from-amber-400 to-orange-500' }, 
                    { l:'T0 (Acc)', v: totalWeekly.t0, i:'ph-check-circle', c:'emerald', grad:'from-emerald-400 to-teal-500' }, 
                    { l:'V0 (VIP)', v: totalWeekly.v0, i:'ph-star', c:'purple', grad:'from-purple-400 to-fuchsia-500' }, 
                    { l:'Denda', v: `Rp ${(totalWeekly.denda).toLocaleString('id-ID')}`, i:'ph-warning-circle', c:'rose', grad:'from-rose-400 to-red-500' } 
                ].map((k,idx)=>(
                    <div key={idx} className="relative group overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        {isLoading && <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-20 flex justify-center items-center"><i className={`ph-bold ph-spinner ph-spin text-2xl text-${k.c}-500`}></i></div>}
                        <div className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-gradient-to-r ${k.grad}`}></div>
                        <div className="p-4 sm:p-5 flex flex-col justify-between h-full relative z-10">
                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold leading-tight break-words max-w-[70%]">{k.l}</span>
                                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-${k.c}-50 dark:bg-${k.c}-900/20 text-${k.c}-500 dark:text-${k.c}-400 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                                    <i className={`ph-fill ${k.i} text-lg sm:text-xl`}></i>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className={`text-xl sm:text-2xl lg:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br ${k.grad} drop-shadow-sm`}>
                                    {isLoading ? '-' : k.v}
                                </span>
                                <i className={`ph-fill ${k.i} absolute -bottom-3 -right-2 text-5xl sm:text-6xl opacity-[0.04] dark:opacity-[0.03] group-hover:scale-125 transition-transform duration-500 pointer-events-none`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. TABS NAVIGASI & AKSI */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl overflow-hidden flex flex-col">
                <div className="flex border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-900/30 overflow-x-auto hide-scrollbar snap-x">
                    <button onClick={() => setActiveTab('input')} className={`px-5 sm:px-6 py-4 font-black text-xs sm:text-sm flex items-center whitespace-nowrap transition-all duration-300 border-b-[3px] snap-center ${activeTab === 'input' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        <i className="ph-bold ph-pencil-simple-line mr-2 text-lg"></i> Input Data
                    </button>
                    <button onClick={() => setActiveTab('harian')} className={`px-5 sm:px-6 py-4 font-black text-xs sm:text-sm flex items-center whitespace-nowrap transition-all duration-300 border-b-[3px] snap-center ${activeTab === 'harian' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        <i className="ph-bold ph-calendar-check mr-2 text-lg"></i> Rekap Harian
                    </button>
                    <button onClick={() => setActiveTab('mingguan')} className={`px-5 sm:px-6 py-4 font-black text-xs sm:text-sm flex items-center whitespace-nowrap transition-all duration-300 border-b-[3px] snap-center ${activeTab === 'mingguan' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        <i className="ph-bold ph-calendar-blank mr-2 text-lg"></i> Rekap Mingguan
                    </button>
                    {isPrivileged && (
                        <button onClick={() => setActiveTab('arsip')} className={`px-5 sm:px-6 py-4 font-black text-xs sm:text-sm flex items-center whitespace-nowrap transition-all duration-300 border-b-[3px] snap-center ${activeTab === 'arsip' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                            <i className="ph-bold ph-archive mr-2 text-lg"></i> Arsip Mingguan
                        </button>
                    )}
                    <button onClick={() => setActiveTab('riwayat')} className={`px-5 sm:px-6 py-4 font-black text-xs sm:text-sm flex items-center whitespace-nowrap transition-all duration-300 border-b-[3px] snap-center ${activeTab === 'riwayat' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        <i className="ph-bold ph-clock-counter-clockwise mr-2 text-lg"></i> Riwayat Semua Laporan
                    </button>
                </div>
                
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800">
                    <div className="w-full md:w-auto">
                        {activeTab === 'input' && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 dark:bg-gray-900 p-2 sm:p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                <label className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Tgl Kerja:</label>
                                <input type="date" value={filterTanggalKerja} onChange={e=>setFilterTanggalKerja(e.target.value)} className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto shadow-sm" />
                            </div>
                        )}
                        {activeTab === 'harian' && (
                            <div className="flex items-center gap-2 w-full overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                                <input type="date" value={harianDate} onChange={e=>setHarianDate(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm shrink-0" />
                                <button onClick={()=>{const d=new Date(); d.setHours(0,0,0,0); setHarianDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0])}} className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors border border-indigo-100 dark:border-indigo-800/50 shadow-sm shrink-0">Hari Ini</button>
                                <button onClick={()=>{const d=new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); setHarianDate(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0])}} className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">Kemarin</button>
                            </div>
                        )}
                        {activeTab === 'arsip' && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 dark:bg-gray-900 p-2 sm:p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                <label className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Pilih Minggu:</label>
                                <select value={arsipOffset} onChange={e => setArsipOffset(Number(e.target.value))} className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto shadow-sm">
                                    <option value={-1}>Minggu Lalu (H-1 Mgg)</option>
                                    <option value={-2}>2 Minggu Lalu (H-2 Mgg)</option>
                                    <option value={-3}>3 Minggu Lalu (H-3 Mgg)</option>
                                    <option value={-4}>4 Minggu Lalu (H-4 Mgg)</option>
                                </select>
                            </div>
                        )}
                        {activeTab === 'riwayat' && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 dark:bg-gray-900 p-2 sm:p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                <input type="month" value={riwayatBulan} onChange={e=>setRiwayatBulan(e.target.value)} className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto shadow-sm" />
                                {isPrivileged && (
                                    <select value={riwayatUsername} onChange={e=>setRiwayatUsername(e.target.value)} className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto shadow-sm">
                                        <option value="">Semua Staff</option>
                                        {globalStaffList.map((u, i) => <option key={i} value={u.username}>{u.name}</option>)}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 justify-end">
                        <button onClick={()=>fetchData()} className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-all shadow-sm" title="Refresh Data"><i className="ph-bold ph-arrows-clockwise text-lg"></i></button>
                        {['harian', 'mingguan', 'arsip', 'riwayat'].includes(activeTab) && (
                            <>
                                <button onClick={() => exportCSV(activeTab === 'harian' ? [['Username','Posts','Kunjungan','Pelamar','Pengujian','T0','V0','Total Harian','Denda'], ...displayHarian.map(s => [s.username, s.posts, s.kunjungan, s.pelamar, s.pengujian, s.t0, s.v0, s.totalHarian, s.denda])] : activeTab === 'riwayat' ? [['ID','Tgl Kerja','Tgl Lapor','Username','Posts','Visit','Pelamar','Uji'], ...perfData.filter(p => p.tanggalKerja.startsWith(riwayatBulan) && (riwayatUsername ? p.username === riwayatUsername : true) && (!isPrivileged ? p.username === authUser.username : true)).map(p => [p.id, p.tanggalKerja, p.tanggalLapor, p.username, p.postingan, p.kunjungan, p.pelamar, p.pengujian])] : [['Username','Posts','Kunjungan','Pelamar','Pengujian','T0','V0','Total Harian','Miss Target','Total Denda', 'Bonus 50K'], ...(activeTab === 'arsip' ? arsipSummary : displayWeekly).map(s => [s.username, s.posts, s.kunjungan, s.pelamar, s.pengujian, s.t0, s.v0, s.totalHarian, s.missCount, s.denda, s.dapatBonus ? 'Dapat' : 'Tidak'])], `Export_${activeTab}_${new Date().getTime()}.csv`)} className="px-4 py-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-100 dark:border-emerald-800/50 rounded-xl transition-colors font-black text-xs sm:text-sm flex items-center shadow-sm"><i className="ph-bold ph-file-csv mr-1.5 text-lg"></i> CSV</button>
                                <button onClick={handlePrint} className="px-4 py-2 text-rose-600 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-100 dark:border-rose-800/50 rounded-xl transition-colors font-black text-xs sm:text-sm flex items-center shadow-sm"><i className="ph-bold ph-printer mr-1.5 text-lg"></i> Print</button>
                            </>
                        )}
                    </div>
                </div>

                {/* AREA KONTEN (Tabel / Kartu HP) */}
                <div className="bg-white dark:bg-gray-800 min-h-[400px]">
                    
                    {/* TAB: INPUT DATA DENGAN KONSEP INBOX ZERO */}
                    {activeTab === 'input' && (() => {
                        const inputItems = viewableStaffList.map(staff => {
                            const username = staff.username || staff.name;
                            const p = perfData.find(x => x.username === username && x.tanggalKerja === filterTanggalKerja);
                            const auto = computeT0V0(username, filterTanggalKerja); 
                            const evalP = evaluateH1(filterTanggalKerja, p ? p.tanggalLapor : null, auto.totalHarian, p ? p.postingan : 0);
                            return { staff, username, p, auto, evalP };
                        });
                    
                        const belumInput = inputItems.filter(item => !item.p);
                        const sudahInput = inputItems.filter(item => !!item.p);

                        return (
                            <div>
                                {/* Desktop View */}
                                <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                                        <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-10 backdrop-blur-md">
                                            <tr><th className="px-5 py-4">Informasi Staf</th><th className="px-5 py-4 text-center">Postingan</th><th className="px-5 py-4 text-center">Visitor</th><th className="px-5 py-4 text-center">Pelamar</th><th className="px-5 py-4 text-center">Diuji</th><th className="px-5 py-4 text-center">Auto (T0/V0)</th><th className="px-5 py-4 text-center">Total & Status</th><th className="px-5 py-4 text-right">Tindakan</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {isLoading ? [...Array(3)].map((_,i)=><tr key={i}><td colSpan="8" className="px-5 py-6"><div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md w-full"></div></td></tr>) : 
                                            inputItems.length === 0 ? <tr><td colSpan="8" className="text-center py-16 text-gray-400 font-bold"><i className="ph-fill ph-folder-open text-5xl mb-2 opacity-50 block"></i>Belum ada data staf.</td></tr> :
                                            (
                                                <>
                                                    {/* Kondisi Jika Semua Selesai */}
                                                    {belumInput.length === 0 && sudahInput.length > 0 && (
                                                        <tr>
                                                            <td colSpan="8" className="text-center py-12">
                                                                <div className="inline-flex flex-col items-center justify-center bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-8 py-5 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
                                                                    <i className="ph-fill ph-check-circle text-5xl mb-3 drop-shadow-sm"></i>
                                                                    <span className="font-black text-lg">Semua Laporan Selesai! 🎉</span>
                                                                    <span className="text-xs font-bold mt-1 opacity-80">Tidak ada lagi input yang tertunda untuk tanggal ini.</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* Render Staf Yang Belum Input */}
                                                    {belumInput.map(item => renderInputRow(item, false))}

                                                    {/* Toggle Accordion Untuk Staf Yang Sudah Selesai */}
                                                    {sudahInput.length > 0 && (
                                                        <tr>
                                                            <td colSpan="8" className="bg-gray-50/80 dark:bg-gray-900/50 p-0 border-y border-gray-200 dark:border-gray-700">
                                                                <button onClick={() => setShowSelesaiInput(!showSelesaiInput)} className="w-full px-5 py-3.5 flex items-center justify-between text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors outline-none focus:bg-gray-100 dark:focus:bg-gray-800">
                                                                    <div className="font-black text-[10px] uppercase tracking-widest flex items-center"><i className="ph-fill ph-check-square-offset text-emerald-500 mr-2 text-lg"></i> Laporan Selesai & Bisa Diedit ({sudahInput.length} Orang)</div>
                                                                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold opacity-50">{showSelesaiInput ? 'Tutup' : 'Lihat'}</span><i className={`ph-bold ph-caret-${showSelesaiInput ? 'up' : 'down'} text-lg`}></i></div>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* Render Staf Yang Sudah Input (Hanya jika Accordion Terbuka) */}
                                                    {showSelesaiInput && sudahInput.map(item => renderInputRow(item, true))}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Mobile View */}
                                <div className="lg:hidden p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    {isLoading ? <div className="flex justify-center p-6"><i className="ph-bold ph-spinner ph-spin text-3xl text-indigo-500"></i></div> :
                                    inputItems.length === 0 ? <div className="text-center py-10 text-gray-400 font-bold"><i className="ph-fill ph-folder-open text-4xl mb-2 opacity-50 block"></i>Kosong</div> :
                                    (
                                        <>
                                            {/* Kondisi Jika Semua Selesai */}
                                            {belumInput.length === 0 && sudahInput.length > 0 && (
                                                <div className="text-center py-10 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center">
                                                    <i className="ph-fill ph-check-circle text-5xl text-emerald-500 mb-2 drop-shadow-sm"></i>
                                                    <p className="font-black text-emerald-700 dark:text-emerald-400 text-lg">Semua Selesai! 🎉</p>
                                                    <p className="text-xs font-bold text-emerald-600/70 mt-1">Laporan harian tuntas.</p>
                                                </div>
                                            )}

                                            {/* Render Staf Yang Belum Input */}
                                            {belumInput.map(item => renderInputCard(item, false))}

                                            {/* Toggle Accordion Mobile Untuk Staf Yang Sudah Selesai */}
                                            {sudahInput.length > 0 && (
                                                <button onClick={() => setShowSelesaiInput(!showSelesaiInput)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center text-sm font-black text-gray-600 dark:text-gray-300 shadow-sm active:scale-95 transition-transform outline-none">
                                                    <span className="flex items-center text-xs uppercase tracking-widest"><i className="ph-fill ph-check-square-offset text-emerald-500 mr-2 text-xl"></i> Sudah Lapor ({sudahInput.length})</span>
                                                    <i className={`ph-bold ph-caret-${showSelesaiInput ? 'up' : 'down'} text-xl`}></i>
                                                </button>
                                            )}

                                            {/* Render Staf Yang Sudah Input (Hanya jika Accordion Terbuka) */}
                                            {showSelesaiInput && <div className="space-y-4 pt-2 border-t border-gray-200 border-dashed dark:border-gray-700">{sudahInput.map(item => renderInputCard(item, true))}</div>}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                    {/* TAB: REKAP HARIAN */}
                    {activeTab === 'harian' && (
                        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/30 dark:bg-gray-900/20">
                            <h2 className="hidden print:block text-2xl font-black mb-6 text-center border-b pb-4">Rekap Harian - {formatToDDMMYYYY(harianDate)}</h2>
                            {isLoading ? <div className="flex flex-col items-center justify-center py-20 text-indigo-500"><i className="ph-bold ph-spinner ph-spin text-5xl mb-3 drop-shadow-md"></i></div> : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-gray-800 rounded-3xl p-5 border border-emerald-100 dark:border-emerald-800/40 shadow-sm flex flex-col">
                                        <h4 className="font-black text-emerald-700 dark:text-emerald-400 mb-5 flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-4"><span className="flex items-center text-base"><i className="ph-fill ph-check-circle mr-2 text-xl drop-shadow-sm"></i> Target Tercapai</span><span className="bg-emerald-500 text-white dark:bg-emerald-600 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm">{displayHarian.filter(s => s.statusHarian === 'Sesuai Target').length} Orang</span></h4>
                                        <div className="space-y-4 flex-1">{displayHarian.filter(s => s.statusHarian === 'Sesuai Target').map(renderHarianCard)}{displayHarian.filter(s => s.statusHarian === 'Sesuai Target').length === 0 && <div className="text-xs font-bold text-gray-400 text-center py-10 opacity-50"><i className="ph-fill ph-empty text-3xl mb-2 block"></i>Nihil</div>}</div>
                                    </div>
                                    <div className="bg-gradient-to-b from-rose-50/80 to-white dark:from-rose-950/20 dark:to-gray-800 rounded-3xl p-5 border border-rose-100 dark:border-rose-800/40 shadow-sm flex flex-col">
                                        <h4 className="font-black text-rose-700 dark:text-rose-400 mb-5 flex items-center justify-between border-b border-rose-200/60 dark:border-rose-800/60 pb-4"><span className="flex items-center text-base"><i className="ph-fill ph-warning-circle mr-2 text-xl drop-shadow-sm"></i> Kena Denda</span><span className="bg-rose-500 text-white dark:bg-rose-600 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm">{displayHarian.filter(s => s.statusHarian === 'Kurang Target').length} Orang</span></h4>
                                        <div className="space-y-4 flex-1">{displayHarian.filter(s => s.statusHarian === 'Kurang Target').map(renderHarianCard)}{displayHarian.filter(s => s.statusHarian === 'Kurang Target').length === 0 && <div className="text-xs font-bold text-gray-400 text-center py-10 opacity-50"><i className="ph-fill ph-empty text-3xl mb-2 block"></i>Nihil</div>}</div>
                                    </div>
                                    <div className="bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/30 dark:to-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700/60 shadow-sm flex flex-col">
                                        <h4 className="font-black text-gray-700 dark:text-gray-300 mb-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-700/80 pb-4"><span className="flex items-center text-base"><i className="ph-fill ph-prohibit mr-2 text-xl drop-shadow-sm"></i> Belum Lapor</span><span className="bg-gray-500 text-white dark:bg-gray-600 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm">{displayHarian.filter(s => s.statusHarian === 'Belum Lapor').length} Orang</span></h4>
                                        <div className="space-y-4 flex-1">{displayHarian.filter(s => s.statusHarian === 'Belum Lapor').map(renderHarianCard)}{displayHarian.filter(s => s.statusHarian === 'Belum Lapor').length === 0 && <div className="text-xs font-bold text-gray-400 text-center py-10 opacity-50"><i className="ph-fill ph-empty text-3xl mb-2 block"></i>Nihil</div>}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: REKAP MINGGUAN */}
                    {activeTab === 'mingguan' && (
                        <div>
                            {/* Desktop View */}
                            <div className="hidden lg:block overflow-x-auto print:p-0 custom-scrollbar">
                                <h2 className="hidden print:block text-2xl font-black mb-6 text-center border-b pb-4">Rekap Mingguan - Mulai {formatToDDMMYYYY(getOffsetMondayStr(0))}</h2>
                                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                                    <thead className="bg-purple-50/80 dark:bg-purple-900/30 text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-widest border-b-2 border-purple-200 dark:border-purple-800/50 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="px-5 py-4 border-l border-purple-200 dark:border-purple-800/50">Anggota Tim</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">PST</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">KNJ</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">PLM</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">UJI</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">T0</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-purple-100/50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">V0</th><th className="px-5 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Total Leads</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 text-rose-700 dark:text-rose-400">Miss</th><th className="px-5 py-4 text-right border-l border-purple-200 dark:border-purple-800/50">Denda</th><th className="px-5 py-4 text-center border-l border-purple-200 dark:border-purple-800/50"><i className="ph-fill ph-gift text-amber-500 mr-1 text-sm"></i> Bonus (50K)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {isLoading ? [...Array(5)].map((_,i)=><tr key={i}><td colSpan="11" className="px-5 py-6"><div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md w-full"></div></td></tr>) : 
                                         displayWeekly.length === 0 ? <tr><td colSpan="11" className="text-center py-16 text-gray-400 font-bold"><i className="ph-fill ph-ghost text-5xl mb-2 opacity-50 block"></i>Data mingguan masih kosong.</td></tr> :
                                         displayWeekly.map((s, i) => (
                                            <tr key={i} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                                <td className="px-5 py-4 font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">{s.username}</td>
                                                <td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.posts}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.kunjungan}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.pelamar}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.pengujian}</td>
                                                <td className="px-4 py-4 text-center font-black text-emerald-600 dark:text-emerald-400 border-l border-gray-100 dark:border-gray-700/50 bg-emerald-50/30 dark:bg-emerald-900/10">{s.t0}</td><td className="px-4 py-4 text-center font-black text-purple-600 dark:text-purple-400 border-l border-gray-100 dark:border-gray-700/50 bg-purple-50/50 dark:bg-purple-900/20">{s.v0}</td>
                                                <td className="px-5 py-4 text-center font-black text-indigo-600 dark:text-indigo-400 border-l border-gray-100 dark:border-gray-700/50 text-base sm:text-lg bg-indigo-50/50 dark:bg-indigo-900/20 shadow-[inset_4px_0_0_rgba(79,70,229,0.5)]">{s.totalHarian}</td>
                                                <td className="px-4 py-4 text-center font-black border-l border-gray-100 dark:border-gray-700/50">{s.missCount > 0 ? <span className="text-rose-600 dark:text-rose-400">{s.missCount} Hari</span> : <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                                <td className="px-5 py-4 text-right font-black border-l border-gray-100 dark:border-gray-700/50">{s.denda > 0 ? <span className="text-rose-600 bg-rose-50 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800/50 px-2.5 py-1 rounded-md shadow-sm">Rp {(s.denda).toLocaleString('id-ID')}</span> : <span className="text-emerald-500 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">Rp 0</span>}</td>
                                                <td className="px-5 py-4 text-center font-black border-l border-gray-100 dark:border-gray-700/50">{s.dapatBonus ? <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md text-[10px] shadow-sm uppercase tracking-widest flex items-center justify-center w-max mx-auto"><i className="ph-fill ph-star mr-1.5"></i> Cair</span> : <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                            </tr>
                                         ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Mobile View */}
                            <div className="lg:hidden p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                                <h3 className="text-xs text-indigo-600 font-black uppercase tracking-widest text-center mb-2 bg-indigo-50 py-1.5 rounded-lg border border-indigo-100">Minggu Ini</h3>
                                {isLoading ? <div className="flex justify-center py-10"><i className="ph-bold ph-spinner ph-spin text-3xl text-indigo-500"></i></div> :
                                 displayWeekly.length === 0 ? <div className="text-center py-10 text-gray-400 font-bold">Data kosong.</div> :
                                 displayWeekly.map((s, i) => renderMobileWeeklyCard(s, false))}
                            </div>
                        </div>
                    )}

                    {/* TAB: ARSIP MINGGUAN */}
                    {activeTab === 'arsip' && isPrivileged && (
                        <div>
                            {/* Desktop View */}
                            <div className="hidden lg:block overflow-x-auto print:p-0 custom-scrollbar">
                                <div className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                                    <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white mb-2 flex items-center"><i className="ph-fill ph-archive-box mr-3 text-indigo-500"></i> Data Historis Mingguan</h2>
                                    <h3 className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">Periode: {formatToDDMMYYYY(getOffsetMondayStr(arsipOffset))} s/d {formatToDDMMYYYY(new Date(new Date(getOffsetMondayStr(arsipOffset)).getTime() + 6*24*60*60*1000).toISOString())}</h3>
                                </div>
                                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                                    <thead className="bg-purple-50/80 dark:bg-purple-900/30 text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-widest border-b-2 border-purple-200 dark:border-purple-800/50 sticky top-0 z-10 backdrop-blur-md">
                                        <tr><th className="px-5 py-4 border-l border-purple-200 dark:border-purple-800/50">Anggota Tim</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">PST</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">KNJ</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">PLM</th><th className="px-3 py-4 text-center border-l border-purple-200 dark:border-purple-800/50">UJI</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">T0</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-purple-100/50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">V0</th><th className="px-5 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Total Leads</th><th className="px-4 py-4 text-center border-l border-purple-200 dark:border-purple-800/50 text-rose-700 dark:text-rose-400">Miss</th><th className="px-5 py-4 text-right border-l border-purple-200 dark:border-purple-800/50">Denda</th><th className="px-5 py-4 text-center border-l border-purple-200 dark:border-purple-800/50"><i className="ph-fill ph-gift text-amber-500 mr-1 text-sm"></i> Bonus (50K)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {isLoading ? [...Array(3)].map((_,i)=><tr key={i}><td colSpan="11" className="px-5 py-6"><div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md w-full"></div></td></tr>) : 
                                         arsipSummary.length === 0 ? <tr><td colSpan="11" className="text-center py-16 text-gray-400 font-bold"><i className="ph-fill ph-ghost text-5xl mb-2 opacity-50 block"></i>Tidak ada data historis.</td></tr> :
                                         arsipSummary.map((s, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-5 py-4 font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">{s.username}</td>
                                                <td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.posts}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.kunjungan}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.pelamar}</td><td className="px-3 py-4 text-center font-bold text-gray-600 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{s.pengujian}</td>
                                                <td className="px-4 py-4 text-center font-black text-emerald-600 dark:text-emerald-400 border-l border-gray-100 dark:border-gray-700/50 bg-emerald-50/30 dark:bg-emerald-900/10">{s.t0}</td><td className="px-4 py-4 text-center font-black text-purple-600 dark:text-purple-400 border-l border-gray-100 dark:border-gray-700/50 bg-purple-50/50 dark:bg-purple-900/20">{s.v0}</td>
                                                <td className="px-5 py-4 text-center font-black text-indigo-600 dark:text-indigo-400 border-l border-gray-100 dark:border-gray-700/50 text-base sm:text-lg bg-indigo-50/50 dark:bg-indigo-900/20 shadow-[inset_4px_0_0_rgba(79,70,229,0.5)]">{s.totalHarian}</td>
                                                <td className="px-4 py-4 text-center font-black border-l border-gray-100 dark:border-gray-700/50">{s.missCount > 0 ? <span className="text-rose-600 dark:text-rose-400">{s.missCount} Hari</span> : <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                                <td className="px-5 py-4 text-right font-black border-l border-gray-100 dark:border-gray-700/50">{s.denda > 0 ? <span className="text-rose-600 bg-rose-50 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800/50 px-2.5 py-1 rounded-md shadow-sm">Rp {(s.denda).toLocaleString('id-ID')}</span> : <span className="text-emerald-500 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">Rp 0</span>}</td>
                                                <td className="px-5 py-4 text-center font-black border-l border-gray-100 dark:border-gray-700/50">{s.dapatBonus ? <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md text-[10px] shadow-sm uppercase tracking-widest flex items-center justify-center w-max mx-auto"><i className="ph-fill ph-star mr-1.5"></i> Cair</span> : <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                            </tr>
                                         ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Mobile View */}
                            <div className="lg:hidden p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                                <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center mb-2">{formatToDDMMYYYY(getOffsetMondayStr(arsipOffset))} - {formatToDDMMYYYY(new Date(new Date(getOffsetMondayStr(arsipOffset)).getTime() + 6*24*60*60*1000).toISOString())}</h3>
                                {isLoading ? <div className="flex justify-center py-10"><i className="ph-bold ph-spinner ph-spin text-3xl text-indigo-500"></i></div> :
                                 arsipSummary.length === 0 ? <div className="text-center py-10 text-gray-400 font-bold">Data historis kosong.</div> :
                                 arsipSummary.map((s, i) => renderMobileWeeklyCard(s, true))}
                            </div>
                        </div>
                    )}

                    {/* TAB: RIWAYAT SEMUA LAPORAN */}
                    {activeTab === 'riwayat' && (
                        <div>
                            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                                    <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-10 backdrop-blur-md">
                                        <tr><th className="px-5 py-4">Informasi Laporan</th><th className="px-5 py-4 text-center">Kerja vs Lapor</th><th className="px-5 py-4 text-center">PST</th><th className="px-5 py-4 text-center">KNJ</th><th className="px-5 py-4 text-center">PLM</th><th className="px-5 py-4 text-center">UJI</th><th className="px-5 py-4 text-center">Total & Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {perfData.filter(p => p.tanggalKerja.startsWith(riwayatBulan) && (riwayatUsername ? p.username === riwayatUsername : true) && (!isPrivileged ? p.username === authUser.username : true)).sort((a,b) => new Date(b.tanggalKerja).getTime() - new Date(a.tanggalKerja).getTime()).map((p, i) => {
                                            const auto = computeT0V0(p.username, p.tanggalKerja);
                                            const evalP = evaluateH1(p.tanggalKerja, p.tanggalLapor, auto.totalHarian, p.postingan);
                                            return (
                                                <tr key={i} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                    <td className="px-5 py-4"><div className="font-black text-sm text-gray-900 dark:text-white flex items-center"><i className="ph-fill ph-user-circle mr-2 text-gray-400 text-lg"></i>{p.username}</div></td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-bold px-2 py-0.5 rounded mb-1">K: {formatToDDMMYYYY(p.tanggalKerja)}</div>
                                                        <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 font-bold px-2 py-0.5 rounded">L: {formatToDDMMYYYY(p.tanggalLapor)}</div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p.postingan || 0}</td>
                                                    <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p.kunjungan || 0}</td>
                                                    <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p.pelamar || 0}</td>
                                                    <td className="px-5 py-4 text-center font-black text-sm text-gray-700 dark:text-gray-300">{p.pengujian || 0}</td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mb-1">{auto.totalHarian} Leads</div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            {evalP.statusLapor.includes('Telat') ? <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Telat Lapor</span> : <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Tepat Waktu</span>}
                                                            {evalP.statusTarget === 'Kurang Target' ? <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Denda Target</span> : <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Target Pas</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {perfData.filter(p => p.tanggalKerja.startsWith(riwayatBulan) && (riwayatUsername ? p.username === riwayatUsername : true) && (!isPrivileged ? p.username === authUser.username : true)).length === 0 && <tr><td colSpan="7" className="text-center py-16 text-gray-400 font-bold"><i className="ph-fill ph-folder-open text-5xl mb-2 opacity-50 block"></i>Belum ada data pelaporan.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Mobile View */}
                            <div className="lg:hidden p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                                {perfData.filter(p => p.tanggalKerja.startsWith(riwayatBulan) && (riwayatUsername ? p.username === riwayatUsername : true) && (!isPrivileged ? p.username === authUser.username : true)).length === 0 ? <div className="text-center py-10 text-gray-400 font-bold">Kosong</div> : 
                                perfData.filter(p => p.tanggalKerja.startsWith(riwayatBulan) && (riwayatUsername ? p.username === riwayatUsername : true) && (!isPrivileged ? p.username === authUser.username : true)).sort((a,b) => new Date(b.tanggalKerja).getTime() - new Date(a.tanggalKerja).getTime()).map((p, i) => {
                                    const auto = computeT0V0(p.username, p.tanggalKerja);
                                    const evalP = evaluateH1(p.tanggalKerja, p.tanggalLapor, auto.totalHarian, p.postingan);
                                    return (
                                        <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><i className="ph-fill ph-user-circle text-gray-400 text-lg"></i>{p.username}</div>
                                                <div className="text-right">
                                                    <div className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100 mb-1">Kerja: {formatToDDMMYYYY(p.tanggalKerja)}</div>
                                                    <div className="text-[9px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-bold border border-gray-200">Lapor: {formatToDDMMYYYY(p.tanggalLapor)}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50 text-center">
                                                <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Posts</div><div className="font-black text-sm">{p.postingan || 0}</div></div>
                                                <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Kunj</div><div className="font-black text-sm">{p.kunjungan || 0}</div></div>
                                                <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Plmr</div><div className="font-black text-sm">{p.pelamar || 0}</div></div>
                                                <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Uji</div><div className="font-black text-sm">{p.pengujian || 0}</div></div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                                <div className="text-left font-black text-indigo-600 dark:text-indigo-400">{auto.totalHarian} Leads</div>
                                                <div className="flex gap-2">
                                                    {evalP.statusLapor.includes('Telat') ? <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Telat</span> : <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Tepat</span>}
                                                    {evalP.statusTarget === 'Kurang Target' ? <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Denda</span> : <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Aman</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL INPUT/EDIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={()=>setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200 border-t-[6px] border-t-indigo-600">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex justify-between bg-white/50 dark:bg-gray-800/50 items-center">
                            <h2 className="font-black flex items-center text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-3 border border-indigo-100 dark:border-indigo-800/50"><i className={`ph-bold ${modalMode === 'add' ? 'ph-plus' : 'ph-pencil-simple'} text-xl`}></i></div>
                                {modalMode === 'add' ? 'Lapor Kinerja Harian' : 'Edit Kinerja Harian'}
                            </h2>
                            <button onClick={()=>setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"><i className="ph-bold ph-x text-lg"></i></button>
                        </div>
                        <form onSubmit={handleSavePerf} className="p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-[85vh] custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30">
                            
                            {/* Info Target Banner */}
                            <div className="mb-8 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-800 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                                <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl shrink-0"><i className="ph-fill ph-info text-2xl"></i></div>
                                <div className="w-full relative z-10">
                                    <h4 className="font-black text-indigo-900 dark:text-white text-sm uppercase tracking-widest mb-3">Aturan Target Rekrutmen</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/40 text-center shadow-sm"><div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Target 1</div><div className="font-black text-indigo-600 dark:text-indigo-400">3+ Leads</div><div className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-1">Bebas Post</div></div>
                                        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/40 text-center shadow-sm"><div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Target 2</div><div className="font-black text-indigo-600 dark:text-indigo-400">2 Leads</div><div className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-1">Min 30 Post</div></div>
                                        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/40 text-center shadow-sm"><div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Target 3</div><div className="font-black text-indigo-600 dark:text-indigo-400">1 Leads</div><div className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-1">Min 60 Post</div></div>
                                        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-center shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 rounded-bl-full"></div><div className="text-[10px] text-rose-500 uppercase font-bold mb-1">Terburuk</div><div className="font-black text-rose-600 dark:text-rose-400">0 Leads</div><div className="text-xs font-bold text-rose-600/80 mt-1">Min 90 Post</div></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-rose-500 mt-3 flex items-center bg-rose-50 dark:bg-rose-900/20 w-max px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-800/40"><i className="ph-bold ph-warning-circle mr-1.5 text-sm"></i> Gagal memenuhi target dan terlambat lapor dikenakan denda Rp 5.000.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                <div className="space-y-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center mb-4"><i className="ph-bold ph-identification-card mr-2 text-indigo-500"></i> Informasi Laporan</h4>
                                    <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Tanggal Kinerja</label><input type="date" required className={`${InputClass} bg-gray-100 cursor-not-allowed`} value={formData.tanggalKerja} readOnly /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Anggota Operasional</label><input type="text" required className={`${InputClass} bg-gray-100 cursor-not-allowed`} value={formData.username} readOnly /></div>
                                </div>
                                <div className="space-y-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center mb-4"><i className="ph-bold ph-chart-line-up mr-2 text-indigo-500"></i> Metrik Aktivitas</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Total Postingan</label><input type="number" min="0" required placeholder="0" className={InputClass} value={formData.postingan} onChange={e=>setFormData({...formData, postingan: e.target.value})} /></div>
                                        <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Jumlah Kunjungan</label><input type="number" min="0" required placeholder="0" className={InputClass} value={formData.kunjungan} onChange={e=>setFormData({...formData, kunjungan: e.target.value})} /></div>
                                        <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Kandidat Melamar</label><input type="number" min="0" required placeholder="0" className={InputClass} value={formData.pelamar} onChange={e=>setFormData({...formData, pelamar: e.target.value})} /></div>
                                        <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest ml-1">Selesai Diuji</label><input type="number" min="0" required placeholder="0" className={InputClass} value={formData.pengujian} onChange={e=>setFormData({...formData, pengujian: e.target.value})} /></div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 mt-2">
                                    <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-widest flex items-center"><i className="ph-fill ph-magic-wand mr-2 text-lg"></i> Preview Hasil Akhir Sistem</label>
                                    <div className="flex bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl overflow-hidden shadow-inner divide-x divide-indigo-100 dark:divide-indigo-800/50">
                                        <div className="flex-1 p-4 sm:p-5 text-center"><div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Auto ACC (T0)</div><div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{formData.username ? activeFormStats.t0 : '-'}</div></div>
                                        <div className="flex-1 p-4 sm:p-5 text-center"><div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Auto VIP (V0)</div><div className="text-2xl font-black text-purple-600 dark:text-purple-400 drop-shadow-sm">{formData.username ? activeFormStats.v0 : '-'}</div></div>
                                        <div className="flex-1 p-4 sm:p-5 text-center bg-indigo-100/50 dark:bg-indigo-900/50 relative"><div className="absolute top-0 left-0 w-full h-1 bg-indigo-400"></div><div className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest mb-1.5">Total Diterima</div><div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 drop-shadow-sm">{formData.username ? activeFormStats.totalHarian : '-'}</div></div>
                                        <div className="flex-[1.5] p-4 sm:p-5 text-center flex flex-col justify-center items-center bg-white/80 dark:bg-gray-800/80">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Evaluasi Denda</div>
                                            {formData.username ? (evalForm.denda > 0 ? <span className="bg-rose-500 text-white text-xs sm:text-sm px-4 py-1.5 rounded-full font-black shadow-lg shadow-rose-500/40 animate-pulse border-2 border-rose-400">Kena Rp {(evalForm.denda).toLocaleString('id-ID')}</span> : <span className="bg-emerald-500 text-white text-xs sm:text-sm px-4 py-1.5 rounded-full font-black shadow-lg shadow-emerald-500/40 border-2 border-emerald-400 flex items-center"><i className="ph-bold ph-check-circle mr-1"></i> Aman (Bebas)</span>) : <span className="text-gray-300 dark:text-gray-600 text-sm font-bold bg-gray-100 dark:bg-gray-900 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">Pilih Staf Dahulu</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 pb-4">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Batal</button>
                                <button type="submit" disabled={!formData.username} className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:bg-indigo-700 flex justify-center items-center transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"><i className="ph-bold ph-floppy-disk mr-2 text-xl"></i> {modalMode === 'add' ? 'Kirim Laporan' : 'Simpan Perubahan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
