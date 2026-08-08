import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { CallProvider } from './contexts/CallContext';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Home } from './pages/Home';
import { Chats } from './pages/Chats';
import { ChatDetail } from './pages/ChatDetail';
import { Friends } from './pages/Friends';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { LoveSpace } from './pages/LoveSpace';
import { Memories } from './pages/Memories';
import { Settings } from './pages/Settings';

// Components
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { CallOverlay } from './components/CallOverlay';

// Main Router Content Switcher
const AppContent: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const { path, matchRoute, navigateTo } = useNavigation();

  // 1. GLOBAL LOADING SHIELD
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-rose-500 rounded-full animate-spin"></div>
          <span className="absolute text-rose-400 text-sm animate-pulse">❤️</span>
        </div>
        <h1 className="text-lg font-black tracking-widest uppercase mt-6 bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent">
          Luvora
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
          Opening Private Portal...
        </p>
      </div>
    );
  }

  // Define Public routes
  const isPublicRoute = ['/login', '/register', '/forgot-password'].includes(path);

  // 2. AUTHENTICATION & VERIFICATION GUARDS
  if (!user) {
    // Force unauthenticated users to public pages
    if (!isPublicRoute) {
      setTimeout(() => navigateTo('/login'), 0);
      return null;
    }
  } else {
    // If logged in, enforce email verification (excluding verify-email view itself)
    if (!user.emailVerified && path !== '/verify-email') {
      setTimeout(() => navigateTo('/verify-email'), 0);
      return null;
    }

    // Protect authenticated users from returning to public pages (e.g. login)
    if (isPublicRoute) {
      setTimeout(() => navigateTo('/home'), 0);
      return null;
    }
  }

  // 3. SWITCH RENDER PAGE ROUTE MATCHES
  const renderPage = () => {
    if (!user) {
      if (path === '/login') return <Login />;
      if (path === '/register') return <Register />;
      if (path === '/forgot-password') return <ForgotPassword />;
      return <Login />;
    }

    // User is logged in and verified (or currently verifying email)
    if (path === '/verify-email') return <VerifyEmail />;
    if (path === '/home' || path === '/') return <Home />;
    if (path === '/chats') return <Chats />;
    if (path === '/friends') return <Friends />;
    if (path === '/search') return <Search />;
    if (path === '/settings') return <Settings />;

    // Regex matched paths
    if (matchRoute(/^\/chat\/([^/]+)$/)) return <ChatDetail />;
    if (matchRoute(/^\/profile\/([^/]+)$/)) return <Profile />;
    if (matchRoute(/^\/love-space\/([^/]+)$/)) return <LoveSpace />;
    if (matchRoute(/^\/memories\/([^/]+)$/)) return <Memories />;

    // Fallback if unmatched
    return <Home />;
  };

  // 4. SHELL DECORATOR: Render sidebars only on private authenticated views
  const isPrivateView = user && user.emailVerified && path !== '/verify-email';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      
      {/* Global Call Overlay (handles active WebRTC calls visually) */}
      <CallOverlay />

      {/* Left Sidebar navigation layout for Desktop desktops */}
      {isPrivateView && <Sidebar />}

      {/* Primary responsive layout core wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderPage()}
      </div>

      {/* Bottom bar Navigation drawer for mobiles */}
      {isPrivateView && <MobileNav />}

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}
