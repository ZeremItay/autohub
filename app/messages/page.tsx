'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send, ArrowRight, ChevronRight } from 'lucide-react';
import { getAllProfiles } from '@/lib/queries/profiles';
import { supabase } from '@/lib/supabase';

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
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const messagesChannelRef = useRef<any>(null);
  const typingChannelsRef = useRef<Record<string, any>>({});

  // Load current user and conversations
  useEffect(() => {
    async function loadUserAndConversations() {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
      try {
        // Get the currently authenticated user from Supabase Auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('Error getting authenticated user:', authError);
          setLoading(false);
          return;
        }
        
        const userId = authUser.id;
        setCurrentUserId(userId);

        // Load conversations from API
        try {
          const response = await fetch('/api/messages', {
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // Convert API response to conversation format
              const apiConversations = result.data.conversations || [];
              const formattedConversations: Conversation[] = apiConversations.map((conv: any) => ({
                id: conv.partner_id,
                name: conv.partner_name,
                avatar: conv.partner_avatar ? '' : (conv.partner_name?.charAt(0) || '?'),
                avatarColor: 'bg-pink-500',
                lastMessage: conv.messages && conv.messages.length > 0 
                  ? conv.messages[conv.messages.length - 1].text 
                  : '',
                timestamp: conv.last_message_at 
                  ? new Date(conv.last_message_at).toLocaleTimeString('he-IL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  : 'עכשיו',
                unreadCount: conv.unread_count || 0,
                isOnline: false, // TODO: Implement real-time online status
                messages: (conv.messages || []).map((msg: any) => ({
                  id: msg.id,
                  text: msg.text,
                  sender: msg.sender as 'me' | 'other',
                  timestamp: new Date(msg.timestamp).toLocaleTimeString('he-IL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                }))
              }));
              setConversations(formattedConversations);
            }
          } else {
            console.error('Failed to load messages:', await response.json());
          }
        } catch (error) {
          console.error('Error loading messages:', error);
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

  // Set up Realtime subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    // Create channel for listening to new messages
    // Listen to both messages you receive AND messages you send
    const channel = supabase
      .channel(`messages:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('📨 New message received via Realtime:', payload.new);
          handleNewMessage(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('📤 Message sent via Realtime:', payload.new);
          handleNewMessage(payload.new as any);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages Realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error - check if Realtime is enabled for messages table');
        }
      });

    messagesChannelRef.current = channel;

    return () => {
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [currentUserId]);

  // Handle new message from Realtime
  function handleNewMessage(newMessage: any) {
    if (!currentUserId) return;

    const senderId = newMessage.sender_id;
    const isFromCurrentUser = senderId === currentUserId;
    const partnerId = isFromCurrentUser ? newMessage.recipient_id : senderId;

    console.log('🔄 Handling new message:', {
      messageId: newMessage.id,
      senderId,
      recipientId: newMessage.recipient_id,
      partnerId,
      isFromCurrentUser
    });

    // Use functional update to ensure we have the latest state
    setConversations(prev => {
      // Check if message already exists (prevent duplicates)
      const messageExists = prev.some(conv => 
        conv.messages.some(msg => msg.id === newMessage.id)
      );
      if (messageExists) {
        console.log('⚠️ Message already exists, skipping:', newMessage.id);
        return prev;
      }

      // Find existing conversation
      const existingConv = prev.find(conv => conv.id === partnerId);

      const formattedMessage: Message = {
        id: newMessage.id,
        text: newMessage.content,
        sender: isFromCurrentUser ? 'me' : 'other',
        timestamp: new Date(newMessage.created_at).toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      if (existingConv) {
        console.log('✅ Updating existing conversation:', partnerId);
        // Update existing conversation
        const updatedConv = {
          ...existingConv,
          messages: [...existingConv.messages, formattedMessage],
          lastMessage: newMessage.content,
          timestamp: new Date(newMessage.created_at).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          unreadCount: activeConversation?.id === partnerId 
            ? existingConv.unreadCount 
            : (existingConv.unreadCount + (newMessage.is_read ? 0 : 1))
        };

        const updated = prev.map(conv => 
          conv.id === partnerId ? updatedConv : conv
        );
        
        // Sort by last message time
        const sorted = updated.sort((a, b) => {
          const aTime = new Date(a.timestamp).getTime();
          const bTime = new Date(b.timestamp).getTime();
          return bTime - aTime;
        });

        // If this conversation is active, update it
        setActiveConversation(prevActive => {
          if (prevActive?.id === partnerId) {
            return updatedConv;
          }
          return prevActive;
        });

        return sorted;
      } else {
        console.log('🆕 Creating new conversation for partner:', partnerId);
        // Create new conversation - need to fetch partner profile
        (async () => {
          try {
            const { data: profiles } = await getAllProfiles();
            const profilesArray = Array.isArray(profiles) ? profiles : [];
            const partner = profilesArray.find((p: any) => 
              (p.user_id || p.id) === partnerId
            );

            if (partner) {
              const partnerName = partner.display_name || partner.first_name || partner.nickname || 'משתמש';
              const newConversation: Conversation = {
                id: partnerId,
                name: partnerName,
                avatar: partnerName.charAt(0),
                avatarColor: 'bg-pink-500',
                lastMessage: newMessage.content,
                timestamp: new Date(newMessage.created_at).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                unreadCount: newMessage.is_read ? 0 : 1,
                isOnline: false,
                messages: [formattedMessage]
              };

              setConversations(prevConv => {
                // Double check it doesn't exist (race condition protection)
                const alreadyExists = prevConv.find(c => c.id === partnerId);
                if (alreadyExists) {
                  console.log('⚠️ Conversation already exists, updating instead:', partnerId);
                  // Update existing instead of creating duplicate
                  return prevConv.map(conv => 
                    conv.id === partnerId 
                      ? {
                          ...conv,
                          messages: [...conv.messages, formattedMessage],
                          lastMessage: newMessage.content,
                          timestamp: newConversation.timestamp
                        }
                      : conv
                  );
                }
                console.log('✅ Adding new conversation:', partnerId);
                return [newConversation, ...prevConv];
              });
            } else {
              console.error('❌ Partner not found:', partnerId);
            }
          } catch (error) {
            console.error('❌ Error creating new conversation:', error);
          }
        })();
        
        // Return previous state while fetching partner profile
        return prev;
      }
    });
  }

  // Set up typing indicator channel for active conversation
  useEffect(() => {
    if (!activeConversation || !currentUserId) {
      // Clean up all typing channels when no active conversation
      Object.values(typingChannelsRef.current).forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      typingChannelsRef.current = {};
      return;
    }

    const conversationId = activeConversation.id;
    
    // Clean up previous typing channel
    if (typingChannelsRef.current[conversationId]) {
      supabase.removeChannel(typingChannelsRef.current[conversationId]);
    }

    // Create typing channel for this conversation
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const partnerTyping = Object.values(state).some((presence: any) => {
          return presence[0]?.typing === true && presence[0]?.userId !== currentUserId;
        });
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: partnerTyping
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const partnerTyping = newPresences.some((presence: any) => 
          presence.typing === true && presence.userId !== currentUserId
        );
        if (partnerTyping) {
          setTypingUsers(prev => ({
            ...prev,
            [conversationId]: true
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: false
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({
            typing: false,
            userId: currentUserId
          });
        }
      });

    typingChannelsRef.current[conversationId] = typingChannel;

    return () => {
      if (typingChannelsRef.current[conversationId]) {
        supabase.removeChannel(typingChannelsRef.current[conversationId]);
        delete typingChannelsRef.current[conversationId];
      }
    };
  }, [activeConversation, currentUserId]);

  // Handle typing indicator
  function handleTyping(text: string) {
    if (!activeConversation || !currentUserId) return;

    const conversationId = activeConversation.id;
    const typingChannel = typingChannelsRef.current[conversationId];

    if (!typingChannel) return;

    // Clear existing timeout
    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
    }

    // Send typing indicator
    typingChannel.track({
      typing: text.length > 0,
      userId: currentUserId
    });

    // Stop typing indicator after 1 second of no typing
    typingTimeoutRef.current[conversationId] = setTimeout(() => {
      if (typingChannel) {
        typingChannel.track({
          typing: false,
          userId: currentUserId
        });
      }
    }, 1000);
  }

  // Mark conversation as read when opened
  useEffect(() => {
    if (activeConversation && currentUserId) {
      // Mark messages as read in the API
      fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: activeConversation.id
        }),
      }).catch(error => {
        console.error('Error marking messages as read:', error);
      });

      // Reset unread count in local state
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversation.id 
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
    }
  }, [activeConversation, currentUserId]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      // Cleanup messages channel
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }

      // Cleanup typing channels
      Object.values(typingChannelsRef.current).forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      typingChannelsRef.current = {};

      // Cleanup typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      typingTimeoutRef.current = {};
    };
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !currentUserId) return;
    
    const messageText = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX
    
    // Add message to local state optimistically
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
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
    
    // Send to backend API
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: activeConversation.id,
          content: messageText
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Replace temp message with real message from server
      // Note: The message will also come through Realtime, so we need to handle duplicates
      if (result.data) {
        const realMessage: Message = {
          id: result.data.id,
          text: result.data.content,
          sender: 'me',
          timestamp: new Date(result.data.created_at).toLocaleTimeString('he-IL', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };

        // Update active conversation - replace temp message or add if not exists
        setActiveConversation(prev => {
          if (!prev) return null;
          const hasTempMessage = prev.messages.some(msg => msg.id === tempId);
          if (hasTempMessage) {
            return {
              ...prev,
              messages: prev.messages.map(msg => msg.id === tempId ? realMessage : msg),
              lastMessage: messageText,
              timestamp: realMessage.timestamp
            };
          } else {
            // Temp message already replaced by Realtime, just update timestamp
            const hasRealMessage = prev.messages.some(msg => msg.id === realMessage.id);
            if (!hasRealMessage) {
              return {
                ...prev,
                messages: [...prev.messages, realMessage],
                lastMessage: messageText,
                timestamp: realMessage.timestamp
              };
            }
            return prev;
          }
        });

        // Update conversations list
        setConversations(prev => prev.map(conv => {
          if (conv.id === activeConversation.id) {
            const hasTempMessage = conv.messages.some(msg => msg.id === tempId);
            if (hasTempMessage) {
              return {
                ...conv,
                messages: conv.messages.map(msg => msg.id === tempId ? realMessage : msg),
                lastMessage: messageText,
                timestamp: realMessage.timestamp
              };
            } else {
              // Temp message already replaced by Realtime
              const hasRealMessage = conv.messages.some(msg => msg.id === realMessage.id);
              if (!hasRealMessage) {
                return {
                  ...conv,
                  messages: [...conv.messages, realMessage],
                  lastMessage: messageText,
                  timestamp: realMessage.timestamp
                };
              }
            }
          }
          return conv;
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setActiveConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== tempId)
        };
      });
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation.id) {
          return {
            ...conv,
            messages: conv.messages.filter(msg => msg.id !== tempId)
          };
        }
        return conv;
      }));
      // Restore message input
      setMessageInput(messageText);
      alert('שגיאה בשליחת ההודעה. נסה שוב.');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // On mobile, show either conversation list or active conversation
  const showConversationList = !activeConversation;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full bg-white items-center justify-center">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-white overflow-x-hidden">
      {/* Right Sidebar - Conversations List */}
      <aside className={`${showConversationList ? 'flex' : 'hidden'} lg:flex w-full lg:w-[25%] xl:w-[28%] 2xl:w-80 border-l border-gray-200 bg-white flex-col flex-shrink min-w-0`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">הודעות</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חיפוש שיחות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-gray-50 text-sm"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">אין שיחות עדיין</p>
              <p className="text-xs mt-2">התחל שיחה חדשה מחברי הקהילה</p>
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
              className={`w-full p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-right ${
                activeConversation && activeConversation.id === conversation.id ? 'bg-[#F52F8E]/10' : ''
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
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-gray-800 text-sm break-words">
                      {conversation.name}
                    </h3>
                    {conversation.unreadCount > 0 && (
                      <div className="flex-shrink-0 w-5 h-5 bg-[#F52F8E] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">{conversation.unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                    {conversation.lastMessage}
                  </p>
                  <p className="text-xs text-gray-500">
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
        <main className={`flex-1 min-w-0 lg:w-[75%] xl:w-[72%] 2xl:flex-1 flex flex-col bg-white ${showConversationList ? 'hidden' : 'flex'} lg:flex flex-shrink`}>
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              {/* Back Button - Mobile Only */}
              <button
                onClick={() => setActiveConversation(null)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${activeConversation.avatarColor} flex items-center justify-center text-white font-semibold text-base sm:text-lg`}>
                  {activeConversation.avatar}
                </div>
                {activeConversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{activeConversation.name}</h3>
                <p className="text-xs sm:text-sm text-[#F52F8E]">מחובר/ת</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gray-50">
            {activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${
                    message.sender === 'me'
                      ? 'bg-white border border-gray-200'
                      : 'bg-[#F52F8E] text-white'
                  }`}
                >
                  <p className="text-sm mb-1 break-words text-right" dir="rtl">{message.text}</p>
                  <p
                    className={`text-xs ${
                      message.sender === 'me' ? 'text-gray-500' : 'text-pink-100'
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {/* Typing Indicator */}
            {typingUsers[activeConversation.id] && (
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 bg-gray-200">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="text-xs text-gray-600 mr-2">כותב...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                dir="rtl"
                placeholder="כתוב הודעה..."
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTyping(e.target.value);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent bg-gray-50 text-sm sm:text-base text-right"
                suppressHydrationWarning
              />
              <button
                onClick={handleSendMessage}
                className="p-2.5 sm:p-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors flex-shrink-0"
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
        <main className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gray-50">
          <p className="text-gray-500">בחר שיחה כדי להתחיל</p>
        </main>
      )}
    </div>
  );
}

