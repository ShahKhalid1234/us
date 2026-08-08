import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Conversation, UserProfile } from '../types';
import { MessageSquare, Heart, Sparkles, Plus, Search } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion } from 'motion/react';

export const Chats: React.FC = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const [conversations, setConversations] = useState<(Conversation & { partnerProfile?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load active conversations in descending order of last update
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: (Conversation & { partnerProfile?: UserProfile })[] = [];

      for (const d of snapshot.docs) {
        const convoData = d.data() as Conversation;
        const partnerId = convoData.participants.find((id) => id !== user.uid) || '';

        if (partnerId) {
          // One-time fetch of partner's profile
          const pSnap = await getDoc(doc(db, 'users', partnerId));
          const partnerProfile = pSnap.exists() ? (pSnap.data() as UserProfile) : undefined;
          list.push({
            ...convoData,
            partnerProfile
          });
        }
      }

      setConversations(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to conversations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title="Conversations" />

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Chats Header Info card */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide">
              Your Dialogues
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Private and fully encrypted communication channels.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/friends')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/10 text-violet-400 hover:bg-violet-600/20 text-xs font-semibold border border-violet-500/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Message
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-500">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-xs mt-2">Loading private chats...</p>
          </div>
        ) : conversations.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 rounded-2xl bg-slate-900/10 border border-slate-900/80 text-center text-slate-500 max-w-md mx-auto mt-8"
          >
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-800" />
            <h3 className="text-base font-bold text-slate-300">No active dialogues yet</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Find friends or search for partners to establish secure real-time communication.
            </p>
            <button
              onClick={() => navigateTo('/search')}
              className="mt-6 px-4 py-2 bg-gradient-to-r from-violet-600 to-rose-500 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer"
            >
              Search Users
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => navigateTo(`/chat/${convo.id}`)}
                className="p-4 rounded-xl bg-slate-900/15 hover:bg-slate-900/35 border border-slate-900/60 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  
                  {/* Photo with Online Badge */}
                  <div className="w-12 h-12 rounded-full bg-slate-850 overflow-hidden border border-slate-800 relative shrink-0">
                    {convo.partnerProfile?.profilePhoto ? (
                      <img src={convo.partnerProfile.profilePhoto} alt={convo.partnerProfile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm text-rose-300">
                        {convo.partnerProfile?.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {convo.partnerProfile?.onlineStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-slate-950 rounded-full"></span>
                    )}
                  </div>

                  {/* Name and Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-slate-200 group-hover:text-rose-200 transition-colors truncate">
                        {convo.partnerProfile?.displayName || 'Luvora Connection'}
                      </h4>
                      {convo.lastMessage && (
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap shrink-0">
                          {formatTimestamp(convo.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 mt-0.5">
                      <p className="text-xs text-slate-400 truncate leading-relaxed max-w-[260px] sm:max-w-sm">
                        {convo.lastMessage ? convo.lastMessage.content : 'No messages yet'}
                      </p>
                      
                      {/* Typing indicator or unread badge */}
                      {convo.typing && convo.typing[convo.partnerProfile?.uid || ''] ? (
                        <span className="text-[10px] text-rose-400 italic font-medium animate-pulse">
                          Typing...
                        </span>
                      ) : convo.unreadCount && convo.unreadCount[user?.uid || ''] > 0 ? (
                        <span className="bg-gradient-to-r from-violet-500 to-rose-500 text-white text-[9px] font-black h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-sm">
                          {convo.unreadCount[user?.uid || '']}
                        </span>
                      ) : null}
                    </div>

                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};
