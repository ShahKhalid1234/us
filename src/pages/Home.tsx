import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { UserProfile, Conversation, Friendship } from '../types';
import { db, collection, query, where, onSnapshot, orderBy, limit, getDoc, doc } from '../firebase/config';
import { MessageSquare, Heart, Sparkles, Send, Star, Users, Phone, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { Navbar } from '../components/Navbar';

export const Home: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useNavigation();

  const [recentConversations, setRecentConversations] = useState<(Conversation & { partnerProfile?: UserProfile })[]>([]);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [dailyMoment, setDailyMoment] = useState('');
  const [savedMoment, setSavedMoment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved moment from localStorage for standard persistence of minor non-db items
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`luvora_moment_${user.uid}`);
      if (stored) {
        setSavedMoment(stored);
      }
    }
  }, [user]);

  // Subscribe to friendships and load partner profiles
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'friendships'),
      where('user1Id', '==', user.uid)
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('user2Id', '==', user.uid)
    );

    const loadFriends = (snap1Docs: any[], snap2Docs: any[]) => {
      const allDocs = [...snap1Docs, ...snap2Docs];
      const friendIds = allDocs
        .map((docSnap) => {
          const data = docSnap.data();
          return data.user1Id === user.uid ? data.user2Id : data.user1Id;
        })
        .filter(Boolean);

      if (friendIds.length === 0) {
        setFriendsList([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const unsubscribes = friendIds.map((id) => {
        return onSnapshot(doc(db, 'users', id), (uSnap) => {
          if (uSnap.exists()) {
            const p = uSnap.data() as UserProfile;
            setFriendsList((prev) => {
              const filtered = prev.filter((item) => item.uid !== p.uid);
              return [...filtered, p];
            });
          }
        });
      });

      return () => unsubscribes.forEach((unsub) => unsub());
    };

    let docs1: any[] = [];
    let docs2: any[] = [];

    const unsub1 = onSnapshot(q, (snapshot) => {
      docs1 = snapshot.docs;
      loadFriends(docs1, docs2);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      docs2 = snapshot.docs;
      loadFriends(docs1, docs2);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // Subscribe to recent conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos: (Conversation & { partnerProfile?: UserProfile })[] = [];
      
      for (const d of snapshot.docs) {
        const data = d.data() as Conversation;
        const partnerId = data.participants.find((id) => id !== user.uid) || '';
        
        if (partnerId) {
          const pSnap = await getDoc(doc(db, 'users', partnerId));
          const partnerProfile = pSnap.exists() ? (pSnap.data() as UserProfile) : undefined;
          convos.push({
            ...data,
            partnerProfile
          });
        }
      }
      setRecentConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveMoment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyMoment.trim() || !user) return;
    localStorage.setItem(`luvora_moment_${user.uid}`, dailyMoment);
    setSavedMoment(dailyMoment);
    setDailyMoment('');
  };

  const handleClearMoment = () => {
    if (!user) return;
    localStorage.removeItem(`luvora_moment_${user.uid}`);
    setSavedMoment(null);
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar />

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Personalized Welcoming Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl bg-gradient-to-tr from-violet-950/30 via-slate-900/40 to-rose-950/15 border border-slate-900/80 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tr from-violet-500/10 to-rose-500/5 filter blur-3xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-rose-400 font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-spin delay-1000" /> Welcome back
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-100">
                {userProfile ? `Welcome to your universe, ${userProfile.displayName}` : 'Welcome, traveler'} ✨
              </h2>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                A private, high-fidelity digital safe-haven curated exclusively for your closest relationships.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Home Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Column Left: Conversations & Social connections */}
          <div className="space-y-6">
            
            {/* Recent Chats Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase pl-1">
                Recent Conversations
              </h3>
              
              {recentConversations.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/10 border border-slate-900 text-center text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 text-slate-800" />
                  <p className="text-sm font-medium">No recent conversations</p>
                  <p className="text-xs text-slate-600 mt-1">Start a conversation from your friends list!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => navigateTo(`/chat/${convo.id}`)}
                      className="p-4 rounded-xl bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900/60 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-850 overflow-hidden border border-slate-800 relative shrink-0">
                          {convo.partnerProfile?.profilePhoto ? (
                            <img src={convo.partnerProfile.profilePhoto} alt={convo.partnerProfile.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-sm text-rose-300">
                              {convo.partnerProfile?.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {convo.partnerProfile?.onlineStatus === 'online' && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full"></span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-200 group-hover:text-rose-200 transition-colors">
                            {convo.partnerProfile?.displayName || 'Luvora Partner'}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5 leading-relaxed">
                            {convo.lastMessage ? convo.lastMessage.content : 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      
                      {convo.unreadCount && convo.unreadCount[user?.uid || ''] > 0 && (
                        <span className="bg-gradient-to-r from-violet-500 to-rose-500 text-white text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-sm">
                          {convo.unreadCount[user?.uid || '']}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Friends connections */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pl-1">
                <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                  Connected Hearts
                </h3>
                <button 
                  onClick={() => navigateTo('/friends')}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
                >
                  Manage
                </button>
              </div>

              {friendsList.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/10 border border-slate-900 text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-3 text-slate-800" />
                  <p className="text-sm font-medium">Your circle is empty</p>
                  <p className="text-xs text-slate-600 mt-1">Search or invite friends to join your universe.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {friendsList.map((friend) => (
                    <div
                      key={friend.uid}
                      onClick={() => navigateTo(`/profile/${friend.username}`)}
                      className="p-3.5 rounded-xl bg-slate-900/10 border border-slate-900/60 flex items-center gap-3 hover:bg-slate-900/30 transition-all cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-850 overflow-hidden border border-slate-800 relative shrink-0">
                        {friend.profilePhoto ? (
                          <img src={friend.profilePhoto} alt={friend.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-semibold text-xs text-rose-300">
                            {friend.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-950 ${
                          friend.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-650'
                        }`}></span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-300 truncate group-hover:text-rose-200 transition-colors">
                          {friend.displayName}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {friend.onlineStatus === 'online' ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column Right: Love space access & Today's Moment interactive thought-pad */}
          <div className="space-y-6">
            
            {/* Love Space Entrance Panel */}
            <div className="p-6 rounded-2xl bg-gradient-to-tr from-violet-900/20 to-rose-900/10 border border-rose-500/10 relative overflow-hidden flex flex-col justify-between h-56">
              
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Heart className="w-28 h-28 text-rose-500 fill-rose-500" />
              </div>

              <div>
                <span className="text-violet-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 mb-2">
                  <Star className="w-3.5 h-3.5 fill-violet-400/20" /> Shared fantasy
                </span>
                <h3 className="text-xl font-bold text-rose-200 tracking-tight">
                  Your Shared Love Space
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  Enter a small fantasy world made for two. Exchange private letters and save precious memories together.
                </p>
              </div>

              <button
                onClick={() => {
                  if (friendsList.length > 0) {
                    navigateTo(`/love-space/${friendsList[0].uid}`);
                  } else {
                    navigateTo('/friends');
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer w-full"
                id="btn-enter-love-space"
              >
                <span>Enter Your Space</span>
                <Heart className="w-3.5 h-3.5 fill-white/20" />
              </button>
            </div>

            {/* Today's Moment Interactive thought pad */}
            <div className="p-6 rounded-2xl bg-slate-900/10 border border-slate-900/80 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">
                  Today's Moment
                </h4>
                <p className="text-xs text-slate-400 italic">
                  "What's one thing that made you smile today?"
                </p>
              </div>

              {savedMoment ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 relative group text-sm text-slate-300 leading-relaxed italic pr-8">
                  "{savedMoment}"
                  <button
                    onClick={handleClearMoment}
                    className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete moment"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveMoment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="Write a sweet moment..."
                    value={dailyMoment}
                    onChange={(e) => setDailyMoment(e.target.value)}
                    className="flex-1 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer"
                    title="Save moment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
