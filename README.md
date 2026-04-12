# ExamVault - Full-Stack Online Exam Portal

A production-ready, scalable online exam preparation platform similar to Testbook.com.
Built with React.js, Node.js/Express, and MySQL.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MySQL 8 |
| Auth | JWT + Refresh Tokens |
| Caching | Redis (optional) |
| Deployment | Docker + Docker Compose |

---

## 📁 Project Structure

```
examvault/
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Shared UI components
│   │   │   └── layout/       # Navbar, Footer
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # All page components
│   │   └── services/         # Axios API service
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/                   # Express REST API
│   ├── config/
│   │   ├── db.js             # MySQL connection pool
│   │   ├── migrate.js        # DB schema migrations
│   │   └── seed.js           # Sample data seeder
│   ├── controllers/          # Business logic
│   ├── middleware/           # Auth, validation
│   ├── routes/               # API routes
│   ├── utils/                # JWT, helpers
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MySQL 8+
- Redis (optional)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd examvault

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 2. Database Setup

```bash
cd backend
npm install

# Create tables
node config/migrate.js

# Seed sample data
node config/seed.js
```

### 3. Start Backend

```bash
npm run dev
# Server runs on http://localhost:5000
```

### 4. Start Frontend

```bash
cd ../frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## 🐳 Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# Build and start all services
docker-compose up -d --build

# Run migrations inside container
docker exec examvault-backend node config/migrate.js
docker exec examvault-backend node config/seed.js
```

App will be available at `http://localhost`

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@examvault.com | Admin@123 |
| Student | student@examvault.com | Student@123 |

**Change these immediately in production!**

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/forgot-password | Request OTP |
| POST | /api/auth/reset-password | Reset with OTP |
| GET | /api/auth/profile | Get profile |

### Exams (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | All categories |
| GET | /api/categories/:slug | Category + exams |
| GET | /api/exams/:slug/papers | Papers for exam |
| GET | /api/papers/:id | Paper details |
| GET | /api/search | Search papers |
| GET | /api/featured | Featured papers |

### Test Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/test/papers/:id/start | Start/resume attempt |
| POST | /api/test/attempts/:id/save | Auto-save response |
| POST | /api/test/attempts/:id/submit | Submit test |
| GET | /api/test/attempts/:id/result | Get result |
| GET | /api/test/my/attempts | Attempt history |
| GET | /api/test/my/dashboard | Dashboard stats |

### Admin (Admin/SuperAdmin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/categories | Create category |
| POST | /api/exams | Create exam |
| POST | /api/papers | Create paper |
| POST | /api/questions | Add question |
| GET | /api/admin/users | All users |
| GET | /api/admin/analytics | Analytics |
| GET | /api/admin/audit-logs | Audit logs |

---

## 🎯 Features

### Student
- ✅ Register / Login / OTP email verification
- ✅ Dashboard with stats & performance charts
- ✅ Browse categories, exams, and papers
- ✅ Take timed mock tests with section support
- ✅ Auto-save responses every 30 seconds
- ✅ Resume in-progress tests
- ✅ Detailed results with question review
- ✅ Section-wise performance analysis
- ✅ Rank and percentile calculation
- ✅ Attempt history

### Test Engine
- ✅ MCQ-based with 4 options
- ✅ Section-wise navigation
- ✅ Global countdown timer with warnings
- ✅ Mark for Review
- ✅ Question navigation panel
- ✅ Tab-switch detection (anti-cheating)
- ✅ Auto-submit on timeout
- ✅ Question shuffling support

### Admin
- ✅ Dashboard analytics
- ✅ Create categories, exams, papers
- ✅ Configure exam settings (duration, marks, negative marking)
- ✅ User management (enable/disable)
- ✅ Audit logs (SuperAdmin)

### Platform
- ✅ Dark mode
- ✅ Fully responsive (mobile-first)
- ✅ JWT + Refresh token auth
- ✅ Rate limiting & security headers
- ✅ AdSense-ready ad placeholders
- ✅ SEO meta tags
- ✅ Privacy Policy, Terms, About, Contact pages
- ✅ Docker deployment ready

---

## 📈 Scaling

- **Database**: Use read replicas for high traffic
- **Redis**: Enable caching for frequently accessed data
- **CDN**: Serve static assets via CloudFront/Cloudflare
- **Load Balancer**: Add multiple backend instances
- **Horizontal Scaling**: Stateless JWT auth enables easy scaling

---

## 🔒 Security

- Bcrypt password hashing (12 rounds)
- JWT with short expiry (15m) + refresh tokens (7d)
- Account lockout after 5 failed attempts
- Rate limiting on all endpoints
- Helmet.js security headers
- Input validation on all routes
- CORS configuration
- SQL injection prevention via parameterized queries
- Audit logging for admin actions

---

## 💰 AdSense Integration

Ad placeholders are pre-configured at:
- Header banner (728×90)
- Below hero (970×90)
- Between sections (728×90)
- Sidebar rectangle (300×250)
- Footer banner (728×90)

To activate, replace the placeholder `<div>` in `src/components/common/Ad.jsx` with your AdSense `<ins>` tags.

---

## 📞 Support

For issues and feature requests, please open a GitHub issue.
