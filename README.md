# CampusConnect

A full-stack college social networking platform where students, alumni, staff, and admins can connect, share posts, message each other, and manage relationships within a verified academic community.

---

## Features

- **Role-based accounts** — Student, Alumni, Staff, and Admin roles with distinct permissions
- **Verified registration** — Students verified against a pre-loaded student records database; alumni require admin approval
- **Post feed** — Create general posts, announcements (staff), and job/internship listings (alumni) with image/video support
- **Follow system** — Student-to-student follows require mutual acceptance; alumni/staff follows are auto-approved
- **Real-time messaging** — Direct messages with typing indicators and online status via Socket.IO
- **Notifications** — Live activity feed for likes, comments, follows, and messages
- **User search** — Discover users by name, department, batch, or role
- **Admin panel** — Approve/reject users, moderate posts, bulk-import student records via Excel
- **Dark / Light theme** — Persisted across sessions

---

## Tech Stack

### Backend
| Package | Version |
|---|---|
| Node.js + Express | ^5.2.1 |
| MySQL (mysql2) | ^3.20.0 |
| Socket.IO | ^4.8.3 |
| JSON Web Token | ^9.0.3 |
| bcryptjs | ^3.0.3 |
| Multer | ^2.1.1 |
| xlsx | ^0.18.5 |

### Frontend
| Package | Version |
|---|---|
| React | ^19.2.4 |
| React Router DOM | ^7.13.2 |
| Axios | ^1.13.6 |
| Socket.IO Client | ^4.8.3 |
| Vite | ^8.0.1 |

---

## Project Structure

```
campusconnect/
├── backend/
│   ├── config/
│   │   └── db.js               # MySQL connection pool + table init
│   ├── middleware/
│   │   ├── auth.js             # JWT verification, role & approval checks
│   │   └── upload.js           # Multer file upload config
│   ├── routes/
│   │   ├── auth.js             # Register, login, reset password
│   │   ├── users.js            # Profile view/edit, search
│   │   ├── posts.js            # CRUD posts, likes, comments, feed
│   │   ├── followers.js        # Follow/unfollow, accept requests
│   │   ├── messages.js         # Direct messaging
│   │   ├── notifications.js    # Activity notifications
│   │   └── admin.js            # Admin moderation & management
│   ├── uploads/                # Uploaded media files (local)
│   ├── migrate_college.js      # College data migration script
│   ├── migrate_students.js     # Student records import script
│   ├── reset_students.js       # Reset student records script
│   ├── server.js               # Entry point — Express + Socket.IO
│   └── .env                    # Environment variables (see below)
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/
    │   │   └── axios.js        # Axios instance with JWT interceptor
    │   ├── components/
    │   │   ├── AppLayout.jsx   # Sidebar nav, unread badges
    │   │   └── PostModal.jsx   # Create/edit post modal
    │   ├── context/
    │   │   ├── AuthContext.jsx   # Auth state & session management
    │   │   ├── SocketContext.jsx # WebSocket lifecycle & online users
    │   │   └── ThemeContext.jsx  # Dark/light theme
    │   ├── pages/
    │   │   ├── Landing.jsx       # Public landing page
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── ForgotPassword.jsx
    │   │   ├── Dashboard.jsx     # Post feed
    │   │   ├── Profile.jsx       # User profile
    │   │   ├── Chat.jsx          # Real-time messaging
    │   │   ├── Notifications.jsx
    │   │   ├── Search.jsx        # User discovery
    │   │   ├── FollowersList.jsx
    │   │   └── AdminPanel.jsx    # Admin-only
    │   ├── App.jsx
    │   └── main.jsx
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MySQL >= 8.0
- npm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/campusconnect.git
cd campusconnect
```

### 2. Configure environment variables

Copy the example and fill in your values:

```


### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start the backend

The database and all tables are created automatically on first run.

```bash
cd backend
node server.js
```

Backend runs on `http://localhost:5000`

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port (default: 5000) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret key for signing JWT tokens |

---

## API Overview

| Base Route | Description |
|---|---|
| `POST /api/auth/register` | Register a new user |
| `POST /api/auth/login` | Login and receive JWT |
| `GET /api/auth/me` | Get current authenticated user |
| `GET /api/users/:id` | Get user profile |
| `GET /api/posts/feed` | Get paginated post feed |
| `POST /api/posts` | Create a new post |
| `POST /api/followers/:id/follow` | Follow a user |
| `GET /api/messages/conversations` | Get all conversations |
| `GET /api/notifications` | Get all notifications |
| `GET /api/admin/stats` | Admin dashboard stats |

Full route details are in the `backend/routes/` directory.

---

## Roles & Permissions

| Action | Student | Alumni | Staff | Admin |
|---|---|---|---|---|
| Create general post | ✅ | ✅ | ✅ | ✅ |
| Create announcement | ❌ | ❌ | ✅ | ✅ |
| Post jobs/internships | ❌ | ✅ | ❌ | ✅ |
| Message anyone | ❌ | ✅ | ✅ | ✅ |
| Auto-approved on register | ✅* | ❌ | ❌ | — |
| Access admin panel | ❌ | ❌ | ❌ | ✅ |

*Students are auto-approved if their email and register number match a record in the student database.

---

## Admin — Bulk Student Import

Admins can upload an Excel file (`.xlsx`) to populate the student records used for registration verification.

**Required columns:**

| Column | Description |
|---|---|
| Name | Student full name |
| Email | Institutional email |
| Register Number | Unique register number |
| Department | Department name |
| Batch | Graduation batch/year |

Upload via the Admin Panel → "Upload Students" section.

---
