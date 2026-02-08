import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Layout, Settings, LogOut, Trash2, Edit, Plus, Save, Database, 
  RefreshCw, Link, Bot, Star, List, TrendingUp, Award, Bell, Film, Download, ExternalLink,
  ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, 
  query, orderBy, writeBatch, setDoc, getDoc, deleteField 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Movie, Episode, AppSettings } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Content Management State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Basic Movie Info
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exclusive');
  const [thumbnail, setThumbnail] = useState('');
  const [year, setYear] = useState('2025');
  const [rating, setRating] = useState('9.0');
  const [quality, setQuality] = useState('4K HDR');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [initialViews, setInitialViews] = useState('1.2M');
  
  // Watch/Download Links
  const [telegramCode, setTelegramCode] = useState('');
  const [downloadCode, setDownloadCode] = useState('');
  const [downloadLink, setDownloadLink] = useState('');
  
  // Premium Features
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(1);
  const [isTop10, setIsTop10] = useState(false);
  const [top10Position, setTop10Position] = useState(1);
  const [priority, setPriority] = useState(0);
  
  // Episode Management
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  
  // New Episode Fields
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpSeason, setNewEpSeason] = useState('1');
  const [newEpNumber, setNewEpNumber] = useState('');
  const [newEpDuration, setNewEpDuration] = useState('');
  const [newEpCode, setNewEpCode] = useState('');
  const [newEpDownloadCode, setNewEpDownloadCode] = useState('');
  const [newEpDownloadLink, setNewEpDownloadLink] = useState('');
  
  // List State
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // App Settings State
  const [botUsername, setBotUsername] = useState('');
  const [channelLink, setChannelLink] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [enableTop10, setEnableTop10] = useState(true);
  const [enableBanners, setEnableBanners] = useState(true);

  // UI State
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    download: false,
    premium: false,
    episodes: false
  });

  // Categories (Fixed - No Management Needed)
  const FIXED_CATEGORIES = ['Exclusive', 'Korean Drama', 'Series'];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchMovies();
        fetchSettings();
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Movies
  const fetchMovies = async () => {
    try {
      const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const movies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Movie[];
      setMovieList(movies);
    } catch (err) {
      console.error('Error fetching movies:', err);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'config'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setBotUsername(data.botUsername || '');
        setChannelLink(data.channelLink || '');
        setNoticeText(data.noticeText || '');
        setNoticeEnabled(data.noticeEnabled !== false);
        setEnableTop10(data.enableTop10 !== false);
        setEnableBanners(data.enableBanners !== false);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Filter Movies
  useEffect(() => {
    let filtered = movieList;
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory !== 'All') {
      filtered = filtered.filter(m => m.category === filterCategory);
    }
    
    setFilteredMovies(filtered);
  }, [searchTerm, filterCategory, movieList]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showSuccess('লগইন সফল হয়েছে! 🎉');
    } catch (err: any) {
      setError('ইমেইল বা পাসওয়ার্ড ভুল আছে');
    }
    setLoading(false);
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  // Show Success Message
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Toggle Section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ==================== EPISODE MANAGEMENT ====================
  
  // Add or Update Episode
  const handleAddOrUpdateEpisode = () => {
    // Validation
    if (!newEpTitle.trim()) {
      alert('⚠️ Episode Title দিতে হবে!');
      return;
    }
    
    if (!newEpCode.trim()) {
      alert('⚠️ Watch Telegram Code দিতে হবে!');
      return;
    }
    
    if (!newEpDuration.trim()) {
      alert('⚠️ Duration দিতে হবে!');
      return;
    }

    const seasonNum = parseInt(newEpSeason) || 1;
    
    // Auto-calculate episode number if not provided
    let epNumber = parseInt(newEpNumber) || 0;
    if (epNumber === 0 && !editingEpisodeId) {
      const episodesInSeason = episodes.filter(e => e.season === seasonNum);
      epNumber = episodesInSeason.length + 1;
    }

    if (editingEpisodeId) {
      // Update existing episode
      setEpisodes(episodes.map(ep => 
        ep.id === editingEpisodeId
          ? {
              ...ep,
              season: seasonNum,
              number: epNumber,
              title: newEpTitle,
              duration: newEpDuration,
              telegramCode: newEpCode,
              downloadCode: newEpDownloadCode || undefined,
              downloadLink: newEpDownloadLink || undefined
            }
          : ep
      ));
      showSuccess(`✅ Episode ${epNumber} আপডেট হয়েছে!`);
      setEditingEpisodeId(null);
    } else {
      // Add new episode
      const newEp: Episode = {
        id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        season: seasonNum,
        number: epNumber,
        title: newEpTitle,
        duration: newEpDuration,
        telegramCode: newEpCode,
        downloadCode: newEpDownloadCode || undefined,
        downloadLink: newEpDownloadLink || undefined
      };
      setEpisodes([...episodes, newEp]);
      showSuccess(`✅ Episode ${epNumber} যোগ হয়েছে!`);
    }
    
    // Clear form
    clearEpisodeForm();
  };

  // Edit Episode
  const handleEditEpisode = (ep: Episode) => {
    setNewEpTitle(ep.title);
    setNewEpSeason(ep.season.toString());
    setNewEpNumber(ep.number.toString());
    setNewEpDuration(ep.duration);
    setNewEpCode(ep.telegramCode);
    setNewEpDownloadCode(ep.downloadCode || '');
    setNewEpDownloadLink(ep.downloadLink || '');
    setEditingEpisodeId(ep.id);
    
    // Scroll to episode form
    document.getElementById('episode-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Delete Episode
  const handleDeleteEpisode = (id: string) => {
    if (confirm('এই Episode মুছে ফেলবেন?')) {
      setEpisodes(episodes.filter(ep => ep.id !== id));
      if (editingEpisodeId === id) {
        clearEpisodeForm();
      }
      showSuccess('Episode মুছে ফেলা হয়েছে!');
    }
  };

  // Clear Episode Form
  const clearEpisodeForm = () => {
    setNewEpTitle('');
    setNewEpNumber('');
    setNewEpDuration('');
    setNewEpCode('');
    setNewEpDownloadCode('');
    setNewEpDownloadLink('');
    setEditingEpisodeId(null);
  };

  // ==================== MOVIE MANAGEMENT ====================
  
  // Reset Form
  const resetForm = () => {
    setTitle('');
    setCategory('Exclusive');
    setThumbnail('');
    setTelegramCode('');
    setDownloadCode('');
    setDownloadLink('');
    setYear('2025');
    setRating('9.0');
    setQuality('4K HDR');
    setDescription('');
    setEpisodes([]);
    setIsPremium(false);
    setInitialViews('1.2M');
    setIsFeatured(false);
    setFeaturedOrder(1);
    setIsTop10(false);
    setTop10Position(1);
    setPriority(0);
    setIsEditing(false);
    setEditId(null);
    clearEpisodeForm();
    
    // Collapse all sections except basic
    setExpandedSections({
      basic: true,
      download: false,
      premium: false,
      episodes: false
    });
  };

  // Publish or Update Movie
  const handlePublish = async () => {
    // Validation
    if (!title.trim()) {
      alert('⚠️ Title দিতে হবে!');
      return;
    }

    if (!thumbnail.trim()) {
      alert('⚠️ Thumbnail URL দিতে হবে!');
      return;
    }

    if (!telegramCode.trim()) {
      alert('⚠️ Watch/Stream Telegram Code দিতে হবে!');
      return;
    }

    // URL validation for external links
    if (downloadLink && !downloadLink.startsWith('http')) {
      alert('⚠️ Download link সঠিক নয়! https:// দিয়ে শুরু করতে হবে।');
      return;
    }

    setLoading(true);
    try {
      // Prepare movie data
      const movieData: any = {
        title: title.trim(),
        thumbnail: thumbnail.trim(),
        category,
        telegramCode: telegramCode.trim(),
        rating: parseFloat(rating) || 9.0,
        views: initialViews,
        year,
        quality,
        description: description.trim(),
        isPremium,
        isFeatured,
        isTop10,
        priority,
        createdAt: isEditing ? undefined : serverTimestamp()
      };

      // Add download options if provided
      if (downloadCode.trim()) {
        movieData.downloadCode = downloadCode.trim();
      }
      if (downloadLink.trim()) {
        movieData.downloadLink = downloadLink.trim();
      }

      // Add episodes if any
      if (episodes.length > 0) {
        // Sort episodes properly
        const sortedEpisodes = [...episodes].sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.number - b.number;
        });
        movieData.episodes = sortedEpisodes;
      }
      
      // Add premium feature positions
      if (isFeatured) {
        movieData.featuredOrder = featuredOrder;
      }
      
      if (isTop10) {
        movieData.top10Position = top10Position;
      }

      if (isEditing && editId) {
        // Update existing movie
        const updateData: any = { ...movieData };
        delete updateData.createdAt; // Don't update createdAt
        
        // Remove undefined fields properly using deleteField()
        const fieldsToCheck = [
          'downloadCode',
          'downloadLink',
          'episodes',
          'featuredOrder',
          'top10Position'
        ];
        
        fieldsToCheck.forEach(field => {
          if (!updateData[field] || 
              (Array.isArray(updateData[field]) && updateData[field].length === 0)) {
            updateData[field] = deleteField();
          }
        });
        
        await updateDoc(doc(db, 'movies', editId), updateData);
        showSuccess('✅ Movie আপডেট সফল হয়েছে!');
      } else {
        // Add new movie
        await addDoc(collection(db, 'movies'), movieData);
        showSuccess('🚀 Movie পাবলিশ সফল হয়েছে!');
      }

      resetForm();
      fetchMovies();
    } catch (err: any) {
      console.error('Error publishing:', err);
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  // Edit Movie
  const handleEdit = (movie: Movie) => {
    setTitle(movie.title);
    setCategory(movie.category);
    setThumbnail(movie.thumbnail);
    setTelegramCode(movie.telegramCode || '');
    setDownloadCode(movie.downloadCode || '');
    setDownloadLink(movie.downloadLink || '');
    setYear(movie.year || '2025');
    setRating(movie.rating?.toString() || '9.0');
    setQuality(movie.quality || '4K HDR');
    setDescription(movie.description || '');
    setIsPremium(movie.isPremium || false);
    setInitialViews(movie.views || '1.2M');
    
    // Premium features
    setIsFeatured(movie.isFeatured || false);
    setFeaturedOrder(movie.featuredOrder || 1);
    setIsTop10(movie.isTop10 || false);
    setTop10Position(movie.top10Position || 1);
    setPriority(movie.priority || 0);
    
    // Episodes - Sort them properly
    if (movie.episodes && movie.episodes.length > 0) {
      const sortedEps = [...movie.episodes].sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return a.number - b.number;
      });
      setEpisodes(sortedEps);
    } else {
      setEpisodes([]);
    }
    
    setIsEditing(true);
    setEditId(movie.id);
    setActiveTab('upload');
    
    // Expand necessary sections
    setExpandedSections({
      basic: true,
      download: !!(movie.downloadCode || movie.downloadLink),
      premium: !!(movie.isFeatured || movie.isTop10),
      episodes: !!movie.episodes && movie.episodes.length > 0
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Movie
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" মুছে ফেলতে চান?`)) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'movies', id));
      showSuccess('✅ মুছে ফেলা হয়েছে!');
      fetchMovies();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  // ==================== SETTINGS MANAGEMENT ====================
  
  const handleSaveSettings = async () => {
    if (!botUsername.trim()) {
      alert('⚠️ Bot Username দিতে হবে!');
      return;
    }
    
    if (!channelLink.trim()) {
      alert('⚠️ Channel Link দিতে হবে!');
      return;
    }

    setLoading(true);
    try {
      const settingsData: AppSettings = {
        botUsername: botUsername.trim(),
        channelLink: channelLink.trim(),
        noticeText: noticeText.trim() || 'Welcome to CINEFLIX!',
        noticeEnabled,
        enableTop10,
        enableBanners,
        categories: FIXED_CATEGORIES
      };

      await setDoc(doc(db, 'settings', 'config'), settingsData);
      showSuccess('✅ Settings সেভ হয়েছে!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  // ==================== RENDER ====================

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gold mb-2">ADMIN LOGIN</h1>
            <p className="text-sm text-gray-400">CINEFLIX Control Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50"
            >
              {loading ? 'লগইন করছি...' : 'লগইন করুন'}
            </button>
          </form>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="bg-[#111] border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gold">ADMIN PANEL</h1>
          <p className="text-xs text-gray-500">CINEFLIX Control Center</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500/20 transition-all text-sm font-bold"
          >
            <LogOut size={16} />
            Logout
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[250] bg-green-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl"
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="bg-[#0a0a0a] border-b border-white/5 px-4 flex gap-2 overflow-x-auto">
        {[
          { id: 'upload', label: 'Upload/Edit', icon: Upload },
          { id: 'list', label: 'All Content', icon: List },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-gold border-gold'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* UPLOAD/EDIT TAB */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Film size={20} className="text-gold" />
                {isEditing ? 'Edit Movie/Series' : 'Upload New Content'}
              </h2>

              {/* Basic Information */}
              <div className="space-y-4">
                <SectionHeader 
                  title="Basic Information" 
                  isExpanded={expandedSections.basic}
                  onToggle={() => toggleSection('basic')}
                  required
                />
                
                {expandedSections.basic && (
                  <div className="space-y-3 pl-4 border-l-2 border-gold/20">
                    <InputField
                      label="Title"
                      value={title}
                      onChange={setTitle}
                      placeholder="Avengers: Endgame"
                      required
                    />

                    <SelectField
                      label="Category"
                      value={category}
                      onChange={setCategory}
                      options={FIXED_CATEGORIES}
                      required
                    />

                    <InputField
                      label="Thumbnail URL"
                      value={thumbnail}
                      onChange={setThumbnail}
                      placeholder="https://..."
                      required
                    />

                    <InputField
                      label="Watch/Stream Telegram Code"
                      value={telegramCode}
                      onChange={setTelegramCode}
                      placeholder="avengers_endgame_2024"
                      required
                      helperText="Bot এ stream করার জন্য code"
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <InputField
                        label="Year"
                        value={year}
                        onChange={setYear}
                        placeholder="2025"
                      />
                      <InputField
                        label="Rating"
                        value={rating}
                        onChange={setRating}
                        placeholder="9.5"
                      />
                      <InputField
                        label="Quality"
                        value={quality}
                        onChange={setQuality}
                        placeholder="4K HDR"
                      />
                    </div>

                    <InputField
                      label="Description"
                      value={description}
                      onChange={setDescription}
                      placeholder="Movie এর বর্ণনা..."
                      multiline
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Initial Views"
                        value={initialViews}
                        onChange={setInitialViews}
                        placeholder="1.2M"
                      />
                      <CheckboxField
                        label="Premium Content"
                        checked={isPremium}
                        onChange={setIsPremium}
                      />
                    </div>
                  </div>
                )}

                {/* Download Options */}
                <SectionHeader 
                  title="Download Options (Optional)" 
                  isExpanded={expandedSections.download}
                  onToggle={() => toggleSection('download')}
                  icon={Download}
                />
                
                {expandedSections.download && (
                  <div className="space-y-3 pl-4 border-l-2 border-green-500/20">
                    <InputField
                      label="Download Telegram Code"
                      value={downloadCode}
                      onChange={setDownloadCode}
                      placeholder="download_avengers_2024"
                      helperText="আলাদা download code (optional)"
                    />

                    <InputField
                      label="Download Link (External)"
                      value={downloadLink}
                      onChange={setDownloadLink}
                      placeholder="https://drive.google.com/..."
                      helperText="Google Drive, Mega ইত্যাদি link (optional)"
                    />
                  </div>
                )}

                {/* Premium Features */}
                <SectionHeader 
                  title="Premium Features" 
                  isExpanded={expandedSections.premium}
                  onToggle={() => toggleSection('premium')}
                  icon={Star}
                />
                
                {expandedSections.premium && (
                  <div className="space-y-3 pl-4 border-l-2 border-purple-500/20">
                    <div className="grid grid-cols-2 gap-3">
                      <CheckboxField
                        label="Featured (Banner)"
                        checked={isFeatured}
                        onChange={setIsFeatured}
                      />
                      {isFeatured && (
                        <InputField
                          label="Banner Position"
                          value={featuredOrder.toString()}
                          onChange={(v) => setFeaturedOrder(parseInt(v) || 1)}
                          placeholder="1"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <CheckboxField
                        label="Top 10"
                        checked={isTop10}
                        onChange={setIsTop10}
                      />
                      {isTop10 && (
                        <InputField
                          label="Top 10 Position (1-10)"
                          value={top10Position.toString()}
                          onChange={(v) => setTop10Position(Math.min(10, Math.max(1, parseInt(v) || 1)))}
                          placeholder="1"
                        />
                      )}
                    </div>

                    <InputField
                      label="Priority (Higher = First)"
                      value={priority.toString()}
                      onChange={(v) => setPriority(parseInt(v) || 0)}
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Episodes */}
                <SectionHeader 
                  title="Episode Management (For Series)" 
                  isExpanded={expandedSections.episodes}
                  onToggle={() => toggleSection('episodes')}
                  icon={Layout}
                />
                
                {expandedSections.episodes && (
                  <div className="space-y-4 pl-4 border-l-2 border-blue-500/20">
                    {/* Episode Form */}
                    <div id="episode-form" className="bg-black/30 border border-white/5 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">
                          {editingEpisodeId ? '📝 Edit Episode' : '➕ Add Episode'}
                        </h4>
                        {editingEpisodeId && (
                          <button
                            onClick={clearEpisodeForm}
                            className="text-xs text-gray-500 hover:text-white"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <InputField
                          label="Season"
                          value={newEpSeason}
                          onChange={setNewEpSeason}
                          placeholder="1"
                          small
                        />
                        <InputField
                          label="Episode #"
                          value={newEpNumber}
                          onChange={setNewEpNumber}
                          placeholder="Auto"
                          small
                        />
                        <InputField
                          label="Duration"
                          value={newEpDuration}
                          onChange={setNewEpDuration}
                          placeholder="45m"
                          small
                          required
                        />
                      </div>

                      <InputField
                        label="Episode Title"
                        value={newEpTitle}
                        onChange={setNewEpTitle}
                        placeholder="The Beginning"
                        required
                        small
                      />

                      <InputField
                        label="Watch Telegram Code"
                        value={newEpCode}
                        onChange={setNewEpCode}
                        placeholder="s1e1_code"
                        required
                        small
                      />

                      <InputField
                        label="Download Code (Optional)"
                        value={newEpDownloadCode}
                        onChange={setNewEpDownloadCode}
                        placeholder="download_s1e1"
                        small
                      />

                      <InputField
                        label="Download Link (Optional)"
                        value={newEpDownloadLink}
                        onChange={setNewEpDownloadLink}
                        placeholder="https://..."
                        small
                      />

                      <button
                        onClick={handleAddOrUpdateEpisode}
                        className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        {editingEpisodeId ? 'Update Episode' : 'Add Episode'}
                      </button>
                    </div>

                    {/* Episodes List */}
                    {episodes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase">
                          Episodes ({episodes.length})
                        </h4>
                        {episodes
                          .sort((a, b) => {
                            if (a.season !== b.season) return a.season - b.season;
                            return a.number - b.number;
                          })
                          .map(ep => (
                            <div
                              key={ep.id}
                              className="bg-black/30 border border-white/5 rounded-lg p-3 flex items-center justify-between hover:border-gold/30 transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-gold">
                                    S{ep.season}E{ep.number}
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {ep.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{ep.duration}</span>
                                  <span>•</span>
                                  <span>Watch: {ep.telegramCode}</span>
                                  {(ep.downloadCode || ep.downloadLink) && (
                                    <>
                                      <span>•</span>
                                      <span className="text-green-400">Download Available</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditEpisode(ep)}
                                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Edit size={14} className="text-blue-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEpisode(ep.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={14} className="text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="flex-1 bg-gray-500/10 border border-gray-500/20 text-gray-400 font-bold py-3 rounded-lg hover:bg-gray-500/20 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="flex-1 bg-gold text-black font-bold py-3 rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Processing...' : isEditing ? 'Update Movie' : 'Publish Movie'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Database size={20} className="text-gold" />
                  All Content ({movieList.length})
                </h2>
                <button
                  onClick={fetchMovies}
                  className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-lg text-gold hover:bg-gold/20 transition-all text-sm font-bold"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title..."
                  className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-gold"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-gold"
                >
                  <option value="All">All Categories</option>
                  {FIXED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Movies List */}
            <div className="space-y-2">
              {filteredMovies.length === 0 ? (
                <div className="bg-[#111] border border-white/10 rounded-xl p-12 text-center">
                  <p className="text-gray-500 text-sm">No movies found</p>
                </div>
              ) : (
                filteredMovies.map(movie => (
                  <div
                    key={movie.id}
                    className="bg-[#111] border border-white/10 rounded-xl p-4 hover:border-gold/30 transition-all"
                  >
                    <div className="flex gap-4">
                      <img
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="w-20 h-28 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-base font-bold text-white mb-1">
                              {movie.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="px-2 py-0.5 bg-gold/10 text-gold rounded">
                                {movie.category}
                              </span>
                              <span>{movie.year}</span>
                              <span>•</span>
                              <span>⭐ {movie.rating}</span>
                              {movie.isPremium && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-400">Premium</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(movie)}
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit size={16} className="text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(movie.id, movie.title)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-400" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          {movie.isFeatured && (
                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20">
                              📺 Featured #{movie.featuredOrder}
                            </span>
                          )}
                          {movie.isTop10 && (
                            <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                              🏆 Top #{movie.top10Position}
                            </span>
                          )}
                          {movie.episodes && movie.episodes.length > 0 && (
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                              📺 {movie.episodes.length} Episodes
                            </span>
                          )}
                          {(movie.downloadCode || movie.downloadLink) && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                              ⬇ Download Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <Settings size={20} className="text-gold" />
                App Settings
              </h2>

              <div className="space-y-4">
                <InputField
                  label="Bot Username"
                  value={botUsername}
                  onChange={setBotUsername}
                  placeholder="your_bot_username"
                  icon={Bot}
                  required
                  helperText="@ ছাড়া শুধু username"
                />

                <InputField
                  label="Telegram Channel Link"
                  value={channelLink}
                  onChange={setChannelLink}
                  placeholder="https://t.me/your_channel"
                  icon={Link}
                  required
                />

                <InputField
                  label="Notice Text"
                  value={noticeText}
                  onChange={setNoticeText}
                  placeholder="Welcome to CINEFLIX!"
                  icon={Bell}
                  multiline
                  helperText="এই text notice bar এ marquee হবে"
                />

                <CheckboxField
                  label="Enable Notice Bar"
                  checked={noticeEnabled}
                  onChange={setNoticeEnabled}
                  helperText="Notice bar দেখাবে কিনা"
                />

                <CheckboxField
                  label="Enable Top 10 Section"
                  checked={enableTop10}
                  onChange={setEnableTop10}
                  helperText="Top 10 movies section দেখাবে কিনা"
                />

                <CheckboxField
                  label="Enable Banners"
                  checked={enableBanners}
                  onChange={setEnableBanners}
                  helperText="Main banner carousel দেখাবে কিনা"
                />

                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Categories (Fixed)</h3>
                  <div className="flex flex-wrap gap-2">
                    {FIXED_CATEGORIES.map(cat => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 bg-gold/10 text-gold rounded-lg border border-gold/20 text-sm font-bold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    এই 3টি category fixed থাকবে
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="w-full mt-6 bg-gold text-black font-bold py-3 rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==================== HELPER COMPONENTS ====================

interface SectionHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  icon?: any;
  required?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  isExpanded, 
  onToggle, 
  icon: Icon,
  required 
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-3 bg-black/30 border border-white/10 rounded-lg hover:border-gold/30 transition-all"
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon size={16} className="text-gold" />}
      <span className="text-sm font-bold text-white">
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
    </div>
    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
  </button>
);

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  helperText?: string;
  icon?: any;
  small?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
  helperText,
  icon: Icon,
  small
}) => (
  <div>
    <label className={`block font-bold text-gray-400 mb-1.5 ${small ? 'text-xs' : 'text-xs'}`}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold resize-none ${small ? 'text-xs' : 'text-sm'}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold ${Icon ? 'pl-10' : ''} ${small ? 'text-xs' : 'text-sm'}`}
        />
      )}
    </div>
    {helperText && (
      <p className="text-xs text-gray-600 mt-1">{helperText}</p>
    )}
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  required
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-400 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-gold"
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange,
  helperText
}) => (
  <div>
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-11 h-6 rounded-full transition-all ${checked ? 'bg-gold' : 'bg-gray-700'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
        </div>
      </div>
      <span className="text-sm font-bold text-white group-hover:text-gold transition-colors">
        {label}
      </span>
    </label>
    {helperText && (
      <p className="text-xs text-gray-600 mt-1 ml-14">{helperText}</p>
    )}
  </div>
);

export default AdminPanel;
