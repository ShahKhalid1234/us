import React, { useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Home, MessageSquare, Users, Search, Settings } from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../firebase/config';

export const MobileNav: React.FC = () => {
  const { currentPath, navigateTo } = useNavigation();
  const { user } = useAuth();
  
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Chats', path: '/chats', icon: MessageSquare, badge: unreadMessages },
    { name: 'Friends', path: '/friends', icon: Users },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-lg border-t border-slate-900 z-40 flex items-center justify-around px-4 pb-safe text-slate-400">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
        return (
          <button
            key={item.path}
            onClick={() => navigateTo(item.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative cursor-pointer ${
              isActive ? 'text-rose-400' : 'hover:text-slate-200'
            }`}
            id={`mobilenav-item-${item.name.toLowerCase()}`}
          >
            <div className="relative p-1">
              <Icon className={`w-5.5 h-5.5 ${isActive ? 'text-rose-400 fill-rose-500/5' : 'text-slate-500'}`} />
              
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-violet-500 to-rose-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-slate-950 shadow-sm">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
