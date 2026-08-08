import React, { useEffect, useRef } from 'react';
import { useCall } from '../contexts/CallContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, ShieldAlert, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CallOverlay: React.FC = () => {
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isCalling,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Hook local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall, incomingCall, isCalling]);

  // Hook remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall]);

  const showOverlay = activeCall || incomingCall || isCalling;

  if (!showOverlay) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 text-white backdrop-blur-md font-sans">
        
        {/* Background Decorative Romantic Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full filter blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-900/20 rounded-full filter blur-[120px] pointer-events-none animate-pulse delay-75"></div>

        {/* 1. INCOMING CALL SCREEN */}
        {incomingCall && !activeCall && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center p-6 max-w-md w-full"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-2 border-rose-500 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg shadow-rose-500/20">
                {incomingCall.callerPhoto ? (
                  <img src={incomingCall.callerPhoto} alt={incomingCall.callerName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <Heart className="w-10 h-10 text-rose-400 fill-rose-500/10" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-violet-600 p-2 rounded-full border border-slate-900">
                {incomingCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </span>
              <div className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping pointer-events-none"></div>
            </div>

            <h2 className="text-2xl font-bold mb-2 tracking-wide text-rose-200">{incomingCall.callerName}</h2>
            <p className="text-sm text-slate-400 mb-8 animate-pulse">Incoming {incomingCall.type} call...</p>

            <div className="flex items-center gap-8">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 transition-colors flex items-center justify-center shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 duration-150 cursor-pointer"
                id="btn-reject-call"
              >
                <PhoneOff className="w-6 h-6 transform rotate-135" />
              </button>
              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 duration-150 cursor-pointer animate-bounce"
                id="btn-accept-call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}

        {/* 2. OUTGOING CALL SCREEN */}
        {isCalling && !activeCall && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center p-6 max-w-md w-full"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-2 border-violet-500 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Heart className="w-10 h-10 text-violet-400 animate-pulse fill-violet-500/10" />
              </div>
              <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-pulse pointer-events-none"></div>
            </div>

            <h2 className="text-xl font-bold mb-2 tracking-wide">Connecting Luvora Call</h2>
            <p className="text-sm text-slate-400 mb-8">Ringing your partner...</p>

            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 transition-colors flex items-center justify-center shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 duration-150 cursor-pointer"
              id="btn-cancel-outgoing"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </motion.div>
        )}

        {/* 3. ACTIVE CALL SESSION */}
        {activeCall && (
          <div className="relative w-full h-full flex flex-col items-center justify-between p-6">
            
            {/* Top Bar Call Description */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 bg-slate-900/40 backdrop-blur-md p-3 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center text-xs font-bold">
                  L
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-wide text-rose-100">
                    {activeCall.callerId === activeCall.receiverId ? "Private Space" : "Luvora Connection"}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Secure WebRTC Call
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full text-xs font-medium border border-rose-500/20">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>Live Call</span>
              </div>
            </div>

            {/* Video Streams Container */}
            <div className="flex-1 w-full flex items-center justify-center relative mt-16 mb-24 rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/80 shadow-inner">
              
              {/* Remote Video Stream (Main view) */}
              {activeCall.type === 'video' ? (
                <div className="absolute inset-0 w-full h-full bg-slate-950">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-rose-500 animate-spin"></div>
                      <p className="text-xs">Waiting for video stream...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-violet-900/50 to-rose-900/50 flex items-center justify-center border border-rose-500/20 relative shadow-2xl">
                    <Heart className="w-12 h-12 text-rose-400 animate-pulse fill-rose-500/10" />
                    <div className="absolute inset-0 rounded-full border border-rose-400/20 animate-ping pointer-events-none"></div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">Voice Connection Active</h3>
                  <p className="text-xs text-slate-400">Audio routed through browser WebRTC</p>
                </div>
              )}

              {/* Local Video Pip (Floating bottom right, only shown for video calls) */}
              {activeCall.type === 'video' && (
                <div className="absolute bottom-4 right-4 w-28 sm:w-36 aspect-[3/4] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl z-10">
                  {isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                      <VideoOff className="w-6 h-6" />
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  )}
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-[9px] px-2 py-0.5 rounded text-slate-300 border border-slate-800">
                    You
                  </span>
                </div>
              )}

              {/* Secure WebRTC Connection Note for standard iframe constraints */}
              <div className="absolute bottom-4 left-4 max-w-[200px] bg-slate-900/70 backdrop-blur-sm p-2 rounded-lg text-[10px] text-slate-400 border border-slate-800/40 leading-relaxed">
                <span className="flex items-center gap-1 font-semibold text-rose-300 mb-0.5">
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> WebRTC Note
                </span>
                Requires media permissions. If call fails, open in a new tab.
              </div>
            </div>

            {/* Bottom Call Controls Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-slate-900/80 backdrop-blur-lg px-8 py-4 rounded-full border border-slate-800 shadow-2xl">
              
              {/* Mute Mic button */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition-all cursor-pointer ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                }`}
                title={isMuted ? "Unmute" : "Mute"}
                id="btn-call-mute"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* End/Hangup Call button */}
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 transition-all hover:scale-105 active:scale-95 text-white shadow-lg shadow-rose-600/30 cursor-pointer"
                title="End Call"
                id="btn-call-hangup"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* Toggle Video button (only if it's a video call) */}
              {activeCall.type === 'video' ? (
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-all cursor-pointer ${
                    isVideoOff 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                  }`}
                  title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  id="btn-call-video"
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              ) : (
                <div className="w-11"></div> // placeholder to keep symmetry
              )}
            </div>

          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
