/**
 * Onboarding Handler
 *
 * Manages the user registration and setup flow for new WhatsApp users.
 */

const userManager = require('../../scripts/user-management');

// Onboarding state tracking (in-memory, could use Redis for scale)
const onboardingState = new Map();

/**
 * Message templates in Indonesian and English
 */
const TEMPLATES = {
  id: {
    welcome: (code) => `Halo! 👋

Selamat datang di Andi, asisten AI pribadi kamu.

Aku bisa bantu kamu dengan:
📅 Jadwal & Pengingat
📧 Email (Premium)
🍔 Pesan Makanan (Business)

Untuk memulai, verifikasi dulu ya.
Kode kamu: **${code}**

Balas dengan kode tersebut.
_(Kode berlaku 15 menit)_`,

    verifySuccess: (name) => `✅ Verifikasi berhasil!

Hai ${name || 'kamu'}! Senang berkenalan! 🙌

Kamu sekarang pakai paket **FREE**:
• 50 pesan per hari
• Fitur: Kalender & Pengingat

Mau hubungkan Google Calendar?
Ketik "hubungkan calendar" atau "skip".`,

    askName: () => `Verifikasi berhasil! ✅

Boleh tau nama kamu siapa?`,

    invalidCode: (code) => `❌ Kode tidak valid.

Pastikan kamu memasukkan kode yang benar: **${code}**

Atau ketik "kode baru" untuk minta kode baru.`,

    codeExpired: () => `⏰ Kode sudah kadaluarsa.

Ketik "kode baru" untuk minta kode verifikasi baru.`,

    alreadyRegistered: () => `👋 Hai! Sepertinya kamu sudah terdaftar.

Ketik "bantuan" untuk lihat apa yang bisa aku bantu.`,

    connectService: (service, url) => `Oke! Klik link ini untuk hubungkan ${service}:

🔗 ${url}

Setelah selesai, bilang "sudah" ya!`,

    serviceConnected: (service) => `✅ ${service} berhasil terhubung!`,

    setupComplete: (features) => `Setup selesai! 🎉

Beberapa hal yang bisa kamu coba:
${features.map(f => `• ${f}`).join('\n')}

Ketik "bantuan" untuk lihat semua fitur.
Ada yang bisa aku bantu?`,

    rateLimitWarning: (count, limit) => `⚠️ Kamu sudah pakai ${count}/${limit} pesan hari ini.

Batas akan reset besok jam 00:00 WIB.

Ketik "upgrade" untuk info paket Premium.`,

    rateLimitReached: (limit) => `🚫 Batas pesan harian tercapai (${limit} pesan).

Batas akan reset besok jam 00:00 WIB.

Upgrade ke Premium untuk 500 pesan/hari:
Ketik "upgrade premium"`,

    planComparison: () => `📊 **Perbandingan Paket:**

**FREE** (Gratis)
• 50 pesan/hari
• Kalender & Pengingat

**PREMIUM** (Rp 49.000/bulan)
• 500 pesan/hari
• Gmail integration
• Daily briefing

**BUSINESS** (Rp 149.000/bulan)
• Unlimited pesan
• Semua fitur Premium
• Pesan makanan (GrabFood)
• Personality kustom

Ketik "upgrade premium" atau "upgrade business"`
  },

  en: {
    welcome: (code) => `Hello! 👋

Welcome to Andi, your personal AI assistant.

I can help you with:
📅 Schedule & Reminders
📧 Email (Premium)
🍔 Food Ordering (Business)

To get started, please verify your number.
Your code: **${code}**

Reply with the code to continue.
_(Code expires in 15 minutes)_`,

    // ... (English templates similar to Indonesian)
  }
};

/**
 * Get user's preferred language
 */
function getLang(userId) {
  // Default to Indonesian
  return 'id';
}

/**
 * Handle incoming message from potentially new user
 */
async function handleMessage(phone, message, context = {}) {
  const state = onboardingState.get(phone);
  const existingUser = await userManager.getUserByPhone(phone);

  // Already registered and active
  if (existingUser && existingUser.status === 'active') {
    // Check rate limit
    const rateResult = await userManager.incrementMessageCount(existingUser.id);

    if (rateResult.is_limited) {
      return {
        handled: true,
        response: TEMPLATES.id.rateLimitReached(rateResult.limit)
      };
    }

    // Warn when approaching limit
    if (rateResult.limit !== -1 && rateResult.remaining <= 10 && rateResult.remaining > 0) {
      return {
        handled: false, // Let main agent handle, but add warning
        warning: TEMPLATES.id.rateLimitWarning(rateResult.count, rateResult.limit)
      };
    }

    return { handled: false }; // Let main agent handle
  }

  // Pending verification
  if (existingUser && existingUser.status === 'pending') {
    return await handleVerification(phone, message, existingUser);
  }

  // In onboarding flow
  if (state) {
    return await handleOnboardingStep(phone, message, state);
  }

  // New user - start onboarding
  return await startOnboarding(phone);
}

/**
 * Start onboarding for new user
 */
async function startOnboarding(phone) {
  const result = await userManager.registerUser(phone);

  if (result.error === 'ALREADY_REGISTERED') {
    return {
      handled: true,
      response: TEMPLATES.id.alreadyRegistered()
    };
  }

  onboardingState.set(phone, {
    step: 'verify',
    userId: result.user.id,
    code: result.pairing_code
  });

  return {
    handled: true,
    response: TEMPLATES.id.welcome(result.pairing_code)
  };
}

/**
 * Handle verification step
 */
async function handleVerification(phone, message, user) {
  const code = message.trim().toUpperCase();

  // Request new code
  if (message.toLowerCase().includes('kode baru') || message.toLowerCase().includes('new code')) {
    const newCode = userManager.generatePairingCode();
    // Update code in database (would need to implement)
    return {
      handled: true,
      response: TEMPLATES.id.welcome(newCode)
    };
  }

  const result = await userManager.verifyPairing(phone, code);

  if (result.error === 'INVALID_CODE') {
    return {
      handled: true,
      response: TEMPLATES.id.invalidCode(user.pairing_code)
    };
  }

  if (result.error === 'CODE_EXPIRED') {
    return {
      handled: true,
      response: TEMPLATES.id.codeExpired()
    };
  }

  if (result.success) {
    onboardingState.set(phone, {
      step: 'name',
      userId: result.user.id
    });

    return {
      handled: true,
      response: TEMPLATES.id.askName()
    };
  }

  return { handled: false };
}

/**
 * Handle onboarding flow steps
 */
async function handleOnboardingStep(phone, message, state) {
  const lang = getLang(state.userId);
  const msg = message.trim().toLowerCase();

  switch (state.step) {
    case 'name':
      // Save name
      const name = message.trim();
      // Update user name in database (would need to implement)

      onboardingState.set(phone, {
        ...state,
        step: 'connect_services',
        name: name
      });

      return {
        handled: true,
        response: TEMPLATES[lang].verifySuccess(name)
      };

    case 'connect_services':
      if (msg === 'skip' || msg === 'lewati') {
        return completeOnboarding(phone, state);
      }

      if (msg.includes('calendar') || msg.includes('kalender')) {
        const oauthUrl = `https://your-server.com/oauth?user=${state.userId}&service=calendar`;
        onboardingState.set(phone, {
          ...state,
          step: 'waiting_oauth',
          service: 'calendar'
        });

        return {
          handled: true,
          response: TEMPLATES[lang].connectService('Google Calendar', oauthUrl)
        };
      }

      if (msg.includes('gmail') || msg.includes('email')) {
        const oauthUrl = `https://your-server.com/oauth?user=${state.userId}&service=gmail`;
        onboardingState.set(phone, {
          ...state,
          step: 'waiting_oauth',
          service: 'gmail'
        });

        return {
          handled: true,
          response: TEMPLATES[lang].connectService('Gmail', oauthUrl)
        };
      }

      return { handled: false };

    case 'waiting_oauth':
      if (msg === 'sudah' || msg === 'done' || msg === 'selesai') {
        // Mark service as connected
        await userManager.updateConnectedService(state.userId, state.service, true);

        onboardingState.set(phone, {
          ...state,
          step: 'connect_services'
        });

        const serviceName = state.service === 'gmail' ? 'Gmail' : 'Google Calendar';
        return {
          handled: true,
          response: TEMPLATES[lang].serviceConnected(serviceName) +
            '\n\nMau hubungkan layanan lain? Atau ketik "selesai".'
        };
      }

      if (msg === 'selesai' || msg === 'done' || msg === 'skip') {
        return completeOnboarding(phone, state);
      }

      return { handled: false };

    default:
      return { handled: false };
  }
}

/**
 * Complete onboarding process
 */
async function completeOnboarding(phone, state) {
  const user = await userManager.getUserById(state.userId);
  const features = [];

  if (user.connected_services.calendar) {
    features.push('"Jadwal hari ini" - lihat agenda');
  }
  features.push('"Ingatkan aku jam 3" - set pengingat');
  features.push('"Bantuan" - lihat semua fitur');

  onboardingState.delete(phone);

  return {
    handled: true,
    response: TEMPLATES.id.setupComplete(features)
  };
}

/**
 * Handle upgrade request
 */
async function handleUpgradeRequest(userId, plan) {
  if (plan !== 'premium' && plan !== 'business') {
    return {
      handled: true,
      response: TEMPLATES.id.planComparison()
    };
  }

  // In production, this would integrate with payment system
  // For now, just show upgrade instructions

  const prices = {
    premium: 'Rp 49.000/bulan',
    business: 'Rp 149.000/bulan'
  };

  return {
    handled: true,
    response: `Untuk upgrade ke ${plan.toUpperCase()} (${prices[plan]}):

1. Transfer ke: BCA 1234567890 a/n Your Name
2. Kirim bukti transfer ke admin: +628xxxxxxxxxx
3. Akun akan diupgrade dalam 1x24 jam

Atau gunakan link pembayaran:
🔗 https://your-payment-link.com/upgrade/${plan}

Ada pertanyaan? Ketik "bantuan upgrade"`
  };
}

module.exports = {
  handleMessage,
  startOnboarding,
  handleUpgradeRequest,
  TEMPLATES
};
