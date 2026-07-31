import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { FiUsers } from 'react-icons/fi';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function FollowersList() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(searchParams.get('tab') || 'followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, gRes] = await Promise.all([
          API.get(`/followers/${userId}/followers`),
          API.get(`/followers/${userId}/following`)
        ]);
        setFollowers(fRes.data);
        setFollowing(gRes.data);
      } catch (err) {} finally { setLoading(false); }
    };
    fetchData();
  }, [userId]);

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;
  const list = tab === 'followers' ? followers : following;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="followers-page">
      <div className="page-header">
        <h1><FiUsers style={{marginRight:8,verticalAlign:'middle'}}/> Connections</h1>
      </div>
      <div className="admin-tabs" style={{marginBottom:24}}>
        <button className={`tab ${tab==='followers'?'active':''}`} onClick={()=>setTab('followers')}>Followers ({followers.length})</button>
        <button className={`tab ${tab==='following'?'active':''}`} onClick={()=>setTab('following')}>Following ({following.length})</button>
      </div>
      {list.length === 0 ? (
        <div className="empty-state"><div className="icon">👥</div><h3>No {tab} yet</h3></div>
      ) : (
        list.map(u => (
          <div key={u.id} className="user-list-item animate-slideIn" onClick={()=>navigate(`/profile/${u.id}`)} style={{cursor:'pointer'}}>
            <img src={getAvatar(u.profile_photo)} alt="" className="avatar" />
            <div className="user-info">
              <div className="name">{u.name}</div>
              <div className="detail">{u.role} {u.department?`• ${u.department}`:''}</div>
            </div>
            <span className={`role-badge ${u.role}`}>{u.role}</span>
          </div>
        ))
      )}
    </div>
  );
}
