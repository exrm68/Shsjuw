import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Settings, LogOut, Trash2, Edit, Plus, Save, Database, 
  RefreshCw, Link, Bot, Star, List, TrendingUp, Award, Bell, Film, Download, 
  ChevronDown, ChevronUp, Eye, EyeOff, Menu, Tv, Play
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, 
  query, orderBy, setDoc, getDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Movie, Episode, AppSettings } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  // ==================== MAIN NAVIGATION ====================
  const [activeTab, setActiveTab] = useState('movies');
  const [user, setUser] = useState<User | null>(null);
  
  // ==================== LOGIN STATE ====================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ==================== MOVIE/SERIES COMMON STATE ====================
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Exclusive');
  const [thumbnail, setThumbnail] = useState('');
  const [year, setYear] = useState('2025');
  const [rating, setRating] = useState('9.0');
  const [quality, setQuality] = useState('4K HDR');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [initialViews, setInitialViews] = useState('1.2M');
  
  // ==================== WATCH & DOWNLOAD CODES ====================
  const [telegramCode, setTelegramCode] = useState(''); // For Watch/Stream
  const [downloadCode, setDownloadCode] = useState(''); // For Download (separate)
  const [downloadLink, setDownloadLink] = useState(''); // External download link
  
  // ==================== PREMIUM FEATURES ====================
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(1);
  const [isTop10, setIsTop10] = useState(false);
  const [top10Position, setTop10Position] = useState(1);
  const [priority, setPriority] = useState(0);
  
  // ==================== EPISODE MANAGEMENT ====================
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpSeason, setNewEpSeason] = useState('1');
  const [newEpNumber, setNewEpNumber] = useState('');
  const [newEpDuration, setNewEpDuration] = useState('45m');
  const [newEpTelegramCode, setNewEpTelegramCode] = useState(''); // Watch code for episode
  const [newEpDownloadCode, setNewEpDownloadCode] = useState(''); // Download code for episode
  const [newEpDownloadLink, setNewEpDownloadLink] = useState(''); // External download for episode
  
  // ==================== LIST STATE ====================
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [seriesList, setSeriesList] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // ==================== APP SETTINGS STATE ====================
  const [botUsername, setBotUsername] = useState('');
  const [channelLink, setChannelLink] = useState(''); // Notice bar এ যাবে
  const [headerTelegramLink, setHeaderTelegramLink] = useState(''); // Header এর right side এ যাবে
  const [noticeText, setNoticeText] = useState('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [enableTop10, setEnableTop10] = useState(true);
  const [enableBanners, setEnableBanners] = useState(true);

  // ==================== TOP 10 TRENDING STATE ====================
  const [top10Movies, setTop10Movies] = useState<Movie[]>([]);

  // ==================== UI STATE ====================
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    download: false,
    premium: false,
    episodes: false
  });

  // Categories
  const CATEGORIES = ['Exclusive', 'Korean Drama', 'Series'];

  // ==================== AUTH LISTENER ====================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchAllData();
        setError('');
      }
    });
    return () => unsubscribe();
  }, []);

  // ==================== FETCH ALL DATA ====================
  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMovies(),
        fetchSeries(),
        fetchSettings(),
        fetchTop10()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FETCH MOVIES ====================
  const fetchMovies = async () => {
    try {
      const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const movies: Movie[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Movie;
        // শুধু Movies (Series না)
        if (data.category !== 'Series' && data.category !== 'Korean Drama') {
          movies.push({ ...data, id: doc.id });
        }
      });
      
      setMovieList(movies);
      setFilteredMovies(movies);
    } catch (err) {
      console.error('Error fetching movies:', err);
    }
  };

  // ==================== FETCH SERIES ====================
  const fetchSeries = async () => {
    try {
      const q = query(collection(db, 'movies'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const series: Movie[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Movie;
        // শুধু Series
        if (data.category === 'Series' || data.category === 'Korean Drama') {
          series.push({ ...data, id: doc.id });
        }
      });
      
      setSeriesList(series);
    } catch (err) {
      console.error('Error fetching series:', err);
    }
  };

  // ==================== FETCH TOP 10 ====================
  const fetchTop10 = async () => {
    try {
      const q = query(collection(db, 'movies'));
      const snapshot = await getDocs(q);
      const top10: Movie[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Movie;
        if (data.isTop10) {
          top10.push({ ...data, id: doc.id });
        }
      });
      
      // Sort by position
      top10.sort((a, b) => (a.top10Position || 0) - (b.top10Position || 0));
      setTop10Movies(top10);
    } catch (err) {
      console.error('Error fetching top 10:', err);
    }
  };

  // ==================== FETCH SETTINGS ====================
  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'appSettings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setBotUsername(data.botUsername || '');
        setChannelLink(data.channelLink || ''); // Notice bar link
        setHeaderTelegramLink(data.headerTelegramLink || ''); // Header link (new)
        setNoticeText(data.noticeText || '');
        setNoticeEnabled(data.noticeEnabled !== false);
        setEnableTop10(data.enableTop10 !== false);
        setEnableBanners(data.enableBanners !== false);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // ==================== LOGIN ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccessMsg('✅ সফলভাবে লগইন হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError('❌ ইমেইল বা পাসওয়ার্ড ভুল হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOGOUT ====================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setEmail('');
      setPassword('');
      resetForm();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // ==================== RESET FORM ====================
  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setCategory('Exclusive');
    setThumbnail('');
    setYear('2025');
    setRating('9.0');
    setQuality('4K HDR');
    setDescription('');
    setIsPremium(false);
    setInitialViews('1.2M');
    setTelegramCode('');
    setDownloadCode('');
    setDownloadLink('');
    setIsFeatured(false);
    setFeaturedOrder(1);
    setIsTop10(false);
    setTop10Position(1);
    setPriority(0);
    setEpisodes([]);
    setSuccessMsg('');
  };

  // ==================== ADD EPISODE ====================
  const handleAddEpisode = () => {
    if (!newEpTitle || !newEpNumber || !newEpTelegramCode) {
      alert('⚠️ Episode Title, Number এবং Watch Code দিতে হবে!');
      return;
    }

    const newEpisode: Episode = {
      id: `ep_${Date.now()}`,
      season: parseInt(newEpSeason) || 1,
      number: parseInt(newEpNumber),
      title: newEpTitle,
      duration: newEpDuration,
      telegramCode: newEpTelegramCode, // ✅ Watch এর জন্য
      downloadCode: newEpDownloadCode || undefined, // ✅ Download এর জন্য (optional)
      downloadLink: newEpDownloadLink || undefined // ✅ External download (optional)
    };

    setEpisodes([...episodes, newEpisode]);
    
    // Reset episode form
    setNewEpTitle('');
    setNewEpNumber('');
    setNewEpDuration('45m');
    setNewEpTelegramCode('');
    setNewEpDownloadCode('');
    setNewEpDownloadLink('');
    
    setSuccessMsg('✅ Episode যোগ হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  // ==================== REMOVE EPISODE ====================
  const handleRemoveEpisode = (id: string) => {
    setEpisodes(episodes.filter(ep => ep.id !== id));
  };

  // ==================== ADD/UPDATE CONTENT ====================
  const handleAddOrUpdateContent = async () => {
    if (!title || !thumbnail || !telegramCode) {
      alert('⚠️ Title, Thumbnail এবং Watch Code অবশ্যই দিতে হবে!');
      return;
    }

    setLoading(true);
    try {
      const contentData: Partial<Movie> = {
        title,
        category,
        thumbnail,
        year,
        rating: parseFloat(rating),
        quality,
        description,
        isPremium,
        views: initialViews,
        telegramCode, // ✅ Watch/Stream এর জন্য
        downloadCode: downloadCode || undefined, // ✅ Download এর জন্য (optional)
        downloadLink: downloadLink || undefined, // ✅ External link (optional)
        isFeatured,
        featuredOrder: isFeatured ? featuredOrder : undefined,
        isTop10,
        top10Position: isTop10 ? top10Position : undefined,
        priority,
        episodes: episodes.length > 0 ? episodes : undefined,
        createdAt: isEditing ? undefined : serverTimestamp()
      };

      if (isEditing && editId) {
        // Update existing
        await updateDoc(doc(db, 'movies', editId), {
          ...contentData,
          updatedAt: serverTimestamp()
        });
        setSuccessMsg('✅ Content আপডেট হয়েছে!');
      } else {
        // Add new
        await addDoc(collection(db, 'movies'), {
          ...contentData,
          createdAt: serverTimestamp()
        });
        setSuccessMsg('✅ Content যোগ হয়েছে!');
      }

      // Refresh lists
      await fetchMovies();
      await fetchSeries();
      await fetchTop10();
      
      resetForm();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving content:', err);
      setError('❌ Content সেভ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // ==================== DELETE CONTENT ====================
  const handleDeleteContent = async (id: string, type: 'movie' | 'series') => {
    if (!confirm('⚠️ নিশ্চিত করুন, আপনি এটি ডিলিট করতে চান?')) return;

    try {
      await deleteDoc(doc(db, 'movies', id));
      setSuccessMsg('✅ ডিলিট হয়েছে!');
      
      if (type === 'movie') {
        await fetchMovies();
      } else {
        await fetchSeries();
      }
      await fetchTop10();
      
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error('Error deleting:', err);
      setError('❌ ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  // ==================== EDIT CONTENT ====================
  const handleEditContent = (content: Movie) => {
    setIsEditing(true);
    setEditId(content.id);
    setTitle(content.title);
    setCategory(content.category);
    setThumbnail(content.thumbnail);
    setYear(content.year || '2025');
    setRating(content.rating.toString());
    setQuality(content.quality || '4K HDR');
    setDescription(content.description || '');
    setIsPremium(content.isPremium || false);
    setInitialViews(content.views);
    setTelegramCode(content.telegramCode);
    setDownloadCode(content.downloadCode || '');
    setDownloadLink(content.downloadLink || '');
    setIsFeatured(content.isFeatured || false);
    setFeaturedOrder(content.featuredOrder || 1);
    setIsTop10(content.isTop10 || false);
    setTop10Position(content.top10Position || 1);
    setPriority(content.priority || 0);
    setEpisodes(content.episodes || []);
    
    setActiveTab(content.category === 'Series' || content.category === 'Korean Drama' ? 'series' : 'movies');
  };

  // ==================== SAVE SETTINGS ====================
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'appSettings'), {
        botUsername,
        channelLink, // Notice bar link
        headerTelegramLink, // Header telegram link (NEW)
        noticeText,
        noticeEnabled,
        enableTop10,
        enableBanners,
        updatedAt: serverTimestamp()
      });
      
      setSuccessMsg('✅ Settings সেভ হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('❌ Settings সেভ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // ==================== TOGGLE SECTION ====================
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ==================== LOGIN SCREEN ====================
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] bg-gradient-to-br from-red-950 via-black to-black flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md bg-gradient-to-br from-zinc-900 to-black rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-white/30">
              <Film className="text-white" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">ADMIN PANEL</h2>
            <p className="text-red-100 text-sm">CINEFLIX Control Center</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-zinc-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                placeholder="admin@cineflix.com"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50"
            >
              {loading ? '⏳ লগইন হচ্ছে...' : '🔐 লগইন করুন'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  // ==================== MAIN ADMIN PANEL ====================
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between border-b border-red-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Film className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ADMIN PANEL</h1>
            <p className="text-red-100 text-xs">CINEFLIX Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center gap-2 transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm"
          >
            {successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        <div className="flex min-w-max">
          <TabButton
            icon={<Film size={18} />}
            label="Movies"
            active={activeTab === 'movies'}
            onClick={() => {
              setActiveTab('movies');
              resetForm();
            }}
          />
          <TabButton
            icon={<Tv size={18} />}
            label="Series"
            active={activeTab === 'series'}
            onClick={() => {
              setActiveTab('series');
              resetForm();
              setCategory('Series');
            }}
          />
          <TabButton
            icon={<TrendingUp size={18} />}
            label="Top 10"
            active={activeTab === 'top10'}
            onClick={() => setActiveTab('top10')}
          />
          <TabButton
            icon={<Settings size={18} />}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'movies' && (
          <MoviesSection
            isEditing={isEditing}
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            thumbnail={thumbnail}
            setThumbnail={setThumbnail}
            year={year}
            setYear={setYear}
            rating={rating}
            setRating={setRating}
            quality={quality}
            setQuality={setQuality}
            description={description}
            setDescription={setDescription}
            telegramCode={telegramCode}
            setTelegramCode={setTelegramCode}
            downloadCode={downloadCode}
            setDownloadCode={setDownloadCode}
            downloadLink={downloadLink}
            setDownloadLink={setDownloadLink}
            isFeatured={isFeatured}
            setIsFeatured={setIsFeatured}
            featuredOrder={featuredOrder}
            setFeaturedOrder={setFeaturedOrder}
            isTop10={isTop10}
            setIsTop10={setIsTop10}
            top10Position={top10Position}
            setTop10Position={setTop10Position}
            priority={priority}
            setPriority={setPriority}
            initialViews={initialViews}
            setInitialViews={setInitialViews}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            handleAddOrUpdateContent={handleAddOrUpdateContent}
            resetForm={resetForm}
            movieList={movieList}
            handleEditContent={handleEditContent}
            handleDeleteContent={handleDeleteContent}
            loading={loading}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}

        {activeTab === 'series' && (
          <SeriesSection
            isEditing={isEditing}
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            thumbnail={thumbnail}
            setThumbnail={setThumbnail}
            year={year}
            setYear={setYear}
            rating={rating}
            setRating={setRating}
            quality={quality}
            setQuality={setQuality}
            description={description}
            setDescription={setDescription}
            telegramCode={telegramCode}
            setTelegramCode={setTelegramCode}
            downloadCode={downloadCode}
            setDownloadCode={setDownloadCode}
            downloadLink={downloadLink}
            setDownloadLink={setDownloadLink}
            isFeatured={isFeatured}
            setIsFeatured={setIsFeatured}
            featuredOrder={featuredOrder}
            setFeaturedOrder={setFeaturedOrder}
            isTop10={isTop10}
            setIsTop10={setIsTop10}
            top10Position={top10Position}
            setTop10Position={setTop10Position}
            priority={priority}
            setPriority={setPriority}
            initialViews={initialViews}
            setInitialViews={setInitialViews}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            episodes={episodes}
            newEpTitle={newEpTitle}
            setNewEpTitle={setNewEpTitle}
            newEpSeason={newEpSeason}
            setNewEpSeason={setNewEpSeason}
            newEpNumber={newEpNumber}
            setNewEpNumber={setNewEpNumber}
            newEpDuration={newEpDuration}
            setNewEpDuration={setNewEpDuration}
            newEpTelegramCode={newEpTelegramCode}
            setNewEpTelegramCode={setNewEpTelegramCode}
            newEpDownloadCode={newEpDownloadCode}
            setNewEpDownloadCode={setNewEpDownloadCode}
            newEpDownloadLink={newEpDownloadLink}
            setNewEpDownloadLink={setNewEpDownloadLink}
            handleAddEpisode={handleAddEpisode}
            handleRemoveEpisode={handleRemoveEpisode}
            handleAddOrUpdateContent={handleAddOrUpdateContent}
            resetForm={resetForm}
            seriesList={seriesList}
            handleEditContent={handleEditContent}
            handleDeleteContent={handleDeleteContent}
            loading={loading}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}

        {activeTab === 'top10' && (
          <Top10Section
            top10Movies={top10Movies}
            handleEditContent={handleEditContent}
            handleDeleteContent={handleDeleteContent}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsSection
            botUsername={botUsername}
            setBotUsername={setBotUsername}
            channelLink={channelLink}
            setChannelLink={setChannelLink}
            headerTelegramLink={headerTelegramLink}
            setHeaderTelegramLink={setHeaderTelegramLink}
            noticeText={noticeText}
            setNoticeText={setNoticeText}
            noticeEnabled={noticeEnabled}
            setNoticeEnabled={setNoticeEnabled}
            enableTop10={enableTop10}
            setEnableTop10={setEnableTop10}
            enableBanners={enableBanners}
            setEnableBanners={setEnableBanners}
            handleSaveSettings={handleSaveSettings}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

// ==================== TAB BUTTON COMPONENT ====================
const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
      active
        ? 'border-red-500 text-red-500 bg-red-500/5'
        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

// ==================== MOVIES SECTION ====================
const MoviesSection: React.FC<any> = (props) => {
  const {
    isEditing,
    title,
    setTitle,
    category,
    setCategory,
    thumbnail,
    setThumbnail,
    year,
    setYear,
    rating,
    setRating,
    quality,
    setQuality,
    description,
    setDescription,
    telegramCode,
    setTelegramCode,
    downloadCode,
    setDownloadCode,
    downloadLink,
    setDownloadLink,
    isFeatured,
    setIsFeatured,
    featuredOrder,
    setFeaturedOrder,
    isTop10,
    setIsTop10,
    top10Position,
    setTop10Position,
    priority,
    setPriority,
    initialViews,
    setInitialViews,
    isPremium,
    setIsPremium,
    handleAddOrUpdateContent,
    resetForm,
    movieList,
    handleEditContent,
    handleDeleteContent,
    loading,
    expandedSections,
    toggleSection
  } = props;

  return (
    <div className="p-4 space-y-6">
      {/* Form Section */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Film className="text-red-500" size={24} />
          {isEditing ? 'Edit Movie' : 'Add New Movie'}
        </h2>

        {/* Basic Info */}
        <CollapsibleSection
          title="Basic Information"
          expanded={expandedSections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Movie Title" value={title} onChange={setTitle} placeholder="Enter movie name" />
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={['Exclusive']}
            />
            <InputField label="Thumbnail URL" value={thumbnail} onChange={setThumbnail} placeholder="https://..." />
            <InputField label="Year" value={year} onChange={setYear} placeholder="2025" />
            <InputField label="Rating" value={rating} onChange={setRating} placeholder="9.0" />
            <InputField label="Quality" value={quality} onChange={setQuality} placeholder="4K HDR" />
            <InputField label="Initial Views" value={initialViews} onChange={setInitialViews} placeholder="1.2M" />
          </div>
          <div className="mt-4">
            <label className="block text-zinc-400 text-sm mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 h-24 resize-none"
              placeholder="Movie description..."
            />
          </div>
        </CollapsibleSection>

        {/* Watch & Download Links */}
        <CollapsibleSection
          title="Watch & Download Links"
          expanded={expandedSections.download}
          onToggle={() => toggleSection('download')}
        >
          <div className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <label className="block text-blue-400 font-medium mb-2 flex items-center gap-2">
                <Play size={16} />
                Watch/Stream Code (Required)
              </label>
              <input
                value={telegramCode}
                onChange={(e) => setTelegramCode(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="s1e1_code বা movie_code"
              />
              <p className="text-zinc-500 text-xs mt-2">এই code দিয়ে Telegram bot থেকে video stream হবে</p>
            </div>

            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <label className="block text-green-400 font-medium mb-2 flex items-center gap-2">
                <Download size={16} />
                Download Code (Optional)
              </label>
              <input
                value={downloadCode}
                onChange={(e) => setDownloadCode(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="download_s1e1 বা download_movie"
              />
              <p className="text-zinc-500 text-xs mt-2">আলাদা download code (যদি watch code থেকে আলাদা হয়)</p>
            </div>

            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
              <label className="block text-purple-400 font-medium mb-2 flex items-center gap-2">
                <Link size={16} />
                External Download Link (Optional)
              </label>
              <input
                value={downloadLink}
                onChange={(e) => setDownloadLink(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                placeholder="https://drive.google.com/... or https://mega.nz/..."
              />
              <p className="text-zinc-500 text-xs mt-2">Google Drive, Mega বা অন্য কোনো external link</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Premium Features */}
        <CollapsibleSection
          title="Premium Features"
          expanded={expandedSections.premium}
          onToggle={() => toggleSection('premium')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CheckboxField label="Premium Content" checked={isPremium} onChange={setIsPremium} />
            <CheckboxField label="Featured (Banner)" checked={isFeatured} onChange={setIsFeatured} />
            {isFeatured && (
              <InputField label="Banner Position" value={featuredOrder.toString()} onChange={(val) => setFeaturedOrder(Number(val))} type="number" />
            )}
            <CheckboxField label="Top 10 Trending" checked={isTop10} onChange={setIsTop10} />
            {isTop10 && (
              <InputField label="Top 10 Position (1-10)" value={top10Position.toString()} onChange={(val) => setTop10Position(Number(val))} type="number" min="1" max="10" />
            )}
            <InputField label="Priority" value={priority.toString()} onChange={(val) => setPriority(Number(val))} type="number" />
          </div>
        </CollapsibleSection>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddOrUpdateContent}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Saving...' : isEditing ? 'Update Movie' : 'Add Movie'}
          </button>
          {isEditing && (
            <button
              onClick={resetForm}
              className="px-6 bg-zinc-700 text-white py-3 rounded-lg font-medium hover:bg-zinc-600 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Movie List */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <List className="text-red-500" size={24} />
          All Movies ({movieList.length})
        </h2>
        <div className="space-y-3">
          {movieList.map((movie) => (
            <ContentCard
              key={movie.id}
              content={movie}
              onEdit={() => handleEditContent(movie)}
              onDelete={() => handleDeleteContent(movie.id, 'movie')}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== SERIES SECTION ====================
const SeriesSection: React.FC<any> = (props) => {
  const {
    isEditing,
    title,
    setTitle,
    category,
    setCategory,
    thumbnail,
    setThumbnail,
    year,
    setYear,
    rating,
    setRating,
    quality,
    setQuality,
    description,
    setDescription,
    telegramCode,
    setTelegramCode,
    downloadCode,
    setDownloadCode,
    downloadLink,
    setDownloadLink,
    isFeatured,
    setIsFeatured,
    featuredOrder,
    setFeaturedOrder,
    isTop10,
    setIsTop10,
    top10Position,
    setTop10Position,
    priority,
    setPriority,
    initialViews,
    setInitialViews,
    isPremium,
    setIsPremium,
    episodes,
    newEpTitle,
    setNewEpTitle,
    newEpSeason,
    setNewEpSeason,
    newEpNumber,
    setNewEpNumber,
    newEpDuration,
    setNewEpDuration,
    newEpTelegramCode,
    setNewEpTelegramCode,
    newEpDownloadCode,
    setNewEpDownloadCode,
    newEpDownloadLink,
    setNewEpDownloadLink,
    handleAddEpisode,
    handleRemoveEpisode,
    handleAddOrUpdateContent,
    resetForm,
    seriesList,
    handleEditContent,
    handleDeleteContent,
    loading,
    expandedSections,
    toggleSection
  } = props;

  return (
    <div className="p-4 space-y-6">
      {/* Form Section */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Tv className="text-red-500" size={24} />
          {isEditing ? 'Edit Series' : 'Add New Series'}
        </h2>

        {/* Basic Info */}
        <CollapsibleSection
          title="Basic Information"
          expanded={expandedSections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Series Title" value={title} onChange={setTitle} placeholder="Enter series name" />
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={['Series', 'Korean Drama']}
            />
            <InputField label="Thumbnail URL" value={thumbnail} onChange={setThumbnail} placeholder="https://..." />
            <InputField label="Year" value={year} onChange={setYear} placeholder="2025" />
            <InputField label="Rating" value={rating} onChange={setRating} placeholder="9.0" />
            <InputField label="Quality" value={quality} onChange={setQuality} placeholder="4K HDR" />
            <InputField label="Initial Views" value={initialViews} onChange={setInitialViews} placeholder="1.2M" />
          </div>
          <div className="mt-4">
            <label className="block text-zinc-400 text-sm mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 h-24 resize-none"
              placeholder="Series description..."
            />
          </div>
        </CollapsibleSection>

        {/* Series Main Links (Optional for Series) */}
        <CollapsibleSection
          title="Series Main Links (Optional)"
          expanded={expandedSections.download}
          onToggle={() => toggleSection('download')}
        >
          <div className="space-y-4">
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-3">
                ⚠️ Series এর জন্য এই links optional। আপনি চাইলে Series এর জন্য একটা main trailer বা promotional video link দিতে পারেন।
              </p>
              <InputField label="Trailer/Promo Code" value={telegramCode} onChange={setTelegramCode} placeholder="trailer_code (optional)" />
              <InputField label="Download Code" value={downloadCode} onChange={setDownloadCode} placeholder="download_code (optional)" />
              <InputField label="External Link" value={downloadLink} onChange={setDownloadLink} placeholder="https://... (optional)" />
            </div>
          </div>
        </CollapsibleSection>

        {/* Episode Management */}
        <CollapsibleSection
          title="Episode Management (সিরিজ এর জন্য অবশ্যই)"
          expanded={expandedSections.episodes}
          onToggle={() => toggleSection('episodes')}
        >
          {/* Add Episode Form */}
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Plus size={18} className="text-green-500" />
              Add New Episode
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <InputField label="Episode Title" value={newEpTitle} onChange={setNewEpTitle} placeholder="Episode title" />
              <InputField label="Season" value={newEpSeason} onChange={setNewEpSeason} type="number" placeholder="1" />
              <InputField label="Episode Number" value={newEpNumber} onChange={setNewEpNumber} type="number" placeholder="1" />
              <InputField label="Duration" value={newEpDuration} onChange={setNewEpDuration} placeholder="45m" />
            </div>
            
            <div className="space-y-3 mb-3">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <label className="block text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Play size={14} />
                  Watch Code (Required)
                </label>
                <input
                  value={newEpTelegramCode}
                  onChange={(e) => setNewEpTelegramCode(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="s1e1_watch"
                />
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <label className="block text-green-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Download size={14} />
                  Download Code (Optional - আলাদা হলে)
                </label>
                <input
                  value={newEpDownloadCode}
                  onChange={(e) => setNewEpDownloadCode(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  placeholder="s1e1_download (optional)"
                />
              </div>

              <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                <label className="block text-purple-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Link size={14} />
                  External Link (Optional)
                </label>
                <input
                  value={newEpDownloadLink}
                  onChange={(e) => setNewEpDownloadLink(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="https://... (optional)"
                />
              </div>
            </div>

            <button
              onClick={handleAddEpisode}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Episode
            </button>
          </div>

          {/* Episodes List */}
          {episodes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium mb-2">Added Episodes ({episodes.length})</h4>
              {episodes
                .sort((a, b) => a.season - b.season || a.number - b.number)
                .map((ep) => (
                  <div
                    key={ep.id}
                    className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        S{ep.season}E{ep.number}: {ep.title}
                      </div>
                      <div className="text-zinc-400 text-sm mt-1">
                        Duration: {ep.duration} | Watch: {ep.telegramCode}
                        {ep.downloadCode && ` | Download: ${ep.downloadCode}`}
                        {ep.downloadLink && ` | Link: ${ep.downloadLink.substring(0, 30)}...`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEpisode(ep.id)}
                      className="ml-3 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Premium Features */}
        <CollapsibleSection
          title="Premium Features"
          expanded={expandedSections.premium}
          onToggle={() => toggleSection('premium')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CheckboxField label="Premium Content" checked={isPremium} onChange={setIsPremium} />
            <CheckboxField label="Featured (Banner)" checked={isFeatured} onChange={setIsFeatured} />
            {isFeatured && (
              <InputField label="Banner Position" value={featuredOrder.toString()} onChange={(val) => setFeaturedOrder(Number(val))} type="number" />
            )}
            <CheckboxField label="Top 10 Trending" checked={isTop10} onChange={setIsTop10} />
            {isTop10 && (
              <InputField label="Top 10 Position (1-10)" value={top10Position.toString()} onChange={(val) => setTop10Position(Number(val))} type="number" min="1" max="10" />
            )}
            <InputField label="Priority" value={priority.toString()} onChange={(val) => setPriority(Number(val))} type="number" />
          </div>
        </CollapsibleSection>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddOrUpdateContent}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Saving...' : isEditing ? 'Update Series' : 'Add Series'}
          </button>
          {isEditing && (
            <button
              onClick={resetForm}
              className="px-6 bg-zinc-700 text-white py-3 rounded-lg font-medium hover:bg-zinc-600 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Series List */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <List className="text-red-500" size={24} />
          All Series ({seriesList.length})
        </h2>
        <div className="space-y-3">
          {seriesList.map((series) => (
            <ContentCard
              key={series.id}
              content={series}
              onEdit={() => handleEditContent(series)}
              onDelete={() => handleDeleteContent(series.id, 'series')}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== TOP 10 SECTION ====================
const Top10Section: React.FC<{
  top10Movies: Movie[];
  handleEditContent: (movie: Movie) => void;
  handleDeleteContent: (id: string, type: 'movie' | 'series') => void;
}> = ({ top10Movies, handleEditContent, handleDeleteContent }) => {
  return (
    <div className="p-4">
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="text-red-500" size={24} />
          Top 10 Trending Movies/Series
        </h2>
        
        {top10Movies.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Award size={48} className="mx-auto mb-4 opacity-50" />
            <p>No Top 10 items yet</p>
            <p className="text-sm mt-2">Add movies/series and mark them as "Top 10" to show them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top10Movies.map((movie, index) => (
              <div
                key={movie.id}
                className="bg-gradient-to-r from-yellow-600/10 to-transparent border border-yellow-600/30 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  #{index + 1}
                </div>
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{movie.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500" fill="currentColor" />
                      {movie.rating}
                    </span>
                    <span>{movie.category}</span>
                    <span>{movie.year}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditContent(movie)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteContent(movie.id, movie.category === 'Series' || movie.category === 'Korean Drama' ? 'series' : 'movie')}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SETTINGS SECTION ====================
const SettingsSection: React.FC<any> = (props) => {
  const {
    botUsername,
    setBotUsername,
    channelLink,
    setChannelLink,
    headerTelegramLink,
    setHeaderTelegramLink,
    noticeText,
    setNoticeText,
    noticeEnabled,
    setNoticeEnabled,
    enableTop10,
    setEnableTop10,
    enableBanners,
    setEnableBanners,
    handleSaveSettings,
    loading
  } = props;

  return (
    <div className="p-4">
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="text-red-500" size={24} />
          App Settings
        </h2>

        <div className="space-y-6">
          {/* Bot Settings */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Bot size={18} className="text-blue-500" />
              Telegram Bot Settings
            </h3>
            <div className="space-y-4">
              <InputField
                label="Bot Username (without @)"
                value={botUsername}
                onChange={setBotUsername}
                placeholder="your_bot_username"
              />
            </div>
          </div>

          {/* Telegram Link Settings */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Link size={18} className="text-purple-500" />
              Telegram Channel Links
            </h3>
            <div className="space-y-4">
              <div>
                <InputField
                  label="Notice Bar Telegram Link"
                  value={channelLink}
                  onChange={setChannelLink}
                  placeholder="https://t.me/your_channel"
                />
                <p className="text-zinc-500 text-xs mt-1">এই link Notice bar এ যাবে</p>
              </div>
              <div>
                <InputField
                  label="Header Telegram Link (Top Right)"
                  value={headerTelegramLink}
                  onChange={setHeaderTelegramLink}
                  placeholder="https://t.me/your_channel"
                />
                <p className="text-zinc-500 text-xs mt-1">এই link Header এর ডান পাশে Telegram icon এ যাবে</p>
              </div>
            </div>
          </div>

          {/* Notice Settings */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Bell size={18} className="text-yellow-500" />
              Notice Bar Settings
            </h3>
            <div className="space-y-4">
              <CheckboxField
                label="Enable Notice Bar"
                checked={noticeEnabled}
                onChange={setNoticeEnabled}
              />
              {noticeEnabled && (
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Notice Text</label>
                  <textarea
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                    placeholder="আপনার notice message এখানে লিখুন..."
                  />
                  <p className="text-zinc-500 text-xs mt-1">This text will appear in the notice bar</p>
                </div>
              )}
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Star size={18} className="text-green-500" />
              Feature Toggles
            </h3>
            <div className="space-y-3">
              <CheckboxField
                label="Enable Top 10 Trending Section"
                checked={enableTop10}
                onChange={setEnableTop10}
              />
              <CheckboxField
                label="Enable Banner Section"
                checked={enableBanners}
                onChange={setEnableBanners}
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== HELPER COMPONENTS ====================

const CollapsibleSection: React.FC<{
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, expanded, onToggle, children }) => (
  <div className="mb-6">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white font-medium transition-all mb-3"
    >
      <span>{title}</span>
      {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
}> = ({ label, value, onChange, placeholder = '', type = 'text', min, max }) => (
  <div>
    <label className="block text-zinc-400 text-sm mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-all"
      placeholder={placeholder}
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-zinc-400 text-sm mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-all"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const CheckboxField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-11 h-6 rounded-full transition-all ${
          checked ? 'bg-red-600' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'transform translate-x-5' : ''
          }`}
        />
      </div>
    </div>
    <span className="text-zinc-300 group-hover:text-white transition-colors">{label}</span>
  </label>
);

const ContentCard: React.FC<{
  content: Movie;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ content, onEdit, onDelete }) => (
  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-all flex items-start gap-4">
    <img
      src={content.thumbnail}
      alt={content.title}
      className="w-20 h-28 object-cover rounded-lg"
    />
    <div className="flex-1">
      <h3 className="text-white font-bold text-lg mb-1">{content.title}</h3>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">{content.category}</span>
        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">{content.year}</span>
        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">{content.quality}</span>
        {content.isTop10 && (
          <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
            <TrendingUp size={12} />
            Top {content.top10Position}
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-400 space-y-1">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-yellow-500" fill="currentColor" />
          {content.rating} | {content.views} views
        </div>
        {content.episodes && content.episodes.length > 0 && (
          <div className="text-xs text-purple-400">
            {content.episodes.length} Episodes
          </div>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all"
      >
        <Edit size={18} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

export default AdminPanel;
