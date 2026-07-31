import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock, FiBriefcase, FiBook, FiCalendar, FiSun, FiMoon, FiFileText, FiUpload, FiImage } from 'react-icons/fi';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', staff_role: '', department: '', batch: '', college_name: '', register_number: ''
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setProfilePhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validations
    if (!formData.name || !formData.email || !formData.password || !formData.college_name) {
      return toast.error('Please fill all required fields');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    // Role specific validation
    if (formData.role === 'student' && !formData.register_number) {
      return toast.error('Register number is required for students');
    }
    if (formData.role === 'alumni' && !profilePhoto) {
      return toast.error('Profile photo is required for alumni registration');
    }

    setLoading(true);

    try {
      // Prepare FormData for file upload
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      if (profilePhoto) {
        data.append('profile_photo', profilePhoto);
      }

      const res = await register(data);
      toast.success(res.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
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
            <h2>Join CampusConnect</h2>
            <p>Create your account to get started</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><FiUser style={{marginRight:6, verticalAlign:'middle'}}/>Full Name</label>
              <input type="text" name="name" className="form-control" placeholder="Your full name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><FiBook style={{marginRight:6, verticalAlign:'middle'}}/>College Name</label>
              <input type="text" name="college_name" className="form-control" placeholder="e.g. XYZ College of Engineering" value={formData.college_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><FiMail style={{marginRight:6, verticalAlign:'middle'}}/>Email</label>
              <input type="email" name="email" className="form-control" placeholder="your.email@college.edu" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><FiLock style={{marginRight:6, verticalAlign:'middle'}}/>Password</label>
              <input type="password" name="password" className="form-control" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><FiLock style={{marginRight:6, verticalAlign:'middle'}}/>Confirm Password</label>
              <input type="password" name="confirmPassword" className="form-control" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label><FiBriefcase style={{marginRight:6, verticalAlign:'middle'}}/>Role</label>
              <select name="role" className="form-control" value={formData.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
                <option value="staff">Staff (Faculty/HOD/Principal)</option>
              </select>
            </div>

            {(formData.role === 'student' || formData.role === 'alumni') && (
              <div className="form-group animate-fadeIn">
                <label><FiFileText style={{marginRight:6, verticalAlign:'middle'}}/>
                  Register Number {formData.role === 'alumni' ? '(Optional)' : '(Required)'}
                </label>
                <input 
                  type="text" 
                  name="register_number" 
                  className="form-control" 
                  placeholder="e.g. 2021CS001" 
                  value={formData.register_number} 
                  onChange={handleChange} 
                  required={formData.role === 'student'} 
                />
              </div>
            )}

            {formData.role === 'alumni' && (
              <div className="form-group animate-fadeIn">
                <label><FiImage style={{marginRight:6, verticalAlign:'middle'}}/>Profile Photo (Required for Alumni)</label>
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    name="profile_photo" 
                    accept="image/*" 
                    className="form-control" 
                    onChange={handleFileChange} 
                    required 
                  />
                  <FiUpload className="upload-icon-overlay" />
                </div>
              </div>
            )}

            {formData.role === 'staff' && (
              <div className="form-group animate-fadeIn">
                <label>Staff Designation</label>
                <select name="staff_role" className="form-control" value={formData.staff_role} onChange={handleChange}>
                  <option value="">Select designation</option>
                  <option value="Faculty">Faculty</option>
                  <option value="HOD">HOD</option>
                  <option value="Principal">Principal</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label><FiBook style={{marginRight:6, verticalAlign:'middle'}}/>Department</label>
              <select name="department" className="form-control" value={formData.department} onChange={handleChange}>
                <option value="">Select department</option>
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

            {(formData.role === 'student' || formData.role === 'alumni') && (
              <div className="form-group animate-fadeIn">
                <label><FiCalendar style={{marginRight:6, verticalAlign:'middle'}}/>Batch</label>
                <input type="text" name="batch" className="form-control" placeholder="e.g. 2020-2024" value={formData.batch} onChange={handleChange} />
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
