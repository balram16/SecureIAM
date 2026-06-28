# IAM Console API Reference

This document provides a comprehensive guide to all the API endpoints configured in this Identity and Access Management (IAM) application. 

- **Base URL**: `http://localhost:5000/api`
- **Authentication**: All endpoints (except public authentication routes) require a `Bearer <JWT_TOKEN>` in the `Authorization` header.

---

## 1. Authentication Endpoints (`/auth`)

These endpoints handle registration, logins, and session profile details.

| Method | Endpoint | Description | Payload Body (Validated by Zod) |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/auth/register` | Registers a new regular user. | `{ "name": "...", "email": "...", "password": "..." }` |
| **`POST`** | `/auth/login` | Log in and receive a JWT. | `{ "email": "...", "password": "..." }` |
| **`POST`** | `/auth/refresh` | Requests a new access token using a refresh token. | `{ "refreshToken": "..." }` |
| **`POST`** | `/auth/logout` | Terminates session and revokes refresh token. | None (Requires `Authorization` header) |
| **`GET`** | `/auth/me` | Fetches active user profile. | None (Requires `Authorization` header) |

---

## 2. IAM Policy Administration (`/iam/policies`)

Used to build, update, list, and delete system permission policies.

| Method | Endpoint | Required IAM Action | Description | Payload Body (Validated by Zod) |
| :--- | :--- | :--- | :--- | :--- |
| **`POST`** | `/` | `iam:CreatePolicy` | Creates a new policy. | See **Create/Update Policy Schema** below. |
| **`GET`** | `/` | `iam:ListPolicies` | Retrieves list of all policies. | None |
| **`GET`** | `/:id` | `iam:GetPolicy` | Gets statements of a policy. | None |
| **`PUT`** | `/:id` | `iam:UpdatePolicy` | Edits statements/desc. | See **Create/Update Policy Schema** below. |
| **`DELETE`** | `/:id` | `iam:DeletePolicy` | Deletes a policy. | None |

### Policy Schema Reference
When creating (`POST`) or updating (`PUT`) policies, the request payload must adhere to the following schema:
```json
{
  "name": "ReadOnlyAccess",
  "type": "MANAGED", // or "INLINE"
  "description": "Allows read-only access to resources", // optional
  "statements": [
    {
      "Effect": "Allow", // or "Deny"
      "Action": ["reports:List", "reports:Read"], // must be valid system actions
      "Resource": ["*"] // must be exactly ["*"]
    }
  ],
  "userId": "uuid-string-here", // optional, only for INLINE policies
  "groupId": "uuid-string-here" // optional, only for INLINE policies
}
```

---

## 3. IAM Group Administration (`/iam/groups`)

Manages security groups, group memberships, and policies attached to them.

| Method | Endpoint | Required IAM Action | Description | Payload Body (Validated by Zod) |
| :--- | :--- | :--- | :--- | :--- |
| **`POST`** | `/` | `iam:CreateGroup` | Creates a new group. | `{ "name": "...", "description": "..." }` |
| **`GET`** | `/` | `iam:ListGroups` | Retrieves all groups. | None |
| **`GET`** | `/:id` | `iam:GetGroup` | Fetches group details. | None |
| **`PUT`** | `/:id` | `iam:UpdateGroup` | Renames group or desc. | `{ "name": "...", "description": "..." }` (Optional fields) |
| **`DELETE`** | `/:id` | `iam:DeleteGroup` | Deletes a group. | None |
| **`POST`** | `/:id/members` | `iam:AddUserToGroup` | Adds user to group. | `{ "userId": "uuid-string" }` |
| **`DELETE`** | `/:id/members/:userId` | `iam:RemoveUserFromGroup` | Removes user from group. | None |
| **`POST`** | `/:id/policies` | `iam:AttachGroupPolicy` | Attaches a policy to group. | `{ "policyId": "uuid-string" }` |
| **`DELETE`** | `/:id/policies/:policyId` | `iam:DetachGroupPolicy` | Detaches group policy. | None |

---

## 4. IAM User Administration (`/iam/users`)

Manages user profile views, direct user policies, and permission boundary constraints.

| Method | Endpoint | Required IAM Action | Description | Payload Body (Validated by Zod) |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/` | `iam:ListUsers` | Lists all console users. | None |
| **`GET`** | `/:id` | `iam:GetUser` | Fetches details for a user. | None |
| **`POST`** | `/:id/policies` | `iam:AttachUserPolicy` | Attaches policy directly. | `{ "policyId": "uuid-string" }` |
| **`DELETE`** | `/:id/policies/:policyId` | `iam:DetachUserPolicy` | Detaches direct policy. | None |
| **`PUT`** | `/:id/boundary` | `iam:PutUserBoundary` | Assigns boundary (Root only). | `{ "policyId": "uuid-string" }` |
| **`DELETE`** | `/:id/boundary` | `iam:DeleteUserBoundary` | Removes boundary (Root only). | None |

---

## 5. Mock / Dummy Resource Endpoints

These endpoints represent business services (Reports, Alerts, etc.) protected by our IAM evaluation engine.

### A. Reports Endpoints (`/reports`)
*   **`GET`** `/reports` (Action: `reports:List`) — Fetch list of reports.
*   **`POST`** `/reports` (Action: `reports:Create`) — Create a new report.
*   **`GET`** `/reports/:id` (Action: `reports:Read`) — View report details.
*   **`PUT`** `/reports/:id` (Action: `reports:Update`) — Update an existing report.
*   **`DELETE`** `/reports/:id` (Action: `reports:Delete`) — Delete a report.

### B. Alerts Endpoints (`/alerts`)
*   **`GET`** `/alerts` (Action: `alerts:List`) — Fetch list of alert monitors.
*   **`POST`** `/alerts` (Action: `alerts:Create`) — Set up an alert monitor.
*   **`GET`** `/alerts/:id` (Action: `alerts:Read`) — View alert monitor details.
*   **`PATCH`** `/alerts/:id/acknowledge` (Action: `alerts:Acknowledge`) — Acknowledge an alert monitor.
*   **`DELETE`** `/alerts/:id` (Action: `alerts:Delete`) — Disable/Remove an alert monitor.

### C. Settings Endpoints (`/settings`)
*   **`GET`** `/settings` (Action: `settings:Read`) — View system configurations.
*   **`PUT`** `/settings` (Action: `settings:Update`) — Modify system configurations.

### D. Audit Logs Endpoints (`/audit`)
*   **`GET`** `/audit` (Action: `audit:List`) — Fetch list of historical logs.
*   **`GET`** `/audit/:id` (Action: `audit:Read`) — Read detail record of a log.

---

## 6. Global Response Formats

The backend returns standardized JSON objects for success and error operations.

### Success Format (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... } // Contains the returned database entities/records
}
```

### Error Format (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`)
```json
{
  "success": false,
  "message": "Detailed explanation of what failed."
}
```
