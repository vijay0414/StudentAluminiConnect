import { useState, useEffect } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FiImage, FiVideo, FiSend } from 'react-icons/fi';

export default function PostModal({ isOpen, onClose, postToEdit = null, onPostSaved }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [postType, setPostType] = useState('general');
  const [tags, setTags] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (postToEdit) {
      setContent(postToEdit.content || '');
      setPostType(postToEdit.post_type || 'general');
      setTags(postToEdit.tags || '');
      setIsAnnouncement(postToEdit.is_announcement ? true : false);
      setMedia(null);
    } else {
      setContent('');
      setPostType('general');
      setTags('');
      setIsAnnouncement(false);
      setMedia(null);
    }
  }, [postToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return toast.error('Write something!');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('post_type', postType);
      formData.append('tags', tags);
      formData.append('is_announcement', isAnnouncement);
      if (media) formData.append('media', media);

      let res;
      if (postToEdit) {
        res = await API.put(`/posts/${postToEdit.id}`, formData);
        toast.success('Post updated!');
      } else {
        res = await API.post('/posts', formData);
        toast.success('Post created!');
      }
      if (onPostSaved) onPostSaved(res.data.post, !!postToEdit);
      onClose();
    } catch (err) {
      toast.error(postToEdit ? 'Failed to update post' : 'Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = (photo) => photo ? `http://localhost:5000${photo}` : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" dy=".1em" fill="white" font-size="40" font-family="sans-serif">U</text></svg>';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fadeIn" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header">
          <h2>{postToEdit ? 'Edit Post' : 'Create Post'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <img src={getAvatar(user?.profile_photo)} alt="" style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 }} />
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ flex: 1, minHeight: '100px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', color: 'var(--text)', resize: 'none', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <label className="btn btn-ghost btn-sm" style={{cursor:'pointer', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '6px 12px'}}>
              <FiImage style={{marginRight: '2px'}} /><FiVideo style={{marginRight: '2px'}} /> Photo/Video
              <input type="file" accept="image/*,video/*" hidden onChange={(e) => setMedia(e.target.files[0])} />
            </label>
            {user?.role === 'alumni' && (
              <select className="btn btn-ghost btn-sm" value={postType} onChange={(e) => setPostType(e.target.value)} style={{background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:'var(--radius-md)', padding: '6px 12px'}}>
                <option value="general">General</option>
                <option value="job">💼 Job</option>
                <option value="internship">🎓 Internship</option>
              </select>
            )}
            {user?.role === 'staff' && (
              <label className="btn btn-ghost btn-sm" style={{cursor:'pointer', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '6px 12px'}}>
                <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} style={{marginRight:6}} />
                📢 Announcement
              </label>
            )}
            <input
              type="text"
              placeholder="#tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{padding:'6px 12px',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',color:'var(--text)',fontSize:'13px',flex: 1, minWidth: '150px', outline:'none'}}
            />
          </div>
          {media && (
            <div style={{fontSize:13,color:'var(--text-secondary)'}}>
              📎 {media.name}
              <button type="button" onClick={() => setMedia(null)} className="btn btn-ghost btn-sm" style={{marginLeft:8}}>✕</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FiSend style={{marginRight: '6px'}} /> {saving ? (postToEdit ? 'Updating...' : 'Posting...') : (postToEdit ? 'Update' : 'Post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
