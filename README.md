# SecureSend API

SecureSend is a secure messaging platform that lets users exchange end-to-end encrypted text, image, voice, and file messages, send anonymous emails through disposable aliases, and manage public encryption keys for hybrid encryption.

This document describes every API endpoint exposed by the backend, including request/response formats, authentication requirements, and rate limits.

## Base URL

All routes are relative to the API root, for example:

```
https://<your-deployment-domain>/api
```

The `mail` routes are mounted at the application root (no `/api` prefix) — see the Mail section below.

## Authentication

Most endpoints require a JSON Web Token issued by the `/api/auth/login` or `/api/auth/signup` endpoints.

Send the token as a Bearer token on every authenticated request:

```
Authorization: Bearer <token>
```

Tokens are valid for 7 days. Endpoints that don't require authentication are explicitly marked **Public** below.

## Standard Response Shape

Most endpoints return JSON in one of these two shapes:

Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

Error:
```json
{
  "success": false,
  "message": "Description of what went wrong"
}
```

## Rate Limiting

Rate limits are applied per IP address. If a limit is exceeded, the API responds with `429 Too Many Requests` and the following body:

```json
{
  "success": false,
  "status": 429,
  "error": "Too Many Requests",
  "message": "..."
}
```

| Limiter | Window | Max Requests | Applied To |
|---|---|---|---|
| `authLimiter` | 15 minutes | 5 | Auth endpoints (OTP, login, signup, password reset) |
| `messageLimiter` | 1 minute | 20 | Sending a secure message |
| `generalApiLimiter` | 1 minute | 60 | Most authenticated GET/DELETE endpoints |
| `sendAnonymousEmailLimiter` | 1 minute | 10 | Sending an anonymous email |
| `publicMessageLimiter` | 1 minute | 5 | Public message read/view-tracking endpoints |

---

## Table of Contents

- [Auth](#auth)
- [Messages](#messages)
- [Keys](#keys)
- [Users](#users)
- [Anonymous Messaging](#anonymous-messaging)
- [Mail](#mail)

---

## Auth

Base path: `/api/auth`

### `POST /api/auth/request-otp`
Request a one-time password to begin signup for a new email address. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `200` — `{ "success": true, "message": "OTP sent to email" }`
- `400` — user already exists

---

### `POST /api/auth/verify-otp`
Verify a signup or password-reset OTP. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Responses**
- `200` — `{ "success": true, "message": "OTP verified" }`
- `400` — invalid or expired OTP

---

### `POST /api/auth/signup`
Complete signup by setting a password. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com", "password": "MyStrongPassw0rd@" }
```

Password requirements (all enforced):
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one symbol (`@ # $ %`)

**Responses**
- `201` — `{ "success": true, "token": "<jwt>", "user": { "email": "user@example.com" } }`
- `400` — user already exists, or password missing requirements

---

### `POST /api/auth/login`
Log in with email and password. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com", "password": "MyStrongPassw0rd@" }
```

**Responses**
- `200` — `{ "success": true, "token": "<jwt>", "user": { "email": "user@example.com" } }`
- `401` — invalid credentials

---

### `POST /api/auth/forgot-password`
Request a password-reset OTP for an existing account. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `200` — `{ "success": true, "message": "Password reset code sent to email" }`
- `404` — no user with this email

---

### `POST /api/auth/reset-password`
Reset a password using a verified OTP. **Public.** Rate limited by `authLimiter`.

**Body**
```json
{ "email": "user@example.com", "otp": "123456", "newPassword": "MyNewStrongPassw0rd@" }
```

Same password requirements as signup.

**Responses**
- `200` — `{ "success": true, "message": "Password reset successfully" }`
- `400` — invalid/expired OTP or password missing requirements
- `404` — user not found

---

### `GET /api/auth/me`
Get the currently authenticated user's profile. **Requires auth.** Rate limited by `generalApiLimiter`.

**Responses**
- `200` — `{ "success": true, "user": { "email": "user@example.com" } }`
- `404` — user not found

---

## Messages

Base path: `/api/messages`

Messages carry end-to-end encrypted payloads (`encryptedData`, `encryptedAESKey`, `iv`, and optionally `salt`/`keyIv` for hybrid encryption). The server never sees plaintext content.

### `POST /api/messages`
Send a new encrypted message. **Requires auth.** Rate limited by `messageLimiter`.

**Body**
```json
{
  "encryptedData": "string (required)",
  "encryptedAESKey": "string (required)",
  "iv": "string (required)",
  "salt": "string | null",
  "keyIv": "string | null",
  "encryptionMode": "HYBRID | SYMMETRIC",
  "kdf": "string | null",
  "kdfIterations": "number | null",
  "aesAlgorithm": "string | null",
  "rsaAlgorithm": "string | null",
  "recipientEmail": "string (optional — recipient's email)",
  "type": "text | image | voice | file",
  "protection": "quick | hybrid (or other supported modes)",
  "password": "string | null (optional passphrase protection)",
  "isAnonymous": "boolean",
  "viewOnce": "boolean",
  "expiresIn": "number (ms from now, optional)",
  "expiresAt": "ISO date string (optional, used if expiresIn absent)"
}
```

Notes:
- `encryptedData`, `encryptedAESKey`, and `iv` are required.
- Voice messages (`type: "voice"`) are capped at 10 per sender per rolling hour.
- Sending a message to yourself is rejected.
- Large payloads (over `MAX_INLINE_MESSAGE_BYTES`, default 12 MB) are stored externally rather than inline in the database.

**Responses**
- `201` — `{ "success": true, "message": "Message sent successfully", "data": { ...message } }`
- `400` — missing required encrypted fields, or attempting to message yourself
- `429` — hourly voice message limit reached

---

### `GET /api/messages/inbox`
Get all messages received by the authenticated user, newest first. **Requires auth.** Rate limited by `generalApiLimiter`.

Expired messages are automatically wiped of their encrypted payload (`encryptedData`, `encryptedAESKey`, `iv`, `salt`, `keyIv`, `password`, `fileUrl` are cleared) before being returned. View logs are included per message.

**Responses**
- `200` — `{ "success": true, "data": [ ...messages ] }`

---

### `GET /api/messages/outbox`
Get all messages sent by the authenticated user, newest first. **Requires auth.** Rate limited by `generalApiLimiter`.

Same expiry-wiping behavior as inbox.

**Responses**
- `200` — `{ "success": true, "data": [ ...messages ] }`

---

### `GET /api/messages/:id`
Fetch a single message by ID — used for shared/public message links. **Public.** Rate limited by `publicMessageLimiter`.

If the message has expired, its encrypted payload is wiped before the response is sent. The `password` field is never included in the response.

**Responses**
- `200` — `{ "success": true, "data": { "_id", "senderId", "receiverId", "type", "protection", "viewOnce", "expiresAt", "views", "createdAt", "encryptedData", "encryptedAESKey", "iv", "salt", "keyIv", "encryptionMode", "kdf", "kdfIterations", "aesAlgorithm", "rsaAlgorithm", "fileUrl" } }`
- `404` — message not found

---

### `POST /api/messages/:id/view`
Mark a message as viewed and record a view log entry (viewer IP, device, timestamp, and viewer identity if authenticated). **Public.** Rate limited by `publicMessageLimiter`.

- If the viewer is the original sender, the view is not counted or logged.
- If the message is `viewOnce` and this is a genuine (non-sender) view, the encrypted payload is wiped immediately after.
- An optional `Authorization: Bearer <token>` header may be sent to associate the view with a logged-in viewer; it is not required.

**Responses**
- `200` — `{ "success": true, "data": { "views": number, "logs": [ { "viewedAt", "ip", "device", "viewer" } ] } }`
- `404` — message not found

---

### `DELETE /api/messages/expired`
Purge all expired messages system-wide (administrative/cleanup operation). **Requires auth.** Rate limited by `generalApiLimiter`.

**Responses**
- `200` — `{ "success": true, "message": "Monthly cleanup completed. Purged N expired messages.", "data": { ...result } }`

---

### `DELETE /api/messages/:id`
Delete a specific message and its stored payload. Only the sender or receiver may delete it. **Requires auth.** Rate limited by `generalApiLimiter`.

**Responses**
- `200` — `{ "success": true, "message": "Message deleted successfully" }`
- `403` — not authorized to delete this message
- `404` — message not found

---

## Keys

Base path: `/api/keys`

Used to register and retrieve public keys for hybrid (asymmetric + symmetric) encryption between users. All endpoints require authentication and are rate limited by `generalApiLimiter`.

### `POST /api/keys/register`
Register (or update) the authenticated user's public key.

**Body**
```json
{ "publicKey": "string (required)" }
```

**Responses**
- `200` — `{ "success": true, "data": { ...keyRecord }, "message": "Key registered for <email>" }`
- `400` — public key missing

---

### `GET /api/keys/:userId`
Get another user's public key by their user ID.

**Responses**
- `200` — `{ "success": true, "data": { ...keyRecord } }`
- `404` — key not found

---

### `GET /api/keys/me/current`
Get the authenticated user's own public key status.

**Responses**
- `200` — `{ "success": true, "data": { "email", "hasPublicKey": boolean, "publicKey": "string | null" } }`
- `404` — user not found

---

### `DELETE /api/keys/clear`
Delete the authenticated user's public key (e.g., before generating a new keypair).

**Responses**
- `200` — `{ "success": true, "message": "Public key deleted. Generate a new one.", "userEmail": "..." }`

---

## Users

Base path: `/api/users`

### `GET /api/users/search`
Search for other users by email (used when selecting a recipient). **Requires auth.** No dedicated rate limiter beyond global middleware.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `q` | string | Email search term (partial match, case-insensitive) |
| `protection` | string | If `"hybrid"`, ensures each result includes a public key by falling back to the `Key` collection when needed |

**Responses**
- `200` — `{ "success": true, "data": [ { "email": "string", "publicKey": "string | null" }, ... ] }` (max 8 results, current user excluded)

---

## Anonymous Messaging

Base path: `/api/anonymous`

Lets a user generate a disposable email alias (e.g. `random-word@securesend.co.in`) and send/receive anonymous emails without revealing their real address.

### `POST /api/anonymous/send`
Send an anonymous email using a valid alias. **Public.** Rate limited by `sendAnonymousEmailLimiter`.

**Body**
```json
{
  "to": "recipient@example.com (or another securesend.co.in alias)",
  "subject": "string (required)",
  "message": "string (required)",
  "alias": "string (required — the sender's active alias, with or without domain)",
  "attachments": "optional, passed through to the mail service"
}
```

Behavior:
- The sender's `alias` must be currently active and unexpired.
- If `to` is a `@securesend.co.in` alias, the recipient's real email is resolved internally (if that alias is invalid/expired, the request is rejected).
- Otherwise `to` must be a valid email address.
- The message is persisted so it can be shown in the recipient/sender's anonymous inbox.

**Responses**
- `200` — `{ "success": true, "message": "Anonymous message sent successfully.", "provider": "...", "data": { ... } }`
- `400` — missing required fields, invalid sender alias, invalid/expired recipient alias, or invalid recipient email

---

### `POST /api/anonymous/generate-alias`
Generate a new alias, or return the user's existing active alias. **Requires auth.** Rate limited by `generalApiLimiter`.

**Body**
```json
{ "force": false }
```
Set `force: true` to deactivate the current alias and generate a brand new one.

**Responses**
- `200` — existing active alias returned: `{ "success": true, "data": { "alias", "createdAt", "expiresAt" } }`
- `201` — new alias generated: `{ "success": true, "message": "Alias generated successfully.", "data": { "alias", "createdAt", "expiresAt" } }`
- `404` — user not found

---

### `GET /api/anonymous/inbox`
Get all anonymous messages sent to or from any alias owned by the authenticated user. **Requires auth.** Rate limited by `generalApiLimiter`.

**Responses**
- `200` — `{ "success": true, "data": [ { ...anonymousMessage, "isSent": boolean }, ... ] }` (sorted newest first)
- `404` — user not found

---

### `POST /api/anonymous/mark-read/:id`
Mark an anonymous message as read. Only accessible to the message's sender (via alias) or recipient. **Requires auth.** Rate limited by `generalApiLimiter`.

**Responses**
- `200` — `{ "success": true, "message": "Message marked as read." }`
- `403` — access denied (not sender or recipient)
- `404` — user or message not found

---

## Mail

Mounted at the application root (no `/api` prefix).

### `POST /send-email`
Send a transactional email through the configured mail provider. **Requires auth.**

**Body**
```json
{
  "to": "recipient@example.com",
  "subject": "string",
  "message": "string"
}
```

**Responses**
- `200` — `{ "success": true, "data": { ...providerResponse } }`
- Error status from provider (default `500`) — `{ "success": false, "error": "message" }`

---

## Error Handling

Unhandled errors are normalized by a global error middleware and returned as:

```json
{
  "success": false,
  "message": "Human-readable message",
  "error": "raw error message (non-production only)",
  "details": "optional debug details (non-production only)"
}
```

Common cases handled explicitly:
| Condition | Status |
|---|---|
| Payload too large (over request size limit) | `413` |
| Malformed request body | `400` |
| Validation error | `400` |
| Invalid ID / cast error | `400` |
| Duplicate record | `409` |
| Unspecified error | `500` (or `err.status` if set) |

## Request Size Limit

JSON and URL-encoded request bodies are limited to `REQUEST_LIMIT_MB` (default `12` MB).
