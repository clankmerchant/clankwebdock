# Security Specification for Bookmark Sync Hub

This document defines the data integrity constraints, potential test attack payloads (the "Dirty Dozen"), and the security assertions for the real-time, cloud-synced Bookmark Hub database.

## 1. Data Invariants
1. **User Identity Invariant**: A user document must have an identifier matching the Firebase UID of the request's authenticated user.
2. **Relational Owner Invariant**: All websites, folders, and todos must reside under the correct matching parent `/users/{userId}/` subcollection.
3. **Verified Email Constraint**: Only verified authenticated accounts can execute standard state writes.
4. **Strict Schema Constraints**: No shadow or unapproved properties map-poisoning the documents (enforced by explicit fields & map counts checks).

## 2. The "Dirty Dozen" Malicious Payloads (Unauthorized Access, Identity Spoofing, Resource Poisoning)
Below are 12 malicious payloads designed to challenge the rules. All of these must return `PERMISSION_DENIED`:

### P1: Unauthorized Reader Access (Owner Spoofing)
An authenticated attacker attempts to fetch bookmark lists under a different user's subcollection:
- **Operation**: `GET` /users/UserA_UID/websites/website_1
- **Request Auth UID**: "Attacker_UID"

### P2: Anonymous Write Bypass
An unauthenticated or anonymous client attempts to register or modify user details:
- **Operation**: `CREATE` /users/Unverified_UID
- **Request Auth**: `{ uid: "Unverified_UID", token: { email_verified: false } }`

### P3: Self-Assigned Role Elevation
Attempting to insert custom fields like `isAdmin` or `role` to elevate privileges:
- **Operation**: `CREATE` /users/UserA_UID
- **Payload**: `{ uid: "UserA_UID", email: "user@example.com", role: "admin", isAdmin: true, theme: { ... } }`

### P4: ID Poisoning (Denial of Wallet)
Creating folder/website documents with massive, 2MB-sized document IDs to trigger disk depletion:
- **Operation**: `CREATE` /users/UserA_UID/folders/[A-very-long-string-size-100000...]

### P5: Field Type Injection
Writing a `completed` state for a `Todo` document as a string instead of a boolean value:
- **Operation**: `CREATE` /users/UserA_UID/todos/todo_1
- **Payload**: `{ id: "todo_1", userId: "UserA_UID", text: "Task text", completed: "NOT_COMPLETED" }`

### P6: Timestamp Spoofing (Client Invariant Break)
Uploading a custom future/past millisecond timestamp to bypass sorting/cleaning sequences instead of referencing request transaction metrics:
- **Operation**: `CREATE` /users/UserA_UID/websites/website_1
- **Payload**: `{ createdAt: -99999999, ... }` (Must be validated or strictly limited as type number)

### P7: Unregistered Parent Directory
Creating a website reference without a corresponding valid user profile active in the root:
- **Operation**: `CREATE` /users/NonExistent_UID/websites/web_1

### P8: Multi-user Data Hijacking
An authenticated User A attempts to update a website record belonging to User B:
- **Operation**: `UPDATE` /users/UserB_UID/websites/web_1
- **Request Auth UID**: "UserA_UID"

### P9: Shadow Theme Key Insertion
Inserting a field named `maliciousScriptInject` inside the user theme configuration:
- **Operation**: `UPDATE` /users/UserA_UID
- **Payload**: `{ uid: "UserA_UID", email: "user@example.com", theme: { ..., maliciousScriptInject: "<script>alert()</script>" } }`

### P10: Orphaned Delete Access
Attempting to flush master-gate settings from another account's database collection path:
- **Operation**: `DELETE` /users/UserB_UID/folders/folder_1
- **Request Auth UID**: "UserA_UID"

### P11: Oversized Name Tag
Attempting to store an extremely long, 100KB-sized website or folder name value to crash CSS layout:
- **Operation**: `CREATE` /users/UserA_UID/folders/folder_1
- **Payload**: `{ name: "[100KB of random letters]" }`

### P12: Shadow Update Attack
Attempting to send an update targeting a system field which should be immutable after genesis (e.g. `createdAt` on a Bookmark):
- **Operation**: `UPDATE` /users/UserA_UID/websites/web_1
- **Payload**: `{ createdAt: 123456789 }` (modified)
