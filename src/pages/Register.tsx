import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Heart, Mail, Lock, User, Sparkles, AlertCircle, Eye, EyeOff, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

export const Register: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateUsername = (name: string): boolean => {
    // Letters, numbers, underscores, periods.
    const regex = /^[a-zA-Z0-9_.]+$/;
    return regex.test(name);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!email || !username || !displayName || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (!validateUsername(username)) {
      setError("Username can only contain letters, numbers, underscores (_), and periods (.).");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if username is unique in firestore
      const isUnique = await dbService.isUsernameUnique(username);
      if (!isUnique) {
        setError("This username is already taken. Please try another one.");
        setLoading(false);
        return;
      }

      // 2. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Create profile document in firestore
      const profileData: UserProfile = {
        uid: user.uid,
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        bio: "Just joined Luvora ✨",
        profilePhoto: "", // empty placeholder to be uploaded or edited in Settings
        onlineStatus: "online",
        lastSeen: Date.now(),
        joinedDate: Date.now(),
        friendCount: 0
      };

      await dbService.createUserProfile(profileData);

      // 4. Send email verification
      await sendEmailVerification(user);

      // 5. Navigate to verification screen
      navigateTo('/verify-email');
    } catch (err: any) {
      console.error("Registration error:", err);
      let friendlyError = "Something went wrong. Please try again.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = "An account with this email address already exists.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "The email address is invalid.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "The password is too weak.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
      
      {/* Decorative gradients */}
      <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-rose-600/10 rounded-full filter blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 left-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-200 via-rose-200 to-pink-200 bg-clip-text text-transparent">
            CREATE PRIVATE SPACE
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Begin your Luvora journey with a personal profile
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <UserCheck className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                maxLength={30}
                placeholder="Alex Mercer"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
                id="register-displayname"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
              Unique Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="alex.mercer"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
                id="register-username"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 pl-1">
              Used to find each other (e.g., lowercase, dots, underscores)
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="alex@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-sm placeholder-slate-600 focus:outline-none transition-all"
                id="register-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 8 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-xs placeholder-slate-600 focus:outline-none transition-all"
                  id="register-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                Confirm
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-xs placeholder-slate-600 focus:outline-none transition-all"
                  id="register-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-sm font-bold text-white transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-register-submit"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Register & Verify Email</span>
                <Sparkles className="w-4 h-4 text-rose-200 fill-rose-200/20" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6 text-slate-500 text-xs font-semibold">
          Already have an account?{" "}
          <button
            onClick={() => navigateTo('/login')}
            className="text-violet-400 hover:text-violet-300 font-bold ml-1 cursor-pointer"
            id="link-go-to-login"
          >
            Login Here
          </button>
        </div>

      </motion.div>
    </div>
  );
};
