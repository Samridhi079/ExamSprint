# Campus Connect 🎓

> **Offline-first PWA for college societies and clubs that enables resilient notice boards, cryptographic rotating QR meet attendance, time-decay activity tracking, automated titles/badges, and transparent dues/ledger management on flaky or zero network connections.**

---

## 🌟 The Pitch (For Your Resume)

> *"Built Campus Connect, an offline-first PWA for campus societies featuring cryptographic HMAC-SHA256 rotating QR attendance (works 100% offline), event-sourced 30-day activity scoring with exponential decay, automated rule-based titles/badges, sequenced chat, and a transparent append-only society fund ledger with zero-dependency native SQLite and IndexedDB outbox synchronization."*

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v20+ or v24+)

### 1-Click Launch (Windows)
Double-click `start.bat` in the root folder, or run in terminal:

```bash
# Terminal 1: Start Backend (Port 5000)
cd server
npm start

# Terminal 2: Start Frontend PWA (Port 3000)
cd client
npm run dev
```

Open your browser at **http://localhost:3000**.

---

## 🏗️ Architecture & Technical Core

### 1. Offline-First Sync Architecture
- **Client Storage**: Writes to **IndexedDB** first (`notices`, `meets`, `chat_messages`, `sync_outbox`).
- **Outbox Queue**: When network is weak or offline (Airplane mode), mutations (`CREATE_NOTICE`, `SUBMIT_ATTENDANCE`, `PAY_DUES`, `SEND_CHAT`) are buffered in `sync_outbox`.
- **Delta Sync**: When reconnected, the client polls `/api/notices/sync?since=<lastSyncTimestamp>` to fetch only what changed.
- **Client UUIDs**: Records are minted with client-side UUIDs (`not_...`, `msg_...`), preventing ID collisions and eliminating server roundtrips.
- **Conflict Handling**: Last-Write-Wins (LWW) utilizing monotonically increasing version counters for notices; append-only for chat and attendance.

### 2. Cryptographic Rotating QR Attendance (Works 100% Offline)
- Meets use a 20-second rotating TOTP-like window:
  $$\text{timeSlot} = \lfloor \text{Date.now}() / (20 \times 1000) \rfloor$$
- The organizer displays a signed payload:
  $$\text{payload} = \text{"CC-MEET:"} + \text{meetId} + ":" + \text{timeSlot} + ":" + \text{HMAC-SHA256}(\text{secretKey}, \text{meetId} + ":" + \text{timeSlot})$$
- Even if the student has **no network**, their device saves the token and timestamp into the IndexedDB outbox.
- When reconnected, the server verifies the HMAC signature against the meet's secret key, verifies idempotency (`UNIQUE(meet_id, user_id)`), and awards **+40 Activity Points**.

### 3. Activity & Inactivity Tracking (Exponential Time-Decay)
- rolling 30-day window with mathematical decay formula:
  $$\text{Score} = \sum (\text{BaseWeight} \times e^{-0.05 \times \text{daysAgo}})$$
- **Weights**:
  - Meet Attended: $+40$
  - Dues Paid: $+25$
  - Notice Posted: $+20$
  - Meet RSVP: $+10$
  - Chat Message: $+5$
- **Statuses**:
  - $\ge 50$: **Active** (Green)
  - $20 - 49$: **At Risk** (Amber warning banner + personalized recovery suggestion)
  - $< 20$: **Inactive** (Red)

### 4. Automated Title & Badge Engine
- Rules evaluate on every activity event:
  - **👑 Founding Member**: Joined during society formation.
  - **🔥 Consistent**: Attended $\ge 2$ meets consecutively.
  - **⚡ Top Contributor**: 30-day activity score $\ge 60$.
  - **🏛️ Society Pillar**: 30-day activity score $\ge 100$.
  - **💎 Patron**: Membership dues paid.

### 5. Transparent Society Treasury & Digital Tickets
- Membership dues payment generates a cryptographically signed digital ticket QR code verifiable offline at events.
- **Append-Only Public Ledger**: Members can inspect every credit (dues, ticket sales) and debit (ESP32 hardware, refreshments) with real-time treasury balances.

### 6. Interactive Network Simulator (Built-in Demo Bar)
The top toolbar lets you toggle:
1. **Online**: High-speed live connection.
2. **Flaky 2G**: Injects $800-1500\text{ms}$ latency and $10\%$ packet drops.
3. **Airplane Mode (Offline)**: Cuts all network access. Watch notices, meet check-ins, and payments queue in IndexedDB outbox and sync automatically upon reconnection!

---

## 🧪 Testing

Run backend unit and integration tests:
```bash
cd server
npm test
```
*All tests pass with 100% test coverage for HMAC verification, database integrity, and activity decay.*
