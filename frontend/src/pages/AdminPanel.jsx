import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { FiUsers, FiFileText, FiCheckCircle, FiXCircle, FiTrash2, FiShield, FiUpload, FiGrid, FiImage, FiUser, FiArchive } from 'react-icons/fi';

export default function AdminPanel() {
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await API.get('/admin/stats');
      setStats(statsRes.data);
      if (tab === 'pending') {
        const res = await API.get('/admin/pending-users');
        setPendingUsers(res.data);
      } else if (tab === 'users') {
        const res = await API.get('/admin/users');
        setAllUsers(res.data);
      } else if (tab === 'posts') {
        const res = await API.get('/admin/posts');
        setAllPosts(res.data);
      }
    } catch (err) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setUploadLoading(true);
    try {
      const res = await API.post('/admin/upload-students', data);
      toast.success(res.data.message || 'Upload complete');
      fetchData(); // Refresh stats
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const approveUser = async (id) => {
    try {
      await API.put(`/admin/approve/${id}`);
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
      toast.success('User approved');
      setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
    } catch (err) { toast.error('Failed'); }
  };

  const rejectUser = async (id) => {
    if (!window.confirm('Reject this user?')) return;
    try {
      await API.delete(`/admin/reject/${id}`);
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
      toast.success('User rejected');
      setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
    } catch (err) { toast.error('Failed'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setAllUsers(allUsers.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Remove this post?')) return;
    try {
      await API.delete(`/admin/posts/${id}`);
      setAllPosts(allPosts.filter(p => p.id !== id));
      toast.success('Post removed');
    } catch (err) { toast.error('Failed'); }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="admin-page animate-fadeIn">
      <div className="page-header">
        <h1><FiShield style={{marginRight:8,verticalAlign:'middle', color:'var(--primary)'}}/> Admin Panel</h1>
        <p>Manage users, posts, and student record database</p>
      </div>

      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value color-warning">{stats.pendingUsers}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalPosts}</div>
            <div className="stat-label">Total Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value color-primary">{stats.verifiedStudents}</div>
            <div className="stat-label">Student Records</div>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`tab ${tab==='pending'?'active':''}`} onClick={()=>setTab('pending')}>
          Pending Approvals
        </button>
        <button className={`tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>
          User Directory
        </button>
        <button className={`tab ${tab==='posts'?'active':''}`} onClick={()=>setTab('posts')}>
          All Posts
        </button>
        <button className={`tab ${tab==='upload'?'active':''}`} onClick={()=>setTab('upload')}>
          Bulk Upload Students
        </button>
      </div>

      <div className="admin-card">
        {loading && tab !== 'upload' ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <>
            {tab === 'pending' && (
              pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <FiCheckCircle size={48} style={{opacity:0.2, marginBottom:16}} />
                  <h3>No pending approvals</h3>
                  <p>All users have been processed.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>User Info</th>
                        <th>Role / Reg No</th>
                        <th>Department / Batch</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            {u.profile_photo ? (
                              <img 
                                src={`http://localhost:5000${u.profile_photo}`} 
                                alt="Profile" 
                                className="admin-profile-thumb"
                                onClick={() => window.open(`http://localhost:5000${u.profile_photo}`)}
                              />
                            ) : (
                              <div className="admin-profile-placeholder"><FiUser size={24} /></div>
                            )}
                          </td>
                          <td>
                            <div className="user-name-cell">{u.name}</div>
                            <div className="user-email-cell">{u.email}</div>
                          </td>
                          <td>
                            <span className={`role-badge ${u.role}`}>{u.staff_role||u.role}</span>
                            <div className="reg-num-cell">{u.register_number || 'N/A'}</div>
                          </td>
                          <td>
                            <div className="info-cell">{u.department || '-'}</div>
                            <div className="sub-info-cell">{u.batch || '-'}</div>
                          </td>
                          <td>
                            <div style={{display:'flex',gap:8}}>
                              <button className="btn btn-success btn-sm btn-icon-text" onClick={()=>approveUser(u.id)}>
                                <FiCheckCircle/> Approve
                              </button>
                              <button className="btn btn-danger btn-sm btn-icon-text" onClick={()=>rejectUser(u.id)}>
                                <FiXCircle/> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {tab === 'users' && (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Register No</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role}`}>{u.staff_role||u.role}</span></td>
                        <td>{u.register_number || '-'}</td>
                        <td>
                          {u.is_approved ? 
                            <span className="status-success">Approved</span> : 
                            <span className="status-warning">Pending</span>
                          }
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteUser(u.id)}>
                            <FiTrash2/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'upload' && (
              <div className="bulk-upload-section card animate-fadeIn">
                <div className="upload-header">
                  <FiFileText size={40} color="var(--primary)" />
                  <h3>Bulk Student Database Import</h3>
                  <p>Upload an Excel file (.xlsx) to update the verified student records for auto-approval.</p>
                </div>
                
                <div className="upload-instructions">
                  <h4>Excel Format Requirements:</h4>
                  <ul style={{textAlign:'left'}}>
                    <li>Column headers required: <strong>Name, Email, Register Number</strong></li>
                    <li>Optional columns: <strong>Department, Batch</strong></li>
                    <li>The system will match existing records by Email/Register Number.</li>
                  </ul>
                </div>

                <div className="upload-controls">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleExcelUpload} 
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <button 
                    className={`btn btn-primary ${uploadLoading ? 'loading' : ''}`}
                    onClick={triggerFilePicker}
                    disabled={uploadLoading}
                  >
                    <FiUpload style={{marginRight:8}} />
                    {uploadLoading ? 'Processing File...' : 'Select Excel File'}
                  </button>
                  {uploadLoading && <p className="upload-status">Please wait while we process the records...</p>}
                </div>
              </div>
            )}

            {tab === 'posts' && (
              <div className="table-responsive">
                <table className="data-table">
                  <thead><tr><th>Author</th><th>Content</th><th>Type</th><th>Actions</th></tr></thead>
                  <tbody>
                    {allPosts.map(p => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="truncate-text">{p.content}</td>
                        <td>{p.post_type}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={()=>deletePost(p.id)}><FiTrash2/> Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
