import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, FriendRequest, Friendship, Conversation, Message, LoveSpace, LoveNote, Memory, AppNotification, WebRTCCall } from '../types';

// Helper to sort two IDs to generate a stable, unique composite key
export const getCompositeId = (id1: string, id2: string): string => {
  return [id1, id2].sort().join('_');
};

export const dbService = {
  // --- USER PROFILES ---
  async createUserProfile(profile: UserProfile): Promise<void> {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, profile);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  },

  async isUsernameUnique(username: string): Promise<boolean> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  },

  async searchUsers(searchQuery: string, currentUid: string): Promise<UserProfile[]> {
    if (!searchQuery.trim()) return [];
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const usersRef = collection(db, 'users');
    
    // We get all users and filter client-side for username/displayName prefix
    // (since firestore doesn't support full-text search out of the box and is tricky with complex queries)
    const snapshot = await getDocs(usersRef);
    const results: UserProfile[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      if (data.uid !== currentUid) {
        const usernameMatch = data.username.toLowerCase().includes(lowercaseQuery);
        const displayNameMatch = data.displayName.toLowerCase().includes(lowercaseQuery);
        if (usernameMatch || displayNameMatch) {
          results.push(data);
        }
      }
    });
    
    return results;
  },

  async updateUserOnlineStatus(uid: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      onlineStatus: status,
      lastSeen: Date.now()
    });
  },

  // --- FRIEND REQUESTS & SOCIALS ---
  async sendFriendRequest(sender: UserProfile, receiverId: string): Promise<void> {
    // Prevent request to self
    if (sender.uid === receiverId) throw new Error("You cannot send a friend request to yourself.");

    // Check if request already exists
    const requestsRef = collection(db, 'friendRequests');
    const q1 = query(requestsRef, where('senderId', '==', sender.uid), where('receiverId', '==', receiverId));
    const q2 = query(requestsRef, where('senderId', '==', receiverId), where('receiverId', '==', sender.uid));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    if (!snap1.empty || !snap2.empty) {
      throw new Error("A friend request already exists between you.");
    }

    const newRequestRef = doc(collection(db, 'friendRequests'));
    const requestData: FriendRequest = {
      id: newRequestRef.id,
      senderId: sender.uid,
      senderUsername: sender.username,
      senderDisplayName: sender.displayName,
      senderPhoto: sender.profilePhoto,
      receiverId: receiverId,
      status: 'pending',
      timestamp: Date.now()
    };

    await setDoc(newRequestRef, requestData);

    // Create Notification
    await this.createNotification({
      recipientId: receiverId,
      senderId: sender.uid,
      senderName: sender.displayName,
      senderPhoto: sender.profilePhoto,
      type: 'friend_request',
      content: `${sender.displayName} sent you a friend request ✨`,
      data: { friendRequestId: newRequestRef.id }
    });
  },

  async acceptFriendRequest(request: FriendRequest, currentProfile: UserProfile): Promise<void> {
    const requestRef = doc(db, 'friendRequests', request.id);
    await updateDoc(requestRef, { status: 'accepted' });

    // Create friendship
    const friendshipId = getCompositeId(request.senderId, request.receiverId);
    const friendshipRef = doc(db, 'friendships', friendshipId);
    
    const friendshipData: Friendship = {
      id: friendshipId,
      user1Id: request.senderId,
      user2Id: request.receiverId,
      timestamp: Date.now()
    };
    await setDoc(friendshipRef, friendshipData);

    // Create default Love Space
    const loveSpaceRef = doc(db, 'loveSpaces', friendshipId);
    const loveSpaceData: LoveSpace = {
      id: friendshipId,
      participants: [request.senderId, request.receiverId],
      theme: 'moonlit_garden',
      createdAt: Date.now()
    };
    await setDoc(loveSpaceRef, loveSpaceData);

    // Update friend counts
    const senderUserRef = doc(db, 'users', request.senderId);
    const receiverUserRef = doc(db, 'users', request.receiverId);
    await Promise.all([
      updateDoc(senderUserRef, { friendCount: increment(1) }),
      updateDoc(receiverUserRef, { friendCount: increment(1) })
    ]);

    // Send Notification to sender
    await this.createNotification({
      recipientId: request.senderId,
      senderId: currentProfile.uid,
      senderName: currentProfile.displayName,
      senderPhoto: currentProfile.profilePhoto,
      type: 'friend_accepted',
      content: `${currentProfile.displayName} accepted your friend request! ❤️`,
      data: { loveSpaceId: friendshipId }
    });

    // Delete the request document to keep it clean, or keep it as accepted
    await deleteDoc(requestRef);
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  },

  async cancelFriendRequest(requestId: string): Promise<void> {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  },

  async removeFriend(friendId: string, currentUid: string): Promise<void> {
    const friendshipId = getCompositeId(currentUid, friendId);
    
    // Delete friendship
    await deleteDoc(doc(db, 'friendships', friendshipId));

    // Delete love space and conversations associated
    await deleteDoc(doc(db, 'loveSpaces', friendshipId));
    await deleteDoc(doc(db, 'conversations', friendshipId));

    // Decrement friend counts
    const currentUserRef = doc(db, 'users', currentUid);
    const friendUserRef = doc(db, 'users', friendId);
    await Promise.all([
      updateDoc(currentUserRef, { friendCount: increment(-1) }),
      updateDoc(friendUserRef, { friendCount: increment(-1) })
    ]);
  },

  // --- NOTIFICATIONS ---
  async createNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const notificationRef = doc(collection(db, 'notifications'));
    const notifData: AppNotification = {
      ...notification,
      id: notificationRef.id,
      timestamp: Date.now(),
      read: false
    };
    await setDoc(notificationRef, notifData);
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  },

  async clearAllNotifications(recipientId: string): Promise<void> {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', recipientId));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
  },

  // --- CHAT SYSTEM ---
  async getOrCreateConversation(uid1: string, uid2: string): Promise<string> {
    const convoId = getCompositeId(uid1, uid2);
    const convoRef = doc(db, 'conversations', convoId);
    const convoSnap = await getDoc(convoRef);

    if (!convoSnap.exists()) {
      const convoData: Conversation = {
        id: convoId,
        participants: [uid1, uid2],
        updatedAt: Date.now(),
        unreadCount: { [uid1]: 0, [uid2]: 0 }
      };
      await setDoc(convoRef, convoData);
    }
    return convoId;
  },

  async sendMessage(conversationId: string, senderId: string, senderName: string, content: string, replyTo?: Message['replyTo']): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    const convoSnap = await getDoc(convoRef);
    if (!convoSnap.exists()) return;

    const convoData = convoSnap.data() as Conversation;
    const recipientId = convoData.participants.find(id => id !== senderId) || '';

    const msgCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const msgDocRef = doc(msgCollectionRef);
    
    const message: Message = {
      id: msgDocRef.id,
      senderId,
      content,
      timestamp: Date.now(),
      read: false,
      replyTo,
      reactions: {}
    };

    await setDoc(msgDocRef, message);

    // Update last message metadata on conversation
    const incrementUnread: Record<string, any> = {};
    if (recipientId) {
      incrementUnread[`unreadCount.${recipientId}`] = increment(1);
    }

    await updateDoc(convoRef, {
      lastMessage: {
        content,
        senderId,
        timestamp: message.timestamp
      },
      updatedAt: message.timestamp,
      ...incrementUnread
    });

    // Notify partner
    if (recipientId) {
      await this.createNotification({
        recipientId,
        senderId,
        senderName,
        senderPhoto: '', // Filled in on front end
        type: 'new_message',
        content: `New message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
        data: { conversationId }
      });
    }
  },

  async deleteMessage(conversationId: string, messageId: string, senderId: string): Promise<void> {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      deleted: true,
      content: "This message was deleted"
    });
  },

  async reactToMessage(conversationId: string, messageId: string, uid: string, emoji: string): Promise<void> {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const msgData = msgSnap.data() as Message;
    const reactions = msgData.reactions || {};
    
    // Check if user already reacted with this emoji
    const users = reactions[emoji] || [];
    const index = users.indexOf(uid);

    if (index > -1) {
      // Remove reaction
      users.splice(index, 1);
    } else {
      // Add reaction
      users.push(uid);
    }

    if (users.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = users;
    }

    await updateDoc(msgRef, { reactions });
  },

  async clearUnreadCount(conversationId: string, uid: string): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    const updatePayload: Record<string, any> = {};
    updatePayload[`unreadCount.${uid}`] = 0;
    await updateDoc(convoRef, updatePayload);
  },

  async updateTypingStatus(conversationId: string, uid: string, isTyping: boolean): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    const updatePayload: Record<string, any> = {};
    updatePayload[`typing.${uid}`] = isTyping;
    await updateDoc(convoRef, updatePayload);
  },

  // --- LOVE SPACE ---
  async getLoveSpace(friendshipId: string): Promise<LoveSpace | null> {
    const docSnap = await getDoc(doc(db, 'loveSpaces', friendshipId));
    return docSnap.exists() ? (docSnap.data() as LoveSpace) : null;
  },

  async updateLoveSpaceTheme(loveSpaceId: string, theme: LoveSpace['theme']): Promise<void> {
    await updateDoc(doc(db, 'loveSpaces', loveSpaceId), { theme });
  },

  async addLoveNote(loveSpaceId: string, senderId: string, senderName: string, content: string, recipientId: string): Promise<void> {
    const notesCollectionRef = collection(db, 'loveSpaces', loveSpaceId, 'notes');
    const noteDocRef = doc(notesCollectionRef);
    
    const note: LoveNote = {
      id: noteDocRef.id,
      senderId,
      senderName,
      content,
      timestamp: Date.now(),
      isOpened: false
    };

    await setDoc(noteDocRef, note);

    // Create Notification
    await this.createNotification({
      recipientId,
      senderId,
      senderName,
      senderPhoto: '',
      type: 'love_note',
      content: `Left a sweet note in your Love Space! 💌`,
      data: { loveSpaceId }
    });
  },

  async openLoveNote(loveSpaceId: string, noteId: string): Promise<void> {
    await updateDoc(doc(db, 'loveSpaces', loveSpaceId, 'notes', noteId), { isOpened: true });
  },

  async addMemory(loveSpaceId: string, title: string, description: string, date: string, imageBase64: string, createdBy: string, recipientId: string, senderName: string): Promise<void> {
    const memoriesCollectionRef = collection(db, 'loveSpaces', loveSpaceId, 'memories');
    const memoryDocRef = doc(memoriesCollectionRef);

    const memory: Memory = {
      id: memoryDocRef.id,
      title,
      description,
      date,
      image: imageBase64,
      createdBy,
      createdAt: Date.now()
    };

    await setDoc(memoryDocRef, memory);

    // Create Notification
    await this.createNotification({
      recipientId,
      senderId: createdBy,
      senderName,
      senderPhoto: '',
      type: 'memory_created',
      content: `Added a new memory: "${title}" 📸`,
      data: { loveSpaceId }
    });
  },

  async deleteMemory(loveSpaceId: string, memoryId: string): Promise<void> {
    await deleteDoc(doc(db, 'loveSpaces', loveSpaceId, 'memories', memoryId));
  }
};
