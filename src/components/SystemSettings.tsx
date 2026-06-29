import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY } from '../utils';

export const SystemSettings = () => (
    <div className="max-w-3xl space-y-6 animate-in fade-in duration-500 pb-12">
        
        {/* Header Section */}
        <div className="mb-4">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <i className="ph-bold ph-gear text-xl"></i>
                </div>
                Pengaturan Sistem
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Konfigurasi parameter operasional dan notifikasi otomasi perusahaan.</p>
        </div>

        {/* Pengaturan Perusahaan */}
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-black text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center">
                <i className="ph-bold ph-buildings mr-3 text-indigo-500 text-2xl"></i> Pengaturan
            </h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Target Rekrutmen Bulanan</label>
                    <input type="number" defaultValue="100" className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all" />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mata Uang Default</label>
                    <select className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all">
                        <option>IDR (Rupiah)</option>
                        <option>USD (US Dollar)</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Notifikasi Sistem */}
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-black text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center">
                <i className="ph-bold ph-bell-ringing mr-3 text-indigo-500 text-2xl"></i> Notifikasi Sistem
            </h3>
            <div className="space-y-2">
                {[ 
                    {t:'Daily Email Digest', d:'Kirim laporan harian ke email Admin.'}, 
                    {t:'SLA Warning Alert', d:'Beri tanda merah jika kandidat pending > 7 hari.'}, 
                    {t:'Payroll Auto-Draft', d:'Buat draft payroll otomatis di akhir minggu.'} 
                ].map((n, i) => (
                    <div key={i} className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <div className="pr-4">
                            <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{n.t}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{n.d}</div>
                        </div>
                        {/* Toggle Switch Modern */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked={i!==2} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end pt-2">
            <button className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 flex items-center justify-center transition-all transform hover:-translate-y-0.5 uppercase tracking-widest text-sm">
                <i className="ph-bold ph-floppy-disk mr-2 text-lg"></i> Simpan Konfigurasi
            </button>
        </div>
    </div>
);
