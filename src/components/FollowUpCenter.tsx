import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY } from '../utils';

export const FollowUpCenter = ({ authUser }) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const isPrivileged = authUser && ['Superadmin', 'Admin'].includes(authUser.role);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async (showLoading = true) => {
            if (showLoading) setIsLoading(true);
            try {
                const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getDailyData', role: authUser ? authUser.role : null, username: authUser ? authUser.username : null, name: authUser ? authUser.name : null }) });
                const result = await res.json();
                if (result.status === 'success' && isMounted) { 
                    let fetchedData = Array.isArray(result.data) ? result.data : [];
                    if (!isPrivileged) {
                        fetchedData = fetchedData.filter(d => d.recruiter === authUser.username || d.recruiter === authUser.name);
                    }
                    setData(fetchedData); 
                }
            } catch (error) {} finally { if (showLoading && isMounted) setIsLoading(false); }
        };
        
        fetchData(true);
        
        const handleSync = () => {
            fetchData(false);
        };
        window.addEventListener('refreshActiveTab', handleSync);
        
        return () => {
            isMounted = false;
            window.removeEventListener('refreshActiveTab', handleSync);
        };
    }, [authUser, isPrivileged]);

    const getPriorityInfo = (days) => {
        if (days > 7) return { level: 'High', color: 'rose', icon: 'ph-warning-circle' };
        if (days > 3) return { level: 'Medium', color: 'amber', icon: 'ph-clock' };
        return { level: 'Low', color: 'blue', icon: 'ph-check-circle' };
    };

    const today = new Date(); today.setHours(0,0,0,0);
    const categorized = { High: [], Medium: [], Low: [] };
    
    data.filter(c => c.results === 'Pending').forEach(c => {
        let days = 0;
        if (c.tanggal) {
            const inputDate = new Date(c.tanggal);
            if (!isNaN(inputDate.getTime())) {
                inputDate.setHours(0,0,0,0);
                const diffTime = Math.abs(today.getTime() - inputDate.getTime());
                days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        const p = getPriorityInfo(days); categorized[p.level].push({ ...c, days });
    });

    if (isLoading) return <div className="flex justify-center p-12"><i className="ph-bold ph-spinner ph-spin text-4xl text-indigo-500"></i></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['High', 'Medium', 'Low'].map((level) => {
                const colItems = categorized[level]; const styleInfo = getPriorityInfo(level === 'High' ? 8 : level === 'Medium' ? 4 : 1);
                return (
                    <Card key={level} className={`border-t-4 border-t-${styleInfo.color}-500 flex flex-col max-h-[75vh]`}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center sticky top-0"><h3 className="font-bold flex items-center text-sm md:text-base"><i className={`ph-bold ${styleInfo.icon} mr-2 text-${styleInfo.color}-500 text-lg`}></i> {level} Priority</h3><span className={`bg-${styleInfo.color}-100 text-${styleInfo.color}-800 px-2.5 py-1 rounded-full text-xs font-bold`}>{colItems.length}</span></div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-3">
                            {colItems.length > 0 ? colItems.map((c, i) => (
                                <div key={i} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-indigo-300 transition-colors shadow-sm"><div className="flex justify-between items-start mb-2"><div><div className="font-bold text-sm">{c.username}</div><div className="text-xs text-gray-500 font-mono mt-0.5">{c.uid}</div></div><div className={`text-xs font-bold flex items-center text-${styleInfo.color}-500 bg-${styleInfo.color}-50 dark:bg-${styleInfo.color}-900/20 px-2 py-0.5 rounded`}><i className="ph-bold ph-clock mr-1"></i> {c.days} Hari</div></div><div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50"><div className="text-xs text-gray-500 flex items-center font-medium"><i className="ph-bold ph-user-circle mr-1 text-gray-400"></i> {c.recruiter || 'Unknown'}</div><span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-bold text-gray-500">{c.wa}</span></div></div>
                            )) : <div className="h-32 flex flex-col items-center justify-center text-gray-400"><i className="ph-bold ph-check-circle text-3xl mb-2 text-emerald-400 opacity-50"></i><p className="text-sm">Semua Clear!</p></div>}
                        </div>
                    </Card>
                )
            })}
        </div>
    );
};
