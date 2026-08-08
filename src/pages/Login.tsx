import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Heart, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { refreshAuth } = useAuth();
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Refresh authentication state to ensure emailVerified is up-to-date
      await refreshAuth();

      if (!user.emailVerified) {
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
      let friendlyError = "Invalid email or password. Please try again.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyError = "Incorrect email or password.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid email address.";
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = "Too many failed attempts. Please try again later.";
      }
      setError(friendlyError);
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
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="you@domain.com"
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
