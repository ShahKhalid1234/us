import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { Memory, UserProfile } from '../types';
import { db, collection, query, orderBy, onSnapshot, doc } from '../firebase/config';
import { Camera, Trash2, Calendar, Plus, X, ArrowLeft, Image as ImageIcon, Heart } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion, AnimatePresence } from 'motion/react';

export const Memories: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { params, navigateTo } = useNavigation();
  const friendId = params.friendId;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // New Memory Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [base64Image, setBase64Image] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const friendshipId = [user?.uid, friendId].sort().join('_');

  // Subscribe to memories and load partner info
  useEffect(() => {
    if (!user || !friendId) return;

    // Load partner profile
    const unsubPartner = onSnapshot(doc(db, 'users', friendId), (snap) => {
      if (snap.exists()) {
        setPartnerProfile(snap.data() as UserProfile);
      }
    });

    // Load memories list
    const q = query(
      collection(db, 'loveSpaces', friendshipId, 'memories'),
      orderBy('createdAt', 'desc')
    );

    const unsubMemories = onSnapshot(q, (snapshot) => {
      const list: Memory[] = [];
      snapshot.forEach((d) => list.push(d.data() as Memory));
      setMemories(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading memories:", error);
      setLoading(false);
    });

    return () => {
      unsubPartner();
      unsubMemories();
    };
  }, [user, friendId, friendshipId]);

  // Handle image conversion to Base64 (max 500kb to stay within Firestore limits safely)
  const processImageFile = (file: File) => {
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError("Only image files (JPEG, PNG, WEBP) are supported.");
      return;
    }

    if (file.size > 800 * 1024) {
      setImageError("Image must be smaller than 800 KB to be stored securely.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Image(reader.result as string);
    };
    reader.onerror = () => {
      setImageError("Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !description || !user || !userProfile) return;

    try {
      await dbService.addMemory(
        friendshipId,
        title.trim(),
        description.trim(),
        date,
        base64Image,
        user.uid,
        friendId,
        userProfile.displayName
      );

      // Reset
      setTitle('');
      setDate('');
      setDescription('');
      setBase64Image('');
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving memory:", err);
      alert("Could not save memory. Please check fields.");
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this memory forever?")) return;
    try {
      await dbService.deleteMemory(friendshipId, memoryId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title="Memory Scrapbook" />

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Back link */}
        <button
          onClick={() => navigateTo(`/love-space/${friendId}`)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 font-semibold mb-2 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Love Space</span>
        </button>

        {/* Scrapbook Header */}
        <div className="flex justify-between items-baseline border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide">
              Shared Scrapbook
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Preserve your happiest moments, calls, and travel milestones with {partnerProfile?.displayName}.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer"
            id="btn-trigger-add-memory"
          >
            <Plus className="w-4 h-4" /> Add Memory
          </button>
        </div>

        {/* Grid display */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-500">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-xs mt-2">Opening memory coordinates...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="p-16 text-center text-slate-500 max-w-md mx-auto bg-slate-900/10 border border-slate-900 rounded-2xl">
            <Camera className="w-12 h-12 mx-auto mb-4 text-slate-800" />
            <h4 className="text-base font-bold text-slate-300">Scrapbook is clean and fresh</h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Log your very first memory (like "Our First Voice Call" or "Anniversary Day") to construct a visual history together.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-rose-300 border border-slate-800 rounded-xl cursor-pointer"
            >
              Add First Memory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {memories.map((mem) => (
              <motion.div
                key={mem.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-slate-900 bg-slate-900/15 overflow-hidden flex flex-col justify-between group relative hover:border-slate-800 transition-all duration-300"
              >
                
                {/* Image top container with mathematically nesting style */}
                {mem.image ? (
                  <div className="aspect-[4/3] w-full bg-slate-950 overflow-hidden relative">
                    <img src={mem.image} alt={mem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-slate-900/50 flex items-center justify-center text-slate-650 border-b border-slate-900">
                    <ImageIcon className="w-10 h-10 opacity-30" />
                  </div>
                )}

                {/* Details Section */}
                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(mem.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  
                  <h4 className="font-extrabold text-sm text-slate-200 group-hover:text-rose-200 transition-colors">
                    {mem.title}
                  </h4>
                  
                  <p className="text-xs text-slate-400 leading-relaxed truncate-2-lines">
                    {mem.description}
                  </p>
                </div>

                {/* Hover overlay delete option */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-2 bg-slate-950/80 backdrop-blur-sm hover:bg-rose-950/80 rounded-xl text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer shadow-md"
                    title="Delete Memory"
                    id={`btn-delete-mem-${mem.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </motion.div>
            ))}
          </div>
        )}

      </main>

      {/* NEW MEMORY FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900/90 border border-slate-850 p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <h3 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-rose-400" /> Log Sweet Memory
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4 text-left">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                    Memory Title
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="e.g. Our First Date"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none"
                    id="mem-title"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                    Aniversary Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    id="mem-date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                  Share the Story
                </label>
                <textarea
                  required
                  maxLength={300}
                  rows={3}
                  placeholder="Tell us what made this moment special..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-0 leading-relaxed"
                  id="mem-description"
                />
              </div>

              {/* Drag and Drop File Upload */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                  Image Representation
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver 
                      ? 'border-rose-500/60 bg-rose-500/5 text-rose-300' 
                      : base64Image 
                        ? 'border-emerald-500/40 bg-emerald-500/2 text-slate-300'
                        : 'border-slate-850 hover:border-violet-500/40 bg-slate-950/40 text-slate-500'
                  }`}
                  id="mem-dropzone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {base64Image ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 mx-auto overflow-hidden">
                        <img src={base64Image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-400">Image uploaded successfully</p>
                      <p className="text-[10px] text-slate-500">Drag another or click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="w-8 h-8 mx-auto text-slate-700 animate-pulse" />
                      <p className="text-xs font-semibold text-slate-350">Drag & drop your visual here</p>
                      <p className="text-[10px] text-slate-500">Supports JPEG, PNG up to 800KB</p>
                    </div>
                  )}
                </div>

                {imageError && (
                  <p className="text-[10px] text-rose-400 mt-1.5 font-semibold leading-relaxed">
                    {imageError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-400 border border-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                  id="mem-submit"
                >
                  Save in scrapbook
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
