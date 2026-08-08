import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { dbService } from '../services/dbService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Settings as SettingsIcon, Camera, User, FileText, Check, AlertCircle, LogOut, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { motion } from 'motion/react';

export const Settings: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const { navigateTo } = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline' | 'away'>('online');
  const [base64Photo, setBase64Photo] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form with existing values
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setBio(userProfile.bio || '');
      setOnlineStatus(userProfile.onlineStatus || 'online');
      setBase64Photo(userProfile.profilePhoto || '');
    }
  }, [userProfile]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError("Only JPEG, PNG, and WEBP images are supported.");
      return;
    }

    if (file.size > 500 * 1024) {
      setPhotoError("Avatars must be smaller than 500 KB to optimize storage.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Photo(reader.result as string);
    };
    reader.onerror = () => {
      setPhotoError("Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !user) return;

    setSaving(true);
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        onlineStatus: onlineStatus,
        profilePhoto: base64Photo
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to update settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogOutClick = async () => {
    try {
      await logout();
      navigateTo('/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans pb-20 md:pb-6">
      <Navbar title="Settings" />

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Settings Info header */}
        <div className="border-b border-slate-900 pb-4">
          <h2 className="text-xl font-extrabold text-slate-100 tracking-wide">
            Your Core Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Update display parameters, coordinate handles, and manual active indicators.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Avatar and Profile Status Group */}
          <div className="p-6 rounded-2xl bg-slate-900/15 border border-slate-900 flex flex-col sm:flex-row items-center gap-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <SettingsIcon className="w-16 h-16 animate-spin delay-1000" />
            </div>

            {/* Avatar Selector */}
            <div className="relative shrink-0 group">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-800 bg-slate-950 relative">
                {base64Photo ? (
                  <img src={base64Photo} alt="My Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-lg text-rose-300">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Upload Hover overlay */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[9px] font-bold text-slate-300 cursor-pointer"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Upload</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Status Select & Photo error block */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                  Manual Status Coordinate
                </label>
                <div className="flex gap-2">
                  {(['online', 'away', 'offline'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setOnlineStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all capitalize ${
                        onlineStatus === status 
                          ? 'bg-slate-900 border-rose-500/30 text-rose-300 shadow-inner' 
                          : 'bg-slate-950/40 border-slate-900/50 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {photoError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-300 text-[10px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Text Settings Cards */}
          <div className="p-6 rounded-2xl bg-slate-900/10 border border-slate-900/80 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                  Unique Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-650">
                    @
                  </span>
                  <input
                    type="text"
                    disabled
                    value={userProfile.username}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950/30 border border-slate-900/40 rounded-xl text-xs text-slate-550 select-none cursor-not-allowed"
                  />
                </div>
                <p className="text-[9px] text-slate-600 mt-1 pl-1">
                  Usernames are locked permanently.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. Alex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-xs text-slate-200 focus:outline-none"
                    id="settings-displayname"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                Bio Description
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3.5 text-slate-500">
                  <FileText className="w-4 h-4" />
                </span>
                <textarea
                  maxLength={150}
                  rows={2}
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 focus:border-violet-500/50 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-0 leading-relaxed"
                  id="settings-bio"
                />
              </div>
            </div>

            {/* Email (Read Only) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                Registered Email Coordinate
              </label>
              <div className="p-3 bg-slate-950/30 border border-slate-900/40 rounded-xl text-xs text-slate-550 flex items-center gap-2 select-none">
                <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
                <span>{user?.email}</span>
              </div>
            </div>

          </div>

          {/* Form Save Action Row */}
          <div className="flex items-center justify-between gap-4">
            
            <button
              type="button"
              onClick={handleLogOutClick}
              className="py-2.5 px-4 rounded-xl hover:bg-rose-950/10 text-xs font-semibold text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
              id="btn-settings-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Of Luvora</span>
            </button>

            <div className="flex items-center gap-3">
              {success && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                id="btn-settings-submit"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>

          </div>

        </form>

      </main>
    </div>
  );
};
