import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiSun, FiMoon } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
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
            <h2>Welcome Back</h2>
            <p>Sign in to CampusConnect</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><FiMail style={{marginRight:6, verticalAlign:'middle'}}/>Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label><FiLock style={{marginRight:6, verticalAlign:'middle'}}/>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={{textAlign: 'right', marginTop: 12}}>
              <Link to="/forgot-password" style={{fontSize: 13, color: 'var(--text-muted)'}}>Forgot Password?</Link>
            </div>
          </form>
          <div className="auth-footer">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
