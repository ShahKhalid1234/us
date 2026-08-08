import React, { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Mail, ArrowLeft, Send, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ForgotPassword: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let friendlyError = "We couldn't send the password reset email. Please verify your address.";
      if (err.code === 'auth/user-not-found') {
        friendlyError = "No account exists with this email address.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "The email address is invalid.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
      
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full filter blur-[150px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <button
          onClick={() => navigateTo('/login')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 font-semibold mb-6 group cursor-pointer"
          id="btn-forgot-back"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Login</span>
        </button>

        {success ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-wide">Reset Link Sent!</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Check your inbox at <span className="text-violet-300 font-medium">{email}</span>.
              </p>
            </div>

            {/* High-visibility Deliverability / Spam Callout */}
            <div className="text-left p-4 rounded-xl bg-violet-950/20 border border-violet-900/30 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p className="font-semibold text-violet-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                Deliverability Notice (Spam/Junk Folder)
              </p>
              <p>
                Because this app runs in a secure sandbox, password reset emails are sent from:
              </p>
              <div className="font-mono bg-slate-950 px-2 py-1.5 rounded border border-slate-900 text-violet-200 select-all overflow-x-auto break-all text-[11px]">
                noreply@perceptive-upgrade-j5jvd.firebaseapp.com
              </div>
              <p>
                Email providers (like Gmail) will frequently filter emails from newly registered subdomains. 
                <strong className="text-violet-200"> Please check your Spam, Junk, and Promotions folders!</strong>
              </p>
            </div>

            <button
              onClick={() => navigateTo('/login')}
              className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-sm font-semibold transition-all cursor-pointer"
            >
              Return to Login Page
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black tracking-tight text-slate-100">RECOVER ACCOUNT</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Enter your registered email below, and we'll send you a secure link to reset your password.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
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
                    id="forgot-email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-sm font-bold text-white transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                id="btn-forgot-submit"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send Reset Email</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </motion.div>
    </div>
  );
};
