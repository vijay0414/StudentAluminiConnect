import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiSun, FiMoon } from 'react-icons/fi';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !newPassword) return toast.error('Please fill all fields');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await API.put('/auth/reset-password', { email, newPassword });
      toast.success(res.data.message || 'Password updated successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button 
        onClick={toggleTheme} 
        className="btn btn-ghost btn-icon" 
        style={{ position: 'absolute', top: 20, right: 20 }}
      >
        {theme === 'dark' ? <FiSun size={24} /> : <FiMoon size={24} />}
      </button>
      <div className="auth-container">
        <div className="auth-card animate-fadeIn">
          <div className="auth-header">
            <div className="logo">CC</div>
            <h2>Reset Password</h2>
            <p>Enter your email to update your matching password account</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><FiMail style={{marginRight:6, verticalAlign:'middle'}}/>Account Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label><FiLock style={{marginRight:6, verticalAlign:'middle'}}/>New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%', padding: 14}}>
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
          <div className="auth-footer" style={{marginTop: 24, textAlign: 'center'}}>
            Remembered your password? <Link to="/login" style={{color: 'var(--primary-light)', fontWeight: 600}}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
