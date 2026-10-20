const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const dbPath = path.resolve(__dirname, '../campus_connect.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for concurrency and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      branch TEXT,
      graduation_year INTEGER,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      email_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL,
      society_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Member', -- 'President', 'Core Member', 'Member', 'Alumni'
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'Active',
      PRIMARY KEY (user_id, society_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY, -- client-generated UUID
      society_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      event_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notices_sync ON notices(society_id, updated_at);

    CREATE TABLE IF NOT EXISTS meets (
      id TEXT PRIMARY KEY, -- client-generated UUID
      society_id TEXT NOT NULL,
      title TEXT NOT NULL,
      agenda TEXT,
      venue TEXT,
      starts_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      secret_key TEXT NOT NULL, -- Meet-specific HMAC secret for rotating QR codes
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meet_rsvps (
      meet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      response TEXT NOT NULL, -- 'going', 'maybe', 'no'
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (meet_id, user_id),
      FOREIGN KEY (meet_id) REFERENCES meets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meet_attendance (
      id TEXT PRIMARY KEY,
      meet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
      time_slot INTEGER NOT NULL,
      verified_offline INTEGER NOT NULL DEFAULT 0,
      UNIQUE (meet_id, user_id),
      FOREIGN KEY (meet_id) REFERENCES meets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      society_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'MEET_ATTENDED', 'NOTICE_POSTED', 'CHAT_MESSAGE', 'DUES_PAID', 'MEET_RSVP'
      weight REAL NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activity_events ON activity_events(user_id, society_id, occurred_at);

    CREATE TABLE IF NOT EXISTS member_activity (
      user_id TEXT NOT NULL,
      society_id TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'At Risk', 'Inactive'
      meets_attended_count INTEGER NOT NULL DEFAULT 0,
      consecutive_meets INTEGER NOT NULL DEFAULT 0,
      computed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, society_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS member_titles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      society_id TEXT NOT NULL,
      title TEXT NOT NULL,
      badge_icon TEXT NOT NULL,
      source TEXT NOT NULL, -- 'AUTO' or 'MANUAL'
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, society_id, title),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dues (
      id TEXT PRIMARY KEY,
      society_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount_paise INTEGER NOT NULL, -- e.g. 20000 = Rs 200.00
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, -- client-generated UUID
      due_id TEXT,
      society_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'SUCCESS', 'PENDING'
      payment_method TEXT NOT NULL,
      transaction_ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      society_id TEXT NOT NULL,
      entry_type TEXT NOT NULL, -- 'CREDIT' or 'DEBIT'
      category TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      society_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      sequence_num INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_seq ON chat_messages(society_id, sequence_num);
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return; // already seeded

  console.log('🌱 Seeding initial campus societies, demo students, and sample data...');

  const passHash = bcrypt.hashSync('campus123', 10);

  // Demo Users
  const user1 = {
    id: 'u-101',
    email: 'alex.cs@college.edu',
    full_name: 'Alex Sharma',
    branch: 'Computer Science',
    graduation_year: 2026,
    role: 'STUDENT'
  };
  const user2 = {
    id: 'u-102',
    email: 'priya.ece@college.edu',
    full_name: 'Priya Patel',
    branch: 'Electronics',
    graduation_year: 2025,
    role: 'SENIOR'
  };
  const user3 = {
    id: 'u-103',
    email: 'rohan.mech@college.edu',
    full_name: 'Rohan Gupta',
    branch: 'Mechanical',
    graduation_year: 2027,
    role: 'STUDENT'
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, branch, graduation_year, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [user1, user2, user3].forEach(u => {
    insertUser.run(u.id, u.email, passHash, u.full_name, u.branch, u.graduation_year, u.role);
  });

  // Demo Societies
  const soc1 = {
    id: 'soc-code',
    name: 'ByteCraft Coding Club',
    category: 'Technical',
    description: 'Competitive programming, open-source projects, hackathons, and offline-first tech.'
  };
  const soc2 = {
    id: 'soc-robot',
    name: 'Robotics & Automation Guild',
    category: 'Engineering',
    description: 'Hardware building, microcontrollers, IoT, and line-follower tournaments.'
  };
  const soc3 = {
    id: 'soc-lit',
    name: 'Aura Literary & Debating Society',
    category: 'Cultural',
    description: 'Debates, poetry slams, college magazines, and public speaking meets.'
  };

  const insertSoc = db.prepare('INSERT INTO societies (id, name, category, description) VALUES (?, ?, ?, ?)');
  [soc1, soc2, soc3].forEach(s => insertSoc.run(s.id, s.name, s.category, s.description));

  // Memberships & Roles
  const insertMember = db.prepare('INSERT INTO memberships (user_id, society_id, role, status) VALUES (?, ?, ?, ?)');
  insertMember.run(user1.id, soc1.id, 'President', 'Active');
  insertMember.run(user2.id, soc1.id, 'Core Member', 'Active');
  insertMember.run(user3.id, soc1.id, 'Member', 'Active');

  insertMember.run(user2.id, soc2.id, 'President', 'Active');
  insertMember.run(user1.id, soc2.id, 'Member', 'Active');

  // Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (id, society_id, author_id, author_name, title, body, event_at, version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  insertNotice.run(
    'not-1',
    soc1.id,
    user1.id,
    user1.full_name,
    '🚀 Annual Hackathon Kickoff & Offline Protocol Rules',
    'Get ready for Campus Hack 2026! In case of college Wi-Fi outage, all commits will be queued locally using our offline sync engine. Meet in Auditorium B at 4 PM.',
    '2026-10-20 16:00:00'
  );
  insertNotice.run(
    'not-2',
    soc1.id,
    user2.id,
    user2.full_name,
    '📢 Git & Open Source Workshop Series',
    'Bring your laptops with Git installed. Senior mentors will guide junior batches through PR reviews and branch workflows.',
    '2026-10-22 17:30:00'
  );

  // Meets with HMAC secret key for offline rotating QR
  const insertMeet = db.prepare(`
    INSERT INTO meets (id, society_id, title, agenda, venue, starts_at, created_by, secret_key, version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  const meet1Secret = crypto.randomBytes(16).toString('hex');
  insertMeet.run(
    'meet-101',
    soc1.id,
    'Weekly Sprint & Core Member Sync',
    'Review hackathon tracks, finalize budget, test offline attendance scanner.',
    'Lab 304 / Offline PWA Room',
    '2026-10-18 17:00:00',
    user1.id,
    meet1Secret
  );

  // Pre-seed some RSVPs
  const insertRsvp = db.prepare('INSERT INTO meet_rsvps (meet_id, user_id, response) VALUES (?, ?, ?)');
  insertRsvp.run('meet-101', user1.id, 'going');
  insertRsvp.run('meet-101', user2.id, 'going');
  insertRsvp.run('meet-101', user3.id, 'maybe');

  // Pre-seed dues
  const insertDue = db.prepare('INSERT INTO dues (id, society_id, title, amount_paise, due_date) VALUES (?, ?, ?, ?, ?)');
  insertDue.run('due-1', soc1.id, 'Semester Membership & Cloud Server Fund', 25000, '2026-10-31'); // Rs 250
  insertDue.run('due-2', soc1.id, 'Hackathon Kit & T-Shirt Contribution', 15000, '2026-11-05'); // Rs 150

  // Pre-seed ledger
  const insertLedger = db.prepare(`
    INSERT INTO ledger (id, society_id, entry_type, category, amount_paise, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertLedger.run('led-1', soc1.id, 'CREDIT', 'DUES', 150000, 'Opening balance from 2025 dues collection', 'System');
  insertLedger.run('led-2', soc1.id, 'DEBIT', 'EQUIPMENT', 45000, 'Bought 3 ESP32 boards & USB cables for workshop', user1.full_name);

  // Initial Titles
  const insertTitle = db.prepare(`
    INSERT INTO member_titles (id, user_id, society_id, title, badge_icon, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTitle.run('tit-1', user1.id, soc1.id, 'Founding Member', '👑', 'AUTO');
  insertTitle.run('tit-2', user2.id, soc1.id, 'Consistent', '🔥', 'AUTO');
  insertTitle.run('tit-3', user1.id, soc1.id, 'President', '⭐', 'MANUAL');

  // Chat message initial seed
  const insertChat = db.prepare(`
    INSERT INTO chat_messages (id, society_id, sender_id, sender_name, content, sequence_num)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertChat.run('msg-1', soc1.id, user1.id, user1.full_name, 'Welcome everyone to the ByteCraft society board!', 1);
  insertChat.run('msg-2', soc1.id, user2.id, user2.full_name, 'Remember to RSVP for Wednesday meet. Offline attendance QR will be active!', 2);

  console.log('✅ Initial seed data created successfully.');
}

module.exports = {
  db,
  initDatabase
};
