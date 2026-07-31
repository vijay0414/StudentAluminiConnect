import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiUsers, FiMessageSquare, FiTrendingUp, FiMoon, FiSun, FiUser, FiBriefcase, FiAward } from 'react-icons/fi';
import './Landing.css';

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="logo-icon">CC</div>
          <h1>CampusConnect</h1>
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/register" className="btn btn-primary">Sign Up</Link>
        </div>
      </nav>

      <main className="landing-content">
        <section className="hero-section">
          <div className="hero-text">
            <h1 className="hero-title">Bridging the Gap Between <span className="highlight">Students</span> and <span className="highlight">Alumni</span></h1>
            <p className="hero-subtitle">
              CampusConnect is the ultimate platform for networking, career growth, and seamless communication. Stay connected with your campus community, find jobs, and share your achievements.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Login to Account</Link>
            </div>
          </div>
          <div className="hero-image-container">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="hero-glass-card">
              <div className="glass-header">
                <div className="dot red"></div>
                <div className="dot yellow"></div>
                <div className="dot green"></div>
              </div>
              <div className="glass-content">
                
                <div className="mock-user-card float-anim-1">
                  <div className="mock-avatar-img blue-bg"><FiUser /></div>
                  <div className="mock-user-info">
                    <div className="mock-name">Sarah Jenkins</div>
                    <div className="mock-role">Alumni '19 • Software Engineer</div>
                  </div>
                  <div className="mock-btn-sm">Connect</div>
                </div>
                
                <div className="mock-post float-anim-2">
                  <div className="mock-post-header">
                    <div className="mock-avatar-img green-bg"><FiBriefcase /></div>
                    <div className="mock-user-info">
                      <div className="mock-name">TechCorp Internship</div>
                      <div className="mock-role">Posted 2 hours ago</div>
                    </div>
                  </div>
                  <div className="mock-post-body">
                    We are looking for passionate juniors for our Summer Program! Drop your resume...
                  </div>
                </div>

                <div className="mock-notification float-anim-3">
                  <div className="mock-icon-wrapper purple-bg"><FiAward /></div>
                  <div className="mock-notif-text">
                    <strong>Campus Event:</strong> Tech Hackathon winner announced!
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="feature-card card">
            <div className="feature-icon"><FiUsers /></div>
            <h3>Build Your Network</h3>
            <p>Connect with peers, professors, and alumni to construct a network that propels your career forward.</p>
          </div>
          <div className="feature-card card">
            <div className="feature-icon"><FiMessageSquare /></div>
            <h3>Real-time Chat & Notifications</h3>
            <p>Engage in instant messaging and stay updated with live notifications from your connections.</p>
          </div>
          <div className="feature-card card">
            <div className="feature-icon"><FiTrendingUp /></div>
            <h3>Opportunities & Announcements</h3>
            <p>Discover job postings, internships, and crucial campus announcements curated exclusively for you.</p>
          </div>
        </section>
      </main>
      
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} CampusConnect. All rights reserved.</p>
      </footer>
    </div>
  );
}
