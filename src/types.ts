export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  profilePhoto: string; // Base64 or URL
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen: number; // Timestamp
  joinedDate: number; // Timestamp
  friendCount: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhoto: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  timestamp: number;
  blockedUsers?: string[]; // Array of user UIDs who are blocked
}

export interface Conversation {
  id: string; // Usually combo of two UIDs sorted, e.g. "uid1_uid2"
  participants: string[]; // [uid1, uid2]
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: number;
  };
  unreadCount?: {
    [uid: string]: number;
  };
  typing?: {
    [uid: string]: boolean;
  };
  updatedAt: number;
}

export interface MessageReaction {
  [emoji: string]: string[]; // emoji -> list of userIds
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  read: boolean;
  deleted?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  reactions?: MessageReaction;
}

export interface LoveSpace {
  id: string; // Friendship ID
  participants: string[];
  theme: 'moonlit_garden' | 'starry_galaxy' | 'enchanted_forest' | 'sunset_beach';
  createdAt: number;
}

export interface LoveNote {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isOpened: boolean;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string; // User-selected date
  image: string; // Base64 image
  createdBy: string;
  createdAt: number;
}

export type NotificationType = 
  | 'friend_request' 
  | 'friend_accepted' 
  | 'new_message' 
  | 'incoming_call' 
  | 'love_note' 
  | 'memory_created';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: NotificationType;
  content: string;
  timestamp: number;
  read: boolean;
  data?: {
    conversationId?: string;
    loveSpaceId?: string;
    callId?: string;
    friendRequestId?: string;
  };
}

export interface WebRTCCall {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  timestamp: number;
  offer?: any; // RTCSessionDescriptionInit as JSON
  answer?: any; // RTCSessionDescriptionInit as JSON
  callerCandidates?: any[]; // ICE candidates as JSON array
  receiverCandidates?: any[]; // ICE candidates as JSON array
}
