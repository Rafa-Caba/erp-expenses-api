# ERP Expenses App — API Documentation

Base URL:

```
http://localhost:4000
```

Protected routes require:

```
Authorization: Bearer <accessToken>
```

Refresh token is stored in httpOnly cookie.

---

# 🔐 Authentication

## Register

POST `/api/auth/register`

### Body

```json
{
  "name": "Rafael Cabanillas",
  "email": "rafael@example.com",
  "password": "Password123!"
}
```

Creates user and auto-generates:

- INDIVIDUAL workspace
- OWNER membership

---

## Login

POST `/api/auth/login`

### Body

```json
{
  "email": "rafael@example.com",
  "password": "Password123!"
}
```

### Response

```json
{
  "user": { ... },
  "accessToken": "..."
}
```

Sets refreshToken cookie.

---

## Refresh

POST `/api/auth/refresh`

No body required.

Returns new access token.

---

## Logout

POST `/api/auth/logout`

Revokes refresh token and clears cookie.

---

# 🏢 Workspaces

## List My Workspaces

GET `/api/workspaces`

Returns all workspaces where user is active member.

---

## Create Workspace

POST `/api/workspaces`

### Body

```json
{
  "name": "Cabanillas Family",
  "kind": "SHARED",
  "currencyDefault": "MXN",
  "timezone": "America/Mexico_City"
}
```

---

## Get Workspace

GET `/api/workspaces/:workspaceId`

---

# 👥 Members

## List Members

GET `/api/workspaces/:workspaceId/members`

---

## Add Member (SHARED only)

POST `/api/workspaces/:workspaceId/members`

### Body

```json
{
  "email": "caro@example.com",
  "role": "MEMBER"
}
```

---

## Update Member Role

PATCH `/api/workspaces/:workspaceId/members/:memberId/role`

### Body

```json
{
  "role": "ADMIN"
}
```

OWNER cannot be downgraded.

---

## Disable Member

PATCH `/api/workspaces/:workspaceId/members/:memberId/disable`

OWNER cannot be disabled.

---

# 📦 Response Codes

- 200 → Success
- 201 → Created
- 400 → Validation error
- 401 → Unauthorized
- 403 → Forbidden
- 404 → Not found
- 409 → Conflict
- 500 → Server error

Error format:

```json
{
  "message": "Error description"
}
```
