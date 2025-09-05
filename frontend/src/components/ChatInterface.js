import React, { useState, useEffect, useRef } from 'react';
import { 
  FaComments, 
  FaPaperPlane, 
  FaTimes, 
  FaCircle, 
  FaImage, 
  FaArrowDown,
  FaClock,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = ({ 
  artisanId, 
  productId = null, 
  chatType = 'general', 
  initialMessage = '',
  onClose 
}) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const { user, userType } = useAuth();

  useEffect(() => {
    if (artisanId) {
      initializeChat();
    }
    
    return () => {
      // Set offline status when component unmounts
      if (chat?._id) {
        updateOnlineStatus(false);
      }
    };
  }, [artisanId, productId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/chat/start', {
        artisanId,
        productId,
        chatType,
        initialMessage: initialMessage.trim() || undefined
      });

      if (response.data.success) {
        setChat(response.data.chat);
        setMessages(response.data.chat.messages || []);
        setIsOnline(response.data.chat.isOnline);
        
        // Set online status
        updateOnlineStatus(true);
      }
    } catch (error) {
      console.error('Initialize chat error:', error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !chat?._id) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await axios.post(`/api/chat/${chat._id}/message`, {
        content: messageContent,
        messageType: 'text'
      });

      if (response.data.success) {
        setMessages(prev => [...prev, response.data.message]);
        updateOnlineStatus(true); // Refresh online status
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const updateOnlineStatus = async (online) => {
    if (!chat?._id) return;

    try {
      await axios.put(`/api/chat/${chat._id}/online`, {
        isOnline: online
      });
    } catch (error) {
      console.error('Update online status error:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  if (userType !== 'customer') {
    return (
      <div className="chat-interface error">
        <div className="error-message">
          <p>Chat is only available for customers</p>
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-interface loading">
        <div className="chat-header">
          <div className="skeleton-header">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-info">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <FaTimes />
          </button>
        </div>
        <div className="messages-container">
          <div className="loading-messages">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className={`skeleton-message ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="skeleton-content"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="chat-interface error">
        <div className="error-message">
          <p>Unable to start chat. Please try again.</p>
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="chat-interface">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="user-avatar">
            {chat.artisan?.profileImage ? (
              <img src={chat.artisan.profileImage} alt={chat.artisan.name} />
            ) : (
              <FaUser />
            )}
            <div className={`online-indicator ${isOnline ? 'online' : 'offline'}`}>
              <FaCircle />
            </div>
          </div>
          <div className="user-details">
            <h3>{chat.artisan?.name}</h3>
            <p className="user-status">
              {isOnline ? 'Online' : 'Offline'} • {chat.artisan?.location?.city}
            </p>
            {chat.product && (
              <p className="product-context">
                About: {chat.product.name}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="close-btn">
          <FaTimes />
        </button>
      </div>

      {/* Messages Container */}
      <div className="messages-container" ref={messagesContainerRef}>
        {Object.entries(messageGroups).map(([date, dayMessages]) => (
          <div key={date} className="message-group">
            <div className="date-separator">
              <span>{formatDate(dayMessages[0].timestamp)}</span>
            </div>
            {dayMessages.map((message) => {
              const isOwn = message.senderType === (userType === 'customer' ? 'User' : 'Artisan');
              
              return (
                <div key={message._id} className={`message ${isOwn ? 'own' : 'other'}`}>
                  <div className="message-content">
                    <div className="message-bubble">
                      <p>{message.content}</p>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                        {isOwn && (
                          <span className={`read-status ${message.isRead ? 'read' : 'sent'}`}>
                            {message.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="empty-chat">
            <FaComments className="empty-icon" />
            <p>Start a conversation with {chat.artisan?.name}</p>
            {chat.product && (
              <p>Ask about "{chat.product.name}" or place a custom order</p>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          <FaArrowDown />
        </button>
      )}

      {/* Message Input */}
      <div className="message-input-container">
        <div className="message-input">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${chat.artisan?.name}...`}
            disabled={sending}
            rows="1"
            style={{ 
              minHeight: '20px',
              maxHeight: '120px',
              resize: 'none',
              overflow: 'auto'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="send-btn"
          >
            {sending ? <FaClock /> : <FaPaperPlane />}
          </button>
        </div>
        <div className="input-footer">
          <span className="char-count">
            {newMessage.length}/1000
          </span>
          {!isOnline && (
            <span className="offline-notice">
              {chat.artisan?.name} is offline. They'll see your message when they return.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
