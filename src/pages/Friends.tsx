import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { UserProfile, FriendRequest } from '../types';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Heart, Users, MessageSquare, Trash2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion } from 'motion/react';

export const Friends: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useNavigation();

  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to Accepted Friendships (mutual)
  useEffect(() => {
    if (!user) return;

    // We fetch where user1 is current user
    const q1 = query(collection(db, 'friendships'), where('user1Id', '==', user.uid));
    // We fetch where user2 is current user
    const q2 = query(collection(db, 'friendships'), where('user2Id', '==', user.uid));

    const loadFriends = (snap1: any[], snap2: any[]) => {
      const allDocs = [...snap1, ...snap2];
      const friendIds = allDocs.map(d => {
        const data = d.data();
        return data.user1Id === user.uid ? data.user2Id : data.user1Id;
      });

      if (friendIds.length === 0) {
        setFriendsList([]);
        setLoading(false);
        return;
      }

      const unsubs = friendIds.map(id => {
        return onSnapshot(doc(db, 'users', id), (snap) => {
          if (snap.exists()) {
            const p = snap.data() as UserProfile;
            setFriendsList(prev => {
              const filtered = prev.filter(item => item.uid !== p.uid);
              return [...filtered, p];
            });
          }
        });
      });

      return () => unsubs.forEach(u => u());
    };

    let docs1: any[] = [];
    let docs2: any[] = [];

    const unsub1 = onSnapshot(q1, (snap) => {
      docs1 = snap.docs;
      loadFriends(docs1, docs2);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      docs2 = snap.docs;
      loadFriends(docs1, docs2);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // 2. Subscribe to Incoming and Outgoing Friend Requests
  useEffect(() => {
    if (!user) return;

    // Incoming requests (receiver is me)
    const qi = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubIncoming = onSnapshot(qi, (snapshot) => {
      const reqs: FriendRequest[] = [];
      snapshot.forEach((d) => reqs.push(d.data() as FriendRequest));
      setIncomingRequests(reqs);
    });

    // Outgoing requests (sender is me)
    const qo = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubOutgoing = onSnapshot(qo, (snapshot) => {
      const reqs: FriendRequest[] = [];
      snapshot.forEach((d) => reqs.push(d.data() as FriendRequest));
      setOutgoingRequests(reqs);
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [user]);

  const handleAccept = async (req: FriendRequest) => {
    if (!userProfile) return;
    try {
      await dbService.acceptFriendRequest(req, userProfile);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await dbService.rejectFriendRequest(reqId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (reqId: string) => {
    try {
      await dbService.cancelFriendRequest(reqId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !window.confirm("Are you sure you want to remove this connection? Your chat logs and Love Space memories will be deleted.")) return;
    try {
      await dbService.removeFriend(friendId, user.uid);
      setFriendsList(prev => prev.filter(f => f.uid !== friendId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChat = async (friendId: string) => {
    if (!user) return;
    try {
      const convoId = await dbService.getOrCreateConversation(user.uid, friendId);
      navigateTo(`/chat/${convoId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title="Connected Hearts" />

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        
        {/* Dynamic header summary */}
        <div className="flex justify-between items-baseline border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide">
              Your Close Circle
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect privately with your spouse, best friend, or partner.
            </p>
          </div>
          <span className="text-xs text-rose-400 font-semibold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
            {friendsList.length} Connected
          </span>
        </div>

        {/* 1. INCOMING REQUESTS SECTION */}
        {incomingRequests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-violet-400 tracking-wider uppercase pl-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-violet-400" /> Incoming Requests ({incomingRequests.length})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <div 
                  key={req.id}
                  className="p-4 rounded-xl bg-gradient-to-r from-violet-950/20 to-slate-900/35 border border-violet-500/25 flex items-center justify-between shadow-sm"
                >
                  <div 
                    onClick={() => navigateTo(`/profile/${req.senderUsername}`)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-850 bg-slate-900 shrink-0">
                      {req.senderPhoto ? (
                        <img src={req.senderPhoto} alt={req.senderDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold text-rose-300">
                          {req.senderDisplayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-200 hover:text-rose-200 transition-colors truncate">
                        {req.senderDisplayName}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        @{req.senderUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 ml-4">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
                      title="Decline"
                      id={`btn-decline-${req.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAccept(req)}
                      className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white transition-all shadow-md cursor-pointer"
                      title="Accept"
                      id={`btn-accept-${req.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. ACTIVE FRIENDS LIST */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase pl-1">
            Connections ({friendsList.length})
          </h3>

          {friendsList.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/10 border border-slate-900/80 text-center text-slate-500 max-w-md mx-auto mt-6">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-850" />
              <h4 className="text-base font-bold text-slate-300">Your universe is quiet</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Connect with special individuals by searching their unique username, then share a beautiful fantasy Love Space together.
              </p>
              <button
                onClick={() => navigateTo('/search')}
                className="mt-6 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Find Partner
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendsList.map((friend) => (
                <div
                  key={friend.uid}
                  className="p-4 rounded-xl bg-slate-900/15 border border-slate-900 hover:border-slate-800 transition-all flex items-center justify-between group"
                >
                  <div 
                    onClick={() => navigateTo(`/profile/${friend.username}`)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-800 border border-slate-800 relative shrink-0">
                      {friend.profilePhoto ? (
                        <img src={friend.profilePhoto} alt={friend.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center font-bold text-sm text-rose-300">
                          {friend.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                        friend.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}></span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-200 group-hover:text-rose-200 transition-colors truncate">
                        {friend.displayName}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        @{friend.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleRemoveFriend(friend.uid)}
                      className="p-2 rounded-xl hover:bg-rose-950/25 border border-transparent hover:border-rose-500/20 text-slate-600 hover:text-rose-400 transition-all cursor-pointer"
                      title="Disconnect"
                      id={`btn-disconnect-${friend.uid}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartChat(friend.uid)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-800 transition-all cursor-pointer"
                      title="Send Message"
                      id={`btn-chat-${friend.uid}`}
                    >
                      <MessageSquare className="w-4 h-4 fill-rose-500/5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. SENT OUTGOING REQUESTS */}
        {outgoingRequests.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-900">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase pl-1">
              Pending Sent Requests ({outgoingRequests.length})
            </h3>

            <div className="space-y-2.5 max-w-md">
              {outgoingRequests.map((req) => (
                <div 
                  key={req.id}
                  className="p-3.5 rounded-xl bg-slate-900/10 border border-slate-900/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-800">
                      {req.senderPhoto ? (
                        <img src={req.senderPhoto} alt="Receiver Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Heart className="w-4 h-4 text-slate-600 mx-auto mt-2" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      Waiting for approval...
                    </span>
                  </div>

                  <button
                    onClick={() => handleCancel(req.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg border border-rose-500/10 transition-all cursor-pointer"
                    id={`btn-cancel-req-${req.id}`}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
