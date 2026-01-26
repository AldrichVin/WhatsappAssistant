/**
 * OAuth Server for Gmail/Calendar Authentication
 *
 * This simple server handles the OAuth callback from Google
 * and saves the authentication token.
 *
 * Usage: node oauth-server.js
 */

const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// Configuration
const PORT = 3000;
const CREDENTIALS_PATH = path.join(__dirname, '..', 'skills', 'gmail', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'skills', 'gmail', 'token.json');

// OAuth scopes for both Gmail and Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

let oAuth2Client = null;

/**
 * Initialize OAuth client from credentials
 */
async function initOAuth() {
  try {
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      `http://localhost:${PORT}/oauth/callback`
    );

    return true;
  } catch (err) {
    console.error('Error loading credentials:', err.message);
    console.log('\nPlease place your Google OAuth credentials.json file at:');
    console.log(CREDENTIALS_PATH);
    return false;
  }
}

/**
 * Generate OAuth URL
 */
function getAuthUrl() {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokenFromCode(code) {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return tokens;
}

/**
 * HTML template for pages
 */
function htmlPage(title, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #333; }
    .success { color: #28a745; }
    .error { color: #dc3545; }
    a.button {
      display: inline-block;
      background: #4285f4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    a.button:hover {
      background: #357abd;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
`;
}

/**
 * HTTP request handler
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/') {
    // Home page - show auth link
    const authUrl = getAuthUrl();
    const html = htmlPage('Google OAuth Setup', `
      <h1>WhatsApp AI Assistant</h1>
      <h2>Google Account Setup</h2>
      <p>Click the button below to connect your Gmail and Calendar:</p>
      <a href="${authUrl}" class="button">Connect Google Account</a>
      <p style="margin-top: 20px; color: #666;">
        This will allow the bot to:<br>
        - Read and send emails<br>
        - View and create calendar events
      </p>
    `);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);

  } else if (pathname === '/oauth/callback') {
    // OAuth callback
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    if (error) {
      const html = htmlPage('Authorization Failed', `
        <h1 class="error">Authorization Failed</h1>
        <p>Error: ${error}</p>
        <p><a href="/">Try again</a></p>
      `);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    try {
      const tokens = await getTokenFromCode(code);
      console.log('✅ Token saved successfully!');

      const html = htmlPage('Success!', `
        <h1 class="success">Connected Successfully!</h1>
        <p>Your Google account has been connected.</p>
        <p>You can now use email and calendar features via WhatsApp.</p>
        <p style="margin-top: 30px;">
          Go back to WhatsApp and type <code>sudah</code> to confirm.
        </p>
      `);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);

    } catch (err) {
      console.error('Error getting token:', err);
      const html = htmlPage('Error', `
        <h1 class="error">Something went wrong</h1>
        <p>Error: ${err.message}</p>
        <p><a href="/">Try again</a></p>
      `);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(html);
    }

  } else if (pathname === '/status') {
    // Status check
    let tokenExists = false;
    try {
      await fs.access(TOKEN_PATH);
      tokenExists = true;
    } catch {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      authenticated: tokenExists,
      tokenPath: TOKEN_PATH
    }));

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

/**
 * Start the server
 */
async function start() {
  console.log('========================================');
  console.log('Google OAuth Server');
  console.log('========================================');
  console.log('');

  const initialized = await initOAuth();
  if (!initialized) {
    process.exit(1);
  }

  const server = http.createServer(handleRequest);

  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log('');
    console.log('To authenticate:');
    console.log(`1. Open http://localhost:${PORT} in your browser`);
    console.log('2. Click "Connect Google Account"');
    console.log('3. Sign in with your Google account');
    console.log('4. Grant the requested permissions');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });
}

start();
