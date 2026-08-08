import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCall } from '../contexts/CallContext';
import { dbService } from '../services/dbService';
import { Message, UserProfile, Conversation } from '../types';
import { db, collection, query, orderBy, onSnapshot, doc, getDoc } from '../firebase/config';
import { ArrowLeft, Phone, Video, Send, Smile, Reply, Trash2, Copy, Heart, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ChatDetail: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { params, navigateTo } = useNavigation();
  const { startCall } = useCall();
  const conversationId = params.conversationId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId for picker
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Partner Profile & Clear Unread
  useEffect(() => {
    if (!user || !conversationId) return;

    const parts = conversationId.split('_');
    const partnerId = parts.find((id) => id !== user.uid);
    if (!partnerId) return;

    // Get partner profile in real-time to track onlineStatus
    const unsubPartner = onSnapshot(doc(db, 'users', partnerId), (snap) => {
      if (snap.exists()) {
        setPartnerProfile(snap.data() as UserProfile);
      }
    });

    // Clear unread count initially
    dbService.clearUnreadCount(conversationId, user.uid);

    return () => unsubPartner();
  }, [user, conversationId]);

  // 2. Subscribe to Real-time Messages
  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push(d.data() as Message);
      });
      setMessages(msgs);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Clear unread count as messages arrive
      if (user) {
        dbService.clearUnreadCount(conversationId, user.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  // 3. Listen for Typing Indicator on Partner
  useEffect(() => {
    if (!conversationId || !partnerProfile) return;

    const unsubConvo = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Conversation;
        const typingMap = data.typing || {};
        setPartnerTyping(!!typingMap[partnerProfile.uid]);
      }
    });

    return () => unsubConvo();
  }, [conversationId, partnerProfile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !userProfile || !conversationId) return;

    const content = inputText.trim();
    setInputText('');

    // Stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    dbService.updateTypingStatus(conversationId, user.uid, false);
    setIsTyping(false);

    const replyToPayload = replyMessage ? {
      id: replyMessage.id,
      content: replyMessage.content,
      senderId: replyMessage.senderId
    } : undefined;

    setReplyMessage(null);

    try {
      await dbService.sendMessage(conversationId, user.uid, userProfile.displayName, content, replyToPayload);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!user || !conversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      dbService.updateTypingStatus(conversationId, user.uid, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      dbService.updateTypingStatus(conversationId, user.uid, false);
      setIsTyping(false);
    }, 2000);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!conversationId || !user) return;
    try {
      await dbService.deleteMessage(conversationId, msgId, user.uid);
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!conversationId || !user) return;
    try {
      await dbService.reactToMessage(conversationId, msgId, user.uid, emoji);
      setShowEmojiPicker(null);
    } catch (err) {
      console.error("Reacting error:", err);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCall = (callType: 'voice' | 'video') => {
    if (!partnerProfile) return;
    startCall(partnerProfile.uid, callType, partnerProfile.displayName, partnerProfile.profilePhoto);
  };

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const EMOJIS = ['❤️', '😂', '🔥', '😘', '🥺', '👍'];

  return (
    <div className="flex-1 bg-slate-950 min-h-screen text-slate-100 font-sans flex flex-col justify-between pb-safe">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-16 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigateTo('/chats')}
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {partnerProfile && (
            <div 
              onClick={() => navigateTo(`/profile/${partnerProfile.username}`)}
              className="flex items-center gap-3 cursor-pointer group min-w-0"
            >
              <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-slate-800 shrink-0 relative">
                {partnerProfile.profilePhoto ? (
                  <img src={partnerProfile.profilePhoto} alt={partnerProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-300">
                    {partnerProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                  partnerProfile.onlineStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}></span>
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-slate-200 group-hover:text-rose-200 transition-colors truncate">
                  {partnerProfile.displayName}
                </h3>
                <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                  {partnerProfile.onlineStatus === 'online' ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action icons (WebRTC Calling) */}
        {partnerProfile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCall('voice')}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 transition-all cursor-pointer"
              title="Voice Call"
              id="btn-voice-call"
            >
              <Phone className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => handleCall('video')}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-slate-900/60 transition-all cursor-pointer"
              title="Video Call"
              id="btn-video-call"
            >
              <Video className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </header>

      {/* 2. CHAT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-550 border border-slate-850 animate-pulse mb-3">
              ❤️
            </div>
            <p className="text-sm font-semibold">Start your story here</p>
            <p className="text-xs text-slate-700 mt-1">This communication is secure and private to you two.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  
                  {/* Reply Indicator Preview if it replies to a previous message */}
                  {msg.replyTo && (
                    <div className="text-[10px] text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-t-xl border border-b-0 border-slate-900 mb-0.5 max-w-full truncate">
                      <span className="font-bold text-rose-400 mr-1 flex items-center gap-1">
                        <Reply className="w-2.5 h-2.5" /> Reply to
                      </span>
                      {msg.replyTo.content}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className="relative group/bubble flex items-center gap-2">
                    
                    {/* Hover menu left of bubble for self, right for recipient */}
                    {isMe && !msg.deleted && (
                      <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 text-slate-500 pr-1.5">
                        <button onClick={() => setReplyMessage(msg)} className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleCopyMessage(msg.content)} className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 hover:text-rose-400 rounded cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}

                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.deleted 
                          ? 'bg-slate-900/40 text-slate-650 border border-slate-900 italic'
                          : isMe 
                            ? 'bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-md shadow-violet-600/5 rounded-tr-sm' 
                            : 'bg-slate-900 text-slate-200 rounded-tl-sm border border-slate-900/40'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {!isMe && !msg.deleted && (
                      <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 text-slate-500 pl-1.5">
                        <button onClick={() => setReplyMessage(msg)} className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleCopyMessage(msg.content)} className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 hover:text-rose-400 rounded cursor-pointer" title="React"><Smile className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  {/* Reaction selector overlay */}
                  {showEmojiPicker === msg.id && (
                    <div className="flex gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-full shadow-xl mt-1.5 z-10">
                      {EMOJIS.map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => handleReactToMessage(msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Emoji Reactions List below bubble */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex gap-1.5 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const usersList = users as string[];
                        return (
                          <button 
                            key={emoji} 
                            onClick={() => handleReactToMessage(msg.id, emoji)}
                            className="bg-slate-900/80 border border-slate-800/80 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 hover:border-rose-500/20 transition-all"
                          >
                            <span>{emoji}</span>
                            <span className="text-slate-500 text-[9px]">{usersList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Timestamp */}
                  {!msg.deleted && (
                    <span className="text-[9px] text-slate-600 mt-1 font-medium px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* Partner Typing indicator */}
        {partnerTyping && (
          <div className="flex items-center gap-2 text-slate-500 text-xs italic pl-1 py-1">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce delay-150"></span>
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce delay-300"></span>
            <span className="ml-1 text-[10px] font-medium text-slate-500">{partnerProfile?.displayName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. MESSAGE COMPOSER BAR */}
      <footer className="p-4 bg-slate-950 border-t border-slate-900/80 space-y-2">
        
        {/* Reply Preview indicator above text area */}
        {replyMessage && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="truncate pr-4 flex-1">
              <span className="font-bold text-rose-400 mr-1">Replying to:</span>
              <span className="text-slate-400">{replyMessage.content}</span>
            </div>
            <button 
              onClick={() => setReplyMessage(null)}
              className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            required
            maxLength={1000}
            placeholder={partnerProfile ? `Send a sweet message to ${partnerProfile.displayName}...` : 'Write a message...'}
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-slate-900/60 border border-slate-900 focus:border-violet-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-0"
            id="chat-input"
          />
          <button
            type="submit"
            className="p-3 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 rounded-xl text-white transition-all shadow-md shadow-rose-500/10 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 duration-150 shrink-0"
            id="chat-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

    </div>
  );
};
