#!/usr/bin/env node

/**
 * Local Setup Script
 *
 * Interactive setup wizard for WhatsApp AI Assistant
 * Run: node scripts/setup-local.js
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const CLAWD_HOME = path.join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',     // Cyan
    success: '\x1b[32m',  // Green
    warn: '\x1b[33m',     // Yellow
    error: '\x1b[31m',    // Red
    reset: '\x1b[0m'
  };

  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

async function checkPrerequisites() {
  log('Checking prerequisites...');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

  if (majorVersion < 18) {
    log(`Node.js ${nodeVersion} detected. Version 18+ required.`, 'error');
    return false;
  }
  log(`Node.js ${nodeVersion} - OK`, 'success');

  // Check if credentials.json exists
  const credPath = path.join(CLAWD_HOME, 'skills', 'gmail', 'credentials.json');
  try {
    await fs.access(credPath);
    log('Google OAuth credentials found - OK', 'success');
  } catch {
    log('Google OAuth credentials not found', 'warn');
    log(`Please place credentials.json at: ${credPath}`, 'warn');
  }

  return true;
}

async function setupUserPreferences() {
  console.log('\n========================================');
  console.log('User Preferences Setup');
  console.log('========================================\n');

  const name = await ask('Your name: ');
  const phone = await ask('WhatsApp phone number (with country code, e.g., +6281234567890): ');

  console.log('\nTimezone options: WIB (Jakarta), WITA (Makassar), WIT (Papua)');
  const timezone = await ask('Your timezone [WIB]: ') || 'WIB';

  const timezoneMap = {
    'WIB': 'Asia/Jakarta',
    'WITA': 'Asia/Makassar',
    'WIT': 'Asia/Jayapura'
  };

  const language = await ask('Preferred language [Indonesian]: ') || 'Indonesian';
  const formalityChoice = await ask('Conversation style - casual or formal [casual]: ') || 'casual';

  // Update USER.md
  const userMdPath = path.join(CLAWD_HOME, 'USER.md');
  let userContent = await fs.readFile(userMdPath, 'utf8');

  userContent = userContent
    .replace('[To be configured]', name)
    .replace('[WhatsApp number]', phone)
    .replace('Asia/Jakarta (WIB)', timezoneMap[timezone.toUpperCase()] || 'Asia/Jakarta')
    .replace('Indonesian (Bahasa)', language)
    .replace('Casual', formalityChoice.charAt(0).toUpperCase() + formalityChoice.slice(1));

  await fs.writeFile(userMdPath, userContent);
  log('User preferences saved to USER.md', 'success');

  // Update clawdbot.json with phone number
  const configPath = path.join(CLAWD_HOME, 'config', 'clawdbot.json');
  let config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  config.channels.whatsapp.allowFrom = [phone];
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  log('Phone number added to clawdbot.json', 'success');

  return { name, phone, timezone };
}

async function setupSkills() {
  console.log('\n========================================');
  console.log('Skills Configuration');
  console.log('========================================\n');

  const gmail = await ask('Enable Gmail integration? (y/n) [y]: ');
  const calendar = await ask('Enable Calendar integration? (y/n) [y]: ');
  const grabfood = await ask('Enable GrabFood ordering? (y/n) [n]: ');

  const enabledSkills = [];
  if (gmail.toLowerCase() !== 'n') enabledSkills.push('gmail');
  if (calendar.toLowerCase() !== 'n') enabledSkills.push('calendar');
  if (grabfood.toLowerCase() === 'y') enabledSkills.push('grab-food');

  // Update config
  const configPath = path.join(CLAWD_HOME, 'config', 'clawdbot.json');
  let config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.skills.enabled = enabledSkills;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  log(`Enabled skills: ${enabledSkills.join(', ')}`, 'success');

  return enabledSkills;
}

async function setupBriefing() {
  console.log('\n========================================');
  console.log('Daily Briefing Setup');
  console.log('========================================\n');

  const enableBriefing = await ask('Enable daily morning briefing? (y/n) [y]: ');

  if (enableBriefing.toLowerCase() !== 'n') {
    const briefingTime = await ask('Briefing time (24h format, e.g., 07:00) [07:00]: ') || '07:00';

    const [hour, minute] = briefingTime.split(':').map(n => parseInt(n, 10));

    const configPath = path.join(CLAWD_HOME, 'config', 'clawdbot.json');
    let config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    config.cron.jobs.morning_briefing.schedule = `${minute} ${hour} * * *`;
    config.cron.jobs.morning_briefing.enabled = true;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    log(`Morning briefing set for ${briefingTime}`, 'success');
  }
}

async function printNextSteps(userInfo, skills) {
  console.log('\n========================================');
  console.log('Setup Complete!');
  console.log('========================================\n');

  console.log('Your configuration has been saved.\n');

  console.log('Next steps:\n');

  console.log('1. Install Clawdbot (if not already installed):');
  console.log('   curl -fsSL https://clawd.bot/install.sh | bash\n');

  console.log('2. Configure Claude authentication:');
  console.log('   clawdbot models auth paste-token --provider anthropic\n');

  console.log('3. Pair your WhatsApp:');
  console.log('   clawdbot whatsapp pair');
  console.log('   (Scan the QR code with your phone)\n');

  if (skills.includes('gmail') || skills.includes('calendar')) {
    console.log('4. Complete Google OAuth (for Gmail/Calendar):');
    console.log('   node scripts/oauth-server.js');
    console.log('   (Open http://localhost:3000 in your browser)\n');
  }

  console.log('5. Start the assistant:');
  console.log('   clawdbot start\n');

  console.log('========================================');
  console.log('Useful Commands');
  console.log('========================================\n');
  console.log('  clawdbot status     - Check status');
  console.log('  clawdbot logs       - View logs');
  console.log('  clawdbot stop       - Stop assistant');
  console.log('  clawdbot restart    - Restart assistant\n');

  console.log(`Welcome aboard, ${userInfo.name}!`);
}

async function main() {
  console.log('========================================');
  console.log('WhatsApp AI Assistant Setup Wizard');
  console.log('========================================\n');

  try {
    const prereqOk = await checkPrerequisites();
    if (!prereqOk) {
      log('Please fix prerequisites and try again.', 'error');
      rl.close();
      return;
    }

    const userInfo = await setupUserPreferences();
    const skills = await setupSkills();
    await setupBriefing();

    await printNextSteps(userInfo, skills);

  } catch (err) {
    log(`Error during setup: ${err.message}`, 'error');
  }

  rl.close();
}

main();
