import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageSquare, FiUserPlus, FiMessageCircle, FiBell, FiCheck, FiTrash2 } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', () => {
        fetchNotifications();
        fetchRequests();
      });
      return () => socket.off('new_notification');
    }
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchRequests = async () => {
    try {
      const res = await API.get('/followers/requests');
      setRequests(res.data);
    } catch(err) {}
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const clearNotifications = async () => {
    try {
      await API.delete('/notifications');
      setNotifications([]);
    } catch (err) {}
  };

  const handleAccept = async (followerId) => {
    try {
      await API.put(`/followers/${followerId}/accept`);
      setRequests(requests.filter(r => r.id !== followerId));
    } catch (err) {}
  };

  const handleReject = async (followerId) => {
    try {
      await API.delete(`/followers/${followerId}/follow`);
      setRequests(requests.filter(r => r.id !== followerId));
    } catch (err) {}
  };

  const handleClick = async (notif) => {
    try {
      await API.put(`/notifications/${notif.id}/read`);
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (err) {}

    switch (notif.type) {
      case 'like':
      case 'comment':
        navigate('/');
        break;
      case 'follow':
        navigate(`/profile/${notif.from_user_id}`);
        break;
      case 'message':
        navigate('/chat');
        break;
      default:
        break;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <FiHeart />;
      case 'comment': return <FiMessageSquare />;
      case 'follow': return <FiUserPlus />;
      case 'message': return <FiMessageCircle />;
      default: return <FiBell />;
    }
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';
  const formatTime = (date) => { try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; } };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="feed-container">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1>🔔 Notifications</h1>
          <p>Stay updated with your campus activity</p>
        </div>
        <div style={{display:'flex', gap: '8px'}}>
          {notifications.some(n => !n.is_read) && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <FiCheck /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clearNotifications}>
              <FiTrash2 /> Clear all
            </button>
          )}
        </div>
      </div>

      {requests.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)' }}>Follow Requests ({requests.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => (
              <div key={req.id} className="notification-item animate-fadeIn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${req.id}`)}>
                  <img src={getAvatar(req.profile_photo)} alt="" style={{width: 40, height: 40, borderRadius: 'var(--radius-full)', objectFit: 'cover'}} />
                  <div>
                    <div style={{fontWeight: 600, fontSize: 15}}>{req.name} <span style={{fontSize: 12, fontWeight: 'normal', color: 'var(--text-secondary)'}}>wants to follow you</span></div>
                    <div style={{fontSize: 13, color: 'var(--text-muted)'}}>{req.role} • {req.department}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req.id)}>Accept</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleReject(req.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifications.length > 0 && <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)' }}>Recent</h3>}

      {notifications.length === 0 && requests.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔕</div>
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-item ${!notif.is_read ? 'unread' : ''} animate-fadeIn`}
              onClick={() => handleClick(notif)}
            >
              <div className={`notif-icon ${notif.type}`}>
                {getIcon(notif.type)}
              </div>
              <div className="notif-content">
                <div className="notif-text">{notif.message}</div>
                <div className="notif-time">{formatTime(notif.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
