import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { AppNotification, FriendRequest } from '../types';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Bell, Check, Trash2, Heart, MessageSquare, Star, Sparkles, X, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useNavigation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Subscribe to standard notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push(doc.data() as AppNotification);
      });
      setNotifications(notifs);
    }, (err) => {
      console.error("Error subscribing to notifications:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to pending friend requests
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: FriendRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push(doc.data() as FriendRequest);
      });
      setFriendRequests(reqs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!userProfile) return;
    try {
      await dbService.acceptFriendRequest(request, userProfile);
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    try {
      await dbService.rejectFriendRequest(request.id);
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await dbService.markNotificationAsRead(notifId);
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await dbService.clearAllNotifications(user.uid);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    handleMarkAsRead(notif.id);
    onClose();

    if (notif.data?.conversationId) {
      navigateTo(`/chat/${notif.data.conversationId}`);
    } else if (notif.data?.loveSpaceId) {
      // Extract partner UID from conversation/friendship ID (user1_user2)
      const parts = notif.data.loveSpaceId.split('_');
      const partnerId = parts.find(p => p !== user?.uid);
      if (partnerId) {
        navigateTo(`/love-space/${partnerId}`);
      }
    } else if (notif.type === 'friend_request') {
      navigateTo('/friends');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-slate-900 shadow-2xl flex flex-col justify-between z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">Notifications</h2>
            {(notifications.length > 0 || friendRequests.length > 0) && (
              <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-0.5 rounded-full border border-rose-500/20 font-semibold">
                {notifications.length + friendRequests.length} new
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Pending Friend Requests Section */}
          {friendRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-violet-400 tracking-wider uppercase">
                Pending Connections
              </h3>
              <div className="space-y-2.5">
                {friendRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-xl bg-gradient-to-r from-violet-950/20 to-slate-900/40 border border-violet-500/20 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                        {req.senderPhoto ? (
                          <img src={req.senderPhoto} alt={req.senderDisplayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-violet-900/30 flex items-center justify-center text-xs font-semibold text-violet-300">
                            {req.senderDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-200 truncate">
                          {req.senderDisplayName}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{req.senderUsername}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectRequest(req)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-semibold text-white transition-all shadow-sm shadow-rose-600/10 cursor-pointer"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard Notifications Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                Recent Updates
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-slate-500 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-slate-700 animate-pulse" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-slate-700 mt-1">We will notify you here when things happen.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => {
                  let Icon = Bell;
                  let colorClass = "text-violet-400 bg-violet-500/10 border-violet-500/20";
                  
                  if (notif.type === 'love_note') {
                    Icon = Heart;
                    colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                  } else if (notif.type === 'new_message') {
                    Icon = MessageSquare;
                    colorClass = "text-pink-400 bg-pink-500/10 border-pink-500/20";
                  } else if (notif.type === 'friend_accepted') {
                    Icon = UserCheck;
                    colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                  } else if (notif.type === 'memory_created') {
                    Icon = Star;
                    colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  }

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
                        notif.read 
                          ? 'bg-slate-950/20 border-slate-900/60 text-slate-400' 
                          : 'bg-slate-900/30 border-slate-800 text-slate-200 hover:border-slate-700 shadow-sm shadow-violet-500/2'
                      }`}
                    >
                      <div className={`p-2 rounded-xl border shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed">
                          {notif.content}
                        </p>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {!notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.id);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-900/80 text-center">
          <p className="text-[10px] text-slate-600">
            Luvora Secure Private Connections
          </p>
        </div>
      </div>
    </div>
  );
};
