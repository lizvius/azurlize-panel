import React, { useState } from 'react';
import { Card, Badge } from './UI'; // Pastikan path import ini sesuai dengan struktur foldermu

export interface PagePermission {
    name: string;
    view: string[];
    edit: string[];
}

export interface WorkflowStep {
    id: string;
    title: string;
    desc: string;
}

export interface UploadedImage {
    id: string;
    url: string;
    title: string;
}

export interface LandingPageData {
    heroTitle: string;
    heroSubtitle: string;
    steps: WorkflowStep[];
    images: UploadedImage[];
}

interface SuperadminToolsProps {
    authUser: any;
    // Props untuk Permissions
    initialPermissions: Record<string, PagePermission>;
    defaultPermissions: Record<string, PagePermission>;
    onSavePermissions: (newPermissions: Record<string, PagePermission>) => void;
    
    // Props untuk Landing Page
    initialLandingData: LandingPageData;
    onSaveLandingData: (newLandingData: LandingPageData) => void;
}

export const SuperadminTools = ({ 
    authUser, 
    initialPermissions, 
    defaultPermissions, 
    onSavePermissions, 
    initialLandingData, 
    onSaveLandingData 
}: SuperadminToolsProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'permissions' | 'landing'>('permissions');
    const [toast, setToast] = useState<string | null>(null);

    // State diinisialisasi dari props, BUKAN hardcode localStorage
    const [permissions, setPermissions] = useState<Record<string, PagePermission>>(initialPermissions);
    const [landingData, setLandingData] = useState<LandingPageData>(initialLandingData);

    // New Step Form State
    const [newStepTitle, setNewStepTitle] = useState('');
    const [newStepDesc, setNewStepDesc] = useState('');

    // New Image Form State
    const [newImageTitle, setNewImageTitle] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // -------------------------------------------------------------
    // PERMISSIONS MANAGEMENT
    // -------------------------------------------------------------
    const handleTogglePermission = (pageKey: string, type: 'view' | 'edit', role: string) => {
        if (role === 'Superadmin') return; // Superadmin cannot be unchecked

        const pagePerms = { ...permissions[pageKey] };
        const list = [...pagePerms[type]];

        if (list.includes(role)) {
            const index = list.indexOf(role);
            list.splice(index, 1);
        } else {
            list.push(role);
        }

        const updated = {
            ...permissions,
            [pageKey]: {
                ...pagePerms,
                [type]: list
            }
        };

        setPermissions(updated);
    };

    const handleSavePermissions = () => {
        // Mengirim data kembali ke parent untuk disimpan (misal ke database / localStorage spesifik)
        onSavePermissions(permissions);
        showToast("✓ Hak akses halaman berhasil diperbarui!");
    };

    const handleResetPermissions = () => {
        // Menggunakan default dari props
        setPermissions(defaultPermissions);
        onSavePermissions(defaultPermissions);
        showToast("✓ Hak akses telah dikembalikan ke default!");
    };

    // -------------------------------------------------------------
    // LANDING PAGE CUSTOMIZATION
    // -------------------------------------------------------------
    const handleUpdateHero = (title: string, subtitle: string) => {
        const updated = {
            ...landingData,
            heroTitle: title,
            heroSubtitle: subtitle
        };
        setLandingData(updated);
    };

    const handleAddStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStepTitle.trim() || !newStepDesc.trim()) return;

        const newStep: WorkflowStep = {
            id: Date.now().toString(),
            title: newStepTitle.trim(),
            desc: newStepDesc.trim()
        };

        const updated = {
            ...landingData,
            steps: [...landingData.steps, newStep]
        };

        setLandingData(updated);
        setNewStepTitle('');
        setNewStepDesc('');
        showToast("✓ Langkah alur kerja berhasil ditambahkan!");
    };

    const handleDeleteStep = (id: string) => {
        const updated = {
            ...landingData,
            steps: landingData.steps.filter((s: WorkflowStep) => s.id !== id)
        };
        setLandingData(updated);
        showToast("✓ Langkah alur kerja berhasil dihapus!");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setNewImageUrl(reader.result);
                setIsUploading(false);
                showToast("✓ Gambar berhasil dimuat!");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newImageTitle.trim() || !newImageUrl) return;

        const newImg: UploadedImage = {
            id: Date.now().toString(),
            url: newImageUrl,
            title: newImageTitle.trim()
        };

        const updated = {
            ...landingData,
            images: [...landingData.images, newImg]
        };

        setLandingData(updated);
        setNewImageTitle('');
        setNewImageUrl('');
        showToast("✓ Gambar dokumentasi berhasil ditambahkan!");
    };

    const handleDeleteImage = (id: string) => {
        const updated = {
            ...landingData,
            images: landingData.images.filter((img: UploadedImage) => img.id !== id)
        };
        setLandingData(updated);
        showToast("✓ Gambar berhasil dihapus!");
    };

    const handleSaveLanding = () => {
        // Mengirim data kembali ke parent untuk disimpan
        onSaveLandingData(landingData);
        showToast("✓ Landing page berhasil disimpan dan dipublikasikan!");
    };

    return (
        <div id="superadmin-tools" className="space-y-6">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white font-black text-xs sm:text-sm px-6 py-4 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <i className="ph-bold ph-check-circle text-xl"></i> {toast}
                </div>
            )}

            {/* Header Dashboard */}
            <div className="bg-gradient-to-r from-red-500 via-rose-600 to-indigo-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3 border border-white/20 shadow-sm">
                        Superadmin Panel
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none mb-2">Pusat Kendali Otoritas & Konten</h1>
                    <p className="text-xs sm:text-sm font-bold text-rose-50 max-w-xl">Superadmin dapat mengontrol hak akses menu (siapa yang bisa melihat dan siapa yang bisa mengedit) di semua halaman aplikasi serta menyunting alur proses landing page.</p>
                </div>
            </div>

            {/* Sub Tabs Selection */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-1.5 flex gap-1 shadow-sm overflow-x-auto custom-scrollbar">
                <button 
                    onClick={() => setActiveSubTab('permissions')}
                    className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${activeSubTab === 'permissions' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
                >
                    <i className="ph-bold ph-key-hole text-lg"></i> Hak Akses Menu & Halaman
                </button>
                <button 
                    onClick={() => setActiveSubTab('landing')}
                    className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${activeSubTab === 'landing' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
                >
                    <i className="ph-bold ph-newspaper text-lg"></i> Pengaturan Landing Page
                </button>
            </div>

            {/* CONTENT TAB 1: PERMISSIONS */}
            {activeSubTab === 'permissions' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-5 mb-6 gap-4">
                            <div>
                                <h3 className="font-black text-lg text-gray-900 dark:text-white">Matriks Otorisasi Halaman</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Mengatur Hak Akses Menu View & Edit</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                <button onClick={handleResetPermissions} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all">
                                    Reset Default
                                </button>
                                <button onClick={handleSavePermissions} className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5">
                                    <i className="ph-bold ph-floppy-disk text-lg"></i> Simpan Hak Akses
                                </button>
                            </div>
                        </div>

                        {/* Responsive Perms Table */}
                        <div className="overflow-x-auto custom-scrollbar border border-gray-200 dark:border-gray-700/50 rounded-2xl">
                            <table className="w-full text-left whitespace-nowrap min-w-[650px]">
                                <thead className="bg-gray-50 dark:bg-[#111827]/40 border-b border-gray-200 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-4 w-1/3">Nama Halaman/Menu</th>
                                        <th className="px-5 py-4 text-center border-l border-gray-100 dark:border-gray-700/40">Bisa Melihat (View)</th>
                                        <th className="px-5 py-4 text-center border-l border-gray-100 dark:border-gray-700/40">Bisa Mengedit (Edit)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 font-medium text-xs sm:text-sm">
                                    {(Object.entries(permissions) as [string, PagePermission][]).map(([key, page]) => (
                                        <tr key={key} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                            <td className="px-5 py-4 font-black text-gray-900 dark:text-white flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                {page.name}
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">({key})</span>
                                            </td>
                                            
                                            {/* VIEW RIGHTS CHECKS */}
                                            <td className="px-5 py-4 border-l border-gray-100 dark:border-gray-700/40">
                                                <div className="flex items-center justify-center gap-4">
                                                    {['Superadmin', 'Admin', 'Staff'].map(role => {
                                                        const isChecked = page.view.includes(role);
                                                        const isSuper = role === 'Superadmin';
                                                        return (
                                                            <label key={role} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all select-none cursor-pointer ${isChecked ? 'bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/50' : 'bg-transparent text-gray-400 border-gray-200 dark:border-gray-700'} ${isSuper ? 'opacity-80 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    disabled={isSuper}
                                                                    checked={isChecked}
                                                                    onChange={() => handleTogglePermission(key, 'view', role)}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                                                />
                                                                {role}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* EDIT RIGHTS CHECKS */}
                                            <td className="px-5 py-4 border-l border-gray-100 dark:border-gray-700/40">
                                                <div className="flex items-center justify-center gap-4">
                                                    {['Superadmin', 'Admin', 'Staff'].map(role => {
                                                        const isChecked = page.edit.includes(role);
                                                        const isSuper = role === 'Superadmin';
                                                        return (
                                                            <label key={role} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all select-none cursor-pointer ${isChecked ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/50' : 'bg-transparent text-gray-400 border-gray-200 dark:border-gray-700'} ${isSuper ? 'opacity-80 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    disabled={isSuper}
                                                                    checked={isChecked}
                                                                    onChange={() => handleTogglePermission(key, 'edit', role)}
                                                                    className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                                                                />
                                                                {role}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* CONTENT TAB 2: LANDING EDITOR */}
            {activeSubTab === 'landing' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-5 mb-6 gap-4">
                            <div>
                                <h3 className="font-black text-lg text-gray-900 dark:text-white">Editor Landing Page</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Sunting Hero, Alur Alur Kerja, & Galeri Dokumentasi</p>
                            </div>
                            <button onClick={handleSaveLanding} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5">
                                <i className="ph-bold ph-floppy-disk text-lg"></i> Simpan & Publikasikan Landing
                            </button>
                        </div>

                        {/* SECTION 1: HERO TEXTS */}
                        <div className="space-y-4 mb-8">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 1. Bagian Hero Landing Page
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Judul Utama Hero (Hero Title)</label>
                                    <input 
                                        type="text" 
                                        value={landingData.heroTitle}
                                        onChange={(e) => handleUpdateHero(e.target.value, landingData.heroSubtitle)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                        placeholder="Ketik judul landing harian..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Sub-judul Penjelas (Hero Subtitle)</label>
                                    <textarea 
                                        value={landingData.heroSubtitle}
                                        onChange={(e) => handleUpdateHero(landingData.heroTitle, e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium resize-none custom-scrollbar"
                                        placeholder="Ketik deskripsi sub-judul..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: WORKFLOW STEPS */}
                        <div className="space-y-5 mb-8 border-t border-gray-100 dark:border-gray-700/60 pt-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 2. Langkah Alur Kerja & Operasional
                            </h4>
                            
                            {/* Steps Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {landingData.steps.map((step: WorkflowStep, idx: number) => (
                                    <div key={step.id || idx} className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex justify-between items-start gap-4">
                                        <div className="min-w-0">
                                            <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-6 h-6 rounded-md font-black text-xs mb-2">
                                                {idx + 1}
                                            </span>
                                            <h5 className="font-black text-sm text-gray-900 dark:text-white mb-1">{step.title}</h5>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteStep(step.id)} 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-gray-400 hover:text-rose-600 border border-gray-200 dark:border-gray-700 hover:border-rose-100 transition-colors shrink-0"
                                        >
                                            <i className="ph-bold ph-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Form Add Step */}
                            <form onSubmit={handleAddStep} className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 rounded-2xl p-4 sm:p-5">
                                <h5 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3"><i className="ph-bold ph-plus-circle mr-1 text-lg inline-block align-middle"></i> Tambahkan Langkah Alur Baru</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-1">
                                        <input 
                                            type="text" 
                                            placeholder="Nama Langkah (Contoh: Input Data)" 
                                            value={newStepTitle}
                                            onChange={(e) => setNewStepTitle(e.target.value)}
                                            className="w-full h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Deskripsi langkah alur kerja..." 
                                            value={newStepDesc}
                                            onChange={(e) => setNewStepDesc(e.target.value)}
                                            className="w-full h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                                        />
                                        <button 
                                            type="submit"
                                            className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center justify-center"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* SECTION 3: IMAGE GALLERY */}
                        <div className="space-y-5 border-t border-gray-100 dark:border-gray-700/60 pt-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 3. Galeri Dokumentasi & Gambar Landing Page
                            </h4>

                            {/* Images Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {landingData.images.map((img: UploadedImage, idx: number) => (
                                    <div key={img.id || idx} className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden p-3 flex gap-4 items-center">
                                        <div className="w-24 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200/50 dark:border-gray-700">
                                            <img src={img.url} alt={img.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-black text-sm text-gray-900 dark:text-white truncate">{img.title}</h5>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">{img.url.startsWith('data:') ? 'Unggahan Base64 Local' : 'Gambar Link Eksternal'}</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteImage(img.id)} 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-gray-400 hover:text-rose-600 border border-gray-200 dark:border-gray-700 hover:border-rose-100 transition-colors shrink-0"
                                        >
                                            <i className="ph-bold ph-trash"></i>
                                        </button>
                                    </div>
                                ))}
                                {landingData.images.length === 0 && (
                                    <div className="col-span-2 text-center py-8 text-gray-400 font-bold text-xs">Belum ada gambar ditambahkan.</div>
                                )}
                            </div>

                            {/* Form Add Image with File Upload */}
                            <form onSubmit={handleAddImage} className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl p-4 sm:p-5 space-y-4">
                                <h5 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><i className="ph-bold ph-image mr-1 text-lg inline-block align-middle"></i> Unggah & Tambahkan Gambar Dokumentasi Baru</h5>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Upload box */}
                                    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/50 transition-colors relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <i className={`ph-bold ${isUploading ? 'ph-spinner ph-spin text-emerald-500' : 'ph-cloud-arrow-up text-gray-400'} text-3xl mb-1`}></i>
                                        <p className="text-xs font-black text-gray-700 dark:text-gray-300">Pilih berkas gambar atau Drag & Drop</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Mendukung format PNG, JPG, WEBP</p>
                                    </div>

                                    {/* Link & Title form fields */}
                                    <div className="space-y-3 flex flex-col justify-between">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Judul / Caption Gambar</label>
                                            <input 
                                                type="text" 
                                                placeholder="Judul foto (Contoh: Evaluasi Tim Bulanan)" 
                                                value={newImageTitle}
                                                onChange={(e) => setNewImageTitle(e.target.value)}
                                                className="w-full h-[40px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Link URL Alternatif (Atau otomatis terisi dari upload)</label>
                                            <input 
                                                type="text" 
                                                placeholder="https://images.unsplash.com/..." 
                                                value={newImageUrl}
                                                onChange={(e) => setNewImageUrl(e.target.value)}
                                                className="w-full h-[40px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono text-gray-500 dark:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        {newImageUrl && (
                                            <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg truncate">
                                                ✓ Media siap ditambahkan ({newImageUrl.substring(0, 40)}...)
                                            </div>
                                        )}
                                        <button 
                                            type="submit" 
                                            disabled={!newImageTitle.trim() || !newImageUrl}
                                            className="w-full h-[40px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0"
                                        >
                                            <i className="ph-bold ph-plus-circle text-lg"></i> Tambahkan ke Galeri
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
