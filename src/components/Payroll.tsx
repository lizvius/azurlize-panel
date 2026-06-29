import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY, hasEditAccess } from '../utils';

export const Payroll = ({ authUser }) => {
    const [data, setData] = useState([]);
    const [users, setUsers] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('');
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [formData, setFormData] = useState({
        id: '', periode: '', username: '', uid: '', hariKerja: '', totalPostingan: '',
        deklarasiT0: '0', sebenarnyaT0: '0', t3: '', deklarasiV0: '0', sebenarnyaV0: '0',
        rasioPeningkatan: '0%', komisi: '', bonusT0: '', bonusT3: '', otherBonus: '', deduksi: '',
        status: 'Draft'
    });

    const isPrivileged = authUser && hasEditAccess('payroll', authUser.role);

    const getSundayStr = (mondayStr) => {
        if (!mondayStr) return "";
        try {
            const d = new Date(mondayStr);
            d.setDate(d.getDate() + 6);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch (e) { return mondayStr; }
    };

    const getPayrollDateOfMonday = (mondayStr) => {
        if (!mondayStr) return "";
        try {
            const d = new Date(mondayStr);
            d.setDate(d.getDate() + 11);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch (e) { return ""; }
    };

    const getWeekId = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    useEffect(() => {
        let isMounted = true;
        const fetchData = async (showLoading = false) => {
            if (showLoading) setIsLoading(true);
            try {
                // 1. Fetch Users
                const resUsers = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getUsers' }) });
                const dataUsers = await resUsers.json();
                if (dataUsers.status === 'success' && isMounted) { setUsers(Array.isArray(dataUsers.data) ? dataUsers.data : []); }

                // 2. Fetch Payroll Data
                const resPayroll = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getPayrollData' }) });
                const dataPayroll = await resPayroll.json();
                if (dataPayroll.status === 'success' && isMounted) {
                    let fetchedData = Array.isArray(dataPayroll.data) ? dataPayroll.data : [];
                    if (!isPrivileged) {
                        fetchedData = fetchedData.filter(d => d.username === authUser.username || d.username === authUser.name);
                    }
                    setData(fetchedData);
                    
                    if (fetchedData.length > 0) {
                        const periods = [...new Set(fetchedData.map(d => d.periode))].sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());
                        setFilterPeriod(prev => prev || periods[0]);
                    }
                }

                // 3. Fetch Daily Data (Untuk Sinkronisasi T0 & V0 ACC Otomatis)
                if (isPrivileged) {
                    const resDaily = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getDailyData' }) });
                    const dailyResult = await resDaily.json();
                    if (dailyResult.status === 'success' && isMounted) {
                        setDailyData(Array.isArray(dailyResult.data) ? dailyResult.data : []);
                    }
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

    // =========================================================================
    // FUNGSI AUTO-FILL 1: DEKLARASI (Semua Status) & SEBENARNYA (Hanya ACC)
    // =========================================================================
    useEffect(() => {
        if (isModalOpen && formData.username && formData.periode && dailyData.length > 0) {
            const startDate = new Date(formData.periode);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(startDate.getTime());
            endDate.setDate(endDate.getDate() + 6); 
            endDate.setHours(23, 59, 59, 999);

            let declT0 = 0; 
            let declV0 = 0; 
            let autoT0 = 0; 
            let autoV0 = 0; 

            dailyData.forEach(d => {
                const rec = d.recruiter || d.username;
                if (rec === formData.username) {
                    const dDate = new Date(d.tanggal);
                    if (dDate >= startDate && dDate <= endDate) {
                        const isV0 = (d.grup || '').toUpperCase().includes('V0');
                        const statusData = (d.results || '').toLowerCase();
                        
                        if (isV0) declV0++;
                        else declT0++;

                        if (statusData === 'acc') {
                            if (isV0) autoV0++;
                            else autoT0++;
                        }
                    }
                }
            });

            if (formData.sebenarnyaT0 !== autoT0.toString() || 
                formData.sebenarnyaV0 !== autoV0.toString() ||
                formData.deklarasiT0 !== declT0.toString() ||
                formData.deklarasiV0 !== declV0.toString()) {
                setFormData(prev => ({
                    ...prev,
                    sebenarnyaT0: autoT0.toString(),
                    sebenarnyaV0: autoV0.toString(),
                    deklarasiT0: declT0.toString(),
                    deklarasiV0: declV0.toString()
                }));
            }
        }
    }, [formData.username, formData.periode, dailyData, isModalOpen]);

    // =========================================================================
    // FUNGSI AUTO-FILL 2: RASIO PENINGKATAN
    // Rumus: IFERROR((T3 + Sebenarnya V0) / (Sebenarnya T0 + T3 + Deklarasi V0 + Sebenarnya V0); 0)
    // =========================================================================
    useEffect(() => {
        if (isModalOpen) {
            const t3 = Number(formData.t3) || 0;
            const sebV0 = Number(formData.sebenarnyaV0) || 0;
            const sebT0 = Number(formData.sebenarnyaT0) || 0;
            const dekV0 = Number(formData.deklarasiV0) || 0;

            const pembilang = t3 + sebV0;
            const penyebut = sebT0 + t3 + dekV0 + sebV0;

            let rasioValue = 0;
            if (penyebut !== 0) {
                rasioValue = (pembilang / penyebut) * 100;
            }

            const formatRasio = `${rasioValue.toFixed(1).replace(/\.0$/, '')}%`;

            if (formData.rasioPeningkatan !== formatRasio) {
                setFormData(prev => ({
                    ...prev,
                    rasioPeningkatan: formatRasio
                }));
            }
        }
    }, [formData.t3, formData.sebenarnyaV0, formData.sebenarnyaT0, formData.deklarasiV0, isModalOpen]);

    const formatCurrency = (amount) => `Rp ${(Number(amount) || 0).toLocaleString('id-ID')}`;
    
    const calculatePayrollMetrix = (input) => {
        const aktif = Number(input.sebenarnyaT0) || 0;
        const promosi = (Number(input.t3) || 0) + (Number(input.sebenarnyaV0) || 0);
        let level = 0; let pokok = 0;

        if (aktif >= 21 && promosi >= 12) { level = 3; pokok = 500000; }
        else if (aktif >= 14 && promosi >= 7) { level = 2; pokok = 400000; }
        else if (aktif >= 7 && promosi >= 3) { level = 1; pokok = 300000; }

        const komisi = Number(input.komisi) || 0; const bT0 = Number(input.bonusT0) || 0; const bT3 = Number(input.bonusT3) || 0; const bOther = Number(input.otherBonus) || 0; const deduksi = Number(input.deduksi) || 0;
        const total = pokok + komisi + bT0 + bT3 + bOther - deduksi;
        return { level, pokok, total, aktif, promosi };
    };

    const liveStats = calculatePayrollMetrix(formData);

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData, id: modalMode === 'add' ? Date.now() : formData.id,
            levelGaji: liveStats.level, gajiPokok: liveStats.pokok, totalGaji: liveStats.total,
            status: formData.status || 'Draft',
            startWeek: formData.periode,
            endWeek: getSundayStr(formData.periode),
            payrollDate: getPayrollDateOfMonday(formData.periode),
            weekId: getWeekId(formData.periode)
        };

        let newData = [...data];
        if (modalMode === 'add') newData.push(payload);
        else newData = newData.map(p => p.id === payload.id ? payload : p);
        setData(newData); setIsModalOpen(false);

        const action = modalMode === 'add' ? 'addPayrollData' : 'updatePayrollData'; 
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: action, ...payload }) }); } catch(err) {}
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Hapus data slip gaji ini?")) return;
        setData(data.filter(p => p.id !== id));
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deletePayrollData', id: id }) }); } catch(err) {}
    };

    const handleTogglePublish = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
        setData(data.map(p => p.id === id ? { ...p, status: newStatus } : p));
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updatePayrollData', id, status: newStatus }) }); } catch(err) {}
    };

    const handlePublishAll = () => {
        if(!window.confirm("Umumkan SEMUA slip gaji di layar ini kepada staf?")) return;
        const updatedData = data.map(d => currentData.find(c => c.id === d.id) ? { ...d, status: 'Published' } : d);
        setData(updatedData);
        currentData.forEach(async (d) => {
            if(d.status !== 'Published') {
                await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updatePayrollData', id: d.id, status: 'Published' }) }).catch(()=>{});
            }
        });
    };

    const handleUserSelect = (username) => {
        const u = users.find(x => x.username === username);
        setFormData({ ...formData, username: username, uid: u ? (u.uid || '') : '' });
    };

    const currentData = data.filter(d => {
        const matchPeriod = filterPeriod ? d.periode === filterPeriod : true;
        const matchSearch = d.username?.toLowerCase().includes(searchQuery.toLowerCase()) || d.uid?.includes(searchQuery);
        return matchPeriod && matchSearch;
    }).map(d => {
        const u = users.find(x => x.username === d.username);
        return { ...d, fullName: u?.name || d.username, role: u?.role || 'Staff' };
    }).sort((a, b) => b.totalGaji - a.totalGaji);

    const availablePeriods = [...new Set(data.map(d => d.periode))].sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    const getRoleStyle = (role) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { bg: 'bg-[#e73a4b]', text: 'text-[#e73a4b]', icon: 'ph-crown' };
        if (r === 'admin') return { bg: 'bg-[#2563eb]', text: 'text-[#2563eb]', icon: 'ph-shield-check' };
        return { bg: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', icon: 'ph-user' };
    };

    const InputCls = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400";
    
    // ----------------------------------------------------------------------
    // TAMPILAN KHUSUS STAFF
    // ----------------------------------------------------------------------
    if (!isPrivileged) {
        return (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
                <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-6 sm:p-8 lg:p-10 rounded-[32px] shadow-2xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-500/20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute -left-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>
                    <div className="z-10 relative">
                        <div className="inline-flex items-center gap-2 text-emerald-300 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-4 bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-800/50">
                            <i className="ph-bold ph-receipt text-sm"></i> Payslip Saya
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
                            Slip Gaji <span className="text-emerald-400">Digital</span>
                        </h2>
                        <p className="text-indigo-200 text-sm sm:text-base">Informasi pendapatan dan insentif Anda secara transparan.</p>
                    </div>
                </div>

                {isLoading ? (
                     <div className="flex justify-center py-20"><i className="ph-bold ph-spinner ph-spin text-5xl text-emerald-500 drop-shadow-md"></i></div>
                ) : currentData.length === 0 ? (
                     <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center shadow-sm">
                         <i className="ph-fill ph-wallet text-6xl text-gray-300 mb-4 block"></i>
                         <h3 className="text-gray-900 dark:text-white font-black text-lg">Belum Ada Slip Gaji</h3>
                         <p className="text-sm text-gray-500">Anda belum memiliki catatan penggajian untuk saat ini.</p>
                     </div>
                ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {currentData.map(d => {
                              const isPublished = d.status === 'Published' || d.status === 'PAID';
                              const totalBonus = (Number(d.komisi)||0) + (Number(d.bonusT0)||0) + (Number(d.bonusT3)||0) + (Number(d.otherBonus)||0);
                              
                              if (!isPublished) {
                                  return (
                                      <div key={d.id} className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                         <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500 mb-5 shadow-inner group-hover:scale-110 transition-transform">
                                             <i className="ph-fill ph-hourglass-high text-4xl animate-spin-slow"></i>
                                         </div>
                                         <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full mb-2 border border-indigo-100">Sedang Dikalkulasi</div>
                                         <h4 className="font-black text-gray-800 dark:text-gray-200 text-lg mb-1">Week {getWeekId(d.periode)}</h4>
                                         <div className="text-[11px] text-gray-500 font-bold mb-2">Periode: {formatToDDMMYYYY(d.periode)} - {formatToDDMMYYYY(getSundayStr(d.periode))}</div>
                                         <p className="text-xs text-gray-500 font-medium px-4 leading-relaxed">Slip gaji Anda sedang dalam tahap rekapitulasi dan verifikasi ({d.status || 'Draft'}). Harap bersabar menunggu rilis resmi dari Admin.</p>
                                      </div>
                                  )
                              }

                              return (
                                  <div key={d.id} className="bg-white dark:bg-[#1a202c] rounded-[32px] p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700/60 relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>
                                      <div className="absolute -left-6 -top-6 w-20 h-20 bg-emerald-500 flex items-end justify-end p-4 rounded-full shadow-lg transform -rotate-12">
                                          <i className="ph-fill ph-seal-check text-white text-xl"></i>
                                      </div>

                                      <div className="text-right mb-6 relative z-10 space-y-1">
                                          <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Week {getWeekId(d.periode)}</div>
                                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Periode Kerja</div>
                                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 inline-block px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-700">{formatToDDMMYYYY(d.periode)} - {formatToDDMMYYYY(getSundayStr(d.periode))}</div>
                                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Pencairan</div>
                                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatToDDMMYYYY(getPayrollDateOfMonday(d.periode))}</div>
                                      </div>

                                      <div className="text-center mb-8 relative z-10">
                                          <div className="mb-2">
                                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                   d.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                                   d.status === 'PROCESSING PAYROLL' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' :
                                                   'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                              }`}>
                                                  {d.status || 'PAID'}
                                              </span>
                                          </div>
                                          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2 flex items-center justify-center"><i className="ph-bold ph-money mr-1.5"></i> Total Take Home Pay</div>
                                          <div className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-teal-400 drop-shadow-sm">{formatCurrency(d.totalGaji)}</div>
                                          <div className="mt-3 inline-flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                             Level Kinerja: {d.levelGaji || 0}
                                          </div>
                                      </div>

                                      <div className="space-y-3 bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 relative z-10">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-gray-500">Gaji Pokok Dasar</span>
                                              <span className="font-black text-gray-800 dark:text-gray-200">{formatCurrency(d.gajiPokok)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center"><i className="ph-bold ph-plus-circle mr-1"></i> Total Insentif / Bonus</span>
                                              <span className="font-black text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalBonus)}</span>
                                          </div>
                                          {Number(d.deduksi) > 0 && (
                                              <div className="flex justify-between items-center text-xs pt-3 mt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                  <span className="font-bold text-rose-500 flex items-center"><i className="ph-bold ph-minus-circle mr-1"></i> Potongan / Deduksi</span>
                                                  <span className="font-black text-rose-500">-{formatCurrency(d.deduksi)}</span>
                                              </div>
                                          )}
                                      </div>

                                      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 relative z-10">
                                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Metrik Pencapaian Anda</div>
                                          <div className="grid grid-cols-4 gap-2 text-center">
                                              <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm border border-gray-100 dark:border-gray-700"><div className="text-[8px] font-bold text-gray-400 uppercase mb-1">Hari</div><div className="text-xs font-black text-gray-800 dark:text-gray-200">{d.hariKerja||0}</div></div>
                                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2 shadow-sm border border-emerald-100 dark:border-emerald-800/30"><div className="text-[8px] font-bold text-emerald-600 uppercase mb-1">ACC T0</div><div className="text-xs font-black text-emerald-700 dark:text-emerald-400">{d.sebenarnyaT0||0}</div></div>
                                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2 shadow-sm border border-purple-100 dark:border-purple-800/30"><div className="text-[8px] font-bold text-purple-600 uppercase mb-1">Elit V0</div><div className="text-xs font-black text-purple-700 dark:text-purple-400">{d.sebenarnyaV0||0}</div></div>
                                              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2 shadow-sm border border-indigo-100 dark:border-indigo-800/30"><div className="text-[8px] font-bold text-indigo-600 uppercase mb-1">Ke T3</div><div className="text-xs font-black text-indigo-700 dark:text-indigo-400">{d.t3||0}</div></div>
                                          </div>
                                      </div>
                                  </div>
                              )
                         })}
                     </div>
                )}
            </div>
        );
    }
    
    // ----------------------------------------------------------------------
    // TAMPILAN ADMIN
    // ----------------------------------------------------------------------
    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* HEADER BANNER */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-6 sm:p-8 lg:p-10 rounded-[32px] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden gap-6 md:gap-12 border border-indigo-500/20">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>
                <i className="ph-fill ph-money absolute -right-10 md:right-10 top-1/2 -translate-y-1/2 opacity-[0.05] text-[200px] md:text-[250px] pointer-events-none transform -rotate-12"></i>
                
                <div className="z-10 w-full md:w-auto text-center md:text-left flex flex-col items-center md:items-start">
                    <div className="inline-flex items-center gap-2 text-emerald-300 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-4 bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-800/50">
                        <i className="ph-bold ph-wallet text-sm"></i> Payroll & Compensation
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
                        Slip Gaji <span className="text-emerald-400">Tim</span>
                    </h2>
                    
                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 shrink-0">
                            <i className="ph-fill ph-calendar-check text-xl"></i>
                        </div>
                        <div className="text-left text-white text-xs sm:text-sm">
                            <span className="font-black text-emerald-400 block sm:inline mr-1">INFO PENCAIRAN:</span> 
                            Periode Kerja <span className="font-bold border-b border-dashed">Senin - Minggu</span> akan dicairkan pada <span className="font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">Hari Jumat</span> di minggu berikutnya.
                        </div>
                    </div>
                </div>
                
                {isPrivileged && (
                    <div className="z-10 w-full md:w-auto min-w-[250px] bg-white/5 p-5 sm:p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-center">
                        <div className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                            Total Pengeluaran (Periode Ini)
                        </div>
                        <div className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-200 drop-shadow-sm truncate">
                            {formatCurrency(currentData.reduce((acc, curr) => acc + (Number(curr.totalGaji) || 0), 0))}
                        </div>
                    </div>
                )}
            </div>

            {/* LEADERBOARD */}
            {!isLoading && currentData.length > 0 && isPrivileged && (
                <div>
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest mb-4 flex items-center"><i className="ph-fill ph-ranking mr-2 text-indigo-500 text-lg"></i> Top 3 Pencapaian Gaji Tertinggi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {currentData.slice(0, 3).map((d, i) => {
                            const rank = i + 1; const uStyle = getRoleStyle(d.role);
                            return (
                                <div key={i} className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border relative overflow-hidden shadow-sm ${rank === 1 ? 'border-amber-300 dark:border-amber-700/50 shadow-amber-500/10' : 'border-gray-200/80 dark:border-gray-700/60'}`}>
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black text-white rounded-bl-xl shadow-sm ${rank === 1 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : rank === 2 ? 'bg-gray-400' : 'bg-amber-700'}`}>Rank #{rank}</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white shadow-sm border border-white/20 ${uStyle.bg}`}>
                                            {(d.fullName && typeof d.fullName === 'string' && d.fullName.trim() !== '') 
                                                ? d.fullName.charAt(0).toUpperCase() 
                                                : (d.username && typeof d.username === 'string' && d.username.trim() !== '')
                                                    ? d.username.charAt(0).toUpperCase()
                                                    : <i className="ph-bold ph-user"></i>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-sm text-gray-900 dark:text-white truncate">{d.fullName}</div>
                                            <div className="text-[10px] font-bold text-gray-500">Tingkat Gaji: <span className="text-indigo-500 font-black">Level {d.levelGaji || 0}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* TOOLBAR */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" placeholder="Cari User / UID..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div className="relative">
                        <select value={filterPeriod} onChange={e=>setFilterPeriod(e.target.value)} className="w-full sm:w-auto appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-10 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200">
                            <option value="">Semua Periode</option>
                            {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <i className="ph-bold ph-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    {isPrivileged && currentData.some(d => d.status !== 'Published') && (
                        <button onClick={handlePublishAll} className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 font-black text-xs rounded-xl shadow-sm hover:bg-emerald-100 flex justify-center items-center transition-all uppercase tracking-widest">
                            <i className="ph-bold ph-megaphone mr-2 text-sm"></i> Umumkan Semua
                        </button>
                    )}
                    
                    {isPrivileged && (
                        <button onClick={()=>{
                            setModalMode('add'); 
                            setFormData({
                                id:'', periode: new Date().toISOString().split('T')[0], username: '', uid: '', hariKerja: '', totalPostingan: '', 
                                deklarasiT0: '0', sebenarnyaT0: '0', t3: '', deklarasiV0: '0', sebenarnyaV0: '0', 
                                rasioPeningkatan: '0%', komisi: '', bonusT0: '', bonusT3: '', otherBonus: '', deduksi: '', status: 'Draft'
                            }); 
                            setIsModalOpen(true);
                        }} className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(79,70,229,0.39)] hover:bg-indigo-700 flex justify-center items-center transition-all transform hover:-translate-y-0.5">
                            <i className="ph-bold ph-plus mr-2 text-lg"></i> Buat Slip Baru
                        </button>
                    )}
                </div>
            </div>

            {/* AREA TABEL / MOBILE CARDS */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-emerald-500"><i className="ph-bold ph-spinner ph-spin text-5xl mb-4 drop-shadow-md"></i><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Memuat Data Keuangan...</span></div>
            ) : currentData.length === 0 ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-400"><i className="ph-fill ph-wallet text-4xl"></i></div>
                    <h3 className="text-gray-900 dark:text-white font-black text-lg mb-1">Data Kosong</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-sm">Belum ada catatan penggajian untuk periode atau pencarian ini.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1a202c] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                    
                    {/* TAMPILAN HP (MOBILE) */}
                    <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                        {currentData.map(d => {
                            const uStyle = getRoleStyle(d.role);
                            
                            if (!isPrivileged && d.status !== 'Published') {
                                return (
                                    <div key={d.id} className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500 mb-4 shadow-inner">
                                            <i className="ph-fill ph-hourglass-high text-3xl animate-spin-slow"></i>
                                        </div>
                                        <h4 className="font-black text-gray-800 dark:text-gray-200 text-sm">Sedang Dikalkulasi</h4>
                                        <p className="text-[10px] text-gray-500 font-bold mt-1 px-4">Slip gaji untuk periode <span className="text-indigo-500 border-b border-indigo-200">{formatToDDMMYYYY(d.periode)}</span> sedang dalam proses verifikasi Admin. Harap tunggu pengumuman.</p>
                                    </div>
                                )
                            }

                            return (
                                <div key={d.id} className={`p-4 sm:p-5 transition-colors relative ${d.status === 'Draft' ? 'bg-amber-50/30 dark:bg-amber-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}>
                                    {isPrivileged && (
                                        <div className="absolute top-4 right-4 flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded flex items-center text-[8px] font-black uppercase tracking-widest border shadow-sm ${d.status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                <i className={`ph-bold ${d.status === 'Published' ? 'ph-check-circle' : 'ph-clock'} mr-1`}></i> {d.status === 'Published' ? 'Telah Rilis' : 'Belum Rilis'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-start mb-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg text-white shadow-sm shrink-0 border border-white/10 ${uStyle.bg}`}>
                                            {(d.fullName && typeof d.fullName === 'string' && d.fullName.trim() !== '') 
                                                ? d.fullName.charAt(0).toUpperCase() 
                                                : (d.username && typeof d.username === 'string' && d.username.trim() !== '')
                                                    ? d.username.charAt(0).toUpperCase()
                                                    : <i className="ph-bold ph-user"></i>}
                                        </div>
                                        <div className="ml-3 mt-0.5">
                                            <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><i className={`${uStyle.icon} text-[10px] ${uStyle.text}`}></i> {d.fullName}</div>
                                            <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mt-0.5"><i className="ph-bold ph-calendar-blank"></i> {formatToDDMMYYYY(d.periode)}</div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800 mb-4 grid grid-cols-4 gap-2 text-center divide-x divide-gray-200 dark:divide-gray-700 shadow-inner">
                                        <div><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Hari</div><div className="text-xs font-black text-gray-700 dark:text-gray-300">{d.hariKerja||0}</div></div>
                                        <div><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Aktif T0</div><div className="text-xs font-black text-emerald-600">{d.sebenarnyaT0||0}</div></div>
                                        <div><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Elit V0</div><div className="text-xs font-black text-purple-600">{d.sebenarnyaV0||0}</div></div>
                                        <div><div className="text-[8px] font-black text-gray-400 uppercase mb-1">Ke T3</div><div className="text-xs font-black text-indigo-600">{d.t3||0}</div></div>
                                    </div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50 shadow-sm">Level {d.levelGaji || 0}</div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Diterima</div>
                                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(d.totalGaji)}</div>
                                        </div>
                                    </div>
                                    {isPrivileged && (
                                        <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                            <button onClick={() => handleTogglePublish(d.id, d.status)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center border shadow-sm transition-all ${d.status === 'Published' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'}`}>
                                                <i className={`ph-bold ${d.status === 'Published' ? 'ph-eye-slash' : 'ph-megaphone'} mr-1.5 text-sm`}></i> {d.status === 'Published' ? 'Tarik (Draft)' : 'Rilis Sekarang'}
                                            </button>
                                            <button onClick={()=>{setModalMode('edit'); setFormData(d); setIsModalOpen(true);}} className="w-9 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-500 rounded-lg flex items-center justify-center shadow-sm"><i className="ph-bold ph-pencil-simple text-sm"></i></button>
                                            <button onClick={()=>handleDelete(d.id)} className="w-9 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-rose-500 rounded-lg flex items-center justify-center shadow-sm"><i className="ph-bold ph-trash text-sm"></i></button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* TAMPILAN DESKTOP (TABEL) */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left whitespace-nowrap min-w-[1500px]">
                            <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-5 py-4">Informasi Staf & Periode</th>
                                    <th className="px-3 py-4 text-center border-l border-gray-200 dark:border-gray-700">Hari</th>
                                    <th className="px-3 py-4 text-center border-l border-gray-200 dark:border-gray-700">Pstgn</th>
                                    <th className="px-3 py-4 text-center border-l border-gray-200 dark:border-gray-700 bg-emerald-50/30 dark:bg-emerald-900/10" colSpan="2">T0 (Masuk/Acc)</th>
                                    <th className="px-3 py-4 text-center border-l border-gray-200 dark:border-gray-700 bg-purple-50/30 dark:bg-purple-900/10" colSpan="2">V0 (Masuk/Acc)</th>
                                    <th className="px-3 py-4 text-center border-l border-gray-200 dark:border-gray-700">T3</th>
                                    <th className="px-4 py-4 text-center border-l border-gray-200 dark:border-gray-700 text-indigo-600">Level</th>
                                    <th className="px-5 py-4 text-right border-l border-gray-200 dark:border-gray-700">Gaji Pokok</th>
                                    <th className="px-5 py-4 text-right border-l border-gray-200 dark:border-gray-700">Komisi/Bonus</th>
                                    <th className="px-5 py-4 text-right border-l border-gray-200 dark:border-gray-700 text-rose-500">Deduksi</th>
                                    <th className="px-5 py-4 text-right border-l border-gray-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-black">TOTAL GAJI</th>
                                    {isPrivileged && <th className="px-5 py-4 text-center border-l border-gray-200 dark:border-gray-700">Aksi Admin</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {currentData.map(d => {
                                    const uStyle = getRoleStyle(d.role);
                                    const totalBonus = (Number(d.komisi)||0) + (Number(d.bonusT0)||0) + (Number(d.bonusT3)||0) + (Number(d.otherBonus)||0);
                                    
                                    if (!isPrivileged && d.status !== 'Published') {
                                        return (
                                            <tr key={d.id}>
                                                <td colSpan="14" className="px-5 py-8 text-center bg-gray-50/50 dark:bg-gray-800/30">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
                                                            <i className="ph-fill ph-hourglass-high text-xl animate-spin-slow"></i>
                                                        </div>
                                                        <div className="font-black text-sm text-gray-800 dark:text-gray-200">Gaji Sedang Dikalkulasi</div>
                                                        <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Periode <span className="text-indigo-500 border-b border-indigo-200">{formatToDDMMYYYY(d.periode)}</span> dalam tahap verifikasi</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }

                                    return (
                                        <tr key={d.id} className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group ${d.status === 'Draft' ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''}`}>
                                            <td className="px-5 py-3 relative">
                                                {isPrivileged && d.status === 'Draft' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>}
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0 ${uStyle.bg}`}>
                                                        {(d.fullName && typeof d.fullName === 'string' && d.fullName.trim() !== '') 
                                                            ? d.fullName.charAt(0).toUpperCase() 
                                                            : (d.username && typeof d.username === 'string' && d.username.trim() !== '')
                                                                ? d.username.charAt(0).toUpperCase()
                                                                : <i className="ph-bold ph-user"></i>}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><i className={`${uStyle.icon} text-[10px] ${uStyle.text}`}></i> {d.fullName}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {d.uid}</div>
                                                        <div className="text-[10px] text-indigo-500 font-black mt-0.5">Week ID: {getWeekId(d.periode)}</div>
                                                        <div className="text-[9px] text-gray-500 font-medium mt-0.5">Periode: {formatToDDMMYYYY(d.periode)} - {formatToDDMMYYYY(getSundayStr(d.periode))}</div>
                                                        <div className="text-[9px] text-emerald-600 font-bold mt-0.5">Gaji Cair: {formatToDDMMYYYY(getPayrollDateOfMonday(d.periode))}</div>
                                                        <div className="mt-1">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                                d.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                                                d.status === 'PROCESSING PAYROLL' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' :
                                                                d.status === 'CLOSED' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' :
                                                                d.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                                                                'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'
                                                            }`}>
                                                                {d.status || 'Draft'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold border-l border-gray-100 dark:border-gray-700/50">{d.hariKerja||0}</td>
                                            <td className="px-3 py-3 text-center font-bold border-l border-gray-100 dark:border-gray-700/50">{d.totalPostingan||0}</td>
                                            <td className="px-3 py-3 text-center font-bold text-gray-400 border-l border-gray-100 dark:border-gray-700/50 bg-emerald-50/10 dark:bg-emerald-900/5">{d.deklarasiT0||0}</td>
                                            <td className="px-3 py-3 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10">{d.sebenarnyaT0||0}</td>
                                            <td className="px-3 py-3 text-center font-bold text-gray-400 border-l border-gray-100 dark:border-gray-700/50 bg-purple-50/10 dark:bg-purple-900/5">{d.deklarasiV0||0}</td>
                                            <td className="px-3 py-3 text-center font-black text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10">{d.sebenarnyaV0||0}</td>
                                            <td className="px-3 py-3 text-center font-black text-indigo-600 dark:text-indigo-400 border-l border-gray-100 dark:border-gray-700/50">{d.t3||0}</td>
                                            <td className="px-4 py-3 text-center border-l border-gray-100 dark:border-gray-700/50"><span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-800/50">LVL {d.levelGaji||0}</span></td>
                                            <td className="px-5 py-3 text-right font-black text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700/50">{formatCurrency(d.gajiPokok)}</td>
                                            <td className="px-5 py-3 text-right font-black text-emerald-500 border-l border-gray-100 dark:border-gray-700/50">+{formatCurrency(totalBonus)}</td>
                                            <td className="px-5 py-3 text-right font-black text-rose-500 border-l border-gray-100 dark:border-gray-700/50">-{formatCurrency(d.deduksi)}</td>
                                            <td className="px-5 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 text-base shadow-[inset_4px_0_0_rgba(16,185,129,0.5)] border-l border-gray-100 dark:border-gray-700/50">{formatCurrency(d.totalGaji)}</td>
                                            
                                            {isPrivileged && (
                                                <td className="px-5 py-3 text-center border-l border-gray-100 dark:border-gray-700/50">
                                                    <div className="flex justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleTogglePublish(d.id, d.status)} className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center border shadow-sm transition-colors ${d.status === 'Published' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`} title={d.status === 'Published' ? 'Ubah ke Draft' : 'Umumkan ke Staff'}>
                                                            <i className={`ph-bold ${d.status === 'Published' ? 'ph-eye-slash' : 'ph-megaphone'} mr-1 text-sm`}></i> {d.status === 'Published' ? 'Tarik' : 'Rilis'}
                                                        </button>
                                                        <button onClick={()=>{setModalMode('edit'); setFormData(d); setIsModalOpen(true);}} className="w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-indigo-500 rounded flex items-center justify-center shadow-sm"><i className="ph-bold ph-pencil-simple text-xs"></i></button>
                                                        <button onClick={()=>handleDelete(d.id)} className="w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-rose-500 rounded flex items-center justify-center shadow-sm"><i className="ph-bold ph-trash text-xs"></i></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL FORMULIR INPUT DATA */}
            {isModalOpen && isPrivileged && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={()=>setIsModalOpen(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200 border-t-[6px] border-t-emerald-500">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex justify-between bg-white/50 dark:bg-gray-800/50 items-center">
                            <h2 className="font-black flex items-center text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-3 border border-emerald-100 dark:border-emerald-800/50"><i className={`ph-bold ${modalMode === 'add' ? 'ph-plus' : 'ph-pencil-simple'} text-xl`}></i></div>
                                {modalMode === 'add' ? 'Buat Slip Gaji Baru' : 'Edit Slip Gaji'}
                            </h2>
                            <button onClick={()=>setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"><i className="ph-bold ph-x text-lg"></i></button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-[85vh] custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30 flex flex-col lg:flex-row gap-6 lg:gap-8">
                            
                            {/* BAGIAN KIRI: INPUT METRIK */}
                            <div className="flex-1 space-y-6">
                                {/* Section 1: Info Dasar */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center"><i className="ph-fill ph-identification-card mr-1.5 text-sm"></i> 1. Identitas & Periode</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Periode (Tanggal Awal Minggu)</label><input type="date" required className={InputCls} value={formData.periode} onChange={e=>setFormData({...formData, periode: e.target.value})} disabled={modalMode === 'edit'} /></div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Pilih Anggota Staff</label>
                                            <select required className={InputCls} value={formData.username} onChange={e=>handleUserSelect(e.target.value)} disabled={modalMode === 'edit'}>
                                                <option value="" disabled>-- Pilih Akun --</option>
                                                {users.filter(u=>u.role==='Staff' && u.status==='Aktif').map((u, i) => <option key={i} value={u.username}>{u.name} ({u.username})</option>)}
                                            </select>
                                        </div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">UID Akun</label><input type="text" readOnly placeholder="Otomatis" className={`${InputCls} bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed`} value={formData.uid} /></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Hari Kerja</label><input type="number" min="0" required placeholder="0" className={InputCls} value={formData.hariKerja} onChange={e=>setFormData({...formData, hariKerja: e.target.value})} /></div>
                                    </div>
                                </div>

                                {/* Section 2: Kinerja Konversi & Sinkronisasi Daily Data */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm relative">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center"><i className="ph-fill ph-chart-line-up mr-1.5 text-sm"></i> 2. Kinerja Rekrutmen (Penentu Level Gaji)</h4>
                                    
                                    <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                                        <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase ml-1">Total Postingan Selama Periode</label>
                                        <input type="number" min="0" required placeholder="0" className={`${InputCls} !bg-white dark:!bg-gray-800 border-emerald-200 dark:border-emerald-700 focus:ring-emerald-500`} value={formData.totalPostingan} onChange={e=>setFormData({...formData, totalPostingan: e.target.value})} />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {/* T0 - Auto-Filled */}
                                        <div className="sm:col-span-1 border-r border-gray-100 dark:border-gray-700 pr-2 relative">
                                            <div className="text-[10px] font-black text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">KANDIDAT AKTIF (T0)</div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Total Masuk</label>
                                                    <input type="number" readOnly placeholder="0" className={`${InputCls} bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed font-mono`} value={formData.deklarasiT0} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-emerald-600 mb-1 uppercase flex items-center justify-between">Di-ACC <i className="ph-fill ph-lightning text-amber-500"></i></label>
                                                    <input type="number" readOnly placeholder="0" className={`${InputCls} border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-not-allowed`} value={formData.sebenarnyaT0} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* V0 - Auto-Filled */}
                                        <div className="sm:col-span-1 border-r border-gray-100 dark:border-gray-700 pr-2 pl-2 relative">
                                            <div className="text-[10px] font-black text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">KANDIDAT ELIT (V0)</div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Total Masuk</label>
                                                    <input type="number" readOnly placeholder="0" className={`${InputCls} bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed font-mono`} value={formData.deklarasiV0} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-purple-600 mb-1 uppercase flex items-center justify-between">Di-ACC <i className="ph-fill ph-lightning text-amber-500"></i></label>
                                                    <input type="number" readOnly placeholder="0" className={`${InputCls} border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 cursor-not-allowed`} value={formData.sebenarnyaV0} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* T3 - Manual */}
                                        <div className="sm:col-span-1 pl-2">
                                            <div className="text-[10px] font-black text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">PROMOSI T3</div>
                                            <div className="space-y-3">
                                                <div><label className="block text-[9px] font-black text-indigo-600 mb-1 uppercase">Dipromosikan (Mnl) <span className="text-rose-500">*</span></label><input type="number" min="0" required placeholder="0" className={`${InputCls} border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500`} value={formData.t3} onChange={e=>setFormData({...formData, t3: e.target.value})} /></div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Rasio Pktn (Auto)</label>
                                                    <input type="text" readOnly placeholder="0%" className={`${InputCls} bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed`} value={formData.rasioPeningkatan} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/40 flex items-center">
                                        <i className="ph-bold ph-info mr-1.5 text-sm"></i> Nilai "Total Masuk" dan "Di-ACC" dihitung otomatis dari riwayat pelamar minggu tersebut. "Rasio Pktn" (Peningkatan) juga dihitung otomatis.
                                    </div>
                                </div>

                                {/* Section 3: Finansial Manual */}
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center"><i className="ph-fill ph-coins mr-1.5 text-sm"></i> 3. Komisi, Bonus & Deduksi</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Komisi</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span><input type="number" min="0" placeholder="0" className={`${InputCls} pl-8`} value={formData.komisi} onChange={e=>setFormData({...formData, komisi: e.target.value})} /></div></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Other Bonus</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span><input type="number" min="0" placeholder="0" className={`${InputCls} pl-8`} value={formData.otherBonus} onChange={e=>setFormData({...formData, otherBonus: e.target.value})} /></div></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Bonus T0</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span><input type="number" min="0" placeholder="0" className={`${InputCls} pl-8`} value={formData.bonusT0} onChange={e=>setFormData({...formData, bonusT0: e.target.value})} /></div></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase ml-1">Bonus T3</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span><input type="number" min="0" placeholder="0" className={`${InputCls} pl-8`} value={formData.bonusT3} onChange={e=>setFormData({...formData, bonusT3: e.target.value})} /></div></div>
                                        <div className="col-span-2"><label className="block text-[10px] font-black text-rose-500 mb-1.5 uppercase ml-1">Potongan / Deduksi (-)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-xs">Rp</span><input type="number" min="0" placeholder="0" className={`${InputCls} pl-8 border-rose-200 dark:border-rose-800 focus:ring-rose-500 text-rose-600`} value={formData.deduksi} onChange={e=>setFormData({...formData, deduksi: e.target.value})} /></div></div>
                                    </div>
                                </div>
                            </div>

                            {/* BAGIAN KANAN: PREVIEW OTOMATIS */}
                            <div className="lg:w-80 shrink-0">
                                <div className="sticky top-0 bg-gradient-to-b from-[#111827] to-[#1f2937] rounded-3xl p-6 shadow-2xl border border-gray-700 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl"></div>
                                    
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center border-b border-gray-700 pb-3">
                                        <i className="ph-fill ph-calculator mr-2 text-emerald-500 text-lg"></i> Kalkulator Sistem
                                    </div>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 text-center">
                                            <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Anggota Aktif</div><div className="text-xl font-black text-emerald-400">{liveStats.aktif}</div></div>
                                            <div><div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Anggota Promosi</div><div className="text-xl font-black text-purple-400">{liveStats.promosi}</div></div>
                                        </div>

                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1.5">Tingkat Penerimaan (Level)</div>
                                            <div className={`px-4 py-2 rounded-xl border flex items-center justify-center text-sm font-black uppercase tracking-widest ${liveStats.level > 0 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                                {liveStats.level > 0 ? `Level ${liveStats.level}` : 'Belum Memenuhi Syarat'}
                                            </div>
                                            {liveStats.level === 0 && <div className="text-[9px] text-rose-400 mt-1.5 text-center">*Minimal 7 Aktif & 3 Promosi untuk Gaji Pokok.</div>}
                                        </div>

                                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2.5">
                                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-medium">Gaji Pokok (Auto)</span><span className="font-bold text-emerald-400">{formatCurrency(liveStats.pokok)}</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-medium">Total Komisi & Bonus</span><span className="font-bold text-gray-200">+{formatCurrency(liveStats.total - liveStats.pokok + (Number(formData.deduksi)||0))}</span></div>
                                            <div className="flex justify-between text-xs border-b border-gray-700/50 pb-2.5"><span className="text-rose-400 font-medium">Deduksi</span><span className="font-bold text-rose-500">-{formatCurrency(formData.deduksi)}</span></div>
                                            <div className="pt-2">
                                                <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Total Dibayarkan</div>
                                                <div className="text-2xl font-black text-emerald-400 drop-shadow-md">{formatCurrency(liveStats.total)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* STATUS PREVIEW & TOMBOL SIMPAN */}
                                    <div className="mt-8 pt-5 border-t border-gray-700 flex flex-col gap-3.5">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase ml-1">Status Periode / Payroll</label>
                                            <select 
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm"
                                                value={formData.status || 'Draft'} 
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                            >
                                                <option value="Draft">Draft (Belum Rilis)</option>
                                                <option value="ACTIVE">ACTIVE (Periode Berjalan)</option>
                                                <option value="CLOSED">CLOSED (Periode Selesai)</option>
                                                <option value="PROCESSING PAYROLL">PROCESSING PAYROLL (Sedang Dihitung)</option>
                                                <option value="PAID">PAID (Sudah Dibayar)</option>
                                                <option value="Published">Published (Rilis Tradisional)</option>
                                            </select>
                                        </div>
                                        <button type="submit" disabled={!formData.username} className="w-full px-5 py-3.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors flex justify-center items-center uppercase tracking-widest text-xs disabled:opacity-50">
                                            <i className="ph-bold ph-floppy-disk mr-2 text-base"></i> Simpan Slip Gaji
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
