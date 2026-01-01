'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send, ArrowRight, ChevronRight } from 'lucide-react';
import { getAllProfiles } from '@/lib/queries/profiles';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user and conversations
  useEffect(() => {
    async function loadUserAndConversations() {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
      try {
        // Load current user
        const savedUserId = localStorage.getItem('selectedUserId');
        let userId: string | null = null;
        
        if (savedUserId) {
          userId = savedUserId;
          setCurrentUserId(userId);
        } else {
          const { data: profiles } = await getAllProfiles();
          if (Array.isArray(profiles) && profiles.length > 0) {
            userId = profiles[0].user_id || profiles[0].id;
            setCurrentUserId(userId);
            // Save to localStorage for future use
            if (userId) {
              localStorage.setItem('selectedUserId', userId);
            }
          }
        }

        if (!userId) {
          setLoading(false);
          return;
        }

        // Load conversations from localStorage (temporary solution until messages table is created)
        const savedConversations = localStorage.getItem(`conversations_${userId}`);
        if (savedConversations) {
          try {
            const parsed = JSON.parse(savedConversations);
            setConversations(parsed);
          } catch (e) {
            console.error('Error parsing saved conversations:', e);
          }
        }

        // Check if there's a partner to start conversation with
        const partnerId = localStorage.getItem('messagePartnerId');
        const partnerName = localStorage.getItem('messagePartnerName');
        
        if (partnerId && partnerName) {
          // Check if conversation already exists
          const existingConv = conversations.find(conv => conv.id === partnerId);
          
          if (existingConv) {
            // Conversation exists, open it
            setActiveConversation(existingConv);
          } else {
            // Create new conversation
            const newConversation: Conversation = {
              id: partnerId,
              name: partnerName,
              avatar: partnerName.charAt(0),
              avatarColor: 'bg-pink-500',
              lastMessage: '',
              timestamp: 'עכשיו',
              unreadCount: 0,
              isOnline: true,
              messages: []
            };
            
            // Add to conversations list
            setConversations(prev => {
              const updated = [newConversation, ...prev];
              // Save to localStorage
              if (userId) {
                localStorage.setItem(`conversations_${userId}`, JSON.stringify(updated));
              }
              return updated;
            });
            setActiveConversation(newConversation);
          }
          
          // Clear the partner info from localStorage
          localStorage.removeItem('messagePartnerId');
          localStorage.removeItem('messagePartnerName');
        }
      } catch (error) {
        console.error('Error loading user and conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserAndConversations();
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (currentUserId && conversations.length > 0) {
      localStorage.setItem(`conversations_${currentUserId}`, JSON.stringify(conversations));
    }
  }, [conversations, currentUserId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    
    const messageText = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX
    
    // Add message to local state optimistically
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'me',
      timestamp: 'עכשיו'
    };
    
    // Update the conversation with the new message
    setActiveConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastMessage: messageText,
        timestamp: 'עכשיו'
      };
    });
    
    // Update conversations list
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation.id) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: messageText,
          timestamp: 'עכשיו'
        };
      }
      return conv;
    }));
    
    // TODO: Send to backend API when messages table is created
    // For now, messages are saved in localStorage
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // On mobile, show either conversation list or active conversation
  const showConversationList = !activeConversation;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <p className="text-gray-300">טוען...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Right Sidebar - Conversations List */}
      <aside className={`${showConversationList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 border-l border-white/20 glass-card flex-col`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/20">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">הודעות</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חיפוש שיחות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent bg-white/5 text-sm text-white placeholder-gray-400"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p className="text-sm">אין שיחות עדיין</p>
              <p className="text-xs mt-2 text-gray-500">התחל שיחה חדשה מחברי הקהילה</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                // Reset unread count when opening conversation
                if (conversation.unreadCount > 0) {
                  const updatedConversations = conversations.map(conv => 
                    conv.id === conversation.id 
                      ? { ...conv, unreadCount: 0 }
                      : conv
                  );
                  setConversations(updatedConversations);
                  setActiveConversation({ ...conversation, unreadCount: 0 });
                  
                  // Save to localStorage
                  if (currentUserId) {
                    localStorage.setItem(`conversations_${currentUserId}`, JSON.stringify(updatedConversations));
                  }
                } else {
                  setActiveConversation(conversation);
                }
              }}
              className={`w-full p-3 sm:p-4 border-b border-white/10 hover:bg-white/10 transition-colors text-right ${
                activeConversation && activeConversation.id === conversation.id ? 'bg-hot-pink/20 border-l-2 border-l-hot-pink' : ''
              }`}
              suppressHydrationWarning
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${conversation.avatarColor} flex items-center justify-center text-white font-semibold text-base sm:text-lg`}>
                    {conversation.avatar}
                  </div>
                  {conversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-[#1e293b]"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-white text-sm break-words">
                      {conversation.name}
                    </h3>
                    {conversation.unreadCount > 0 && (
                      <div className="flex-shrink-0 w-5 h-5 bg-hot-pink rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">{conversation.unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-1 mb-1">
                    {conversation.lastMessage}
                  </p>
                  <p className="text-xs text-gray-400">
                    {conversation.timestamp}
                  </p>
                </div>
              </div>
            </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      {activeConversation && (
        <main className={`flex-1 flex flex-col glass-card ${showConversationList ? 'hidden' : 'flex'} lg:flex`}>
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              {/* Back Button - Mobile Only */}
              <button
                onClick={() => setActiveConversation(null)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-gray-300" />
              </button>
              <div className="relative">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${activeConversation.avatarColor} flex items-center justify-center text-white font-semibold text-base sm:text-lg`}>
                  {activeConversation.avatar}
                </div>
                {activeConversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1e293b]"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base">{activeConversation.name}</h3>
                <p className="text-xs sm:text-sm text-cyan-400">מחובר/ת</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-black/20">
            {activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${
                    message.sender === 'me'
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-hot-pink text-white'
                  }`}
                >
                  <p className="text-sm mb-1 break-words text-right" dir="rtl">{message.text}</p>
                  <p
                    className={`text-xs ${
                      message.sender === 'me' ? 'text-gray-400' : 'text-pink-100'
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-3 sm:p-4 border-t border-white/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                dir="rtl"
                placeholder="כתוב הודעה..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent bg-white/5 text-sm sm:text-base text-right text-white placeholder-gray-400"
                suppressHydrationWarning
              />
              <button
                onClick={handleSendMessage}
                className="p-2.5 sm:p-3 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors flex-shrink-0 shadow-lg hover:shadow-xl"
                suppressHydrationWarning
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Empty State - Mobile */}
      {!activeConversation && (
        <main className="hidden lg:flex flex-1 flex-col items-center justify-center bg-black/20">
          <p className="text-gray-300">בחר שיחה כדי להתחיל</p>
        </main>
      )}
    </div>
  );
}

