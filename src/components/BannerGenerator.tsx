import React, { useState, useEffect, useRef } from 'react';

interface BannerGeneratorProps {
    authUser: any;
}

const BANNER_SIZES = [
    { id: 'landscape', label: 'Landscape (Header 800x250)', w: 800, h: 250, aspect: 'aspect-[80/25]' },
    { id: 'social', label: 'Modern Social (16:9 - 800x450)', w: 800, h: 450, aspect: 'aspect-[16/9]' },
    { id: 'square', label: 'Square Post (1:1 - 500x500)', w: 500, h: 500, aspect: 'aspect-square' }
];

const STYLE_PRESETS = [
    { id: 'indigo', label: 'Calm Indigo (General)', start: '#4f46e5', end: '#7c3aed', text: '#ffffff' },
    { id: 'emerald', label: 'Fresh Emerald (Event/Reward)', start: '#10b981', end: '#059669', text: '#ffffff' },
    { id: 'rose', label: 'Urgent Rose (Rules/Alert)', start: '#f43f5e', end: '#be123c', text: '#ffffff' },
    { id: 'amber', label: 'Golden Amber (Bonus/Target)', start: '#f59e0b', end: '#d97706', text: '#ffffff' },
    { id: 'sky', label: 'Ocean Sky (Tech/Modern)', start: '#0ea5e9', end: '#2563eb', text: '#ffffff' },
    { id: 'slate', label: 'Dark Slate (Executive)', start: '#1e293b', end: '#0f172a', text: '#ffffff' },
    { id: 'custom', label: 'Custom Custom Gradient 🎨', start: '#8b5cf6', end: '#ec4899', text: '#ffffff' }
];

const FONTS = [
    { id: 'sans', label: 'Inter (Sans-serif)', family: "'Inter', sans-serif" },
    { id: 'display', label: 'Space Grotesk (Tech)', family: "'Space Grotesk', sans-serif" },
    { id: 'mono', label: 'JetBrains Mono (Mono)', family: "'JetBrains Mono', monospace" }
];

export function BannerGenerator({ authUser }: BannerGeneratorProps) {
    const [text, setText] = useState('Dapatkan Bonus Mingguan Mencapai Target!');
    const [badge, setBadge] = useState('📢  PENGUMUMAN BARU');
    const [footerText, setFooterText] = useState('AzurLize Recruitment Platform');
    
    const [sizeId, setSizeId] = useState('landscape');
    const [presetId, setPresetId] = useState('indigo');
    const [customStart, setCustomStart] = useState('#8b5cf6');
    const [customEnd, setCustomEnd] = useState('#ec4899');
    
    const [fontId, setFontId] = useState('sans');
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
    const [patternType, setPatternType] = useState<'abstract' | 'circles' | 'waves' | 'none'>('abstract');
    
    const [generatedImage, setGeneratedImage] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sentStatus, setSentStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedChannel, setSelectedChannel] = useState('general');

    const activeSize = BANNER_SIZES.find(s => s.id === sizeId) || BANNER_SIZES[0];
    const activePreset = STYLE_PRESETS.find(p => p.id === presetId) || STYLE_PRESETS[0];
    
    const colorStart = presetId === 'custom' ? customStart : activePreset.start;
    const colorEnd = presetId === 'custom' ? customEnd : activePreset.end;
    const fontObj = FONTS.find(f => f.id === fontId) || FONTS[0];

    // Re-draw canvas whenever styling parameters change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = activeSize.w;
        canvas.height = activeSize.h;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, activeSize.w, activeSize.h);

        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, activeSize.w, activeSize.h);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, activeSize.w, activeSize.h);

        // Draw geometric / artistic decorative background accents
        if (patternType !== 'none') {
            ctx.save();
            if (patternType === 'abstract' || patternType === 'circles') {
                // Large transparent circles
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.arc(activeSize.w * 0.15, activeSize.h * 0.8, activeSize.h * 0.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.beginPath();
                ctx.arc(activeSize.w * 0.85, activeSize.h * 0.2, activeSize.h * 0.7, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.beginPath();
                ctx.arc(activeSize.w * 0.5, activeSize.h * 0.6, activeSize.h * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            if (patternType === 'abstract' || patternType === 'waves') {
                // Diagonals / Waves
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.beginPath();
                ctx.moveTo(0, activeSize.h * 0.3);
                ctx.bezierCurveTo(activeSize.w * 0.25, activeSize.h * 0.1, activeSize.w * 0.5, activeSize.h * 0.8, activeSize.w, activeSize.h * 0.5);
                ctx.lineTo(activeSize.w, activeSize.h);
                ctx.lineTo(0, activeSize.h);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
                ctx.beginPath();
                ctx.moveTo(0, activeSize.h * 0.7);
                ctx.bezierCurveTo(activeSize.w * 0.3, activeSize.h * 0.9, activeSize.w * 0.7, activeSize.h * 0.4, activeSize.w, activeSize.h * 0.8);
                ctx.lineTo(activeSize.w, activeSize.h);
                ctx.lineTo(0, activeSize.h);
                ctx.closePath();
                ctx.fill();
            }

            if (patternType === 'abstract') {
                // Diagonal overlay lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                for (let i = -100; i < activeSize.w; i += 40) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i + 150, activeSize.h);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Draw Badge header
        if (badge.trim()) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            
            const badgeFont = `bold ${Math.max(11, Math.round(activeSize.h * 0.045))}px system-ui, sans-serif`;
            ctx.font = badgeFont;
            const textMetrics = ctx.measureText(badge.toUpperCase());
            const badgePaddingX = 14;
            const badgePaddingY = 7;
            const badgeW = textMetrics.width + (badgePaddingX * 2);
            const badgeH = Math.max(11, Math.round(activeSize.h * 0.045)) + (badgePaddingY * 2);
            
            let badgeX = 40;
            if (textAlign === 'center') {
                badgeX = (activeSize.w - badgeW) / 2;
            } else if (textAlign === 'right') {
                badgeX = activeSize.w - badgeW - 40;
            }
            const badgeY = Math.round(activeSize.h * 0.15);

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
            } else {
                ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            }
            ctx.fill();

            // Text of Badge
            ctx.font = badgeFont;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(badge.toUpperCase(), badgeX + badgePaddingX, badgeY + badgePaddingY + Math.max(11, Math.round(activeSize.h * 0.045)) - 1);
            ctx.restore();
        }

        // Draw Main text body
        if (text.trim()) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            
            // Adaptive font sizes based on banner scale
            let baseFontSize = 26;
            if (sizeId === 'social') baseFontSize = 38;
            if (sizeId === 'square') baseFontSize = 34;
            
            ctx.font = `bold ${baseFontSize}px ${fontObj.family}`;
            
            const words = text.split(/\s+/);
            let line = '';
            const lines = [];
            const maxWidth = activeSize.w - 80;
            const lineHeight = baseFontSize * 1.35;

            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line.trim());
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line.trim());

            // Calculate start vertical Y
            let startY = activeSize.h * 0.44;
            if (sizeId === 'social') startY = activeSize.h * 0.42;
            if (sizeId === 'square') startY = activeSize.h * 0.38;

            // Align text vertically and center lines block if requested
            lines.forEach((currentLine, lineIdx) => {
                let textX = 40;
                if (textAlign === 'center') {
                    const singleLineWidth = ctx.measureText(currentLine).width;
                    textX = (activeSize.w - singleLineWidth) / 2;
                } else if (textAlign === 'right') {
                    const singleLineWidth = ctx.measureText(currentLine).width;
                    textX = activeSize.w - singleLineWidth - 40;
                }
                ctx.fillText(currentLine, textX, startY + (lineIdx * lineHeight));
            });
            ctx.restore();
        }

        // Draw Footer Branding Text
        if (footerText.trim()) {
            ctx.save();
            ctx.font = `italic ${Math.max(10, Math.round(activeSize.h * 0.04))}px system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            
            let footerX = 40;
            if (textAlign === 'center') {
                const footerW = ctx.measureText(footerText).width;
                footerX = (activeSize.w - footerW) / 2;
            } else if (textAlign === 'right') {
                const footerW = ctx.measureText(footerText).width;
                footerX = activeSize.w - footerW - 40;
            }
            const footerY = activeSize.h - Math.max(20, Math.round(activeSize.h * 0.12));

            ctx.fillText(footerText, footerX, footerY);
            ctx.restore();
        }

        // Save generated image URL to local state
        setGeneratedImage(canvas.toDataURL('image/png'));

    }, [text, badge, footerText, sizeId, presetId, customStart, customEnd, fontId, textAlign, patternType]);

    // Handle Copy banner image to clipboard
    const handleCopyToClipboard = async () => {
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        const item = new ClipboardItem({ 'image/png': blob });
                        await navigator.clipboard.write([item]);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                    } catch (e) {
                        // Fallback dataURL copying if clipboard API not fully supported inside iframe
                        await navigator.clipboard.writeText(canvas.toDataURL('image/png'));
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                    }
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }
    };

    // Download banner image as PNG file
    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.download = `banner-azurlize-${Date.now()}.png`;
        link.href = generatedImage;
        link.click();
    };

    // Integration helper: Directly publish generated banner to AnnouncementCenter local storage feed
    const handlePublishToAnnouncements = async () => {
        setIsSending(true);
        setSentStatus('idle');
        try {
            // Retrieve existing announcements
            const existingRaw = localStorage.getItem('recruitOps_announcements');
            const posts = existingRaw ? JSON.parse(existingRaw) : [];
            
            const tempId = Date.now();
            const newPost = {
                id: tempId,
                channelId: selectedChannel,
                author: authUser.name,
                role: authUser.role,
                content: text || 'Banner pengumuman baru diterbitkan.',
                timestamp: new Date().toISOString(),
                likes: [],
                comments: [],
                pinned: false,
                banner: generatedImage || null,
                isPending: false
            };
            
            posts.push(newPost);
            localStorage.setItem('recruitOps_announcements', JSON.stringify(posts));

            // Mark as read for this user
            const readRaw = localStorage.getItem(`recruitOps_read_${authUser.username}`);
            const reads = readRaw ? JSON.parse(readRaw) : [];
            reads.push(tempId);
            localStorage.setItem(`recruitOps_read_${authUser.username}`, JSON.stringify(reads));

            // Notify UI
            window.dispatchEvent(new Event('refreshActiveTab'));
            
            setSentStatus('success');
            setTimeout(() => setSentStatus('idle'), 3500);
        } catch (e) {
            setSentStatus('error');
            setTimeout(() => setSentStatus('idle'), 3500);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
            
            {/* Header Title with Subtitle */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center tracking-tight">
                        <i className="ph-fill ph-palette text-indigo-600 mr-2.5 text-2xl md:text-3xl"></i>
                        AzurLize Banner Studio
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Buat banner pengumuman, bonus mingguan, dan target secara instan dengan desain modern, visual shapes, dan ekspor super cepat.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/40 px-4 py-2 rounded-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Active Canvas Engine v2.0</span>
                </div>
            </div>

            {/* Hidden canvas used purely for drawing */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT PANEL: Canvas Preview & Share Integration (7 columns) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Live Preview Wrapper */}
                    <div className="bg-white/90 dark:bg-[#151a23]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/60 rounded-3xl shadow-xl p-4 sm:p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800/60 pb-3">
                            <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <i className="ph-fill ph-monitor-play text-indigo-500"></i> Live Canvas Preview
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-700/50">
                                {activeSize.w} x {activeSize.h} px
                            </span>
                        </div>

                        {/* Real dynamic image preview with constraints */}
                        <div className="bg-gray-100 dark:bg-gray-900/80 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-2 sm:p-4 border border-gray-200/50 dark:border-gray-800/50">
                            {generatedImage ? (
                                <div className={`w-full max-w-full overflow-hidden rounded-xl border border-white dark:border-gray-800 shadow-xl transition-all duration-300 relative group`}>
                                    <img 
                                        src={generatedImage} 
                                        alt="Banner Canvas Output" 
                                        className="w-full h-auto object-contain select-none" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                        <button onClick={handleDownload} className="px-4 py-2.5 bg-white text-gray-900 font-bold text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5">
                                            <i className="ph-bold ph-download-simple"></i> Download
                                        </button>
                                        <button onClick={handleCopyToClipboard} className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5">
                                            <i className={`ph-bold ${isCopied ? 'ph-check-circle' : 'ph-copy'}`}></i> {isCopied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center text-center">
                                    <i className="ph-bold ph-spinner ph-spin text-3xl text-indigo-500 mb-2"></i>
                                    <span className="text-xs text-gray-400">Rendering canvas...</span>
                                </div>
                            )}
                        </div>

                        {/* Download and Copy Instant Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button 
                                onClick={handleDownload} 
                                className="py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm"
                            >
                                <i className="ph-bold ph-download-simple text-sm"></i> Unduh Gambar (PNG)
                            </button>
                            <button 
                                onClick={handleCopyToClipboard} 
                                className={`py-3 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-98 shadow-md`}
                            >
                                <i className={`ph-bold ${isCopied ? 'ph-check-circle' : 'ph-copy'} text-sm`}></i> 
                                {isCopied ? 'Berhasil Disalin!' : 'Salin Ke Clipboard'}
                            </button>
                        </div>
                    </div>

                    {/* Quick Publish Integration */}
                    <div className="bg-white/95 dark:bg-[#151a23]/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i className="ph-fill ph-paper-plane-tilt text-emerald-500 text-lg"></i>
                            Kirim Ke Saluran Komunikasi (Pemberitahuan)
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                    Pilih Channel Pengumuman
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'general', label: '📢 Umum', bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
                                        { id: 'rules', label: '📌 Peraturan', bg: 'hover:bg-rose-50 dark:hover:bg-rose-950/20' },
                                        { id: 'bonus', label: '💰 Bonus & Target', bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/20' },
                                        { id: 'event', label: '🎉 Acara', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' }
                                    ].map(ch => (
                                        <button 
                                            key={ch.id} 
                                            onClick={() => setSelectedChannel(ch.id)}
                                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${selectedChannel === ch.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'border-gray-200 dark:border-gray-700/80 bg-transparent text-gray-500 dark:text-gray-400 ' + ch.bg}`}
                                        >
                                            {ch.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handlePublishToAnnouncements} 
                                disabled={isSending || !text.trim()}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSending ? (
                                    <>
                                        <i className="ph-bold ph-spinner ph-spin text-sm"></i>
                                        Memproses pengiriman...
                                    </>
                                ) : (
                                    <>
                                        <i className="ph-bold ph-telegram-logo text-sm"></i>
                                        Terbitkan Banner Sebagai Pengumuman Baru
                                    </>
                                )}
                            </button>

                            {/* Toast Notification for Success / Error */}
                            {sentStatus === 'success' && (
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                    <i className="ph-fill ph-check-circle text-lg"></i> Banner berhasil diterbitkan ke channel pemberitahuan!
                                </div>
                            )}

                            {sentStatus === 'error' && (
                                <div className="p-3 bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-center text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                    <i className="ph-fill ph-warning-circle text-lg"></i> Gagal menerbitkan banner. Silakan coba kembali.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Controls & Settings (5 columns) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white/95 dark:bg-[#151a23]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/60 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
                        
                        <div className="border-b border-gray-100 dark:border-gray-800/60 pb-3">
                            <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <i className="ph-fill ph-sliders-horizontal text-indigo-500"></i>
                                Pengaturan Desain & Teks
                            </h3>
                        </div>

                        {/* Text Inputs */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                    Pita Atas (Badge Tag)
                                </label>
                                <div className="relative">
                                    <i className="ph-bold ph-tag absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
                                    <input 
                                        type="text" 
                                        value={badge} 
                                        onChange={e => setBadge(e.target.value)}
                                        placeholder="Ketik tag atas banner..." 
                                        className="w-full text-xs font-bold pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                    Pesan Utama / Pengumuman
                                </label>
                                <textarea 
                                    rows={3}
                                    value={text} 
                                    onChange={e => setText(e.target.value)}
                                    placeholder="Ketik teks utama pengumuman..." 
                                    className="w-full text-xs font-bold p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none custom-scrollbar"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                    Label Bawah / Hak Cipta
                                </label>
                                <div className="relative">
                                    <i className="ph-bold ph-copyright absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
                                    <input 
                                        type="text" 
                                        value={footerText} 
                                        onChange={e => setFooterText(e.target.value)}
                                        placeholder="Ketik label bawah..." 
                                        className="w-full text-xs font-bold pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preset Styles Grid */}
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Tema Warna / Preset
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {STYLE_PRESETS.map(preset => (
                                    <button 
                                        key={preset.id}
                                        onClick={() => setPresetId(preset.id)}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${presetId === preset.id ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                    >
                                        <div 
                                            className="w-5 h-5 rounded-md border border-white shadow-sm shrink-0" 
                                            style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }}
                                        />
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Color Pickers if 'custom' is selected */}
                        {presetId === 'custom' && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/80 animate-in slide-in-from-top-2 duration-150">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Mulai Gradien</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={customStart} 
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="w-8 h-8 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 cursor-pointer shrink-0"
                                        />
                                        <input 
                                            type="text" 
                                            value={customStart} 
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="w-full text-[11px] font-mono px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Akhir Gradien</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={customEnd} 
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="w-8 h-8 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 cursor-pointer shrink-0"
                                        />
                                        <input 
                                            type="text" 
                                            value={customEnd} 
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="w-full text-[11px] font-mono px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Banner Aspect Ratio Sizing Options */}
                        <div className="space-y-2.5">
                            <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Dimensi Banner / Ukuran
                            </label>
                            <div className="space-y-1.5">
                                {BANNER_SIZES.map(sz => (
                                    <button 
                                        key={sz.id}
                                        onClick={() => setSizeId(sz.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${sizeId === sz.id ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <span className="text-[11px] font-bold">{sz.label}</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-4 border-2 rounded ${sizeId === sz.id ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-400 bg-gray-100 dark:bg-gray-800'}`} style={{ aspectRatio: sz.id === 'square' ? '1/1' : sz.id === 'social' ? '16/9' : '3/1' }}></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Formatting Controls: Fonts and Alignments */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                    Gaya Huruf / Font
                                </label>
                                <select 
                                    value={fontId} 
                                    onChange={e => setFontId(e.target.value)}
                                    className="w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-indigo-500 text-gray-800 dark:text-gray-100"
                                >
                                    {FONTS.map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                                    Penyelarasan Teks
                                </label>
                                <div className="flex bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden p-1">
                                    {(['left', 'center', 'right'] as const).map(align => (
                                        <button 
                                            key={align} 
                                            onClick={() => setTextAlign(align)}
                                            className={`flex-1 py-1.5 flex items-center justify-center rounded-lg text-xs transition-all ${textAlign === align ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                        >
                                            <i className={`ph-bold ph-text-align-${align} text-base`}></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Patterns & Shapes */}
                        <div className="space-y-2.5">
                            <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Ornamen Latar Belakang
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'abstract', label: 'Eksklusif', icon: 'ph-sparkle' },
                                    { id: 'circles', label: 'Bulatan', icon: 'ph-circle' },
                                    { id: 'waves', label: 'Gelombang', icon: 'ph-waves' },
                                    { id: 'none', label: 'Polos', icon: 'ph-prohibit' }
                                ].map(pat => (
                                    <button 
                                        key={pat.id}
                                        onClick={() => setPatternType(pat.id as any)}
                                        className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${patternType === pat.id ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                    >
                                        <i className={`ph-bold ${pat.icon} text-lg`}></i>
                                        <span className="text-[9px] font-bold tracking-tight">{pat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>

        </div>
    );
}
