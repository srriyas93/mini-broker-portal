# Mini Broker Portal

A multi-role brokerage portal built with **Laravel 11 API**, **Sanctum Authentication**, and **React 18 + TypeScript + Tailwind CSS**.

The system implements role-based access control (RBAC), brute-force login protection with account lockouts, regulatory KYC document compliance with secure streaming, and concurrency-safe financial transaction ledgers with atomic database row locks.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Exact Local Setup Instructions](#exact-local-setup-instructions)
   - [Backend Setup (Laravel 11)](#1-backend-setup-laravel-11)
   - [Frontend Setup (React + Vite)](#2-frontend-setup-react--vite)
4. [Running the Automated Test Suite](#running-the-automated-test-suite)
5. [Default Seeded Credentials](#default-seeded-credentials)
6. [Completed Features](#completed-features)
   - [Authentication & Access Control](#1-authentication--access-control)
   - [KYC Document Compliance](#2-kyc-document-compliance)
   - [Financial Transactions & Concurrency Ledger](#3-financial-transactions--concurrency-ledger)
   - [Admin Portal & Audit Trail](#4-admin-portal--audit-trail)
   - [Modern Responsive Frontend](#5-modern-responsive-frontend)
7. [Architectural Decisions & Assumptions](#architectural-decisions--assumptions)
8. [Potential Next Improvements](#potential-next-improvements)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | PHP 8.2+, Laravel 11, Laravel Sanctum, BCMath |
| **Frontend** | React 18, TypeScript (Zero `any`), Vite, Tailwind CSS, TanStack Query, Axios, Lucide React |
| **Database** | SQLite (Default for instant zero-config setup) or MySQL |
| **Storage** | Private local disk (`storage/app/kyc_documents`) |
| **Testing** | PHPUnit 11 (41 automated tests, 291 assertions) |

---

## Prerequisites

Ensure the following tools are installed on your machine:
- **PHP 8.2 or higher** with `pdo`, `pdo_sqlite` or `pdo_mysql`, and `bcmath` extensions enabled.
- **Composer** (v2.x)
- **Node.js** (v18.x or v20.x+) and **npm**

---

## Exact Local Setup Instructions

### 1. Backend Setup (Laravel 11)

Navigate to the `backend/` directory:
```bash
cd backend
```

#### Step 1: Install Dependencies
```bash
composer install
```

#### Step 2: Configure Environment
Copy the example environment file:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / macOS / Git Bash
cp .env.example .env
```

Generate your application encryption key:
```bash
php artisan key:generate
```

#### Step 3: Database Setup
You can run the portal with zero external database configuration using **SQLite** (recommended for local development) or **MySQL**:

**Option A: SQLite (Quickest Setup)**
1. In `backend/.env`, set:
   ```env
   DB_CONNECTION=sqlite
   ```
2. Create the SQLite database file:
   ```bash
   # Windows PowerShell
   New-Item -ItemType File -Path database\database.sqlite -Force

   # Linux / macOS / Git Bash
   touch database/database.sqlite
   ```

**Option B: MySQL**
1. In `backend/.env`, configure your MySQL credentials:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=mini_broker_portal
   DB_USERNAME=root
   DB_PASSWORD=
   ```
2. Create the database in MySQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS mini_broker_portal;
   ```

#### Step 4: Run Migrations and Seed Test Accounts
```bash
php artisan migrate --seed
```

#### Step 5: Start Backend API Server
```bash
php artisan serve
```
The backend API will start on **`http://127.0.0.1:8000`**.

---

### 2. Frontend Setup (React + Vite)

Open a new terminal and navigate to the `frontend/` directory:
```bash
cd frontend
```

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Configure Environment (Optional)
The frontend connects by default to `http://127.0.0.1:8000/api`. If needed, create a `.env` file:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

#### Step 3: Start Development Server
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:5173`**.

#### Step 4: Verify Production Build
To verify type-checking and bundling:
```bash
npm run build
```

---

## Running the Automated Test Suite

The backend includes a comprehensive feature test suite verifying lockout behaviors, role access control, withdrawal validation, race condition protections, and file privacy.

Run the test suite using in-memory SQLite:
```bash
cd backend
php artisan test
```

### Test Coverage Highlights:
- **`AuthLockoutTest`**: Verifies accounts lock for 15 minutes after 5 consecutive failed attempts, returning HTTP 429 with remaining wait minutes (rounded up with `ceil`).
- **`RoleAccessTest`**: Verifies clients receive HTTP 403 on `/api/admin/*` endpoints, while administrators succeed.
- **`WithdrawalValidationTest`**: Verifies withdrawals are rejected if KYC is not approved or if the withdrawal amount exceeds the wallet balance.
- **`TransactionApprovalTest`**: Verifies atomic transaction approval using `lockForUpdate()`, confirming balance is updated once and subsequent approval attempts return HTTP 422 without double-crediting.
- **`KycDocumentPrivacyTest`**: Verifies unauthorized clients cannot download another client's KYC file (HTTP 403), while the document owner and administrators can stream it.
- **`KycTest`**, **`TransactionTest`**, **`AuthTest`**, **`AdminClientTest`**, **`AdminAccessTest`**: End-to-end domain coverage.

**Result:** `41 passed (291 assertions)`.

---

## Default Seeded Credentials

When you run `php artisan migrate --seed`, the following accounts are initialized:

| Role | Email | Password | Initial Balance | Privileges & Notes |
|---|---|---|---|---|
| **Administrator** | `admin@test.com` | `Admin@123` | $10,000.00 | Full access to client rosters, KYC reviews, transaction approvals, and audit trail logs. |
| **Client** | `client@test.com` | `Client@123` | $5,000.00 | Trading account with pre-seeded approved KYC, ready for deposits and withdrawals. |

> **Tip:** The Login Page includes quick-fill buttons to populate these credentials with a single click.

---

## Completed Features

### 1. Authentication & Access Control
- **Strict Typing & Backed Enums:** All models and controllers enforce `declare(strict_types=1);` and utilize PHP backed enums (`UserRole`, `KycStatus`, `TransactionType`, `TransactionStatus`).
- **Sanctum Bearer Token Auth:** Stateful token issuance supporting optional "Remember me" persistence (`localStorage` when checked, `sessionStorage` otherwise).
- **Brute-Force Lockout Defense:**
  - Failed login attempts increment on bad credentials.
  - Reaching 5 failures locks the account for exactly 15 minutes (`locked_until = now()->addMinutes(15)`).
  - Attempting to log into a locked account returns **HTTP 429** with exact remaining wait minutes (`ceil`).
  - Always returns exact generic message `"Email or password is incorrect."` on 401 to prevent username enumeration.
  - Successful authentication immediately clears `failed_login_attempts` to 0 and `locked_until` to `null`.
- **Role-Aware Route Protection:**
  - Backend middleware `EnsureUserIsAdmin` guards `/api/admin/*`, returning HTTP 403 JSON for non-admin callers.
  - Frontend `ProtectedRoute` guards restrict client users from accessing `/admin/*` routes.

### 2. KYC Document Compliance
- **File Validation:** Accepts `id_document` and `address_document` (required, file, `mimes:jpg,jpeg,png,pdf`, max 5MB).
- **Zero Public Exposure:** Uploaded documents are saved on the private disk (`storage/app/kyc_documents`), never linked to public web roots.
- **Secure File Streaming:** Endpoints (`/api/kyc-documents/{id}/{type}`) stream files dynamically via `Storage::disk('local')->response(...)` only after verifying that `$user->isAdmin() || $user->id === $submission->user_id` (403 otherwise).
- **Never Leaks Storage Paths:** `KycSubmissionResource` converts internal file paths into authorized streaming URLs.
- **Re-upload Gating:** Uploads are blocked if a submission is `pending` or `approved`. Re-uploads are allowed only if no submission exists or if the previous review was `rejected`.

### 3. Financial Transactions & Concurrency Ledger
- **Client Requests:** Clients can initiate deposit and withdrawal requests with positive amounts.
- **Pre-flight Withdrawal Rules:** Withdrawals are automatically blocked if the client's KYC is unapproved or if `bccomp($balance, $amount, 2) < 0`.
- **Atomic Concurrency Protection:** Admin approval and rejection endpoints execute inside `DB::transaction()` with pessimistic row locks (`lockForUpdate()`) on both `transactions` and `users` tables.
- **Double-Processing Prevention:** If a transaction is already processed, any duplicate approval or rejection attempt returns HTTP 422.
- **Arbitrary Precision:** All balance updates use PHP's `bcadd` and `bcsub` functions with 2 decimal places to prevent floating-point rounding issues.

### 4. Admin Portal & Audit Trail
- **Clients Management:** Paginated client table with debounced search by name or email, and KYC status filters (`all`, `pending`, `approved`, `rejected`, `none`).
- **Client Profile View:** Shows balance, KYC history, and client transactions.
- **Authenticated Blob Preview Modal:** Admins can preview images and PDFs directly in-browser using authenticated blob streams (`responseType: 'blob'`).
- **Decision Confirm Dialogs:** Approve and Reject actions are confirmed with modals, requiring an explicit rejection reason for rejected KYC submissions.
- **Requests Queue:** Backlog view of pending deposits, withdrawals, and KYC documents.
- **Audit Trail (Activity Log):** Real-time ledger recording administrative approvals and rejections (e.g. `"Admin approved withdrawal #12 for $200.00"`), including actor ID, action names, IP address, and timestamps.

### 5. Modern Responsive Frontend
- **Zero `any` TypeScript:** Complete type safety covering all models, resources, and error structures.
- **Password Rules Checklist:** Live-updating indicators on registration checking 8+ characters, at least 1 letter, at least 1 number, and password matching.
- **Mobile Responsive:** Clean Tailwind CSS UI with dark theme, responsive navigation drawer, and loading spinners.

---

## Architectural Decisions & Assumptions

1. **Pessimistic Row Locking (`lockForUpdate`):**
   Financial transactions and account balances must be resilient against race conditions. By locking both the transaction record and the target user row within an explicit database transaction, concurrent duplicate requests are serialized, and subsequent callers see status `completed` and receive HTTP 422.
2. **Private File Storage:**
   Identity documents contain sensitive PII (Personally Identifiable Information). Storing them in `storage/app/kyc_documents` rather than `storage/app/public` ensures that direct URL access is impossible without passing through authenticated authorization checks.
3. **BCMath for Monetary Arithmetic:**
   Floating-point calculations in PHP (`0.1 + 0.2`) can introduce rounding drift. Using `bcadd`, `bcsub`, and `bccomp` with a scale of 2 ensures precision for brokerage ledgers.
4. **Enums Over Raw Strings:**
   Backed enums (`UserRole`, `KycStatus`, `TransactionType`, `TransactionStatus`) provide compile-time safety and eliminate invalid state transitions.
5. **Decoupled API Client & Storage Handling:**
   The frontend Axios client manages Bearer tokens based on user preference ("Remember me" vs session-only), providing auto-logout and redirect handling on HTTP 401.

---

## Potential Next Improvements

- **Real-Time WebSockets (Laravel Reverb / Pusher):** Push live balance updates, transaction approvals, and admin queue notifications without polling.
- **Two-Factor Authentication (2FA):** Implement TOTP (Time-Based One-Time Passwords) via Google Authenticator or SMS codes for withdrawal authorization.
- **Automated Document OCR / Verification:** Integrate third-party compliance APIs (such as Onfido or Sumsub) for automated passport and ID verification.
- **Payment Gateway Webhooks:** Integrate Stripe, PayPal, or crypto payment webhooks for automatic deposit crediting.
- **Exportable Compliance Reports:** Add CSV/PDF export capabilities for transaction ledgers and audit logs.
