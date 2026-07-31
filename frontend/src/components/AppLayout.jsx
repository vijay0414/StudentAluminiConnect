import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';
import { FiHome, FiMessageSquare, FiBell, FiUser, FiLogOut, FiShield, FiSearch, FiMenu, FiMoon, FiSun, FiPlus } from 'react-icons/fi';
import PostModal from './PostModal';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, notifications: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPostModalOpen, setPostModalOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCounts();
    if (socket) {
      socket.on('receive_message', fetchUnreadCounts);
      socket.on('new_notification', fetchUnreadCounts);
      return () => {
        socket.off('receive_message', fetchUnreadCounts);
        socket.off('new_notification', fetchUnreadCounts);
      };
    }
  }, [socket, location]); // Re-fetch on navigation

  const fetchUnreadCounts = async () => {
    if (user?.role === 'admin') return;
    try {
      const [msgRes, notifRes] = await Promise.all([
        API.get('/messages/conversations'),
        API.get('/notifications/unread-count')
      ]);
      const msgCount = msgRes.data.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
      setUnreadCounts({
        messages: msgCount,
        notifications: notifRes.data.count
      });
    } catch (error) {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">CC</div>
          <h1>CampusConnect</h1>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-link" onClick={() => setPostModalOpen(true)} style={{background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', justifyContext: 'center'}}>
            <FiPlus className="icon" /> <span>New Post</span>
          </button>
          <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FiHome className="icon" /> <span>Feed</span>
          </NavLink>
          <NavLink to="/search" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FiSearch className="icon" /> <span>Search Network</span>
          </NavLink>
          <NavLink to="/chat" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FiMessageSquare className="icon" /> <span>Messages</span>
            {unreadCounts.messages > 0 && <span className="badge">{unreadCounts.messages}</span>}
          </NavLink>
          <NavLink to="/notifications" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FiBell className="icon" /> <span>Notifications</span>
            {unreadCounts.notifications > 0 && <span className="badge">{unreadCounts.notifications}</span>}
          </NavLink>
          <NavLink to={`/profile/${user?.id}`} className={({isActive}) => `nav-link ${isActive && location.pathname === '/profile/' + user?.id ? 'active' : ''}`}>
            <FiUser className="icon" /> <span>Profile</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <FiShield className="icon" /> <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <img src={getAvatar(user?.profile_photo)} alt="" className="avatar" />
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="role">{user?.staff_role || user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title="Toggle Theme" style={{marginLeft:'auto',padding:4}}>
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout" style={{padding:4}}>
            <FiLogOut />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <PostModal 
        isOpen={isPostModalOpen} 
        onClose={() => setPostModalOpen(false)} 
        onPostSaved={(post, isEdit) => {
          window.dispatchEvent(new CustomEvent('postSaved', { detail: { post, isEdit } }));
        }} 
      />
    </div>
  );
}
