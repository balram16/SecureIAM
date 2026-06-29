# SecureIAM: AWS-Modeled Self-Administered IAM Console

An enterprise-grade, self-administered Identity and Access Management (IAM) console modeled directly after AWS IAM. This system features granular user and group-level identity policies, a robust permission boundaries engine, and an automated delegation bypass prevention mechanism that protects the platform from privilege escalation during custom policy authorship.

---

## Prerequisites

- **Node.js**: `v22.19.0` or higher
- **PostgreSQL**: `v16` or higher
  *(Note: While some project sheets mention MongoDB, this codebase uses **PostgreSQL** as configured in the Prisma schemas).*
- **Database Client**: Prisma ORM (bundled with backend)

---

## Seed Credentials

Seeding the database will register the following base users:

| User Name | Email Address | Password | Role / Access Group |
| :--- | :--- | :--- | :--- |
| **Root** | `root@org.local` | `root1234` | Super Administrator (bypasses all checks, full root access) |
| **Alice** | `alice@org.local` | `alice1234` | Normal User / Member of **Viewers** Group (ReadOnlyAccess) |
| **Bob** | `bob@org.local` | `bob1234` | Normal User / Independent operator (No initial policies attached) |
| **Charlie** | `charlie@org.local` | `charlie1234` | Normal User / Independent operator (No initial policies attached) |

---

## Environment Configuration (`backend/.env`)

Create a `.env` file inside the `backend/` directory. The following variables must be specified:

| Key | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | The port number on which the express backend server listens. | `5000` |
| `DATABASE_URL` | PostgreSQL connection string including credentials, host, port, and database name. | `postgresql://postgres:postgres@localhost:5432/iam_db?schema=public` |
| `JWT_SECRET` | Secret key used by the authentication server to sign and verify JSON Web Tokens (JWT). | `super_secret_jwt_key_9876543210` |
| `NODE_ENV` | Mode under which the server runs (`development` or `production`). | `development` |

---

## Step-by-Step Setup Instructions

### 1. Backend & Database Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file (e.g. `backend/.env`) and configure the `DATABASE_URL` with your local PostgreSQL password.

4. **Sync the Database Schema**:
   Push the Prisma schema models to your PostgreSQL database instance:
   ```bash
   npx prisma db push
   ```

5. **Generate the Prisma Client**:
   ```bash
   npx prisma generate
   ```
   *(Note: If you run into an EPERM file lock error during generation, make sure the backend dev server is stopped so Windows frees the DLL handles).*

6. **Run Database Seed**:
   Seed the database with default users, groups, and policies:
   ```bash
   node prisma/seed.js
   ```

7. **Start Backend in Development Mode**:
   ```bash
   npm run dev
   ```
   The backend server runs locally at: `http://localhost:5000`

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Frontend in Development Mode**:
   ```bash
   npm run dev
   ```
   The React client console runs locally at: `http://localhost:5173`

---

## Running Verification / Automated Integration Tests

To run the complete automated integration test suite validating all custom permission policies, boundaries evaluations, and delegation bypass logic:
```bash
# Execute this script from the backend directory:
node scratch/verify_iam.js
```

---

## System Architecture

The following diagram illustrates how a client request flows through the validation, authentication, and granular authorization checks before interacting with the database:

```mermaid
graph TD
    %% Define Nodes
    Client["React Client (Vite + TS)"]
    Router["Express Router (Backend)"]
    AuthMid["authMiddleware (JWT Validation)"]
    ZodMid["validateMiddleware (Zod Inputs Schema)"]
    IAMMid["iamMiddleware (Action Check)"]
    EvalEngine["evaluatePermission (Policy Engine)"]
    DbPrisma["Prisma ORM Client"]
    DbPostgres[(PostgreSQL Database)]
    
    DelegationCheck["validateDelegationBypass (Policy Service)"]

    %% Flow Connections
    Client -->| "1. HTTP API Request" | Router
    Router -->| "2. Authentication" | AuthMid
    AuthMid -->| "Success: req.user attached" | ZodMid
    AuthMid -->| "Failure: 401 Unauthorized" | Client
    
    ZodMid -->| "3. Input Validation" | IAMMid
    ZodMid -->| "Failure: 400 Bad Request" | Client
    
    IAMMid -->| "4. Granular Authorization" | EvalEngine
    EvalEngine -->| "Denied: 403 Forbidden" | Client
    EvalEngine -->| "Allowed: Next()" | DbPrisma
    
    %% Write mutations check
    DbPrisma -->| "5. If Create/Update Policy" | DelegationCheck
    DelegationCheck -->| "Prevented: 403 Forbidden" | Client
    DelegationCheck -->| "Valid Delegation" | DbPrisma
    
    DbPrisma -->| "6. Query execution" | DbPostgres
    DbPostgres -->| "7. Query Result" | Client
```

### Policy Evaluation Flow

Below is the decision tree showing how `evaluatePermission` handles identity-based policies and permission boundary validation:

```mermaid
flowchart TD
    Start(["Start Evaluation"]) --> CheckRoot{"Is User Root?"}
    
    CheckRoot -->|Yes| AllowRoot["Return TRUE (Bypass all checks)"]
    
    CheckRoot -->|No| CollectStatements["Collect all effective policy statements (Direct + Groups)"]
    
    CollectStatements --> CheckDeny{"Any Explicit DENY for requested action?"}
    
    CheckDeny -->|Yes| DenyRequest["Return FALSE (Denied)"]
    
    CheckDeny -->|No| CheckAllow{"Any Explicit ALLOW for requested action?"}
    
    CheckAllow -->|No| DenyRequest
    
    CheckAllow -->|Yes| CheckBoundaryActive{"Permission Boundary Set?"}
    
    CheckBoundaryActive -->|No| AllowRequest["Return TRUE (Allowed)"]
    
    CheckBoundaryActive -->|Yes| CheckBoundaryDeny{"Explicit DENY in Boundary statement?"}
    
    CheckBoundaryDeny -->|Yes| DenyRequest
    
    CheckBoundaryDeny -->|No| CheckBoundaryAllow{"Explicit ALLOW in Boundary statement?"}
    
    CheckBoundaryAllow -->|No| DenyRequest
    
    CheckBoundaryAllow -->|Yes| AllowRequest
```
