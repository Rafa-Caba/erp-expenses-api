# ERP Expenses App

A modular, multi-user expense and debt tracking backend built with:

- Node.js
- Express
- TypeScript
- MongoDB (Mongoose)
- Zod (validation)
- JWT (Access + Refresh with rotation)

This project is designed as a scalable, ERP-style financial engine supporting:

- Multi-workspace architecture
- Shared & individual financial spaces
- Role-based permissions
- Ledger-based transaction system (planned)
- Debt tracking and future scheduling

---

## 🚀 Implemented Features

### 🔐 Authentication

- Register
- Login
- Refresh (with rotation)
- Logout
- Access token expiration: **7 days**
- Refresh token stored in **httpOnly cookie**
- Refresh tokens stored **hashed** in database
- Secure token rotation
- Session invalidation support

---

### 🏢 Workspace System

Supports hybrid architecture:

#### INDIVIDUAL Workspace

- Automatically created on user registration
- Named: `{name} - Personal`
- Only OWNER can access
- No additional members allowed

#### SHARED Workspace

- Multiple members
- Roles:

  - OWNER
  - ADMIN
  - MEMBER
  - VIEWER

- OWNER & ADMIN can manage members
- OWNER cannot be removed or downgraded

---

## 📁 Project Structure

```
src/
  auth/
  users/
  workspaces/
  accounts/
  debts/
  transactions/
  middlewares/
  config/
  shared/
```

Each module contains:

- models
- types
- schemas (Zod validation)
- services
- controllers
- routes

---

## ⚙️ Setup

### Install dependencies

```bash
npm install
```

### Environment variables

Create `.env`:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/erp_expenses_app

JWT_ACCESS_SECRET=your_super_long_access_secret
JWT_REFRESH_SECRET=your_super_long_refresh_secret

CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

### Run MongoDB (Docker recommended)

```bash
docker run --name erp-mongo -d -p 27017:27017 mongo:7
```

### Run server

```bash
npm run dev
```

Server runs at:

```
http://localhost:4000
```

---

## 🔐 Security Decisions

- Refresh tokens are hashed in DB
- Refresh token lives only in httpOnly cookie
- Access tokens are sent via Authorization header
- Token rotation enforced
- Zod validates environment variables

---

## 🗺 Roadmap

### Phase 1

- Accounts
- Categories
- Transactions (Unified Ledger)
- Debt Management
- Dashboard summary

### Phase 2

- Budget system
- Analytics
- Monthly reports
- Net cash flow engine

### Phase 3

- Multi-currency engine
- Exchange rate integration
- Receipt uploads
- Audit logs

---

## 📜 License

Private project.
