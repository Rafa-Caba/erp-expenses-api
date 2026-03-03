# ERP Expenses App — Architecture Documentation

## 1. Overview

ERP Expenses App follows a **workspace-first modular architecture** designed for scalability and long-term maintainability.

Core principles:

- Workspace isolation
- Modular domain structure
- Clear separation between authentication and authorization
- Ledger-based financial modeling
- Role-based access control

---

## 2. Workspace-First Design

All financial data belongs to a workspace.

Every domain entity must include:

```
workspaceId
```

This ensures:

- Data isolation
- Multi-tenant capability
- Scalability to business environments

---

## 3. Workspace Types

### INDIVIDUAL

- Auto-created at registration
- Name format: `{name} - Personal`
- Single OWNER
- No additional members allowed

### SHARED

- Multiple members
- Role enforcement
- Used for family/shared finances

---

## 4. Role-Based Access Control (RBAC)

Roles:

- OWNER
- ADMIN
- MEMBER
- VIEWER

Enforced via middleware:

- requireAuth
- requireWorkspaceAccess
- requireRole

Authorization is executed before controller logic.

---

## 5. Authentication Architecture

### Access Token

- JWT
- 7-day expiration
- Sent via Bearer header
- Contains userId (`sub`)

### Refresh Token

- JWT
- Stored in httpOnly cookie
- Rotated on each refresh
- Stored hashed in database
- Revoked on logout

Security benefits:

- No refresh token in response body
- No localStorage dependency
- Reduced risk if DB leaks

---

## 6. Modular Structure

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

Each module encapsulates:

- Data model
- Validation
- Business logic
- Routing layer

---

## 7. Database Philosophy

Using MongoDB + Mongoose:

- Schema validation
- Index enforcement
- `_id` → `id` transformation
- Timestamps enabled

Rules:

- All entities include workspaceId
- OWNER cannot be removed
- INDIVIDUAL workspace is owner-only

---

## 8. Planned Ledger Core

All financial movement flows through a unified transaction model:

Types:

- income
- expense
- transfer
- debt_payment
- adjustment

This enables:

- Accurate balances
- Auditability
- Debt integration
- Financial analytics

---

## 9. Scalability Strategy

Architecture supports:

- Multiple workspaces per user
- Business expansion
- SaaS multi-tenancy
- Reporting modules
- Event-driven extensions

---

## 10. Long-Term Goal

Evolve into a full ERP-style financial backend capable of supporting:

- Personal finance
- Family finance
- Business finance
- Multi-organization SaaS platforms
