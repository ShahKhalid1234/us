import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { signInWithEmailAndPassword, sendEmailVerification, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { dbService } from '../services/dbService';
import { Heart, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { refreshAuth, loginAsMockUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine final login identifier
      const finalEmail = email.includes('@') ? email.trim() : `${email.toLowerCase().trim()}@luvora.user`;
      
      const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
      const user = userCredential.user;

      // Refresh authentication state to ensure emailVerified is up-to-date
      await refreshAuth();

      // Automatically bypass verification for @luvora.user accounts
      if (user.email?.endsWith('@luvora.user')) {
        localStorage.setItem('bypass_verification', 'true');
        navigateTo('/home');
      } else if (!user.emailVerified) {
        // Send verification if they didn't get it
        try {
          await sendEmailVerification(user);
        } catch (e) {
          console.log("Verification email rate-limited or already sent");
        }
        navigateTo('/verify-email');
      } else {
        navigateTo('/home');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let friendlyError = "Incorrect username/email or password.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = "Incorrect username/email or password.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid username or email address.";
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = "Too many failed attempts. Please try again later.";
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyError = "Email/Password sign-in is disabled in your Firebase Console. Please go to Firebase Console -> Authentication -> Sign-in methods to enable 'Email/Password'. In the meantime, you can instantly test all features by logging into Romeo or Juliet using the Demo Sandbox below!";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'romeo' | 'juliet') => {
    setLoading(true);
    setError(null);
    const demoEmail = `${role}@luvora.demo`;
    const demoPassword = 'LuvoraDemo123!';
    const demoUsername = role;
    const demoDisplayName = role.charAt(0).toUpperCase() + role.slice(1);

    try {
      // Try to sign in first
      const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      
      // Ensure user profile document exists in firestore
      const user = userCredential.user;
      const profile = await dbService.getUserProfile(user.uid);
      if (!profile) {
        const profileData = {
          uid: user.uid,
          username: demoUsername,
          displayName: demoDisplayName,
          bio: `Demo account for ${demoDisplayName} ✨`,
          profilePhoto: "",
          onlineStatus: "online" as const,
          lastSeen: Date.now(),
          joinedDate: Date.now(),
          friendCount: 0
        };
        await dbService.createUserProfile(profileData);
      }
      
      localStorage.setItem('bypass_verification', 'true');
      await refreshAuth();
      navigateTo('/home');
    } catch (err: any) {
      console.warn("Firebase demo auth failed, using local sandbox fallback:", err);
      try {
        await loginAsMockUser(demoEmail, demoDisplayName, role);
        navigateTo('/home');
      } catch (fallbackErr: any) {
        console.error("Local sandbox fallback login failed:", fallbackErr);
        setError(`Failed to login with demo: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
      
      {/* Visual background ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full filter blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-rose-500/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        
        {/* Brand Banner */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-rose-500 to-pink-400 p-0.5 shadow-xl shadow-rose-500/10 mb-4">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-500/10 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-200 via-rose-200 to-pink-200 bg-clip-text text-transparent">
            LUVORA
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">
            A private digital universe for couples & friends
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <UserCheck className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="e.g. alex.mercer"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
                id="login-email"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigateTo('/forgot-password')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                id="link-forgot-password"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
                id="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-sm font-bold text-white transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-login-submit"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Enter Your Universe</span>
                <Sparkles className="w-4 h-4 text-rose-200 fill-rose-200/20" />
              </>
            )}
          </button>
        </form>
        
        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-900"></div>
          </div>
          <span className="relative px-3 bg-slate-950/40 backdrop-blur-xl text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Demo Sandbox Accounts
          </span>
        </div>

        {/* Demo Buttons */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Test the couples features (messaging, love space, real-time voice & video calls) instantly by logging into Romeo & Juliet:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('romeo')}
              disabled={loading}
              className="py-2.5 px-4 rounded-xl bg-violet-950/20 border border-violet-900/30 hover:bg-violet-950/40 text-xs font-bold text-violet-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              id="btn-demo-romeo"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Romeo</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('juliet')}
              disabled={loading}
              className="py-2.5 px-4 rounded-xl bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/40 text-xs font-bold text-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              id="btn-demo-juliet"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Juliet</span>
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center mt-8 text-slate-500 text-xs font-semibold">
          Don't have a private space yet?{" "}
          <button
            onClick={() => navigateTo('/register')}
            className="text-violet-400 hover:text-violet-300 font-bold ml-1 cursor-pointer"
            id="link-go-to-register"
          >
            Create an Account
          </button>
        </div>

      </motion.div>
    </div>
  );
};
