import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, ProgressBar } from './UI';
import { SCRIPT_URL, formatToDDMMYYYY } from '../utils';

const ANNOUNCEMENT_CHANNELS = [
    { id: 'rules', name: 'Rules', icon: 'ph-push-pin', color: 'rose', grad: 'from-rose-500 to-red-600' },
    { id: 'announcement', name: 'Announcement', icon: 'ph-megaphone', color: 'indigo', grad: 'from-indigo-500 to-violet-600' },
    { id: 'bonus', name: 'Bonus & Reward', icon: 'ph-confetti', color: 'amber', grad: 'from-amber-400 to-orange-500' },
    { id: 'event', name: 'Event', icon: 'ph-calendar-blank', color: 'emerald', grad: 'from-emerald-400 to-teal-500' },
    { id: 'general', name: 'General Discussion', icon: 'ph-chats', color: 'blue', grad: 'from-blue-500 to-cyan-500' }
];

export const AnnouncementCenter = ({authUser}) => {
    const [activeChannel, setActiveChannel] = useState('announcement');
    const [posts, setPosts] = useState([]);
    const [newContent, setNewContent] = useState('');
    const [replyContent, setReplyContent] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [editContent, setEditContent] = useState('');
    const chatEndRef = useRef(null);

    // STATE Pelacakan Pesan Terbaca (Read Receipts)
    const [readPosts, setReadPosts] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`recruitOps_read_${authUser.username}`)) || []; } 
        catch (e) { return []; }
    });

    const [previewBanner, setPreviewBanner] = useState('');

    useEffect(() => {
        if (activeChannel === 'general' || !newContent.trim()) {
            setPreviewBanner('');
            return;
        }

        const timeoutId = setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 250;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Background Gradient
                const gradient = ctx.createLinearGradient(0, 0, 800, 250);
                const channel = ANNOUNCEMENT_CHANNELS.find(c => c.id === activeChannel) || ANNOUNCEMENT_CHANNELS[1];
                let colors = ['#4f46e5', '#7c3aed']; // default indigo
                if (channel.id === 'rules') colors = ['#e11d48', '#be123c'];
                else if (channel.id === 'bonus') colors = ['#fbbf24', '#f59e0b'];
                else if (channel.id === 'event') colors = ['#34d399', '#059669'];
                else if (channel.id === 'general') colors = ['#3b82f6', '#1d4ed8'];
                
                gradient.addColorStop(0, colors[0]);
                gradient.addColorStop(1, colors[1]);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 800, 250);

                // Abstract elegant background visual accents
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath(); ctx.arc(120, 220, 160, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.beginPath(); ctx.arc(680, 40, 180, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                ctx.beginPath(); ctx.arc(420, 160, 90, 0, Math.PI * 2); ctx.fill();

                // Channel Badge Tag in Banner
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                const tagText = `📢  ${channel.name.toUpperCase()}`;
                
                ctx.beginPath();
                const tagWidth = ctx.measureText(tagText).width + 30;
                if (ctx.roundRect) {
                    ctx.roundRect(40, 35, tagWidth, 28, 6);
                } else {
                    ctx.fillRect(40, 35, tagWidth, 28);
                }
                ctx.fill();

                ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(tagText, 55, 52);

                // Render elegant multi-line body text onto the banner
                ctx.fillStyle = '#ffffff';
                const cleanText = newContent.trim();
                ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';

                const words = cleanText.split(/\s+/);
                let line = '';
                const lines = [];
                const maxWidth = 720;
                const lineHeight = 36;

                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    let testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);

                const startY = 115;
                for (let i = 0; i < Math.min(lines.length, 3); i++) {
                    ctx.fillText(lines[i], 40, startY + (i * lineHeight));
                }

                // Small modern branding bottom-right
                ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillText('AzurLize Hub', 680, 215);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setPreviewBanner(dataUrl);
            }
        }, 150);

        return () => clearTimeout(timeoutId);
    }, [newContent, activeChannel]);

    const canPost = (channelId) => channelId === 'general' || ['Superadmin', 'Admin'].includes(authUser.role);
    const canPin = () => ['Superadmin', 'Admin'].includes(authUser.role);
    const canEdit = (p) => authUser.role === 'Superadmin' || (authUser.role === 'Admin' && p.author === authUser.name) || (authUser.role === 'Staff' && p.author === authUser.name);
    const canDelete = (p) => authUser.role === 'Superadmin' || (authUser.role === 'Admin' && (p.author === authUser.name || p.role === 'Staff')) || (authUser.role === 'Staff' && p.author === authUser.name);

    // Gaya Sesuai Role (Superadmin Merah, Admin Biru, Staff Oranye)
    const getRoleStyle = (role) => {
        const r = (role || 'staff').toLowerCase();
        if (r === 'superadmin') return { 
            avatarBg: 'bg-[#e73a4b]', 
            icon: 'ph-fill ph-crown text-[#e73a4b]', 
            badge: 'bg-[#e73a4b]/10 text-[#e73a4b] border-[#e73a4b]/20',
            textColor: 'text-[#e73a4b]'
        };
        if (r === 'admin') return { 
            avatarBg: 'bg-[#2563eb]', 
            icon: 'ph-fill ph-shield-check text-[#2563eb]', 
            badge: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20',
            textColor: 'text-[#2563eb]'
        };
        return { 
            avatarBg: 'bg-[#f59e0b]', 
            icon: 'ph-fill ph-user text-[#f59e0b]', 
            badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
            textColor: 'text-[#f59e0b]'
        };
    };

    const fetchPosts = async () => {
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'getAnnouncements' }) });
            const result = await response.json();
            if (result.status === 'success') {
                setPosts(prevPosts => {
                    const pendingPosts = prevPosts.filter(p => p.isPending || p.isDeleting);
                    const safeData = Array.isArray(result.data) ? result.data : [];
                    const fetchedIds = new Set(safeData.map(p => String(p.id)));
                    const remainingPending = pendingPosts.filter(p => !fetchedIds.has(String(p.id)) && p.isPending);
                    const mergedPosts = safeData.map(serverPost => {
                        const localPost = prevPosts.find(p => String(p.id) === String(serverPost.id));
                        if (localPost && localPost.isDeleting) return { ...serverPost, isDeleting: true };
                        if (localPost && localPost.isEditing) return { ...serverPost, isEditing: true, content: localPost.content };
                        if (localPost && localPost.comments) {
                            const pendingComments = localPost.comments.filter(c => c.isPending);
                            const fetchedCommentIds = new Set(serverPost.comments.map(c => String(c.id)));
                            const remainingPendingComments = pendingComments.filter(c => !fetchedCommentIds.has(String(c.id)));
                            return { ...serverPost, comments: [...serverPost.comments, ...remainingPendingComments] };
                        }
                        return serverPost;
                    });
                    const finalPosts = [...remainingPending, ...mergedPosts];
                    localStorage.setItem('recruitOps_announcements', JSON.stringify(finalPosts.filter(p => !p.isPending && !p.isDeleting)));
                    return finalPosts;
                });
            }
        } catch (error) { const saved = localStorage.getItem('recruitOps_announcements'); if (saved) setPosts(JSON.parse(saved)); }
    };

    useEffect(() => { 
        fetchPosts(); 
        const interval = setInterval(fetchPosts, 5000); 
        window.addEventListener('refreshActiveTab', fetchPosts);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshActiveTab', fetchPosts);
        };
    }, []);

    const currentPosts = posts.filter(p => p.channelId === activeChannel).sort((a, b) => {
        if(activeChannel === 'general') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); 
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); 
    });

    // Otomatis Menandai Pesan Terbaca
    useEffect(() => {
        if (currentPosts.length > 0) {
            const unreadIds = currentPosts.map(p => p.id).filter(id => !readPosts.includes(id));
            if (unreadIds.length > 0) {
                const updatedReads = [...readPosts, ...unreadIds];
                setReadPosts(updatedReads);
                localStorage.setItem(`recruitOps_read_${authUser.username}`, JSON.stringify(updatedReads));
            }
        }
        if (activeChannel === 'general' && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [currentPosts, activeChannel, authUser.username, readPosts]);

    const handlePost = async (e) => {
        e.preventDefault(); if (!newContent.trim()) return;
        const tempId = Date.now();
        const newPost = { 
            id: tempId, 
            channelId: activeChannel, 
            author: authUser.name, 
            role: authUser.role, 
            content: newContent, 
            timestamp: new Date().toISOString(), 
            likes: [], 
            comments: [], 
            pinned: false, 
            banner: previewBanner || null,
            isPending: true 
        };
        setPosts(prev => [...prev, newPost]); 
        setNewContent('');
        setPreviewBanner('');
        
        const newReads = [...readPosts, tempId];
        setReadPosts(newReads); localStorage.setItem(`recruitOps_read_${authUser.username}`, JSON.stringify(newReads));

        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addAnnouncement', ...newPost }) }); setPosts(prev => prev.map(p => p.id === tempId ? { ...p, isPending: false } : p)); } catch(err) {}
    };

    const handleToggleLike = async (postId) => {
        const post = posts.find(p => p.id === postId); if (!post) return;
        const newLikes = post.likes.includes(authUser.name) ? post.likes.filter(n => n !== authUser.name) : [...post.likes, authUser.name];
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updateAnnouncement', id: postId, likes: newLikes }) }); } catch(err) {}
    };

    const handleTogglePin = async (postId) => {
        const post = posts.find(p => p.id === postId); if (!post) return;
        const newPinned = !post.pinned; setPosts(posts.map(p => p.id === postId ? { ...p, pinned: newPinned } : p));
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updateAnnouncement', id: postId, pinned: newPinned }) }); } catch(err) {}
    };

    const handleDelete = async (postId) => {
        if (!window.confirm("Yakin hapus pesan ini?")) return;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isDeleting: true } : p));
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteAnnouncement', id: postId }) }); setPosts(prev => prev.filter(p => p.id !== postId)); } catch(err) { setPosts(prev => prev.map(p => p.id === postId ? { ...p, isDeleting: false } : p)); }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault(); if (!editContent.trim()) return;
        const postId = editingPost.id;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent, isEditing: true } : p)); setEditingPost(null); setEditContent('');
        try { await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updateAnnouncement', id: postId, content: editContent }) }); setPosts(prev => prev.map(p => p.id === postId ? { ...p, isEditing: false } : p)); } catch(err) { setPosts(prev => prev.map(p => p.id === postId ? { ...p, isEditing: false } : p)); }
    };

    const handleComment = async (e, postId) => {
        e.preventDefault(); const text = replyContent[postId]; if (!text || !text.trim()) return;
        const post = posts.find(p => p.id === postId); if (!post) return;
        const tempCommentId = Date.now();
        const newComment = { id: tempCommentId, author: authUser.name, role: authUser.role, content: text, timestamp: new Date().toISOString(), isPending: true };
        const newComments = [...post.comments, newComment];
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: newComments } : p)); setReplyContent({ ...replyContent, [postId]: '' });
        try {
            const payloadComments = newComments.map(c => { const { isPending, ...rest } = c; return rest; });
            await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updateAnnouncement', id: postId, comments: payloadComments }) });
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments.map(c => c.id === tempCommentId ? { ...c, isPending: false } : c) } : p));
        } catch(err) {}
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-'; const d = new Date(isoString); if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + formatToDDMMYYYY(isoString);
    };

    // =========================================================================
    // RENDER 1: PENGUMUMAN (Feed Post - Identik Dengan Gambar Pertama)
    // =========================================================================
    const renderFeedPost = (p) => {
        const style = getRoleStyle(p.role);
        return (
            <div key={p.id} className={`p-4 sm:p-5 mb-5 rounded-3xl border transition-all duration-300 relative group overflow-hidden ${p.pinned ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-md' : 'bg-white dark:bg-[#1a202c] border-gray-100 dark:border-gray-700/60 shadow-sm'} ${p.isPending || p.isDeleting || p.isEditing ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
                {p.pinned && <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center z-10"><i className="ph-fill ph-push-pin mr-1.5 text-sm"></i> Pinned</div>}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                    {/* Header Presisi Sesuai Screenshot */}
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 mt-1 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-sm shrink-0 border border-white/20 ${style.avatarBg}`}>
                            {p.author ? p.author.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex flex-col items-start gap-1.5">
                            <div className={`font-black text-sm sm:text-base flex items-center gap-1.5 ${style.textColor}`}>
                                <i className={`${style.icon} text-sm`}></i> {p.author || 'Unknown'} 
                            </div>
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${style.badge}`}>
                                {p.role}
                            </span>
                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5 flex items-center">
                                <i className="ph-bold ph-clock mr-1.5"></i> {formatTime(p.timestamp)}
                                {p.isPending && <span className="italic ml-2 flex items-center text-indigo-500"><i className="ph-bold ph-spinner ph-spin mr-1"></i> Mengirim...</span>}
                                {p.isDeleting && <span className="italic ml-2 flex items-center text-rose-500"><i className="ph-bold ph-spinner ph-spin mr-1"></i> Menghapus...</span>}
                                {p.isEditing && <span className="italic ml-2 flex items-center text-blue-500"><i className="ph-bold ph-spinner ph-spin mr-1"></i> Menyimpan...</span>}
                            </div>
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {canPin() && !p.isPending && !p.isDeleting && !p.isEditing && <button onClick={() => handleTogglePin(p.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${p.pinned ? 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/50 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}><i className="ph-bold ph-push-pin text-base"></i></button>}
                        {canEdit(p) && !p.isPending && !p.isDeleting && !p.isEditing && <button onClick={() => { setEditingPost(p); setEditContent(p.content); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><i className="ph-bold ph-pencil-simple text-base"></i></button>}
                        {canDelete(p) && !p.isPending && !p.isEditing && <button disabled={p.isDeleting} onClick={() => handleDelete(p.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${p.isDeleting ? 'bg-gray-50 border-gray-200 text-gray-300' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30'}`}><i className="ph-bold ph-trash text-base"></i></button>}
                    </div>
                </div>
                
                {/* Auto-Generated Banner */}
                {p.banner && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/60 shadow-sm relative z-10">
                        <img src={p.banner} alt="Post Banner" className="w-full h-auto object-cover max-h-[225px]" referrerPolicy="no-referrer" />
                    </div>
                )}
                
                {/* Konten Pesan */}
                {editingPost?.id === p.id ? (
                    <form onSubmit={handleEditSubmit} className="mt-2 mb-4 ml-0">
                        <textarea className="w-full p-4 border border-indigo-200 dark:border-indigo-800/50 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/20 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm" rows="3" value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus />
                        <div className="flex gap-2 mt-3 justify-end">
                            <button type="button" onClick={() => setEditingPost(null)} className="px-5 py-2 text-xs font-black text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors uppercase tracking-widest">Batal</button>
                            <button type="submit" className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm uppercase tracking-widest flex items-center"><i className="ph-bold ph-floppy-disk mr-1.5"></i> Simpan</button>
                        </div>
                    </form>
                ) : (
                    <div className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed mb-5 ml-0 relative z-10">
                        {p.content}
                    </div>
                )}
                
                {/* Footer Interaksi */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-gray-700/50 ml-0">
                    <button disabled={p.isPending || p.isDeleting || p.isEditing} onClick={() => handleToggleLike(p.id)} className={`flex items-center gap-1.5 text-xs font-black transition-all ${p.likes.includes(authUser.name) ? 'text-rose-500 scale-105' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'} disabled:opacity-50`}><i className={`${p.likes.includes(authUser.name) ? 'ph-fill' : 'ph-bold'} ph-heart text-xl`}></i> {p.likes.length > 0 ? p.likes.length : 'Suka'}</button>
                    <span className="text-xs text-gray-400 font-black flex items-center gap-1.5"><i className="ph-bold ph-chat-circle text-xl"></i> {p.comments.length} Komentar</span>
                </div>
                
                {/* Daftar Komentar */}
                {p.comments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700/50 space-y-3 ml-0">
                        {p.comments.map(c => {
                            const cStyle = getRoleStyle(c.role);
                            return (
                                <div key={c.id} className={`flex gap-3 bg-gray-50/80 dark:bg-gray-800/50 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/30 ${c.isPending ? 'opacity-60 grayscale-[30%]' : ''}`}>
                                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm ${cStyle.avatarBg}`}>{c.author ? c.author.charAt(0).toUpperCase() : '?'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                                            <span className={`font-black text-xs flex items-center gap-1.5 truncate ${cStyle.textColor}`}>
                                                <i className={`${cStyle.icon} text-[10px]`}></i> {c.author || 'Unknown'}
                                            </span>
                                            <span className="text-[9px] font-bold text-gray-400 flex items-center mt-1 sm:mt-0">
                                                {c.isPending && <i className="ph-bold ph-spinner ph-spin mr-1 text-indigo-500"></i>}{formatTime(c.timestamp)}
                                            </span>
                                        </div>
                                        <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">{c.content}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Form Balasan */}
                <form onSubmit={(e) => handleComment(e, p.id)} className="mt-4 ml-0 flex gap-2 relative">
                    <input type="text" disabled={p.isPending || p.isDeleting || p.isEditing} placeholder={p.isPending || p.isDeleting || p.isEditing ? "Harap tunggu..." : "Tulis balasan komentar..."} value={replyContent[p.id] || ''} onChange={e => setReplyContent({...replyContent, [p.id]: e.target.value})} className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:opacity-50" />
                    <button type="submit" disabled={!replyContent[p.id] || p.isPending || p.isDeleting || p.isEditing} className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm shrink-0"><i className="ph-bold ph-paper-plane-right text-lg"></i></button>
                </form>
            </div>
        );
    };

    // =========================================================================
    // RENDER 2: CHAT BUBBLE (General Discussion - Anti Berantakan/Pecah)
    // =========================================================================
    const renderChatMessage = (p) => {
        const isMe = p.author === authUser.name;
        const style = getRoleStyle(p.role);
        return (
            <div key={p.id} className={`flex w-full mb-6 ${isMe ? 'justify-end' : 'justify-start'} group transition-all duration-300 ${p.isPending || p.isDeleting || p.isEditing ? 'opacity-60 grayscale-[30%]' : ''}`}>
                
                {/* Kontainer Utama Chat Kiri / Kanan */}
                <div className={`flex max-w-[90%] md:max-w-[75%] gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar di Pojok Bawah */}
                    <div className="flex flex-col justify-end pb-1 shrink-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-sm border border-white/10 ${style.avatarBg}`}>
                            {p.author ? p.author.charAt(0).toUpperCase() : '?'}
                        </div>
                    </div>

                    {/* Kolom Teks & Info */}
                    <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                        
                        {/* Header: Nama & Waktu */}
                        <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className={`font-black text-[11px] sm:text-xs flex items-center gap-1 ${style.textColor}`}>
                                {!isMe && <i className={`${style.icon} text-[10px]`}></i>}
                                {p.author || 'Unknown'}
                                {isMe && <i className={`${style.icon} text-[10px]`}></i>}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 flex items-center">
                                {p.isPending && <i className="ph-bold ph-spinner ph-spin mr-1 text-indigo-400"></i>}
                                {p.isDeleting && <i className="ph-bold ph-spinner ph-spin mr-1 text-rose-400"></i>}
                                {p.isEditing && <i className="ph-bold ph-spinner ph-spin mr-1 text-blue-400"></i>}
                                {formatTime(p.timestamp)}
                            </span>
                        </div>

                        {/* Bubble Chat Utama */}
                        <div className={`px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed shadow-sm relative break-words w-full ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-[#1a202c] border border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 rounded-bl-sm'}`}>
                            {editingPost?.id === p.id ? (
                                <form onSubmit={handleEditSubmit} className="min-w-[200px] sm:min-w-[300px]">
                                    <textarea className={`w-full p-3 border rounded-xl outline-none focus:ring-2 resize-none text-xs sm:text-sm font-medium custom-scrollbar ${isMe ? 'bg-indigo-500 border-indigo-400 text-white placeholder-indigo-300 focus:ring-white/50' : 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-indigo-500'}`} rows="2" value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus />
                                    <div className="flex gap-2 mt-2 justify-end">
                                        <button type="button" onClick={() => setEditingPost(null)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg ${isMe ? 'text-indigo-200 hover:bg-indigo-700' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'}`}>Batal</button>
                                        <button type="submit" className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg ${isMe ? 'bg-white text-indigo-600 hover:bg-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>Simpan</button>
                                    </div>
                                </form>
                            ) : p.content}
                        </div>

                        {/* Aksi Bawah Chat (Suka, Edit, Hapus) */}
                        <div className={`flex items-center gap-1.5 mt-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <button disabled={p.isPending || p.isDeleting || p.isEditing} onClick={() => handleToggleLike(p.id)} className={`text-[10px] font-black flex items-center gap-1 px-1.5 py-1 rounded ${p.likes.includes(authUser.name) ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'} disabled:opacity-50`}><i className={`${p.likes.includes(authUser.name) ? 'ph-fill' : 'ph-bold'} ph-heart text-sm`}></i> {p.likes.length > 0 && p.likes.length}</button>
                            {canEdit(p) && !p.isPending && !p.isDeleting && !p.isEditing && <button onClick={() => { setEditingPost(p); setEditContent(p.content); }} className="text-[10px] font-bold text-blue-400 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 w-6 h-6 rounded-md flex items-center justify-center transition-colors"><i className="ph-bold ph-pencil-simple text-sm"></i></button>}
                            {canDelete(p) && !p.isPending && !p.isEditing && <button disabled={p.isDeleting} onClick={() => handleDelete(p.id)} className={`text-[10px] font-bold w-6 h-6 rounded-md flex items-center justify-center transition-colors ${p.isDeleting ? 'text-gray-300' : 'text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100'}`}><i className="ph-bold ph-trash text-sm"></i></button>}
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    const activeChannelInfo = ANNOUNCEMENT_CHANNELS.find(c => c.id === activeChannel);

    return (
        <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[24px] shadow-sm border border-gray-200/80 dark:border-gray-800/80 overflow-hidden relative animate-in fade-in duration-500">
            
            {/* MOBILE: Horizontal Scroll Tabs (Pill Menu) */}
            <div className="lg:hidden flex overflow-x-auto hide-scrollbar bg-gray-50/90 dark:bg-gray-900/90 border-b border-gray-200/80 dark:border-gray-800/80 p-2.5 gap-2 shrink-0 snap-x z-20">
                {ANNOUNCEMENT_CHANNELS.map(c => {
                    const unreadCount = posts.filter(p => p.channelId === c.id && !readPosts.includes(p.id)).length; 
                    const isActive = activeChannel === c.id;
                    return (
                        <button key={c.id} onClick={() => setActiveChannel(c.id)} className={`flex items-center whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-black transition-all duration-300 snap-center relative border shadow-sm ${isActive ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200/80 dark:border-gray-700/80 transform scale-[1.02]' : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-800'}`}>
                            <i className={`ph-fill ${c.icon} mr-2 text-base text-${c.color}-500 drop-shadow-sm`}></i> {c.name}
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse border border-white dark:border-gray-900">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                        </button>
                    )
                })}
            </div>

            {/* TABLET & LAPTOP: Vertical Sidebar */}
            <div className="hidden lg:flex w-64 lg:w-72 h-full bg-gray-50/90 dark:bg-[#111827]/90 border-r border-gray-200/80 dark:border-gray-800/80 flex-col shrink-0 z-20">
                <div className="h-16 px-6 border-b border-gray-200/80 dark:border-gray-800/80 flex items-center bg-white/50 dark:bg-gray-900/50 shrink-0">
                    <h2 className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center">
                        <i className="ph-bold ph-hash mr-2 text-lg"></i> Channels
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {ANNOUNCEMENT_CHANNELS.map(c => {
                        const unreadCount = posts.filter(p => p.channelId === c.id && !readPosts.includes(p.id)).length; 
                        const isActive = activeChannel === c.id;
                        return (
                            <button key={c.id} onClick={() => setActiveChannel(c.id)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-black transition-all group overflow-hidden relative border ${isActive ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border-gray-200/80 dark:border-gray-700/80' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'}`}>
                                {isActive && <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${c.grad}`}></div>}
                                <div className="flex items-center">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-3.5 transition-colors shadow-inner ${isActive ? `bg-${c.color}-50 dark:bg-${c.color}-900/30 text-${c.color}-500` : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                                        <i className={`ph-fill ${c.icon} text-lg`}></i> 
                                    </div>
                                    {c.name}
                                </div>
                                {unreadCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* AREA KONTEN (Feed & Chat) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white/50 dark:bg-gray-900/30 relative">
                
                {/* Header Channel Aktif */}
                <div className="h-14 sm:h-16 bg-white/90 dark:bg-[#1a202c]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 flex items-center px-4 sm:px-6 shrink-0 z-10 shadow-sm">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${activeChannelInfo.grad} flex items-center justify-center text-white shadow-sm mr-3`}>
                        <i className={`ph-bold ${activeChannelInfo.icon} text-lg sm:text-xl`}></i>
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white text-sm sm:text-base leading-tight">{activeChannelInfo.name}</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Channel Komunikasi</p>
                    </div>
                    {activeChannel === 'rules' && <span className="ml-auto text-[9px] sm:text-[10px] bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800/50 px-2 sm:px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm flex items-center"><i className="ph-bold ph-warning mr-1"></i> Wajib Baca</span>}
                </div>

                {/* Kontainer Pesan */}
                <div className={`flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative ${activeChannel === 'general' ? 'bg-[#F8FAFC] dark:bg-[#0f1219] bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] bg-blend-multiply dark:bg-blend-overlay opacity-90 dark:opacity-80' : 'bg-[#F8FAFC] dark:bg-gray-900/50'}`}>
                    {currentPosts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                                <i className={`ph-fill ${activeChannelInfo.icon} text-5xl opacity-50`}></i>
                            </div>
                            <p className="font-bold text-sm">Belum ada aktivitas di channel ini.</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {activeChannel === 'general' ? currentPosts.map(renderChatMessage) : currentPosts.map(renderFeedPost)}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Area Input / Mengetik */}
                {canPost(activeChannel) ? (
                    <div className="p-3 sm:p-4 bg-white/95 dark:bg-[#1a202c]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800/80 shrink-0 z-10 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                        <form onSubmit={handlePost} className="max-w-4xl mx-auto relative">
                            {activeChannel === 'general' ? (
                                <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-inner">
                                    <textarea rows="1" placeholder="Ketik pesan..." value={newContent} onChange={e => setNewContent(e.target.value)} className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-sm font-medium resize-none min-h-[44px] max-h-[120px] custom-scrollbar text-gray-800 dark:text-gray-100 placeholder-gray-400" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }} />
                                    <button type="submit" disabled={!newContent.trim()} className="w-11 h-11 flex items-center justify-center bg-indigo-600 text-white rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm shrink-0"><i className="ph-bold ph-paper-plane-right text-xl"></i></button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 rounded-2xl p-3 sm:p-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-inner">
                                    <textarea rows="3" placeholder={`Ketik pengumuman baru di #${activeChannelInfo.name}...`} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-transparent border-none outline-none resize-none text-sm font-medium custom-scrollbar mb-2 text-gray-800 dark:text-gray-100 placeholder-gray-400"></textarea>
                                    
                                    {/* Live Auto-Generated Banner Preview */}
                                    {previewBanner && (
                                        <div className="mb-4 p-2 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-inner max-w-full">
                                            <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest px-1">
                                                <i className="ph-fill ph-sparkle text-xs animate-spin" style={{ animationDuration: '3s' }}></i> Auto-Generated Post Banner
                                            </div>
                                            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/40">
                                                <img src={previewBanner} alt="Banner Preview" className="w-full h-auto object-cover max-h-[140px]" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700/80">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white ${getRoleStyle(authUser.role).avatarBg}`}>{authUser.name.charAt(0).toUpperCase()}</div>
                                            <div className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest hidden sm:block">Memposting sbg <span className={getRoleStyle(authUser.role).textColor}>{authUser.role}</span></div>
                                        </div>
                                        <button type="submit" disabled={!newContent.trim()} className="px-4 sm:px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-sm"><i className="ph-bold ph-paper-plane-right mr-1 sm:mr-2 text-sm sm:text-base"></i> <span className="hidden sm:inline">Kirim</span></button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-200/80 dark:border-gray-800/80 text-center text-[10px] sm:text-xs text-gray-500 font-black uppercase tracking-widest shrink-0">
                        <i className="ph-bold ph-lock-key mr-1.5 text-sm"></i> Hanya Admin yang dapat memposting di channel ini.
                    </div>
                )}
            </div>
        </div>
    );
};
