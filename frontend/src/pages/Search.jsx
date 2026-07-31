import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { FiSearch, FiFilter, FiUser } from 'react-icons/fi';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = {};
      if (query) params.search = query;
      if (role) params.role = role;
      if (department) params.department = department;
      if (batch) params.batch = batch;

      const res = await API.get('/users', { params });
      setResults(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch();
  }, [role, department, batch]);

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;

  return (
    <div className="feed-container" style={{maxWidth: 800}}>
      <div className="page-header">
        <h1>🔍 Search Directory</h1>
        <p>Find students, alumni, and faculty in your network</p>
      </div>

      <div className="card" style={{marginBottom: 24}}>
        <form onSubmit={handleSearch} style={{display: 'flex', gap: 12}}>
          <div style={{flex: 1, position: 'relative'}}>
            <FiSearch style={{position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by name or email..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{paddingLeft: 44}}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>Search</button>
          <button type="button" className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(!showFilters)}>
            <FiFilter /> Filters
          </button>
        </form>

        {showFilters && (
          <div className="feed-filters animate-slideIn" style={{marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16}}>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block'}}>Role</label>
              <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Any Role</option>
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block'}}>Department</label>
              <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Any Department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
                <option value="Electrical">Electrical</option>
                <option value="Information Technology">Information Technology</option>
                <option value="MBA">MBA</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block'}}>Batch Year</label>
              <input type="text" className="form-control" placeholder="e.g. 2024" value={batch} onChange={(e) => setBatch(e.target.value)} />
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end'}}>
              <button className="btn btn-ghost" style={{width: '100%'}} onClick={() => {setRole(''); setDepartment(''); setBatch(''); setQuery('');}}>Clear Filters</button>
            </div>
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No users found</h3>
            <p>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div style={{display: 'grid', gap: 16}}>
            {results.map(u => (
              <div key={u.id} className="card post-card animate-fadeIn" style={{margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, padding: 16}} onClick={() => navigate(`/profile/${u.id}`)}>
                <img src={getAvatar(u.profile_photo)} alt="" className="avatar" style={{width: 60, height: 60, borderRadius: 'var(--radius-full)', objectFit: 'cover'}} />
                <div style={{flex: 1}}>
                  <div style={{fontSize: 18, fontWeight: 600, marginBottom: 4}}>{u.name}</div>
                  <div style={{fontSize: 14, color: 'var(--text-secondary)'}}>
                    <span className={`role-badge ${u.role}`} style={{marginRight: 8}}>{u.staff_role || u.role}</span>
                    {u.college_name && <span>🏫 {u.college_name} • </span>}
                    {u.department && <span>📚 {u.department}</span>}
                    {u.batch && <span> • 🎓 {u.batch}</span>}
                  </div>
                  {u.bio && <div style={{fontSize: 13, color: 'var(--text-muted)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px'}}>{u.bio}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
