import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { UserProfile, FriendRequest } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Search as SearchIcon, UserPlus, Heart, MessageSquare, ArrowRight, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion } from 'motion/react';

export const Search: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<Record<string, 'connected' | 'sent' | 'received' | 'none'>>({});
  const [requestMap, setRequestMap] = useState<Record<string, string>>({}); // uid -> requestId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Search profiles
      const users = await dbService.searchUsers(searchQuery, user.uid);
      setResults(users);

      if (users.length === 0) {
        setLoading(false);
        return;
      }

      // Resolve connection statuses
      const statusMap: Record<string, 'connected' | 'sent' | 'received' | 'none'> = {};
      const reqIdMap: Record<string, string> = {};

      const friendQuery = query(
        collection(db, 'friendships'),
        where('user1Id', '==', user.uid)
      );
      const friendQuery2 = query(
        collection(db, 'friendships'),
        where('user2Id', '==', user.uid)
      );

      const requestSentQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const requestReceivedQuery = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const [friendSnap, friendSnap2, sentSnap, receivedSnap] = await Promise.all([
        getDocs(friendQuery),
        getDocs(friendQuery2),
        getDocs(requestSentQuery),
        getDocs(requestReceivedQuery)
      ]);

      const connectedUids = new Set<string>();
      friendSnap.forEach(d => connectedUids.add(d.data().user2Id));
      friendSnap2.forEach(d => connectedUids.add(d.data().user1Id));

      const sentUids = new Map<string, string>();
      sentSnap.forEach(d => {
        const data = d.data();
        sentUids.set(data.receiverId, d.id);
      });

      const receivedUids = new Map<string, string>();
      receivedSnap.forEach(d => {
        const data = d.data();
        receivedUids.set(data.senderId, d.id);
      });

      users.forEach(u => {
        if (connectedUids.has(u.uid)) {
          statusMap[u.uid] = 'connected';
        } else if (sentUids.has(u.uid)) {
          statusMap[u.uid] = 'sent';
          reqIdMap[u.uid] = sentUids.get(u.uid) || '';
        } else if (receivedUids.has(u.uid)) {
          statusMap[u.uid] = 'received';
          reqIdMap[u.uid] = receivedUids.get(u.uid) || '';
        } else {
          statusMap[u.uid] = 'none';
        }
      });

      setFriendshipStatus(statusMap);
      setRequestMap(reqIdMap);

    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while executing search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (searchedUser: UserProfile) => {
    if (!userProfile) return;
    try {
      await dbService.sendFriendRequest(userProfile, searchedUser.uid);
      setFriendshipStatus(prev => ({ ...prev, [searchedUser.uid]: 'sent' }));
    } catch (err: any) {
      console.error("Add friend error:", err);
      alert(err.message || "Could not send friend request.");
    }
  };

  const handleStartChat = async (uid: string) => {
    if (!user) return;
    try {
      const convoId = await dbService.getOrCreateConversation(user.uid, uid);
      navigateTo(`/chat/${convoId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title="Search Universe" />

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <SearchIcon className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              required
              placeholder="Search by unique @username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
              id="search-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-500/10 shrink-0 cursor-pointer disabled:opacity-50"
            id="search-submit"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase pl-1">
            Search Results ({results.length})
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
              <div className="w-8 h-8 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin"></div>
              <p className="text-xs mt-2">Searching database...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <SearchIcon className="w-8 h-8 mx-auto mb-3 text-slate-800" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-slate-700 mt-1">Try spelling the full username exactly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((searchedUser) => {
                const status = friendshipStatus[searchedUser.uid] || 'none';
                return (
                  <div
                    key={searchedUser.uid}
                    className="p-4 rounded-xl bg-slate-900/15 border border-slate-900 hover:border-slate-800 transition-all flex items-center justify-between group"
                  >
                    <div 
                      onClick={() => navigateTo(`/profile/${searchedUser.username}`)}
                      className="flex items-center gap-3.5 cursor-pointer min-w-0 flex-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-800 overflow-hidden shrink-0">
                        {searchedUser.profilePhoto ? (
                          <img src={searchedUser.profilePhoto} alt={searchedUser.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-sm text-rose-300">
                            {searchedUser.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-200 group-hover:text-rose-200 transition-colors truncate">
                          {searchedUser.displayName}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          @{searchedUser.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {status === 'connected' && (
                        <>
                          <button
                            onClick={() => handleStartChat(searchedUser.uid)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-rose-400 cursor-pointer"
                            title="Message Partner"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 uppercase tracking-wider">
                            Connected
                          </span>
                        </>
                      )}

                      {status === 'sent' && (
                        <span className="text-[10px] font-extrabold text-violet-400 bg-violet-500/5 px-3 py-1.5 rounded-lg border border-violet-500/10 uppercase tracking-wider">
                          Sent Pending
                        </span>
                      )}

                      {status === 'received' && (
                        <button
                          onClick={() => navigateTo('/friends')}
                          className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-[10px] font-bold text-white rounded-lg uppercase tracking-wider cursor-pointer"
                        >
                          Review Request
                        </button>
                      )}

                      {status === 'none' && (
                        <button
                          onClick={() => handleAddFriend(searchedUser)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
                          id={`btn-add-friend-${searchedUser.uid}`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      )}

                      <button
                        onClick={() => navigateTo(`/profile/${searchedUser.username}`)}
                        className="p-2 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="View Profile"
                      >
                        <ArrowRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};
