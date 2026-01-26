/**
 * User Management System
 *
 * Handles user registration, workspace provisioning, and plan management
 * for multi-user SaaS deployment.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CLAWD_HOME = process.env.CLAWD_HOME || path.join(require('os').homedir(), 'clawd');
const USERS_DIR = path.join(CLAWD_HOME, 'users');
const USERS_DB = path.join(CLAWD_HOME, 'config', 'users.json');

// Plan definitions
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    messages_per_day: 50,
    skills: ['calendar', 'reminders'],
    features: {
      daily_briefing: false,
      priority_support: false,
      custom_personality: false
    }
  },
  premium: {
    name: 'Premium',
    price: 49000, // IDR per month
    messages_per_day: 500,
    skills: ['gmail', 'calendar', 'reminders'],
    features: {
      daily_briefing: true,
      priority_support: true,
      custom_personality: false
    }
  },
  business: {
    name: 'Business',
    price: 149000, // IDR per month
    messages_per_day: -1, // unlimited
    skills: ['gmail', 'calendar', 'grab-food', 'reminders'],
    features: {
      daily_briefing: true,
      priority_support: true,
      custom_personality: true
    }
  }
};

/**
 * Load users database
 */
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_DB, 'utf8');
    return JSON.parse(data);
  } catch {
    return { users: {}, stats: { total: 0, active: 0 } };
  }
}

/**
 * Save users database
 */
async function saveUsers(db) {
  await fs.writeFile(USERS_DB, JSON.stringify(db, null, 2));
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return 'user-' + crypto.randomBytes(4).toString('hex');
}

/**
 * Generate pairing code for new user verification
 */
function generatePairingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Check if phone number is already registered
 */
async function isRegistered(phone) {
  const db = await loadUsers();
  return Object.values(db.users).some(u => u.phone === phone);
}

/**
 * Register a new user
 * @param {string} phone - WhatsApp phone number
 * @param {string} name - User's name (optional)
 * @returns {Object} New user object with pairing code
 */
async function registerUser(phone, name = null) {
  const db = await loadUsers();

  // Check if already registered
  const existing = Object.values(db.users).find(u => u.phone === phone);
  if (existing) {
    return { error: 'ALREADY_REGISTERED', user: existing };
  }

  const userId = generateUserId();
  const pairingCode = generatePairingCode();

  const user = {
    id: userId,
    phone: phone,
    name: name,
    plan: 'free',
    status: 'pending', // pending, active, suspended
    pairing_code: pairingCode,
    pairing_expires: Date.now() + (15 * 60 * 1000), // 15 minutes
    created_at: new Date().toISOString(),
    last_active: null,
    message_count_today: 0,
    message_count_total: 0,
    connected_services: {
      gmail: false,
      calendar: false
    },
    preferences: {
      language: 'id',
      timezone: 'Asia/Jakarta',
      daily_briefing: false,
      briefing_time: '07:00'
    }
  };

  db.users[userId] = user;
  db.stats.total++;
  await saveUsers(db);

  return { success: true, user, pairing_code: pairingCode };
}

/**
 * Verify pairing code and activate user
 */
async function verifyPairing(phone, code) {
  const db = await loadUsers();

  const user = Object.values(db.users).find(u => u.phone === phone);
  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  if (user.status === 'active') {
    return { error: 'ALREADY_ACTIVE', user };
  }

  if (user.pairing_code !== code.toUpperCase()) {
    return { error: 'INVALID_CODE' };
  }

  if (Date.now() > user.pairing_expires) {
    return { error: 'CODE_EXPIRED' };
  }

  // Activate user
  user.status = 'active';
  user.pairing_code = null;
  user.pairing_expires = null;
  user.last_active = new Date().toISOString();

  db.stats.active++;
  await saveUsers(db);

  // Create workspace
  await createUserWorkspace(user);

  // Update routing config
  await addUserToRouting(user);

  return { success: true, user };
}

/**
 * Create isolated workspace for user
 */
async function createUserWorkspace(user) {
  const userDir = path.join(USERS_DIR, user.id);

  // Create directories
  await fs.mkdir(userDir, { recursive: true });
  await fs.mkdir(path.join(userDir, 'memory'), { recursive: true });

  // Copy template files
  const templates = ['AGENTS.md', 'SOUL.md'];
  for (const file of templates) {
    const src = path.join(CLAWD_HOME, file);
    const dest = path.join(userDir, file);
    try {
      await fs.copyFile(src, dest);
    } catch (err) {
      console.error(`Error copying ${file}:`, err.message);
    }
  }

  // Create personalized USER.md
  const userMd = `# User Preferences

## Profile
- **User ID**: ${user.id}
- **Name**: ${user.name || 'User'}
- **Phone**: ${user.phone}
- **Plan**: ${PLANS[user.plan].name}
- **Timezone**: ${user.preferences.timezone}
- **Language**: ${user.preferences.language === 'id' ? 'Indonesian' : 'English'}

## Plan Limits
- **Messages per day**: ${PLANS[user.plan].messages_per_day === -1 ? 'Unlimited' : PLANS[user.plan].messages_per_day}
- **Available skills**: ${PLANS[user.plan].skills.join(', ')}

## Connected Services
- [ ] Gmail - ${user.connected_services.gmail ? 'Connected' : 'Not connected'}
- [ ] Google Calendar - ${user.connected_services.calendar ? 'Connected' : 'Not connected'}

## Preferences
- Daily Briefing: ${user.preferences.daily_briefing ? 'Enabled' : 'Disabled'}
- Briefing Time: ${user.preferences.briefing_time}

---
*Account created: ${user.created_at}*
`;

  await fs.writeFile(path.join(userDir, 'USER.md'), userMd);

  // Create empty MEMORY.md
  const memoryMd = `# Long-term Memory

## User Facts
- Account created: ${user.created_at}

## Preferences Learned
<!-- Preferences discovered through conversations -->

## Recent Context
<!-- Important context from recent conversations -->

---
*Last updated: ${new Date().toISOString()}*
`;

  await fs.writeFile(path.join(userDir, 'MEMORY.md'), memoryMd);

  return userDir;
}

/**
 * Add user to Clawdbot routing configuration
 */
async function addUserToRouting(user) {
  const configPath = path.join(CLAWD_HOME, 'config', 'multi-user.json');

  let config;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch {
    config = { routing: { rules: [] }, agents: { list: [] } };
  }

  // Add routing rule
  const existingRule = config.routing.rules.find(r => r.match?.sender === user.phone);
  if (!existingRule) {
    config.routing.rules.push({
      match: {
        channel: 'whatsapp',
        sender: user.phone
      },
      agent: user.id
    });
  }

  // Add agent
  const existingAgent = config.agents.list.find(a => a.id === user.id);
  if (!existingAgent) {
    config.agents.list.push({
      id: user.id,
      workspace: path.join(USERS_DIR, user.id),
      model: 'claude-3-5-sonnet',
      skills: PLANS[user.plan].skills
    });
  }

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get user by phone number
 */
async function getUserByPhone(phone) {
  const db = await loadUsers();
  return Object.values(db.users).find(u => u.phone === phone);
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const db = await loadUsers();
  return db.users[userId];
}

/**
 * Update user's plan
 */
async function updatePlan(userId, newPlan) {
  if (!PLANS[newPlan]) {
    return { error: 'INVALID_PLAN' };
  }

  const db = await loadUsers();
  const user = db.users[userId];

  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  const oldPlan = user.plan;
  user.plan = newPlan;
  user.plan_updated_at = new Date().toISOString();

  await saveUsers(db);

  // Update routing config with new skills
  await addUserToRouting(user);

  return {
    success: true,
    user,
    changes: {
      from: PLANS[oldPlan].name,
      to: PLANS[newPlan].name
    }
  };
}

/**
 * Increment message count for rate limiting
 */
async function incrementMessageCount(userId) {
  const db = await loadUsers();
  const user = db.users[userId];

  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  // Reset daily count if new day
  const today = new Date().toISOString().split('T')[0];
  if (user.last_message_date !== today) {
    user.message_count_today = 0;
    user.last_message_date = today;
  }

  user.message_count_today++;
  user.message_count_total++;
  user.last_active = new Date().toISOString();

  await saveUsers(db);

  // Check rate limit
  const limit = PLANS[user.plan].messages_per_day;
  const isLimited = limit !== -1 && user.message_count_today > limit;

  return {
    count: user.message_count_today,
    limit: limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - user.message_count_today),
    is_limited: isLimited
  };
}

/**
 * Update connected services status
 */
async function updateConnectedService(userId, service, connected) {
  const db = await loadUsers();
  const user = db.users[userId];

  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  user.connected_services[service] = connected;
  await saveUsers(db);

  return { success: true, user };
}

/**
 * Get system statistics
 */
async function getStats() {
  const db = await loadUsers();

  const stats = {
    total_users: db.stats.total,
    active_users: db.stats.active,
    by_plan: {
      free: 0,
      premium: 0,
      business: 0
    },
    messages_today: 0,
    connected_services: {
      gmail: 0,
      calendar: 0
    }
  };

  for (const user of Object.values(db.users)) {
    if (user.status === 'active') {
      stats.by_plan[user.plan]++;
      stats.messages_today += user.message_count_today || 0;
      if (user.connected_services.gmail) stats.connected_services.gmail++;
      if (user.connected_services.calendar) stats.connected_services.calendar++;
    }
  }

  return stats;
}

/**
 * List all users (for admin)
 */
async function listUsers(options = {}) {
  const db = await loadUsers();
  let users = Object.values(db.users);

  // Filter by status
  if (options.status) {
    users = users.filter(u => u.status === options.status);
  }

  // Filter by plan
  if (options.plan) {
    users = users.filter(u => u.plan === options.plan);
  }

  // Sort
  if (options.sort === 'recent') {
    users.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
  } else if (options.sort === 'messages') {
    users.sort((a, b) => b.message_count_total - a.message_count_total);
  }

  // Limit
  if (options.limit) {
    users = users.slice(0, options.limit);
  }

  return users;
}

/**
 * Suspend a user
 */
async function suspendUser(userId, reason = null) {
  const db = await loadUsers();
  const user = db.users[userId];

  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  user.status = 'suspended';
  user.suspended_at = new Date().toISOString();
  user.suspended_reason = reason;

  db.stats.active--;
  await saveUsers(db);

  return { success: true, user };
}

/**
 * Reactivate a suspended user
 */
async function reactivateUser(userId) {
  const db = await loadUsers();
  const user = db.users[userId];

  if (!user) {
    return { error: 'USER_NOT_FOUND' };
  }

  if (user.status !== 'suspended') {
    return { error: 'NOT_SUSPENDED' };
  }

  user.status = 'active';
  user.suspended_at = null;
  user.suspended_reason = null;
  user.reactivated_at = new Date().toISOString();

  db.stats.active++;
  await saveUsers(db);

  return { success: true, user };
}

// Export functions
module.exports = {
  PLANS,
  loadUsers,
  registerUser,
  verifyPairing,
  getUserByPhone,
  getUserById,
  updatePlan,
  incrementMessageCount,
  updateConnectedService,
  getStats,
  listUsers,
  suspendUser,
  reactivateUser,
  isRegistered,
  generatePairingCode
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  async function cli() {
    switch (command) {
      case 'register':
        const phone = args[1];
        if (!phone) {
          console.log('Usage: node user-management.js register <phone>');
          break;
        }
        const result = await registerUser(phone);
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'verify':
        const verifyPhone = args[1];
        const code = args[2];
        if (!verifyPhone || !code) {
          console.log('Usage: node user-management.js verify <phone> <code>');
          break;
        }
        const verifyResult = await verifyPairing(verifyPhone, code);
        console.log(JSON.stringify(verifyResult, null, 2));
        break;

      case 'stats':
        const stats = await getStats();
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'list':
        const users = await listUsers({ status: 'active', limit: 20 });
        console.log(JSON.stringify(users, null, 2));
        break;

      case 'upgrade':
        const userId = args[1];
        const plan = args[2];
        if (!userId || !plan) {
          console.log('Usage: node user-management.js upgrade <userId> <plan>');
          break;
        }
        const upgradeResult = await updatePlan(userId, plan);
        console.log(JSON.stringify(upgradeResult, null, 2));
        break;

      default:
        console.log(`
User Management CLI

Commands:
  register <phone>          - Register new user
  verify <phone> <code>     - Verify pairing code
  stats                     - Show system statistics
  list                      - List active users
  upgrade <userId> <plan>   - Change user plan (free/premium/business)

Plans: free, premium, business
        `);
    }
  }

  cli().catch(console.error);
}
