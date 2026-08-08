import React, { useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Home, MessageSquare, Users, Search, Settings, LogOut, Heart, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const Sidebar: React.FC = () => {
  const { currentPath, navigateTo } = useNavigation();
  const { user, logout, userProfile } = useAuth();
  
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Subscribe to unread messages
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const unreadMap = data.unreadCount || {};
        count += unreadMap[user.uid] || 0;
      });
      setUnreadMessages(count);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to unread notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Chats', path: '/chats', icon: MessageSquare, badge: unreadMessages },
    { name: 'Friends', path: '/friends', icon: Users },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-900/80 h-screen sticky top-0 text-slate-300 font-sans p-6 justify-between shrink-0">
      <div className="flex flex-col gap-8">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => navigateTo('/home')}
          className="flex items-center gap-3 cursor-pointer group"
          id="sidebar-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-rose-500 to-pink-400 p-0.5 shadow-lg shadow-rose-500/10">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center transition-colors group-hover:bg-slate-900">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-200 via-rose-200 to-pink-200 bg-clip-text text-transparent">
              LUVORA
            </h1>
            <p className="text-[10px] text-violet-400 font-semibold tracking-widest uppercase">
              Digital Universe
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5" id="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-950/40 to-rose-950/25 text-rose-200 border border-violet-500/20 shadow-md shadow-violet-500/5'
                    : 'hover:bg-slate-900/60 hover:text-slate-100 text-slate-400'
                }`}
                id={`sidebar-item-${item.name.toLowerCase()}`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-rose-400 fill-rose-400/5' : 'text-slate-500 group-hover:text-slate-300'
                  }`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-gradient-to-r from-violet-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="flex flex-col gap-4 border-t border-slate-900/80 pt-6">
        {userProfile && (
          <div 
            onClick={() => navigateTo(`/profile/${userProfile.username}`)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900/40 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-800 bg-slate-900 shadow-sm shrink-0">
              {userProfile.profilePhoto ? (
                <img src={userProfile.profilePhoto} alt={userProfile.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold text-rose-300">
                  {userProfile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-slate-200 truncate group-hover:text-rose-200 transition-colors">
                {userProfile.displayName}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                @{userProfile.username}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-950/10 border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
          id="sidebar-logout"
        >
          <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
