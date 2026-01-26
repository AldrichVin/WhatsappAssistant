/**
 * Gmail API Helper Functions
 *
 * This module provides functions to interact with Gmail API
 * for the WhatsApp AI Assistant.
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// Paths for credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// OAuth scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

/**
 * Load or create OAuth2 client
 * @returns {Promise<google.auth.OAuth2>} Authenticated OAuth2 client
 */
async function getAuthClient() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (err) {
    return null; // Not authenticated
  }
}

/**
 * Generate OAuth URL for user authentication
 * @returns {Promise<string>} OAuth consent URL
 */
async function getAuthUrl() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Save OAuth token after user authorization
 * @param {string} code - Authorization code from OAuth callback
 */
async function saveToken(code) {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const { tokens } = await oAuth2Client.getToken(code);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return tokens;
}

/**
 * Check recent emails
 * @param {Object} options - Query options
 * @param {number} options.count - Number of emails (default: 10)
 * @param {boolean} options.unreadOnly - Only unread (default: false)
 * @param {string} options.from - Filter by sender
 * @returns {Promise<Array>} List of email summaries
 */
async function checkEmails({ count = 10, unreadOnly = false, from = null } = {}) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const gmail = google.gmail({ version: 'v1', auth });

  // Build query
  let query = 'in:inbox';
  if (unreadOnly) query += ' is:unread';
  if (from) query += ` from:${from}`;

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: Math.min(count, 50),
    q: query
  });

  const messages = response.data.messages || [];
  const emails = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });

    const headers = detail.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    emails.push({
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: detail.data.snippet,
      unread: detail.data.labelIds?.includes('UNREAD') || false,
      important: detail.data.labelIds?.includes('IMPORTANT') || false
    });
  }

  return emails;
}

/**
 * Read full email content
 * @param {string} emailId - Email ID
 * @returns {Promise<Object>} Full email content
 */
async function readEmail(emailId) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full'
  });

  const headers = response.data.payload.headers;
  const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

  // Extract body
  let body = '';
  const payload = response.data.payload;

  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf8');
  } else if (payload.parts) {
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
    }
  }

  // Mark as read
  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  });

  return {
    id: emailId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body: body,
    attachments: payload.parts?.filter(p => p.filename)?.map(p => p.filename) || []
  };
}

/**
 * Search emails
 * @param {string} query - Gmail search query
 * @param {number} count - Max results
 * @returns {Promise<Array>} Search results
 */
async function searchEmails(query, count = 10) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const gmail = google.gmail({ version: 'v1', auth });

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: count,
    q: query
  });

  const messages = response.data.messages || [];
  const results = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });

    const headers = detail.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    results.push({
      id: msg.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: detail.data.snippet
    });
  }

  return results;
}

/**
 * Send an email
 * @param {Object} email - Email data
 * @param {string} email.to - Recipient
 * @param {string} email.subject - Subject
 * @param {string} email.body - Body text
 * @param {string} email.replyTo - Original message ID for replies
 * @returns {Promise<Object>} Sent message info
 */
async function sendEmail({ to, subject, body, replyTo = null }) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const gmail = google.gmail({ version: 'v1', auth });

  // Build email
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n');

  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody = {
    raw: encodedMessage
  };

  if (replyTo) {
    requestBody.threadId = replyTo;
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody
  });

  return {
    id: response.data.id,
    threadId: response.data.threadId,
    sent: true
  };
}

/**
 * Create a draft email
 * @param {Object} email - Email data
 * @returns {Promise<Object>} Draft info
 */
async function createDraft({ to, subject, body, replyTo = null }) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const gmail = google.gmail({ version: 'v1', auth });

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n');

  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody = {
    message: {
      raw: encodedMessage
    }
  };

  if (replyTo) {
    requestBody.message.threadId = replyTo;
  }

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody
  });

  return {
    draftId: response.data.id,
    messageId: response.data.message.id
  };
}

module.exports = {
  getAuthClient,
  getAuthUrl,
  saveToken,
  checkEmails,
  readEmail,
  searchEmails,
  sendEmail,
  createDraft
};
