import React, { useState } from 'react';
import { Card } from './UI';
import { SCRIPT_URL } from '../utils';

export const AuthLayout = ({ children, title, subtitle }: any) => (
    <div className="min-h-dvh flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-900 p-4 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <Card className="w-full max-w-md p-6 sm:p-8 relative z-10 shadow-2xl shadow-indigo-100 dark:shadow-none border-t-4 border-t-indigo-600">
            <div className="flex justify-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] border-t border-indigo-400/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <svg className="w-8 h-8 text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 21H7.5L12 11L16.5 21H21L12 2Z" fill="currentColor"/><path d="M9.5 15H14.5L12 9.5L9.5 15Z" fill="currentColor" fillOpacity="0.4"/></svg>
                </div>
            </div>
            <div className="text-center mb-8"><h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Team<span className="text-indigo-600">AzurLize</span></h1><p className="text-sm text-gray-500">{title}</p>{subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}</div>
            {children}
        </Card>
    </div>
);

export const Login = ({ onLogin, onNavigateRegister }: any) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState({ username: '', password: '' });

    const handleSubmit = async (e: any) => {
        e.preventDefault(); setIsLoading(true); setErrorMsg('');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username: formData.username.trim(), password: formData.password }) });
            const result = await response.json();
            if (result.status === 'success') onLogin(result.user); else setErrorMsg(result.message || 'Username atau password salah.');
        } catch (error) { setErrorMsg('Terjadi kesalahan koneksi.'); } finally { setIsLoading(false); }
    };
    const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all";
    return (
        <AuthLayout title="L O G I N">
            {errorMsg && <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs flex items-center"><i className="ph-bold ph-warning-circle mr-2"></i><b>{errorMsg}</b></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative"><i className="ph-bold ph-user absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type="text" placeholder="Username...." value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={inputClass} disabled={isLoading} required /></div>
                <div className="relative"><i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={inputClass} disabled={isLoading} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-xl`}></i></button></div>
                <button type="submit" disabled={isLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center disabled:opacity-70">{isLoading ? <><i className="ph-bold ph-spinner ph-spin text-xl mr-2"></i> Memverifikasi...</> : "Masuk"}</button>
            </form>
        </AuthLayout>
    );
};

export const Register = ({ onRegister, onNavigateLogin }: any) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState({ name: '', username: '', uid: '', password: '' });

    const handleSubmit = async (e: any) => {
        e.preventDefault(); setIsLoading(true); setErrorMsg(''); setSuccessMsg('');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'register', name: formData.name.trim(), username: formData.username.trim(), uid: formData.uid.trim(), password: formData.password }) });
            const result = await response.json();
            if (result.status === 'success') { setSuccessMsg(result.message); setFormData({ name: '', username: '', uid: '', password: '' }); setTimeout(() => onNavigateLogin(), 3000); } else { setErrorMsg(result.message || 'Gagal mendaftar.'); }
        } catch (error) { setErrorMsg('Terjadi kesalahan koneksi.'); } finally { setIsLoading(false); }
    };
    const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all";
    return (
        <AuthLayout title="Buat Akun Baru" subtitle="Pendaftaran Tim Operations">
            {errorMsg && <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs flex items-center"><i className="ph-bold ph-warning-circle mr-2"></i><b>{errorMsg}</b></div>}
            {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs flex items-center"><i className="ph-bold ph-check-circle mr-2"></i><b>{successMsg}</b></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative"><i className="ph-bold ph-identification-card absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type="text" placeholder="Nama Lengkap" value={formData.name} required onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} disabled={isLoading || successMsg}/></div>
                <div className="relative"><i className="ph-bold ph-user absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type="text" placeholder="Username (Pakai '@')" value={formData.username} required onChange={e => setFormData({...formData, username: e.target.value})} className={inputClass} disabled={isLoading || successMsg}/></div>
                <div className="relative"><i className="ph-bold ph-hash absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type="text" placeholder="UID Anda" value={formData.uid} required onChange={e => setFormData({...formData, uid: e.target.value})} className={inputClass} disabled={isLoading || successMsg}/></div>
                <div className="relative"><i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i><input type="password" placeholder="Password" value={formData.password} required onChange={e => setFormData({...formData, password: e.target.value})} className={inputClass} disabled={isLoading || successMsg}/></div>
                <button type="submit" disabled={isLoading || successMsg} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold transition-colors">{isLoading ? 'Memproses...' : 'Daftar Sekarang'}</button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-500"><button onClick={onNavigateLogin} className="text-indigo-600 font-bold hover:underline">Sudah punya akun? Masuk</button></div>
        </AuthLayout>
    );
};
