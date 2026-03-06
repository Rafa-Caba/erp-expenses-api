# ERP Expenses App – Backend Roadmap

This document tracks the backend implementation progress for the **ERP Expenses App**.

The goal is to build a **robust financial engine** supporting:

* Workspaces (Shared & Individual)
* Role-based visibility
* Double-entry ledger
* Debt tracking
* Financial analytics

---

# Development Rule

⚠️ **Strict typing is required**

Do **NOT use**:

```
as any
unknown
```

Unless absolutely unavoidable.

All services, controllers, schemas and models must be **fully typed** to prevent runtime inconsistencies and ensure maintainability.

---

# Current Status

### ✅ Implemented

| Module                        | Status |
| ----------------------------- | ------ |
| Auth (JWT + refresh rotation) | ✅      |
| Users                         | ✅      |
| Workspaces                    | ✅      |
| Members & Roles               | ✅      |
| Accounts                      | ✅      |
| Categories                    | ✅      |
| Transactions (Ledger)         | ✅      |
| Transaction Lines             | ✅      |
| Visibility Enforcement        | ✅      |
| Summary Endpoint              | ✅      |

---

# Phase 1 — Core Finance Engine (Current Phase)

Goal: Fully functional financial tracking system.

### Transactions

* [x] Update Transaction (PATCH)
* [x] Soft Delete Transaction
* [x] Restore Deleted Transaction
* [x] Recalculate totals on update
* [x] Validate ledger integrity on update

### Accounts

* [x] GET Account by id
* [x] PATCH Account
* [x] Disable Account
* [x] Prevent delete if referenced

### Categories

* [x] GET Category by id
* [x] PATCH Category
* [x] Disable Category

### Performance

* [x] Index transactions for list queries
* [x] Index transaction lines
* [x] Optimize visibility filtering

### Query Features

* [x] Pagination improvements
* [x] Date range filters
* [x] Category filters
* [x] Account filters

---

# Phase 2 — Debt System

Goal: Track personal debts and repayments.

### Debt Model

* [x] Debt schema
* [x] Debt CRUD

Fields:

```
kind: I_OWE | OWE_ME
principal
remaining
counterparty
dueDate
visibility
status
```

### Debt Payments

* [x] DebtPayment schema
* [x] Create payment endpoint
* [x] Auto-create ledger transaction
* [x] Update debt remaining balance

---

# Phase 3 — Scheduled / Recurring Finance

Goal: Support bills and recurring payments.

### Scheduled Items

* [x] ScheduledItem model
* [x] Recurrence rules

Examples:

```
monthly
weekly
custom interval
```

### Automation

* [x] Generate pending scheduled items
* [x] Bill reminders
* [x] Upcoming payments endpoint

---

# Phase 4 — Budgets & Analytics

Goal: Financial insights.

### Budgets

* [ ] Budget model
* [ ] Monthly category limits
* [ ] Budget progress

### Insights

* [ ] Cashflow per month
* [ ] Category spending
* [ ] Net income
* [ ] Spending trends

---

# Phase 5 — Collaboration & Invitations

Goal: Improve workspace collaboration.

### Invitations

* [ ] Email invite token
* [ ] Accept / decline invite
* [ ] Pending invite management

### Workspace Activity

* [ ] Activity feed
* [ ] Audit logs
* [ ] Member activity tracking

---

# Long-Term Improvements

Future enhancements:

* Multi-currency conversion
* Exchange rate service
* Receipt uploads
* Mobile notifications
* Export reports
* AI financial insights

---

# Current Phase

```
ACTIVE PHASE → Phase 1
```
