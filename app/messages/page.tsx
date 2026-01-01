'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send, ArrowRight, ChevronRight, ArrowLeft } from 'lucide-react';
import { getAllProfiles } from '@/lib/queries/profiles';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getInitials } from '@/lib/utils/display';

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
  avatarUrl?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

export default function MessagesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

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
            if (userId) {
              localStorage.setItem('selectedUserId', userId);
            }
          }
        }

        if (!userId) {
          setLoading(false);
          return;
        }

        // Load conversations from localStorage
        let loadedConversations: Conversation[] = [];
        const savedConversations = localStorage.getItem(`conversations_${userId}`);
        if (savedConversations) {
          try {
            const parsed = JSON.parse(savedConversations);
            loadedConversations = parsed;
            setConversations(parsed);
          } catch (e) {
            console.error('Error parsing saved conversations:', e);
          }
        }

        // Check if there's a partner to start conversation with
        const partnerId = localStorage.getItem('messagePartnerId');
        const partnerName = localStorage.getItem('messagePartnerName');
        
        if (partnerId && partnerName) {
          // Load all profiles to get partner info
          const { data: allProfiles } = await getAllProfiles();
          const partnerProfile = allProfiles?.find((p: any) => (p.user_id || p.id) === partnerId);
          
          // Check if conversation already exists
          const existingConv = loadedConversations.find(conv => conv.id === partnerId);
          
          if (existingConv) {
            setActiveConversation(existingConv);
          } else {
            const newConversation: Conversation = {
              id: partnerId,
              name: partnerName,
              avatar: getInitials(partnerName),
              avatarUrl: partnerProfile?.avatar_url,
              avatarColor: 'bg-hot-pink',
              lastMessage: '',
              timestamp: 'עכשיו',
              unreadCount: 0,
              isOnline: partnerProfile?.is_online || true,
              messages: []
            };
            
            const updated = [newConversation, ...loadedConversations];
            setConversations(updated);
            if (userId) {
              localStorage.setItem(`conversations_${userId}`, JSON.stringify(updated));
            }
            setActiveConversation(newConversation);
          }
          
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
    setMessageInput('');
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'me',
      timestamp: 'עכשיו'
    };
    
    setActiveConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastMessage: messageText,
        timestamp: 'עכשיו'
      };
    });
    
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
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showConversationList = !activeConversation;

  if (loading) {
    return (
      <div className={`flex h-[calc(100vh-4rem)] w-full items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-dark-bg'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 ${
            theme === 'light' ? 'border-[#F52F8E]' : 'border-hot-pink'
          }`}></div>
          <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[calc(100vh-4rem)] w-full ${
      theme === 'light' ? 'bg-gray-50' : 'bg-dark-bg'
    }`}>
      {/* Right Sidebar - Conversations List */}
      <aside className={`${showConversationList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-col ${
        theme === 'light'
          ? 'bg-white border-l border-gray-200'
          : 'bg-white border-l border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${
          theme === 'light' ? 'border-gray-200' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold mb-4 ${
            theme === 'light' ? 'text-gray-800' : 'text-gray-800'
          }`}>הודעות</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חיפוש שיחות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-9 pl-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink/30 focus:border-hot-pink/50 text-sm ${
                theme === 'light'
                  ? 'border border-gray-300 bg-white text-gray-800 placeholder-gray-400'
                  : 'border border-gray-300 bg-white text-gray-800 placeholder-gray-400'
              }`}
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                אין שיחות עדיין
              </p>
              <p className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-400' : 'text-gray-400'}`}>
                התחל שיחה חדשה מחברי הקהילה
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  if (conversation.unreadCount > 0) {
                    const updatedConversations = conversations.map(conv => 
                      conv.id === conversation.id 
                        ? { ...conv, unreadCount: 0 }
                        : conv
                    );
                    setConversations(updatedConversations);
                    setActiveConversation({ ...conversation, unreadCount: 0 });
                    
                    if (currentUserId) {
                      localStorage.setItem(`conversations_${currentUserId}`, JSON.stringify(updatedConversations));
                    }
                  } else {
                    setActiveConversation(conversation);
                  }
                }}
                className={`w-full p-3 hover:bg-gray-50 transition-colors text-right ${
                  activeConversation && activeConversation.id === conversation.id 
                    ? 'bg-hot-pink/10 border-r-2 border-r-hot-pink' 
                    : ''
                }`}
                suppressHydrationWarning
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conversation.avatarUrl ? (
                      <img
                        src={conversation.avatarUrl}
                        alt={conversation.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full bg-hot-pink flex items-center justify-center text-white font-semibold text-lg`}>
                        {conversation.avatar}
                      </div>
                    )}
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3 className={`font-semibold text-sm ${
                        theme === 'light' ? 'text-gray-800' : 'text-gray-800'
                      }`}>
                        {conversation.name}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <div className="flex-shrink-0 w-5 h-5 bg-hot-pink rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">{conversation.unreadCount}</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-1 mb-1 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-600'
                    }`}>
                      {conversation.lastMessage || 'התחל שיחה חדשה'}
                    </p>
                    <p className={`text-xs ${
                      theme === 'light' ? 'text-gray-400' : 'text-gray-400'
                    }`}>
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
      {activeConversation ? (
        <main className={`flex-1 flex flex-col ${showConversationList ? 'hidden' : 'flex'} lg:flex ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-50'
        }`}>
          {/* Chat Header */}
          <div className={`p-4 border-b ${
            theme === 'light' ? 'bg-white border-gray-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {/* Back Button - Mobile Only */}
              <button
                onClick={() => setActiveConversation(null)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Avatar */}
              <div className="relative">
                {activeConversation.avatarUrl ? (
                  <img
                    src={activeConversation.avatarUrl}
                    alt={activeConversation.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-hot-pink flex items-center justify-center text-white font-semibold text-lg`}>
                    {activeConversation.avatar}
                  </div>
                )}
                {activeConversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              {/* Name and Status */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-gray-800'}`}>
                  {activeConversation.name}
                </h3>
                <p className={`text-sm ${activeConversation.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                  {activeConversation.isOnline ? 'מחובר/ת' : 'מנותק/ת'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 ${
              theme === 'light' ? 'bg-gray-50' : 'bg-gray-50'
            }`}
          >
            {activeConversation.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    אין הודעות עדיין
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-400' : 'text-gray-400'}`}>
                    שלח הודעה ראשונה כדי להתחיל את השיחה
                  </p>
                </div>
              </div>
            ) : (
              activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 ${
                      message.sender === 'me'
                        ? theme === 'light'
                          ? 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                        : 'bg-hot-pink text-white shadow-md'
                    }`}
                  >
                    <p className="text-sm mb-1 break-words text-right" dir="rtl">{message.text}</p>
                    <p
                      className={`text-xs ${
                        message.sender === 'me'
                          ? theme === 'light' ? 'text-gray-500' : 'text-gray-500'
                          : 'text-pink-100'
                      }`}
                    >
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className={`p-4 border-t ${
            theme === 'light' ? 'bg-white border-gray-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
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
                className={`flex-1 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-hot-pink/30 focus:border-hot-pink/50 text-sm ${
                  theme === 'light'
                    ? 'border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400'
                    : 'border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400'
                }`}
                suppressHydrationWarning
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className={`p-3 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors flex-shrink-0 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  !messageInput.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                suppressHydrationWarning
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className={`hidden lg:flex flex-1 flex-col items-center justify-center ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-50'
        }`}>
          <div className="text-center">
            <p className={`text-base ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              בחר שיחה כדי להתחיל
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
