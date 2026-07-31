import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiSend, FiMessageCircle, FiSearch, FiTrash2, FiSlash } from 'react-icons/fi';
import { formatDistanceToNow, format } from 'date-fns';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        if (activeChat && message.sender_id === activeChat.user_id) {
          setMessages(prev => [...prev, message]);
          socket.emit('mark_read', { senderId: activeChat.user_id, receiverId: user.id });
        }
        fetchConversations();
      });

      socket.on('user_typing', (data) => {
        if (activeChat && data.senderId === activeChat.user_id) {
          setTyping(true);
          setTimeout(() => setTyping(false), 2000);
        }
      });

      socket.on('message_sent', (message) => {
        if (activeChat && message.receiver_id === (activeChat.user_id || activeChat.id)) {
          setMessages(prev => [...prev, message]);
        }
      });

      socket.on('message_error', (data) => {
        toast.error(data.error);
      });

      return () => {
        socket.off('receive_message');
        socket.off('user_typing');
        socket.off('message_sent');
        socket.off('message_error');
      };
    }
  }, [socket, activeChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await API.get('/messages/conversations');
      setConversations(res.data);
    } catch (err) {} finally { setLoading(false); }
  };

  const openChat = async (chatUser) => {
    setActiveChat(chatUser);
    try {
      const res = await API.get(`/messages/${chatUser.user_id || chatUser.id}`);
      setMessages(res.data);
      if (socket) {
        socket.emit('mark_read', { senderId: chatUser.user_id || chatUser.id, receiverId: user.id });
      }
      fetchConversations();
    } catch (err) { toast.error('Failed to load messages'); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const receiverId = activeChat.user_id || activeChat.id;

    if (socket) {
      socket.emit('send_message', {
        senderId: user.id,
        receiverId,
        content: newMessage,
        senderName: user.name,
        senderPhoto: user.profile_photo
      });
    } else {
      try {
        const res = await API.post(`/messages/${receiverId}`, { content: newMessage });
        setMessages(prev => [...prev, res.data]);
      } catch (err) { toast.error(err.response?.data?.message || 'Failed to send message'); }
    }

    setNewMessage('');
    fetchConversations();
  };

  const handleTyping = () => {
    if (socket && activeChat) {
      socket.emit('typing', { senderId: user.id, receiverId: activeChat.user_id || activeChat.id });
    }
  };

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await API.get('/users', { params: { search: q } });
      setSearchResults(res.data.filter(u => u.id !== user.id));
    } catch (err) {}
  };

  const startChat = (u) => {
    setActiveChat({ user_id: u.id, name: u.name, profile_photo: u.profile_photo, is_online: onlineUsers.has(u.id) });
    openChat({ user_id: u.id, id: u.id });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearChat = async () => {
    if (!activeChat) return;
    if (!window.confirm(`Are you sure you want to clear the chat with ${activeChat.name}?`)) return;
    try {
      const activeId = activeChat.user_id || activeChat.id;
      await API.delete(`/messages/${activeId}/clear`);
      setMessages([]);
      toast.success('Chat cleared');
    } catch (err) {
      toast.error('Failed to clear chat');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await API.delete(`/messages/message/${msgId}`);
      setMessages(messages.filter(m => m.id !== msgId));
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;
  const isOnline = (userId) => onlineUsers.has(userId) || onlineUsers.has(String(userId));

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>💬 Messages</h2>
          <div style={{position:'relative'}}>
            <input
              className="chat-search"
              placeholder="Search users to chat..."
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',marginTop:4,maxHeight:200,overflowY:'auto',zIndex:10}}>
                {searchResults.map(u => (
                  <div key={u.id} className="chat-item" onClick={() => startChat(u)}>
                    <div className="avatar-wrapper">
                      <img src={getAvatar(u.profile_photo)} alt="" className="avatar" style={{width:36,height:36}} />
                      {isOnline(u.id) && <div className="online-dot"></div>}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{u.name}</div>
                      <div className="chat-preview">{u.role} • {u.department || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="chat-list">
          {conversations.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:'var(--text-muted)',fontSize:14}}>No conversations yet. Search for users above!</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.user_id}
                className={`chat-item ${activeChat?.user_id === conv.user_id ? 'active' : ''}`}
                onClick={() => openChat(conv)}
              >
                <div className="avatar-wrapper">
                  <img src={getAvatar(conv.profile_photo)} alt="" className="avatar" />
                  {(conv.is_online || isOnline(conv.user_id)) && <div className="online-dot"></div>}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{conv.name}</div>
                  <div className="chat-preview">{conv.last_message || 'Start chatting'}</div>
                </div>
                <div className="chat-meta">
                  {conv.last_message_time && (
                    <span className="chat-time">{formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}</span>
                  )}
                  {conv.unread_count > 0 && <span className="unread-badge">{conv.unread_count}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Main */}
      {activeChat ? (
        <div className="chat-main">
          <div className="chat-main-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <img src={getAvatar(activeChat.profile_photo)} alt="" className="avatar" />
              <div className="chat-user-info">
                <div className="name">{activeChat.name}</div>
                <div className={`status ${isOnline(activeChat.user_id || activeChat.id) ? '' : 'offline'}`}>
                  {typing ? 'typing...' : isOnline(activeChat.user_id || activeChat.id) ? '● Online' : '○ Offline'}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}} onClick={handleClearChat} title="Clear Chat">
              <FiSlash /> <span style={{marginLeft: 4}}>Clear Chat</span>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id || i} style={{display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
                  <div className={`message-bubble ${isMine ? 'sent' : 'received'}`} style={{margin: 0}}>
                    <div>{msg.content}</div>
                    <div className="message-time">
                      {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                    </div>
                  </div>
                  {isMine && (
                    <button className="btn btn-ghost btn-icon" style={{color: 'var(--danger)', padding: 4}} onClick={() => handleDeleteMessage(msg.id)} title="Delete message">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={sendMessage}>
            <input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            />
            <button type="submit" className="btn btn-primary btn-icon" disabled={!newMessage.trim()}>
              <FiSend />
            </button>
          </form>
        </div>
      ) : (
        <div className="chat-main">
          <div className="chat-empty">
            <FiMessageCircle className="icon" />
            <h3>Select a conversation</h3>
            <p>Choose from your existing conversations or search for users</p>
          </div>
        </div>
      )}
    </div>
  );
}
