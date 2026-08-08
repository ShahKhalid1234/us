import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db, collection, query, where, onSnapshot, doc } from '../firebase/config';
import { useAuth } from './AuthContext';
import { WebRTCCall, UserProfile } from '../types';
import { callService } from '../services/callService';
import { dbService } from '../services/dbService';

interface CallContextType {
  activeCall: WebRTCCall | null;
  incomingCall: WebRTCCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isCalling: boolean; // Outgoing call in progress
  startCall: (receiverId: string, type: 'voice' | 'video', receiverName: string, receiverPhoto: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19002' },
    { urls: 'stun:stun1.l.google.com:19002' },
    { urls: 'stun:stun2.l.google.com:19002' }
  ]
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [activeCall, setActiveCall] = useState<WebRTCCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<WebRTCCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallUnsubRef = useRef<(() => void) | null>(null);

  // 1. Listen for incoming calls
  useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      setActiveCall(null);
      return;
    }

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data() as WebRTCCall;
        setIncomingCall(callData);
      } else {
        setIncomingCall(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Cleanup helper
  const cleanupCallState = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (activeCallUnsubRef.current) {
      activeCallUnsubRef.current();
      activeCallUnsubRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // 2. Start call (caller side)
  const startCall = async (receiverId: string, type: 'voice' | 'video', receiverName: string, receiverPhoto: string) => {
    if (!user || !userProfile) return;
    cleanupCallState();
    setIsCalling(true);

    try {
      // Get Media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      const remoteMediaStream = new MediaStream();
      setRemoteStream(remoteMediaStream);
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteMediaStream.addTrack(track);
        });
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Save to firestore
      const callId = await callService.initiateCall(
        user.uid,
        userProfile.displayName,
        userProfile.profilePhoto || '',
        receiverId,
        type,
        offer
      );

      // Handle ICE Candidates from Caller
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callService.addIceCandidate(callId, event.candidate, 'caller');
        }
      };

      // Create Notification for call
      await dbService.createNotification({
        recipientId: receiverId,
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderPhoto: userProfile.profilePhoto || '',
        type: 'incoming_call',
        content: `Incoming ${type} call from ${userProfile.displayName} 📞`,
        data: { callId }
      });

      // Listen for call updates
      const callRef = doc(db, 'calls', callId);
      activeCallUnsubRef.current = onSnapshot(callRef, async (snapshot) => {
        if (!snapshot.exists()) {
          cleanupCallState();
          return;
        }

        const callData = snapshot.data() as WebRTCCall;
        setActiveCall(callData);

        if (callData.status === 'rejected' || callData.status === 'ended') {
          cleanupCallState();
          return;
        }

        // If accepted and remote answer exists
        if (callData.status === 'accepted' && callData.answer && !pc.remoteDescription) {
          setIsCalling(false);
          await pc.setRemoteDescription(new RTCSessionDescription(callData.answer));
          
          // Add any buffered receiver candidates
          if (callData.receiverCandidates && callData.receiverCandidates.length > 0) {
            callData.receiverCandidates.forEach((candidateObj) => {
              try {
                pc.addIceCandidate(new RTCIceCandidate(candidateObj));
              } catch (e) {
                console.error("Error adding ice candidate:", e);
              }
            });
          }
        }

        // Keep updating ice candidates if added in real-time
        if (pc.remoteDescription && callData.receiverCandidates) {
          callData.receiverCandidates.forEach((candidateObj) => {
            try {
              pc.addIceCandidate(new RTCIceCandidate(candidateObj));
            } catch (e) {
              // ignore duplicate candidate errors
            }
          });
        }
      });

    } catch (error) {
      console.error("Error starting WebRTC call:", error);
      cleanupCallState();
      alert("Could not access camera or microphone. Please check your browser permissions.");
    }
  };

  // 3. Accept Call (receiver side)
  const acceptCall = async () => {
    if (!incomingCall || !user) return;
    const currentIncomingCall = incomingCall;
    setIncomingCall(null);

    try {
      // Get Media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentIncomingCall.type === 'video'
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      const remoteMediaStream = new MediaStream();
      setRemoteStream(remoteMediaStream);
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteMediaStream.addTrack(track);
        });
      };

      // Set Remote Description (Offer)
      await pc.setRemoteDescription(new RTCSessionDescription(currentIncomingCall.offer));

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Accept call in firestore
      await callService.acceptCall(currentIncomingCall.id, answer);

      // Send Caller ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callService.addIceCandidate(currentIncomingCall.id, event.candidate, 'receiver');
        }
      };

      // Process any pre-existing caller candidates
      if (currentIncomingCall.callerCandidates && currentIncomingCall.callerCandidates.length > 0) {
        currentIncomingCall.callerCandidates.forEach((cand) => {
          try {
            pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {}
        });
      }

      // Listen for updates on the call
      const callRef = doc(db, 'calls', currentIncomingCall.id);
      activeCallUnsubRef.current = onSnapshot(callRef, (snapshot) => {
        if (!snapshot.exists()) {
          cleanupCallState();
          return;
        }

        const callData = snapshot.data() as WebRTCCall;
        setActiveCall(callData);

        if (callData.status === 'ended') {
          cleanupCallState();
        }

        // Process newly added caller candidates
        if (callData.callerCandidates) {
          callData.callerCandidates.forEach((cand) => {
            try {
              pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          });
        }
      });

    } catch (error) {
      console.error("Error accepting WebRTC call:", error);
      await callService.rejectCall(currentIncomingCall.id);
      cleanupCallState();
    }
  };

  // 4. Reject Call (receiver side)
  const rejectCall = async () => {
    if (!incomingCall) return;
    await callService.rejectCall(incomingCall.id);
    setIncomingCall(null);
  };

  // 5. End Call (either side)
  const endCall = async () => {
    const activeId = activeCall?.id || (isCalling ? activeCall?.id : null);
    if (activeId) {
      await callService.endCall(activeId);
    } else if (incomingCall) {
      await callService.rejectCall(incomingCall.id);
    }
    cleanupCallState();
  };

  // Mic mute toggle
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Camera video toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <CallContext.Provider value={{
      activeCall,
      incomingCall,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      isCalling,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
