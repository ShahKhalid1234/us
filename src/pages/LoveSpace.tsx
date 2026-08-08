import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { LoveSpace as LoveSpaceType, LoveNote, UserProfile } from '../types';
import { db, collection, query, orderBy, onSnapshot, doc } from '../firebase/config';
import { Heart, Send, Sparkles, Star, Plus, Eye, BookOpen, Music, Trash, ArrowLeft, Image as ImageIcon, Camera } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion, AnimatePresence } from 'motion/react';

export const LoveSpace: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { params, navigateTo } = useNavigation();
  const friendId = params.friendId;

  const [loveSpace, setLoveSpace] = useState<LoveSpaceType | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>([]);
  const [daysConnected, setDaysConnected] = useState(1);
  const [theme, setTheme] = useState<LoveSpaceType['theme']>('moonlit_garden');

  const [isWriteNoteOpen, setIsWriteNoteOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [openedNote, setOpenedNote] = useState<LoveNote | null>(null);

  // Mock songs list for sweet romantic flavor
  const [songs, setSongs] = useState<string[]>([
    "Perfect - Ed Sheeran 🎵",
    "Lover - Taylor Swift 💖",
    "Yellow - Coldplay 🌟"
  ]);
  const [newSong, setNewSong] = useState('');

  const friendshipId = [user?.uid, friendId].sort().join('_');

  // 1. Load Love Space config & Partner Profile
  useEffect(() => {
    if (!user || !friendId) return;

    // Load partner profile
    const unsubPartner = onSnapshot(doc(db, 'users', friendId), (snap) => {
      if (snap.exists()) {
        setPartnerProfile(snap.data() as UserProfile);
      }
    });

    // Load Love Space document
    const unsubSpace = onSnapshot(doc(db, 'loveSpaces', friendshipId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LoveSpaceType;
        setLoveSpace(data);
        setTheme(data.theme);

        // Calculate days connected
        const difference = Date.now() - data.createdAt;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
        setDaysConnected(days);
      }
    });

    return () => {
      unsubPartner();
      unsubSpace();
    };
  }, [user, friendId, friendshipId]);

  // 2. Load Love Notes
  useEffect(() => {
    if (!loveSpace) return;

    const q = query(
      collection(db, 'loveSpaces', friendshipId, 'notes'),
      orderBy('timestamp', 'desc')
    );

    const unsubNotes = onSnapshot(q, (snapshot) => {
      const notes: LoveNote[] = [];
      snapshot.forEach((d) => notes.push(d.data() as LoveNote));
      setLoveNotes(notes);
    });

    return () => unsubNotes();
  }, [loveSpace, friendshipId]);

  const handleUpdateTheme = async (newTheme: LoveSpaceType['theme']) => {
    setTheme(newTheme);
    try {
      await dbService.updateLoveSpaceTheme(friendshipId, newTheme);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !user || !userProfile) return;

    try {
      await dbService.addLoveNote(friendshipId, user.uid, userProfile.displayName, newNoteContent.trim(), friendId);
      setNewNoteContent('');
      setIsWriteNoteOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNote = async (note: LoveNote) => {
    setOpenedNote(note);
    if (!note.isOpened && note.senderId !== user?.uid) {
      try {
        await dbService.openLoveNote(friendshipId, note.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.trim()) return;
    setSongs([...songs, newSong.trim() + " 🎵"]);
    setNewSong('');
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'starry_galaxy':
        return {
          bg: "bg-slate-950",
          card: "bg-indigo-950/20 border-indigo-500/20",
          text: "text-indigo-200",
          button: "bg-indigo-600 hover:bg-indigo-500",
          accent: "text-indigo-400",
          ambient: "bg-indigo-900/10"
        };
      case 'enchanted_forest':
        return {
          bg: "bg-slate-950",
          card: "bg-emerald-950/20 border-emerald-500/20",
          text: "text-emerald-200",
          button: "bg-emerald-600 hover:bg-emerald-500",
          accent: "text-emerald-400",
          ambient: "bg-emerald-900/10"
        };
      case 'sunset_beach':
        return {
          bg: "bg-slate-950",
          card: "bg-orange-950/20 border-orange-500/20",
          text: "text-orange-200",
          button: "bg-orange-600 hover:bg-orange-500",
          accent: "text-orange-400",
          ambient: "bg-orange-900/10"
        };
      case 'moonlit_garden':
      default:
        return {
          bg: "bg-slate-950",
          card: "bg-purple-950/20 border-purple-500/20",
          text: "text-purple-200",
          button: "bg-violet-600 hover:bg-violet-500",
          accent: "text-rose-400",
          ambient: "bg-purple-900/10"
        };
    }
  };

  const style = getThemeStyles();

  if (!partnerProfile || !loveSpace) {
    return (
      <div className="flex-1 bg-slate-950 min-h-screen flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin"></div>
        <p className="text-xs mt-3">Tuning coordinates to shared space...</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen text-slate-100 font-sans pb-20 md:pb-6 transition-colors duration-700 ${style.bg}`}>
      
      {/* Ambient background decoration matching current active theme */}
      <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full filter blur-[150px] pointer-events-none transition-all duration-700 ${style.ambient}`}></div>

      <Navbar title="Our Shared Universe" />

      <main className="max-w-4xl mx-auto p-6 space-y-8 relative z-10">
        
        {/* Back Link */}
        <button
          onClick={() => navigateTo('/home')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 font-semibold mb-2 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        {/* 1. HERO HEROIC CARD */}
        <div className={`p-8 rounded-2xl border ${style.card} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Heart className="w-48 h-48 text-rose-500 fill-rose-500" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className={`text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${style.accent}`}>
                <Star className="w-3.5 h-3.5 animate-pulse" /> Active Space Milestones
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                {userProfile?.displayName} & {partnerProfile.displayName}
              </h2>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Theme: <span className="font-bold capitalize">{theme.replace('_', ' ')}</span>. Open for mutual memory preservation and connection.
              </p>
            </div>

            {/* Days connected badge */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900/80 text-center shrink-0">
              <span className={`text-4xl font-extrabold bg-gradient-to-r from-violet-300 to-rose-300 bg-clip-text text-transparent block`}>
                {daysConnected}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
                Days Together
              </span>
            </div>
          </div>

          {/* Theme Switcher buttons inside Love Space */}
          <div className="mt-8 border-t border-slate-900/60 pt-4 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-2">Change World Atmosphere:</span>
            {(['moonlit_garden', 'starry_galaxy', 'enchanted_forest', 'sunset_beach'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleUpdateTheme(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                  theme === t 
                    ? 'bg-slate-900 border-rose-500/30 text-rose-300 shadow-inner' 
                    : 'bg-slate-950/40 border-slate-900/50 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                }`}
                id={`btn-theme-${t}`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* 2. THREE COMPONENT BENTO BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Memories & photos preservation */}
          <div className={`p-6 rounded-2xl border ${style.card} space-y-4 flex flex-col justify-between h-72`}>
            <div>
              <span className="text-rose-400 text-[10px] font-bold tracking-widest uppercase block mb-1">
                Visual Preserve
              </span>
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                Our Shared Memories
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                Upload photos, record precious dates, and write cute descriptions to build your private scrapbook gallery.
              </p>
            </div>
            <button
              onClick={() => navigateTo(`/memories/${friendId}`)}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-rose-400" />
              <span>Preserve Memories</span>
            </button>
          </div>

          {/* Column 2: Our Playlist */}
          <div className={`p-6 rounded-2xl border ${style.card} space-y-4 flex flex-col justify-between h-72`}>
            <div>
              <span className="text-pink-400 text-[10px] font-bold tracking-widest uppercase block mb-1">
                Sound Track
              </span>
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                Our Shared Songs
              </h3>
              
              <div className="space-y-1.5 mt-3 max-h-24 overflow-y-auto pr-1">
                {songs.map((song, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-pink-500/40 pl-2">
                    {song}
                  </p>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSong} className="flex gap-1.5 mt-2">
              <input
                type="text"
                required
                placeholder="Song name..."
                value={newSong}
                onChange={(e) => setNewSong(e.target.value)}
                className="flex-1 bg-slate-950/60 border border-slate-900 focus:border-pink-500/40 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Column 3: Sweet letters card info */}
          <div className={`p-6 rounded-2xl border ${style.card} space-y-4 flex flex-col justify-between h-72`}>
            <div>
              <span className="text-violet-400 text-[10px] font-bold tracking-widest uppercase block mb-1">
                Postal Room
              </span>
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                Sweet Letters Note
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                Send small envelopes carrying cute, heartwarming text. These can be opened with letter-tearing visual effects!
              </p>
            </div>
            <button
              onClick={() => setIsWriteNoteOpen(true)}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              id="btn-trigger-write-note"
            >
              <Send className="w-3.5 h-3.5 text-violet-400" />
              <span>Write Love Note</span>
            </button>
          </div>

        </div>

        {/* 3. LOVE NOTES CHRONOLOGY */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase pl-1">
            Exchange Box Letters ({loveNotes.length})
          </h3>

          {loveNotes.length === 0 ? (
            <div className="p-12 text-center text-slate-600 bg-slate-900/5 rounded-2xl border border-slate-900/60">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-800" />
              <p className="text-sm font-medium">Envelope rack is empty</p>
              <p className="text-xs text-slate-700 mt-1">Post a sweet love letter using the postal box.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {loveNotes.map((note) => {
                const isMe = note.senderId === user?.uid;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className={`p-4 rounded-xl border flex flex-col justify-between h-36 relative transition-all duration-300 hover:scale-102 cursor-pointer ${
                      note.isOpened 
                        ? 'bg-slate-950/30 border-slate-900 text-slate-400' 
                        : isMe 
                          ? 'bg-slate-950/60 border-slate-900 text-slate-400' 
                          : 'bg-gradient-to-tr from-violet-950/20 to-rose-950/20 border-rose-500/25 text-rose-200 animate-pulse'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold block text-slate-500">
                        {isMe ? "From You" : `From ${note.senderName}`}
                      </span>
                      <p className="text-xs mt-3 leading-relaxed truncate-3-lines">
                        {note.isOpened || isMe ? note.content : "Unopened sweet letter... 💌 Click to read"}
                      </p>
                    </div>

                    <span className="text-[8px] text-slate-600 mt-2 block">
                      {new Date(note.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* 4. MODAL WRITE NOTE */}
      {isWriteNoteOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-850 p-6 rounded-2xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-100 tracking-wide mb-2 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-violet-400 fill-violet-400/20" /> Write Sweet Love Note
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Drop some heartwarming lines inside an envelope. It will notify your partner immediately.
            </p>

            <form onSubmit={handleSendNote} className="space-y-4">
              <textarea
                required
                maxLength={400}
                rows={4}
                placeholder="What do you want to say to your special connection?..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-750 focus:outline-none focus:ring-0 leading-relaxed"
                id="note-textarea"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewNoteContent('');
                    setIsWriteNoteOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-400 border border-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                  id="note-submit"
                >
                  Post Note 💌
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL VIEW / OPEN NOTE */}
      {openedNote && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-850 p-6 rounded-2xl shadow-2xl text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
              💌
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                SWEET CORRESPONDENCE
              </span>
              <p className="text-sm text-slate-300 leading-relaxed italic pt-2">
                "{openedNote.content}"
              </p>
              <p className="text-xs font-bold text-rose-300 pt-4">
                — {openedNote.senderName}
              </p>
            </div>

            <button
              onClick={() => setOpenedNote(null)}
              className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-xs font-semibold text-slate-400 cursor-pointer"
            >
              Close Envelope
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
