import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiMapPin, FiCalendar, FiBook, FiMail, FiPhone, FiUserPlus, FiUserMinus, FiTrash2, FiPlus } from 'react-icons/fi';
import PostModal from '../components/PostModal';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function Profile() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({});
  const [editPhoto, setEditPhoto] = useState(null);
  const [editCover, setEditCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  const profileId = id || user?.id;
  const isOwnProfile = !id || parseInt(id) === user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, postsRes] = await Promise.all([
          API.get(`/users/${profileId}`),
          API.get(`/posts/user/${profileId}`)
        ]);
        setProfile(profileRes.data);
        setPosts(postsRes.data);
        if (isOwnProfile) {
          setEditData({
            name: profileRes.data.name || '',
            college_name: profileRes.data.college_name || '',
            department: profileRes.data.department || '',
            batch: profileRes.data.batch || '',
            skills: profileRes.data.skills || '',
            bio: profileRes.data.bio || '',
            contact_info: profileRes.data.contact_info || ''
          });
        }
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (profileId) fetchProfile();
  }, [profileId, isOwnProfile]);

  useEffect(() => {
    const handlePostSaved = (e) => {
      const { post, isEdit } = e.detail;
      if (post.user_id === parseInt(profileId) || (user && post.user_id === user.id)) {
        if (isEdit) {
          setPosts(prev => prev.map(p => p.id === post.id ? post : p));
        } else {
          setPosts(prev => [post, ...prev]);
        }
      }
    };
    window.addEventListener('postSaved', handlePostSaved);
    return () => window.removeEventListener('postSaved', handlePostSaved);
  }, [profileId, user]);

  const handleFollow = async () => {
    try {
      if (profile.isFollowing || profile.followStatus === 'pending') {
        await API.delete(`/followers/${profileId}/follow`);
        setProfile({ 
          ...profile, 
          isFollowing: false, 
          followStatus: null, 
          followerCount: profile.followerCount - (profile.isFollowing ? 1 : 0) 
        });
        toast.success(profile.isFollowing ? 'Unfollowed' : 'Request Cancelled');
      } else {
        const res = await API.post(`/followers/${profileId}/follow`);
        const status = res.data.status;
        setProfile({ 
          ...profile, 
          isFollowing: status === 'accepted', 
          followStatus: status,
          followerCount: profile.followerCount + (status === 'accepted' ? 1 : 0) 
        });
        toast.success(status === 'accepted' ? 'Following!' : 'Request Sent!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(editData).forEach(([key, val]) => formData.append(key, val));
      if (editPhoto) formData.append('profile_photo', editPhoto);
      if (editCover) formData.append('cover_photo', editCover);
      const res = await API.put('/users/update', formData);
      setProfile({ ...profile, ...res.data.user });
      updateUser(res.data.user);
      setShowEdit(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;
  const formatTime = (date) => { try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; } };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await API.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!profile) return <div className="empty-state"><h3>User not found</h3></div>;

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header animate-fadeIn">
        <div className="profile-cover" style={profile.cover_photo ? { backgroundImage: `url(http://localhost:5000${profile.cover_photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}></div>
        <div className="profile-info-card">
          <img src={getAvatar(profile.profile_photo)} alt="" className="profile-avatar" />
          <div className="profile-details">
            <div>
              <h1 className="profile-name">{profile.name}</h1>
              <span className={`profile-role role-badge ${profile.role}`}>
                {profile.staff_role || profile.role}
              </span>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-meta">
                {profile.college_name && <span className="meta-item"><FiMapPin /> {profile.college_name}</span>}
                {profile.department && <span className="meta-item"><FiBook /> {profile.department}</span>}
                {profile.batch && <span className="meta-item"><FiCalendar /> Batch {profile.batch}</span>}
                {profile.contact_info && <span className="meta-item"><FiPhone /> {profile.contact_info}</span>}
                <span className="meta-item"><FiMail /> {profile.email}</span>
              </div>
              {profile.skills && (
                <div className="profile-skills">
                  {profile.skills.split(',').map((skill, i) => (
                    <span key={i} className="skill-tag">{skill.trim()}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:8,flexShrink:0}}>
              {isOwnProfile ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsCreatingPost(true)}>
                    <FiPlus /> New Post
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                    <FiEdit2 /> Edit Profile
                  </button>
                </>
              ) : (
                <button className={`btn ${profile.isFollowing || profile.followStatus === 'pending' ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                  {profile.followStatus === 'pending' ? <><FiUserMinus /> Cancel Request</> : profile.isFollowing ? <><FiUserMinus /> Unfollow</> : <><FiUserPlus /> Follow</>}
                </button>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item" onClick={() => navigate(`/followers/${profileId}?tab=followers`)}>
              <div className="stat-value">{profile.followerCount}</div>
              <div className="stat-label">Followers</div>
            </div>
            <div className="stat-item" onClick={() => navigate(`/followers/${profileId}?tab=following`)}>
              <div className="stat-value">{profile.followingCount}</div>
              <div className="stat-label">Following</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{profile.postCount}</div>
              <div className="stat-label">Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div style={{marginTop:24}}>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:16}}>Posts</h2>
        {posts.length === 0 ? (
          <div className="empty-state"><p>No posts yet</p></div>
        ) : (
          posts.map(post => (
            <div key={post.id} className={`card post-card ${post.is_announcement ? 'announcement' : ''} animate-fadeIn`} style={{marginBottom:16}}>
              <div className="post-content-area">
                <div className="post-header">
                  <img src={getAvatar(post.profile_photo)} alt="" className="avatar" />
                  <div className="post-user-info">
                    <div className="post-user-name">{post.name}</div>
                    <div className="post-user-meta">
                      <span className={`role-badge ${post.user_role}`}>{post.staff_role || post.user_role}</span>
                      <span>• {formatTime(post.created_at)}</span>
                    </div>
                  </div>
                  <div style={{marginLeft: 'auto', display: 'flex', gap: '8px'}}>
                    {isOwnProfile && (
                      <button className="btn btn-ghost btn-sm" style={{color: 'var(--text-secondary)'}} onClick={() => setEditingPost(post)}>
                        <FiEdit2 />
                      </button>
                    )}
                    {isOwnProfile && (
                      <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}} onClick={() => handleDeletePost(post.id)}>
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-content">{post.content}</div>
                {post.image_url && <img src={`http://localhost:5000${post.image_url}`} alt="" className="post-image" />}
                {post.video_url && <video src={`http://localhost:5000${post.video_url}`} controls className="post-video" style={{ width: '100%', maxHeight: '500px', borderRadius: 'var(--radius-md)', marginTop: '10px' }} />}
                <div className="post-stats">
                  <span className="stat">{post.likeCount} likes</span>
                  <span className="stat">{post.commentCount} comments</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal animate-fadeIn">
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>Cover Photo</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => setEditCover(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Profile Photo</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => setEditPhoto(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-control" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea className="form-control" value={editData.bio} onChange={(e) => setEditData({...editData, bio: e.target.value})} placeholder="Tell us about yourself..." />
              </div>
              <div className="form-group">
                <label>College Name</label>
                <input type="text" className="form-control" value={editData.college_name} onChange={(e) => setEditData({...editData, college_name: e.target.value})} placeholder="e.g. XYZ College" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" className="form-control" value={editData.department} onChange={(e) => setEditData({...editData, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Batch</label>
                <input type="text" className="form-control" value={editData.batch} onChange={(e) => setEditData({...editData, batch: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Skills (comma separated)</label>
                <input type="text" className="form-control" value={editData.skills} onChange={(e) => setEditData({...editData, skills: e.target.value})} placeholder="React, Node.js, Python..." />
              </div>
              <div className="form-group">
                <label>Contact Info</label>
                <input type="text" className="form-control" value={editData.contact_info} onChange={(e) => setEditData({...editData, contact_info: e.target.value})} placeholder="Phone or alternative email" />
              </div>
              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isCreatingPost || editingPost) && (
        <PostModal 
          isOpen={true} 
          postToEdit={editingPost} 
          onClose={() => {
            setIsCreatingPost(false);
            setEditingPost(null);
          }} 
          onPostSaved={(post, isEdit) => {
            window.dispatchEvent(new CustomEvent('postSaved', { detail: { post, isEdit } }));
            setIsCreatingPost(false);
            setEditingPost(null);
          }} 
        />
      )}
    </div>
  );
}
