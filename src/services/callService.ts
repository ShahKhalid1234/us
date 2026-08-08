import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { WebRTCCall } from '../types';

export const callService = {
  async initiateCall(
    callerId: string,
    callerName: string,
    callerPhoto: string,
    receiverId: string,
    type: 'voice' | 'video',
    offerDescription: RTCSessionDescriptionInit
  ): Promise<string> {
    const callRef = doc(db, 'calls', `${callerId}_${Date.now()}`);
    const callData: WebRTCCall = {
      id: callRef.id,
      callerId,
      callerName,
      callerPhoto,
      receiverId,
      type,
      status: 'ringing',
      timestamp: Date.now(),
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp
      },
      callerCandidates: [],
      receiverCandidates: []
    };

    await setDoc(callRef, callData);
    return callRef.id;
  },

  async acceptCall(callId: string, answerDescription: RTCSessionDescriptionInit): Promise<void> {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'accepted',
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      }
    });
  },

  async rejectCall(callId: string): Promise<void> {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'rejected'
    });
  },

  async endCall(callId: string): Promise<void> {
    const callRef = doc(db, 'calls', callId);
    const callSnap = await getDoc(callRef);
    if (callSnap.exists()) {
      await updateDoc(callRef, {
        status: 'ended'
      });
    }
  },

  async addIceCandidate(callId: string, candidate: RTCIceCandidate, role: 'caller' | 'receiver'): Promise<void> {
    const callRef = doc(db, 'calls', callId);
    const serializedCandidate = {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    };

    if (role === 'caller') {
      await updateDoc(callRef, {
        callerCandidates: arrayUnion(serializedCandidate)
      });
    } else {
      await updateDoc(callRef, {
        receiverCandidates: arrayUnion(serializedCandidate)
      });
    }
  }
};
