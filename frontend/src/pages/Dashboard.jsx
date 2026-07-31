import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageSquare, FiImage, FiVideo, FiSend, FiTrash2, FiFilter, FiEdit2 } from 'react-icons/fi';
import PostModal from '../components/PostModal';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFollowed, setShowFollowed] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async () => {
    try {
      const params = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      if (showFollowed) params.followed = 'true';
      if (filter !== 'all') params.tag = filter;
      const res = await API.get('/posts/feed', { params });
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, showFollowed, filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const handlePostSaved = (e) => {
      const { post, isEdit } = e.detail;
      if (isEdit) {
        setPosts(prev => prev.map(p => p.id === post.id ? post : p));
      } else {
        setPosts(prev => [post, ...prev]);
      }
    };
    window.addEventListener('postSaved', handlePostSaved);
    return () => window.removeEventListener('postSaved', handlePostSaved);
  }, []);

  const handleLike = async (postId) => {
    try {
      const res = await API.post(`/posts/${postId}/like`);
      setPosts(posts.map(p => p.id === postId ? {
        ...p, isLiked: res.data.liked, likeCount: res.data.liked ? p.likeCount + 1 : p.likeCount - 1
      } : p));
    } catch (err) { toast.error('Failed'); }
  };

  const loadComments = async (postId) => {
    try {
      const res = await API.get(`/posts/${postId}/comments`);
      setComments(prev => ({ ...prev, [postId]: res.data }));
    } catch (err) {}
  };

  const toggleComments = (postId) => {
    const newShow = !showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: newShow }));
    if (newShow) loadComments(postId);
  };

  const handleComment = async (postId) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    try {
      const res = await API.post(`/posts/${postId}/comment`, { content });
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), res.data.comment] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(posts.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (err) { toast.error('Failed'); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await API.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (err) { toast.error('Failed'); }
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : DEFAULT_AVATAR;
  const formatTime = (date) => { try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; } };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="feed-container">
      <div className="page-header">
        <h1>📰 Feed</h1>
        <p>Stay connected with your campus community</p>
      </div>



      {/* Filters */}
      <div className="feed-filters">
        <button className={`filter-btn ${!showFollowed && !typeFilter && filter === 'all' ? 'active' : ''}`} onClick={() => { setShowFollowed(false); setTypeFilter(''); setFilter('all'); }}>All</button>
        <button className={`filter-btn ${showFollowed ? 'active' : ''}`} onClick={() => setShowFollowed(!showFollowed)}>Following</button>
        <button className={`filter-btn ${typeFilter === 'announcement' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'announcement' ? '' : 'announcement')}>📢 Announcements</button>
        <button className={`filter-btn ${typeFilter === 'job' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'job' ? '' : 'job')}>💼 Jobs</button>
        <button className={`filter-btn ${typeFilter === 'internship' ? 'active' : ''}`} onClick={() => setTypeFilter(typeFilter === 'internship' ? '' : 'internship')}>🎓 Internships</button>
        <button className={`filter-btn ${filter === 'placement' ? 'active' : ''}`} onClick={() => setFilter(filter === 'placement' ? 'all' : 'placement')}>#placement</button>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No posts yet</h3>
          <p>Be the first to share something!</p>
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className={`card post-card ${post.is_announcement ? 'announcement' : ''} ${post.post_type !== 'general' ? post.post_type : ''} animate-fadeIn`}>
            <div className="post-content-area">
              <div className="post-header">
                <img src={getAvatar(post.profile_photo)} alt="" className="avatar" onClick={() => navigate(`/profile/${post.user_id}`)} />
                <div className="post-user-info">
                  <div className="post-user-name" onClick={() => navigate(`/profile/${post.user_id}`)}>{post.name}</div>
                  <div className="post-user-meta">
                    <span className={`role-badge ${post.user_role}`}>{post.staff_role || post.user_role}</span>
                    {post.college_name && <span style={{fontSize: 12, color: 'var(--text-muted)'}}>• {post.college_name} </span>}
                    <span>• {formatTime(post.created_at)}</span>
                  </div>
                </div>
                <div style={{marginLeft: 'auto', display: 'flex', gap: '8px', alignSelf: 'flex-start'}}>
                  {post.user_id === user?.id && (
                    <button className="btn btn-ghost btn-sm" style={{color: 'var(--text-secondary)'}} onClick={() => setEditingPost(post)}>
                      <FiEdit2 /> <span className="hide-mobile">Edit</span>
                    </button>
                  )}
                  {(post.user_id === user?.id || user?.role === 'admin') && (
                    <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}} onClick={() => handleDelete(post.id)}>
                      <FiTrash2 /> <span className="hide-mobile">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {(post.post_type === 'job' || post.post_type === 'internship') && (
                <span className={`post-type-badge ${post.post_type}`}>
                  {post.post_type === 'job' ? '💼 Job Opportunity' : '🎓 Internship'}
                </span>
              )}

              <div className="post-content">{post.content}</div>

              {post.image_url && (
                <img src={`http://localhost:5000${post.image_url}`} alt="" className="post-image" />
              )}
              {post.video_url && (
                <video src={`http://localhost:5000${post.video_url}`} controls className="post-video" style={{ width: '100%', maxHeight: '500px', borderRadius: 'var(--radius-md)', marginTop: '10px' }} />
              )}

              {post.tags && (
                <div className="post-tags">
                  {post.tags.split(',').map((tag, i) => (
                    <span key={i} className="tag" onClick={() => setFilter(tag.trim())}>#{tag.trim()}</span>
                  ))}
                </div>
              )}

              <div className="post-stats">
                <span className="stat">{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>
                <span className="stat">{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
              </div>

              <div className="post-actions-bar">
                <button className={`action-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                  <FiHeart className="icon" style={post.isLiked ? {fill:'currentColor'} : {}} /> {post.isLiked ? 'Liked' : 'Like'}
                </button>
                <button className="action-btn" onClick={() => toggleComments(post.id)}>
                  <FiMessageSquare className="icon" /> Comment
                </button>
              </div>

              {showComments[post.id] && (
                <div className="comments-section animate-fadeIn">
                  {(comments[post.id] || []).map(c => (
                    <div key={c.id} className="comment-item">
                      <img src={getAvatar(c.profile_photo)} alt="" className="avatar" />
                      <div>
                        <div className="comment-body">
                          <div className="comment-name">{c.name}</div>
                          <div className="comment-text">{c.content}</div>
                        </div>
                        <div className="comment-time">{formatTime(c.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  <div className="comment-input">
                    <input
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleComment(post.id)}>
                      <FiSend />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:24}}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{padding:'8px 16px',color:'var(--text-secondary)'}}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {editingPost && (
        <PostModal 
          isOpen={true} 
          postToEdit={editingPost} 
          onClose={() => setEditingPost(null)} 
          onPostSaved={(post) => {
            setPosts(prev => prev.map(p => p.id === post.id ? post : p));
            setEditingPost(null);
          }} 
        />
      )}
    </div>
  );
}
