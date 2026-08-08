import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Mail, RefreshCw, LogOut, CheckCircle, Sparkles, Send } from 'lucide-react';
import { motion } from 'motion/react';

export const VerifyEmail: React.FC = () => {
  const { user, refreshAuth } = useAuth();
  const { navigateTo } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Auto redirect if already verified or if they log out
  useEffect(() => {
    if (!user) {
      navigateTo('/login');
      return;
    }
    if (user.emailVerified) {
      navigateTo('/home');
    }
  }, [user, navigateTo]);

  const handleCheckVerification = async () => {
    setLoading(true);
    setResendStatus(null);
    try {
      await refreshAuth();
      if (auth.currentUser?.emailVerified) {
        navigateTo('/home');
      } else {
        setResendStatus("Email is still not verified. Please check your inbox and click the link.");
      }
    } catch (err) {
      console.error("Error refreshing auth status:", err);
      setResendStatus("Could not verify status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    setResendStatus(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendStatus("Verification email sent successfully! Please check spam or junk filters.");
    } catch (err: any) {
      console.error("Error sending verification email:", err);
      if (err.code === 'auth/too-many-requests') {
        setResendStatus("We've already sent an email. Please wait a bit before requesting another.");
      } else {
        setResendStatus("Could not send email. Please try again later.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigateTo('/login');
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
      
      {/* Visual background ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/10 rounded-full filter blur-[150px] pointer-events-none animate-pulse"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-2xl p-8 shadow-2xl relative z-10 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-rose-500 to-pink-400 p-0.5 shadow-xl shadow-rose-500/10 mb-6 mx-auto">
          <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
            <Mail className="w-7 h-7 text-rose-400 animate-bounce" />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-100 uppercase">
          VERIFY YOUR EMAIL
        </h1>
        
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          We sent a verification link to <br />
          <span className="text-violet-300 font-semibold">{user.email}</span>.
        </p>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Please click the link in that email to activate your account and gain access to your private Luvora space.
        </p>

        {resendStatus && (
          <div className="my-5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-rose-300 leading-relaxed">
            {resendStatus}
          </div>
        )}

        <div className="mt-8 space-y-3">
          
          <button
            onClick={handleCheckVerification}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-sm font-bold text-white transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-verify-check"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 animate-spin delay-1000" />
                <span>I've Verified My Email</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-900 text-xs font-semibold text-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-verify-resend"
          >
            {resending ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-slate-400" />
                <span>Resend Verification Email</span>
              </>
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-transparent hover:bg-rose-950/10 text-xs font-semibold text-slate-500 hover:text-rose-400 transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="btn-verify-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Use a Different Account</span>
          </button>

        </div>

      </motion.div>
    </div>
  );
};
