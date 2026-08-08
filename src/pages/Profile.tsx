import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCall } from '../contexts/CallContext';
import { dbService } from '../services/dbService';
import { UserProfile, FriendRequest } from '../types';
import { db, collection, query, where, getDocs, limit } from '../firebase/config';
import { ArrowLeft, MessageSquare, Heart, Phone, Video, Calendar, Sparkles, Settings, UserPlus, AlertCircle, Sparkle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion } from 'motion/react';

export const Profile: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { params, navigateTo } = useNavigation();
  const { startCall } = useCall();
  const usernameParam = params.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'me' | 'connected' | 'sent' | 'received' | 'none'>('none');
  const [activeRequest, setActiveRequest] = useState<FriendRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usernameParam || !user) return;

    const fetchProfileAndStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', usernameParam.toLowerCase().trim()), limit(1));
        const snap = await getDocs(q);

        if (snap.empty) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const resolvedProfile = snap.docs[0].data() as UserProfile;
        if (!resolvedProfile || !resolvedProfile.uid) {
          throw new Error("User profile is missing a valid UID.");
        }
        setProfile(resolvedProfile);

        // 2. Check status relative to current user
        if (resolvedProfile.uid === user.uid) {
          setFriendshipStatus('me');
          setLoading(false);
          return;
        }

        // Check if mutual friendship exists
        const compositeId = [user.uid, resolvedProfile.uid].sort().join('_');
        const friendshipSnap = await getDocs(query(
          collection(db, 'friendships'),
          where('id', '==', compositeId)
        ));

        if (!friendshipSnap.empty) {
          setFriendshipStatus('connected');
          setLoading(false);
          return;
        }

        // Check if outgoing friend request exists
        const sentSnap = await getDocs(query(
          collection(db, 'friendRequests'),
          where('senderId', '==', user.uid),
          where('receiverId', '==', resolvedProfile.uid),
          where('status', '==', 'pending')
        ));

        if (!sentSnap.empty) {
          setFriendshipStatus('sent');
          setActiveRequest(sentSnap.docs[0].data() as FriendRequest);
          setLoading(false);
          return;
        }

        // Check if incoming friend request exists
        const receivedSnap = await getDocs(query(
          collection(db, 'friendRequests'),
          where('senderId', '==', resolvedProfile.uid),
          where('receiverId', '==', user.uid),
          where('status', '==', 'pending')
        ));

        if (!receivedSnap.empty) {
          setFriendshipStatus('received');
          setActiveRequest(receivedSnap.docs[0].data() as FriendRequest);
          setLoading(false);
          return;
        }

        setFriendshipStatus('none');

      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Could not resolve profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStatus();
  }, [usernameParam, user]);

  const handleAddFriend = async () => {
    if (!userProfile || !profile) return;
    try {
      await dbService.sendFriendRequest(userProfile, profile.uid);
      setFriendshipStatus('sent');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to send request.");
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeRequest || !userProfile) return;
    try {
      await dbService.acceptFriendRequest(activeRequest, userProfile);
      setFriendshipStatus('connected');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChat = async () => {
    if (!user || !profile) return;
    try {
      const convoId = await dbService.getOrCreateConversation(user.uid, profile.uid);
      navigateTo(`/chat/${convoId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (!profile) return;
    startCall(profile.uid, type, profile.displayName, profile.profilePhoto);
  };

  const handleLoveSpace = () => {
    if (!profile) return;
    navigateTo(`/love-space/${profile.uid}`);
  };

  const formatDate = (ts: number): string => {
    return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title={profile ? `${profile.displayName}'s Space` : 'Profile'} />

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Back Link */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 font-semibold mb-2 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-500">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-xs mt-2">Opening profile coordinates...</p>
          </div>
        ) : !profile ? (
          <div className="p-12 rounded-2xl bg-slate-900/10 border border-slate-900/85 text-center text-slate-500 max-w-md mx-auto mt-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-rose-500" />
            <h4 className="text-base font-bold text-slate-300">Space coordinate not found</h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              The user with username <span className="text-violet-300 font-semibold">@{usernameParam}</span> does not exist in our galaxy database.
            </p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            
            {/* Main Profile Info Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-tr from-slate-900/40 via-slate-900/60 to-rose-950/5 border border-slate-900 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-violet-600/5 filter blur-2xl pointer-events-none"></div>

              {/* Profile Photo */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-rose-500/30 bg-slate-850 p-1">
                  {profile.profilePhoto ? (
                    <img src={profile.profilePhoto} alt={profile.displayName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-850 flex items-center justify-center text-2xl font-black text-rose-300 shadow-inner">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                  profile.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}></span>
              </div>

              {/* Titles */}
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{profile.displayName}</h2>
              <p className="text-xs text-slate-400 mt-1">@{profile.username}</p>

              {/* Friendship badge */}
              {friendshipStatus === 'connected' && (
                <span className="mt-3 bg-rose-500/10 text-rose-400 text-[10px] font-bold px-3 py-1 rounded-full border border-rose-500/20 uppercase tracking-widest">
                  Securely Connected
                </span>
              )}

              {/* Bio description */}
              <p className="text-sm text-slate-400 mt-5 max-w-sm leading-relaxed italic">
                "{profile.bio}"
              </p>

              {/* Joined metadata */}
              <div className="flex items-center gap-2 mt-6 text-[11px] text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {formatDate(profile.joinedDate)}</span>
                <span className="mx-1">•</span>
                <span>{profile.friendCount} Friends</span>
              </div>
            </div>

            {/* DYNAMIC ACTIONS BOARD */}
            <div className="p-6 rounded-2xl bg-slate-900/15 border border-slate-900/80">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-4 pl-1">
                Dialogue Coordinates
              </h3>

              {friendshipStatus === 'me' && (
                <button
                  onClick={() => navigateTo('/settings')}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-850 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn-profile-edit-shortcuts"
                >
                  <Settings className="w-4 h-4" />
                  <span>Update Profile Details</span>
                </button>
              )}

              {friendshipStatus === 'connected' && (
                <div className="space-y-4">
                  {/* Triple Row actions: Message, Love Space */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleStartChat}
                      className="py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-profile-message"
                    >
                      <MessageSquare className="w-4 h-4 text-rose-400 fill-rose-500/5" />
                      <span>Send Message</span>
                    </button>
                    <button
                      onClick={handleLoveSpace}
                      className="py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-profile-lovespace"
                    >
                      <Heart className="w-4 h-4 text-pink-400 fill-pink-400/10" />
                      <span>Love Space</span>
                    </button>
                  </div>

                  {/* Calling Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleCall('voice')}
                      className="py-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/15 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-profile-voice"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Voice Call</span>
                    </button>
                    <button
                      onClick={() => handleCall('video')}
                      className="py-3 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/15 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      id="btn-profile-video"
                    >
                      <Video className="w-4 h-4" />
                      <span>Video Call</span>
                    </button>
                  </div>
                </div>
              )}

              {friendshipStatus === 'none' && (
                <button
                  onClick={handleAddFriend}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-profile-add"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Send Friend Request</span>
                </button>
              )}

              {friendshipStatus === 'sent' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-xs text-center text-violet-400 font-semibold uppercase tracking-wider">
                  Request Sent Pending Approval
                </div>
              )}

              {friendshipStatus === 'received' && (
                <button
                  onClick={handleAcceptRequest}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/5"
                  id="btn-profile-accept"
                >
                  <Heart className="w-4 h-4 fill-white/10" />
                  <span>Accept Connection Invite</span>
                </button>
              )}

            </div>

          </motion.div>
        )}

      </main>
    </div>
  );
};
