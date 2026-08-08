import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Bell, Heart, Search, Menu, MessageSquare } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationCenter } from './NotificationCenter';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useNavigation();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen for unread notifications & pending friend requests
    const notifQ = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubNotif = onSnapshot(notifQ, (snap) => {
      setUnreadNotifsCount(snap.size);
    });

    return () => {
      unsubNotif();
    };
  }, [user]);

  // Determine standard greetings
  const getGreeting = () => {
    if (!userProfile) return 'Welcome';
    const hrs = new Date().getHours();
    let greet = 'Good evening';
    if (hrs < 12) greet = 'Good morning';
    else if (hrs < 18) greet = 'Good afternoon';
    return `${greet}, ${userProfile.displayName} ✨`;
  };

  return (
    <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
      
      {/* Title / Greeting */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide truncate max-w-[200px] sm:max-w-xs">
          {title || getGreeting()}
        </h1>
        <p className="text-[10px] text-slate-500 hidden sm:block">
          Your secure digital universe
        </p>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-4">
        
        {/* Search quick button */}
        <button
          onClick={() => navigateTo('/search')}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all cursor-pointer"
          title="Search Users"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setIsNotifOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all relative cursor-pointer"
          id="btn-navbar-notifications"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse"></span>
          )}
        </button>

        {/* Profile Avatar Quick-link */}
        {userProfile && (
          <div 
            onClick={() => navigateTo(`/profile/${userProfile.username}`)}
            className="w-8 h-8 rounded-full overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            {userProfile.profilePhoto ? (
              <img src={userProfile.profilePhoto} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-rose-300">
                {userProfile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Sliding Notification Center Drawer */}
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </header>
  );
};
