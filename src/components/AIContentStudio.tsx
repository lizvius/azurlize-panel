import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL } from '../utils';

// Pre-built templates
const TEMPLATES = [
  {
    id: 'admin_telegram',
    name: '📢 Lowongan Admin Telegram',
    title: 'ADMIN TELEGRAM GROUP',
    description: 'Kami membuka peluang karir sebagai Administrator Grup Telegram resmi TeamAzurLize. Waktu kerja sangat fleksibel, bonus ACC melimpah, komisi harian, dan support penuh tim profesional.',
    platform: 'Telegram',
    theme: 'Creative Neon',
    color: 'Cyan & Purple',
    size: 'Square (1080x1080)'
  },
  {
    id: 'staff_recruiter_tiktok',
    name: '🎵 Staff Recruitment TikTok',
    title: 'STAFF RECRUITMENT TIKTOK',
    description: 'Punya bakat mencari talent hebat? Bergabunglah sebagai Staff Recruitment TikTok kami. Tugas utama menjaring pelamar & input daily data. Bonus ACC melimpah, full remote work.',
    platform: 'TikTok',
    theme: 'Modern Tech',
    color: 'Emerald & Slate',
    size: 'Story (1080x1920)'
  },
  {
    id: 'customer_support_instagram',
    name: '📸 Customer Support Instagram',
    title: 'CUSTOMER SUPPORT',
    description: 'Dicari CS yang komunikatif & responsif untuk mengelola chat client Instagram. Dapatkan gaji pokok menarik, komisi performa, bonus level harian, dan kesempatan WFA.',
    platform: 'Instagram',
    theme: 'Elegant Slate',
    color: 'Blue & Indigo',
    size: 'Portrait (1080x1350)'
  }
];

export const AIContentStudio = ({ authUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'banner' | 'history' | 'templates' | 'settings'>('banner');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('Telegram');
  const [size, setSize] = useState('Square (1080x1080)');
  const [theme, setTheme] = useState('Modern Tech');
  const [dominantColor, setDominantColor] = useState('Blue & Indigo');

  // Generation Results
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState('');
  const [generatedCTA, setGeneratedCTA] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Admin Settings State
  const [settings, setSettings] = useState({
    companyName: 'AzurLize Recruitment',
    logoText: '🚀 AZURLIZE',
    brandColor: '#4f46e5',
    footerText: '© 2026 TeamAzurLize Official',
    website: 'www.azurlize.com',
    telegramHandle: '@AzurLize_Recruitment',
    whatsappNumber: '08123456789',
    qrText: 'https://telegram.me/AzurLize_Recruitment'
  });

  const previewRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Settings and History on Mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('azurlize_ai_settings');
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch(e){}
    }
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      // Pull from GAS SCRIPT_URL
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getAIHistory' })
      });
      const result = await res.json();
      if (result.status === 'success' && Array.isArray(result.data)) {
        setHistoryList(result.data);
      } else {
        // Fallback to local storage
        const savedHistory = localStorage.getItem('azurlize_ai_history');
        if (savedHistory) setHistoryList(JSON.parse(savedHistory));
      }
    } catch (e) {
      const savedHistory = localStorage.getItem('azurlize_ai_history');
      if (savedHistory) setHistoryList(JSON.parse(savedHistory));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('azurlize_ai_settings', JSON.stringify(settings));
    showToast('success', 'Pengaturan branding berhasil disimpan!');
  };

  const selectTemplate = (tpl: any) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setPlatform(tpl.platform);
    setTheme(tpl.theme);
    setSize(tpl.size);
    // Find matching color
    setDominantColor(tpl.color);
    setActiveSubTab('banner');
    showToast('success', `Template "${tpl.name}" berhasil dimuat!`);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      showToast('error', 'Harap isi Judul dan Deskripsi terlebih dahulu!');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Menganalisis konten & merumuskan prompt visual...');
    
    try {
      // 1. Generate text details (Caption, Hashtags, CTA, Prompt)
      const textRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text',
          title,
          description,
          platform,
          size,
          theme,
          color: dominantColor
        })
      });

      const textData = await textRes.json();
      if (!textRes.ok || textData.error) {
        throw new Error(textData.error || 'Gagal menghasilkan copywriting.');
      }

      const { caption, hashtags, cta, imagePrompt } = textData.data;
      setGeneratedCaption(caption);
      setGeneratedHashtags(hashtags);
      setGeneratedCTA(cta);
      setGeneratedPrompt(imagePrompt);

      // 2. Generate Image background
      setGenerationStep('Membangun latar belakang visual menggunakan Gemini Image...');
      const imageRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'image',
          prompt: imagePrompt,
          size
        })
      });

      const imageData = await imageRes.json();
      let imageUrl = '';
      if (imageRes.ok && imageData.imageUrl) {
        imageUrl = imageData.imageUrl;
        setGeneratedImage(imageUrl);
      } else {
        // Safe fallback - geometric abstract representation
        imageUrl = '';
        setGeneratedImage('');
        showToast('error', 'Gagal memuat latar belakang AI, menggunakan gradien tema premium.');
      }

      setGenerationStep('Menyimpan ke riwayat pembuatan...');
      
      // Save item details to history list
      const newItem = {
        id: Date.now().toString(),
        tanggal: new Date().toISOString().split('T')[0],
        staff: authUser?.name || authUser?.username || 'Staff',
        prompt: imagePrompt,
        title,
        description,
        caption,
        hashtag: hashtags,
        cta,
        platform,
        tema: theme,
        ukuran: size,
        imageUrl,
        status: 'Generated',
        createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      const updatedHistory = [newItem, ...historyList];
      setHistoryList(updatedHistory);
      localStorage.setItem('azurlize_ai_history', JSON.stringify(updatedHistory));

      // Attempt to save to SCRIPT_URL
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveAIHistory', ...newItem })
        });
      } catch (err) {}

      showToast('success', 'Visual & Copywriting berhasil dihasilkan secara sempurna!');
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm('Hapus item riwayat ini?')) return;
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('azurlize_ai_history', JSON.stringify(updated));

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteAIHistory', id })
      });
    } catch (err) {}
    showToast('success', 'Riwayat berhasil dihapus.');
  };

  const handleRegenerateFromHistory = (item: any) => {
    setTitle(item.title || item.prompt.substring(0, 30));
    setDescription(item.description || item.caption);
    setPlatform(item.platform || 'Telegram');
    setTheme(item.tema || 'Modern Tech');
    setSize(item.ukuran || 'Square (1080x1080)');
    setGeneratedCaption(item.caption);
    setGeneratedHashtags(item.hashtag);
    setGeneratedCTA(item.cta);
    setGeneratedPrompt(item.prompt);
    setGeneratedImage(item.imageUrl);
    setActiveSubTab('banner');
    showToast('success', 'Riwayat dimuat ke form editing.');
  };

  const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
    return currentY;
  };

  const handleDownload = (format: 'png' | 'jpg' | 'webp') => {
    const canvas = document.createElement('canvas');
    let width = 1080, height = 1080;
    if (size === 'Portrait (1080x1350)') { width = 1080; height = 1350; }
    else if (size === 'Story (1080x1920)') { width = 1080; height = 1920; }
    else if (size === 'Landscape (1920x1080)') { width = 1920; height = 1080; }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderOverlays = () => {
      // 2. Glass Card overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      const margin = width * 0.08;
      const cardWidth = width - (margin * 2);
      const cardHeight = height * 0.7;
      const cardX = margin;
      const cardY = (height - cardHeight) / 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, width * 0.03);
      } else {
        ctx.rect(cardX, cardY, cardWidth, cardHeight);
      }
      ctx.fill();

      // Card Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 3. Draw Branding Logo Text
      ctx.fillStyle = '#ffffff';
      ctx.font = `black ${width * 0.038}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(settings.logoText || '🚀 AZURLIZE', width / 2, cardY + (height * 0.08));

      // Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + (height * 0.11));
      ctx.lineTo(cardX + cardWidth - 40, cardY + (height * 0.11));
      ctx.stroke();

      // 4. Draw Main Headline
      ctx.fillStyle = '#ffffff';
      ctx.font = `black ${width * 0.065}px Inter, sans-serif`;
      ctx.fillText(title ? title.toUpperCase() : 'WE ARE HIRING!', width / 2, cardY + (height * 0.2));

      // 5. Draw Description
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.font = `medium ${width * 0.028}px Inter, sans-serif`;
      wrapText(ctx, description || 'Join our fast-growing recruitment campaign.', width / 2, cardY + (height * 0.28), cardWidth - 100, width * 0.045);

      // 6. Call To Action (CTA Button)
      const btnW = width * 0.6;
      const btnH = height * 0.065;
      const btnX = (width - btnW) / 2;
      const btnY = cardY + cardHeight - (height * 0.18);

      ctx.fillStyle = settings.brandColor || '#4f46e5';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(btnX, btnY, btnW, btnH, width * 0.015);
      } else {
        ctx.rect(btnX, btnY, btnW, btnH);
      }
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${width * 0.026}px Inter, sans-serif`;
      ctx.fillText(generatedCTA ? generatedCTA.toUpperCase() : 'DAFTAR SEKARANG', width / 2, btnY + (btnH / 2) + (height * 0.008));

      // 7. Footer contacts details
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `bold ${width * 0.022}px Inter, sans-serif`;
      ctx.fillText(`${settings.telegramHandle} • WA: ${settings.whatsappNumber}`, width / 2, cardY + cardHeight - (height * 0.05));

      // Download
      const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpg' ? 0.9 : undefined);
      const link = document.createElement('a');
      link.download = `azurlize_banner_${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();
      showToast('success', `Berhasil mengunduh banner format ${format.toUpperCase()}!`);
    };

    // 1. Draw background
    if (generatedImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = generatedImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        renderOverlays();
      };
      img.onerror = () => {
        // Fallback gradient if loading fails (cors etc)
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        renderOverlays();
      };
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      if (theme === 'Creative Neon') {
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#1e1b4b');
      } else if (theme === 'Elegant Slate') {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#334155');
      } else if (theme === 'Warm Pastel') {
        grad.addColorStop(0, '#fff7ed');
        grad.addColorStop(1, '#ffedd5');
      } else {
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      renderOverlays();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all animate-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
          <i className={`ph-fill ${toast.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-xl`}></i>
          <span className="text-xs font-black">{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 sm:gap-4 bg-white/60 dark:bg-gray-800/60 p-4 sm:p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <i className="ph-fill ph-palette text-indigo-500 animate-pulse"></i> AI Content Studio
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Asisten AI cerdas untuk memproduksi copywriting, caption, and banner promosi rekrutmen secara otomatis.
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto bg-gray-100 dark:bg-black/20 p-1 rounded-xl border border-gray-200/50 dark:border-white/5 w-full md:w-auto">
          {(['banner', 'history', 'templates', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeSubTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {tab === 'banner' && '🎨 AI Banner'}
              {tab === 'history' && '📂 History'}
              {tab === 'templates' && '📖 Templates'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: AI BANNER */}
      {activeSubTab === 'banner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: FORM INPUT */}
          <form onSubmit={handleGenerate} className="lg:col-span-5 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-4">
            <div className="border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2"><i className="ph-fill ph-sparkle text-indigo-500"></i> Desain Promosi Baru</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">Isi detail di bawah untuk memicu kecerdasan Gemini.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Judul Promosi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ADMIN GRUP TELEGRAM"
                  className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Deskripsi Detail</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ceritakan tentang lowongan ini, kualifikasi, benefit, cara pendaftaran, dsb..."
                  className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Platform Utama</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                  >
                    <option value="Telegram">Telegram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Dimensi Banner</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={size}
                    onChange={e => setSize(e.target.value)}
                  >
                    <option value="Square (1080x1080)">Square (1:1)</option>
                    <option value="Portrait (1080x1350)">Portrait (4:5)</option>
                    <option value="Story (1080x1920)">Story (9:16)</option>
                    <option value="Landscape (1920x1080)">Landscape (16:9)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Tema Desain</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                  >
                    <option value="Modern Tech">Modern Tech</option>
                    <option value="Creative Neon">Creative Neon</option>
                    <option value="Elegant Slate">Elegant Slate</option>
                    <option value="Warm Pastel">Warm Pastel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Warna Dominan</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={dominantColor}
                    onChange={e => setDominantColor(e.target.value)}
                  >
                    <option value="Blue & Indigo">Blue & Indigo</option>
                    <option value="Emerald & Slate">Emerald & Slate</option>
                    <option value="Cyan & Purple">Cyan & Purple</option>
                    <option value="Amber & Pink">Amber & Pink</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <i className="ph-bold ph-spinner ph-spin text-base"></i>
                    Memproses...
                  </>
                ) : (
                  <>
                    <i className="ph-fill ph-sparkles text-base"></i>
                    Generate AI Poster & Text
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RIGHT: PREVIEW PANEL */}
          <div className="lg:col-span-7 space-y-6">
            {isGenerating ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col items-center justify-center text-center py-24">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin"></div>
                  <i className="ph-fill ph-magic-wand text-3xl text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"></i>
                </div>
                <h4 className="font-black text-gray-900 dark:text-white text-base">Gemini Sedang Mengolah Ide</h4>
                <p className="text-xs text-indigo-500 mt-2 font-bold px-8 max-w-md bg-indigo-500/10 py-2 rounded-xl animate-pulse">{generationStep}</p>
                <p className="text-[10px] text-gray-400 mt-4 px-12 leading-relaxed">Kami sedang merangkai caption menarik, hashtags viral, CTA persuasif, serta melukis background poster rekrutmen bernilai seni tinggi.</p>
              </div>
            ) : generatedCaption ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-200">
                {/* Visual Banner Preview */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-500 flex items-center gap-1.5"><i className="ph-fill ph-image"></i> Desain Poster (Interactive Preview)</h4>
                    <div className="flex gap-1">
                      <button onClick={() => handleDownload('png')} className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-colors">PNG</button>
                      <button onClick={() => handleDownload('jpg')} className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-colors">JPG</button>
                    </div>
                  </div>

                  <div className="flex justify-center bg-gray-900/10 dark:bg-black/20 p-4 sm:p-6 rounded-2xl border border-gray-200/50 dark:border-white/5 overflow-hidden">
                    {/* Responsive Frame rendering */}
                    <div
                      ref={previewRef}
                      className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center justify-center p-6 text-white text-center select-none ${
                        size === 'Square (1080x1080)' ? 'aspect-square' :
                        size === 'Portrait (1080x1350)' ? 'aspect-[4/5]' :
                        size === 'Story (1080x1920)' ? 'aspect-[9/16]' : 'aspect-video'
                      }`}
                      style={{
                        backgroundImage: generatedImage ? `url(${generatedImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#0f172a'
                      }}
                    >
                      {/* Gradient fallback overlay if no image is present */}
                      {!generatedImage && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${
                          theme === 'Creative Neon' ? 'from-indigo-950 via-slate-900 to-indigo-900' :
                          theme === 'Elegant Slate' ? 'from-slate-900 to-zinc-800' :
                          theme === 'Warm Pastel' ? 'from-orange-100 to-rose-200 text-gray-800' :
                          'from-slate-950 to-indigo-950'
                        }`} />
                      )}

                      {/* Premium glassmorphic container card */}
                      <div className={`w-full h-full relative z-10 flex flex-col justify-between p-4 sm:p-6 rounded-2xl border border-white/15 bg-slate-950/75 backdrop-blur-md`}>
                        {/* Company Logo branding header */}
                        <div className="text-center">
                          <span className="font-black text-sm tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/10 text-white uppercase">{settings.logoText || 'AZURLIZE'}</span>
                        </div>

                        {/* Middle: Content */}
                        <div className="my-auto space-y-3">
                          <h2 className="font-black text-xl sm:text-2xl text-white tracking-tight uppercase line-clamp-2">{title || 'JOB VACANCY'}</h2>
                          <p className="text-[10px] sm:text-xs text-white/80 font-semibold line-clamp-5 leading-relaxed">{description}</p>
                        </div>

                        {/* Bottom: Action & contacts */}
                        <div className="space-y-4">
                          <button type="button" className="w-full py-2.5 bg-indigo-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-lg shadow-md border border-indigo-500">
                            {generatedCTA ? generatedCTA.toUpperCase() : 'DAFTAR SEKARANG'}
                          </button>
                          
                          <div className="text-[9px] font-bold text-white/50 flex flex-wrap justify-center gap-x-2">
                            <span>WA: {settings.whatsappNumber}</span>
                            <span>•</span>
                            <span>{settings.telegramHandle}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Copywriting Result */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 dark:border-white/5 pb-2">
                    <h4 className="font-black text-xs uppercase tracking-widest text-emerald-500 flex items-center gap-1.5"><i className="ph-fill ph-pencil-simple-line"></i> Copywriting & Caption</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Caption Media Sosial</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(generatedCaption); showToast('success', 'Caption disalin!'); }}
                          className="text-[10px] text-indigo-500 font-bold hover:underline"
                        >
                          Salin Teks
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-black/15 p-4 rounded-xl border border-gray-200/50 dark:border-white/5 text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-bold whitespace-pre-line">
                        {generatedCaption}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hashtags</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(generatedHashtags); showToast('success', 'Hashtags disalin!'); }}
                            className="text-[10px] text-indigo-500 font-bold hover:underline"
                          >
                            Salin
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-black/15 p-3 rounded-xl border border-gray-200/50 dark:border-white/5 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold whitespace-nowrap overflow-x-auto">
                          {generatedHashtags}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Call To Action</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(generatedCTA); showToast('success', 'CTA disalin!'); }}
                            className="text-[10px] text-indigo-500 font-bold hover:underline"
                          >
                            Salin
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-black/15 p-3 rounded-xl border border-gray-200/50 dark:border-white/5 text-xs text-gray-800 dark:text-gray-200 font-black">
                          {generatedCTA}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Prompt AI Background (Visual Reference)</span>
                      <div className="bg-gray-50 dark:bg-black/10 p-3 rounded-xl border border-gray-200/50 dark:border-white/5 text-[10px] font-mono text-gray-500">
                        {generatedPrompt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col items-center justify-center text-center py-24 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 dark:bg-black/10 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
                  <i className="ph-fill ph-sparkles text-3xl"></i>
                </div>
                <h4 className="font-black text-gray-800 dark:text-gray-200 text-sm">Menunggu Perintah Anda</h4>
                <p className="text-xs text-gray-500 max-w-sm mt-1">Gunakan formulir di sebelah kiri atau pilih template pre-built untuk mulai memproduksi konten rekrutmen premium Anda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2"><i className="ph-fill ph-folder-open text-indigo-500"></i> Riwayat Produksi Konten</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Seluruh karya promosi rekrutmen staff tersimpan otomatis secara real-time.</p>
          </div>

          {isHistoryLoading ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
              <i className="ph-bold ph-spinner ph-spin text-3xl mb-2 text-indigo-500"></i>
              <span className="text-xs font-black uppercase tracking-wider">Memuat Arsip...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
              <i className="ph-fill ph-folder-open text-3xl mb-2 text-gray-300"></i>
              <span className="text-xs font-bold">KOSONG. Belum ada konten yang di-generate.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-4">Informasi Konten</th>
                    <th className="px-5 py-4">Platform / Ukuran</th>
                    <th className="px-5 py-4">Caption Copywriting Preview</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-base shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            ) : (
                              <i className="ph-bold ph-image-square"></i>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-gray-900 dark:text-white">{item.title || 'Job Campaign'}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">Oleh: <span className="text-indigo-500">{item.staff}</span> • {item.tanggal} {item.createdAt}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-black text-gray-700 dark:text-gray-300">{item.platform}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.ukuran}</div>
                      </td>
                      <td className="px-5 py-4 max-w-xs overflow-hidden text-ellipsis">
                        <p className="line-clamp-2 text-gray-500 font-medium leading-relaxed">{item.caption}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleRegenerateFromHistory(item)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 font-black rounded-lg transition-colors flex items-center gap-1">
                            <i className="ph-bold ph-pencil-simple"></i> Load Edit
                          </button>
                          <button onClick={() => handleDeleteHistory(item.id)} className="w-8 h-8 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors flex items-center justify-center">
                            <i className="ph-bold ph-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">{tpl.platform}</span>
                <h4 className="font-black text-gray-900 dark:text-white text-sm">{tpl.name}</h4>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{tpl.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-400">
                  <div>TEMA: <span className="text-gray-700 dark:text-gray-300 font-black">{tpl.theme}</span></div>
                  <div>WARNA: <span className="text-gray-700 dark:text-gray-300 font-black">{tpl.color}</span></div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                <button
                  onClick={() => selectTemplate(tpl)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors flex justify-center items-center gap-1.5"
                >
                  <i className="ph-bold ph-pencil-simple"></i> Gunakan Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm max-w-2xl space-y-6">
          <div className="border-b border-gray-100 dark:border-white/5 pb-3">
            <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2"><i className="ph-fill ph-gear text-indigo-500"></i> Pengaturan Branding & Kontak</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Konfigurasi info di bawah agar logo, kontak, and handles tercetak otomatis di poster promosi.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Nama Perusahaan / Organisasi</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.companyName}
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Logo Text / Icon</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.logoText}
                onChange={e => setSettings({ ...settings, logoText: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Warna Brand Utama (Hex)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-10 p-0.5 bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer"
                  value={settings.brandColor}
                  onChange={e => setSettings({ ...settings, brandColor: e.target.value })}
                />
                <input
                  type="text"
                  required
                  className="flex-1 bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={settings.brandColor}
                  onChange={e => setSettings({ ...settings, brandColor: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Teks Hak Cipta / Footer</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.footerText}
                onChange={e => setSettings({ ...settings, footerText: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Alamat Website</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.website}
                onChange={e => setSettings({ ...settings, website: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Username Telegram Official</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.telegramHandle}
                onChange={e => setSettings({ ...settings, telegramHandle: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Nomor WhatsApp Official</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.whatsappNumber}
                onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Teks QR Code / Link Pendaftaran</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-black/10 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.qrText}
                onChange={e => setSettings({ ...settings, qrText: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center gap-1.5"
            >
              <i className="ph-bold ph-floppy-disk"></i> Simpan Pengaturan
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
