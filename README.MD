# 🔔 Notification System

A **shared backend microservice** for a delivery app that accepts notification requests from other systems and sends email alerts to users.

Built with **Node.js · TypeScript · Express · MySQL (XAMPP) · Nodemailer**

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database (XAMPP)

1. Open **XAMPP Control Panel** → Start **Apache** and **MySQL**
2. Go to [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
3. Click **New** → name it `notification_db` → click **Create**

### 3. Run in development mode

```bash
npm run dev
```

On successful startup you will see:

```
[INFO] MySQL database connection established.
[INFO] SMTP connection verified successfully.
[INFO] User list loaded — 15 users authorized.
[INFO] Notification System running on port 3000
```

---

## 🔐 How Authentication Works

Any user registered at `https://users-api-we0n.onrender.com/api/users` can send requests.

**Send your `_id` as the Bearer token:**

```
Authorization: Bearer 6a0b3d00c53295c94da08c66
```

The system caches the user list every **5 minutes** and auto-refreshes when a new user's `_id` is not found in cache — so newly registered users are automatically picked up.

---

## 📡 API Reference

All protected routes require:

```
Authorization: Bearer <user _id from /api/users>
```

---

### `GET /api/health` — Public

Check if the service is running. No token required.

**Response:**

```json
{
  "success": true,
  "service": "Notification System",
  "status": "operational",
  "timestamp": "2026-05-24T03:00:00.000Z"
}
```

---

### `POST /api/notifications` — Send a Notification 🔒

**Body:**

```json
{
  "recipientEmail": "juan@example.com",
  "recipientName": "Juan Dela Cruz",
  "subject": "Your order is on the way!",
  "body": "Hi Juan! Your rider is 5 minutes away.",
  "sourceSystem": "ordering-system"
}
```

| Field            | Required | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `recipientEmail` | ✅       | Email address to send to                |
| `recipientName`  | ❌       | Display name of the recipient           |
| `subject`        | ✅       | Email subject line                      |
| `body`           | ✅       | Email body text                         |
| `sourceSystem`   | ✅       | Name of the system sending this request |
| `channel`        | ❌       | `EMAIL` (default), `SMS`, `PUSH`        |

**201 — Sent:**

```json
{
  "success": true,
  "duplicate": false,
  "notificationId": "uuid-here",
  "message": "Notification sent successfully."
}
```

**409 — Duplicate blocked:**

```json
{
  "success": false,
  "duplicate": true,
  "notificationId": "original-uuid",
  "message": "Duplicate notification detected. Already sent within the last 5 minute(s)."
}
```

**401 — Unauthorized:**

```json
{
  "success": false,
  "error": "Unauthorized. Your user ID was not found in the system."
}
```

---

### `GET /api/notifications` — List Notifications 🔒

Optional query params:

| Param            | Description                                 |
| ---------------- | ------------------------------------------- |
| `page`           | Page number (default: 1)                    |
| `limit`          | Items per page (default: 20, max: 100)      |
| `status`         | `PENDING` / `SENT` / `FAILED` / `DUPLICATE` |
| `recipientEmail` | Filter by recipient                         |

```
GET /api/notifications?status=SENT&page=1&limit=10
```

---

### `GET /api/notifications/:id` — Get One Notification + Logs 🔒

Returns the notification record and its full audit trail.

---

### `GET /api/notifications/:id/logs` — Get Audit Logs 🔒

Returns all log events for a specific notification.

**Log events:**

| Event               | Meaning                        |
| ------------------- | ------------------------------ |
| `RECEIVED`          | Request accepted and saved     |
| `EMAIL_SENT`        | Email delivered successfully   |
| `EMAIL_FAILED`      | Email delivery failed          |
| `DUPLICATE_BLOCKED` | Duplicate request was rejected |

---

## 🔗 How Other Systems Connect

Any other system in the project (ordering system, legacy system, rider app, etc.) can send notifications by:

1. Getting a valid user `_id` from `https://users-api-we0n.onrender.com/api/users`
2. Calling:

```http
POST http://localhost:3001/api/notifications
Authorization: Bearer <user _id>
Content-Type: application/json

{
  "recipientEmail": "customer@example.com",
  "recipientName": "Customer Name",
  "subject": "Order Update",
  "body": "Your order #1234 has been dispatched.",
  "sourceSystem": "your-system-name"
}


```
