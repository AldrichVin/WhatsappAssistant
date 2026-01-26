/**
 * Google Calendar API Helper Functions
 *
 * This module provides functions to interact with Google Calendar API
 * for the WhatsApp AI Assistant.
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// Paths for credentials (shared with Gmail)
const CREDENTIALS_PATH = path.join(__dirname, '..', 'gmail', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'gmail', 'token.json');

// Calendar-specific scopes (combined with Gmail scopes in OAuth)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

// Default timezone
const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Load OAuth2 client
 * @returns {Promise<google.auth.OAuth2|null>} Authenticated client or null
 */
async function getAuthClient() {
  try {
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (err) {
    return null;
  }
}

/**
 * Parse Indonesian time expressions to Date
 * @param {string} timeStr - Time string (e.g., "jam 3", "besok jam 10")
 * @param {string} timezone - Timezone
 * @returns {Date} Parsed date
 */
function parseIndonesianTime(timeStr, timezone = DEFAULT_TIMEZONE) {
  const now = new Date();
  let targetDate = new Date(now);

  // Handle relative days
  if (timeStr.includes('besok')) {
    targetDate.setDate(targetDate.getDate() + 1);
    timeStr = timeStr.replace('besok', '').trim();
  } else if (timeStr.includes('lusa')) {
    targetDate.setDate(targetDate.getDate() + 2);
    timeStr = timeStr.replace('lusa', '').trim();
  } else if (timeStr.includes('minggu depan')) {
    targetDate.setDate(targetDate.getDate() + 7);
    timeStr = timeStr.replace('minggu depan', '').trim();
  }

  // Parse time
  const timeMatch = timeStr.match(/jam\s*(\d{1,2})(?::(\d{2}))?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

    // Determine AM/PM based on context
    if (timeStr.includes('pagi') && hours === 12) {
      hours = 0;
    } else if (timeStr.includes('sore') || timeStr.includes('siang')) {
      if (hours < 12) hours += 12;
    } else if (timeStr.includes('malam')) {
      if (hours < 12) hours += 12;
    } else if (hours < 12 && hours >= 1 && hours <= 6) {
      // Ambiguous - assume afternoon for business hours
      hours += 12;
    }

    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} timezone - Timezone
 * @returns {string} Formatted date string
 */
function formatDate(date, timezone = DEFAULT_TIMEZONE) {
  const d = new Date(date);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  };
  return d.toLocaleString('id-ID', options);
}

/**
 * Get today's events
 * @param {string} timezone - Timezone
 * @returns {Promise<Array>} Today's events
 */
async function getToday(timezone = DEFAULT_TIMEZONE) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: timezone
  });

  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    attendees: event.attendees?.map(a => a.email) || [],
    isAllDay: !event.start.dateTime
  }));
}

/**
 * Get tomorrow's events
 * @param {string} timezone - Timezone
 * @returns {Promise<Array>} Tomorrow's events
 */
async function getTomorrow(timezone = DEFAULT_TIMEZONE) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: timezone
  });

  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    attendees: event.attendees?.map(a => a.email) || [],
    isAllDay: !event.start.dateTime
  }));
}

/**
 * Get this week's events
 * @param {string} timezone - Timezone
 * @returns {Promise<Array>} Week's events
 */
async function getWeek(timezone = DEFAULT_TIMEZONE) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: timezone
  });

  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    attendees: event.attendees?.map(a => a.email) || [],
    isAllDay: !event.start.dateTime
  }));
}

/**
 * Get a specific event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event details
 */
async function getEvent(eventId) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.get({
    calendarId: 'primary',
    eventId: eventId
  });

  const event = response.data;
  return {
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    attendees: event.attendees?.map(a => ({
      email: a.email,
      status: a.responseStatus
    })) || [],
    isAllDay: !event.start.dateTime,
    htmlLink: event.htmlLink
  };
}

/**
 * Create a new event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
async function createEvent({
  title,
  startTime,
  endTime = null,
  description = '',
  location = '',
  attendees = [],
  reminderMinutes = 15,
  timezone = DEFAULT_TIMEZONE
}) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  // Parse start time
  const start = typeof startTime === 'string'
    ? parseIndonesianTime(startTime, timezone)
    : new Date(startTime);

  // Default end time is 1 hour after start
  const end = endTime
    ? (typeof endTime === 'string' ? parseIndonesianTime(endTime, timezone) : new Date(endTime))
    : new Date(start.getTime() + 60 * 60 * 1000);

  const event = {
    summary: title,
    description: description,
    location: location,
    start: {
      dateTime: start.toISOString(),
      timeZone: timezone
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: timezone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes }
      ]
    }
  };

  if (attendees.length > 0) {
    event.attendees = attendees.map(email => ({ email }));
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: attendees.length > 0 ? 'all' : 'none'
  });

  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime,
    htmlLink: response.data.htmlLink
  };
}

/**
 * Update an existing event
 * @param {string} eventId - Event ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated event
 */
async function updateEvent(eventId, updates) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  // Get current event
  const current = await calendar.events.get({
    calendarId: 'primary',
    eventId: eventId
  });

  const event = current.data;

  // Apply updates
  if (updates.title) event.summary = updates.title;
  if (updates.description) event.description = updates.description;
  if (updates.location) event.location = updates.location;
  if (updates.startTime) {
    const start = parseIndonesianTime(updates.startTime);
    event.start = { dateTime: start.toISOString(), timeZone: DEFAULT_TIMEZONE };
  }
  if (updates.endTime) {
    const end = parseIndonesianTime(updates.endTime);
    event.end = { dateTime: end.toISOString(), timeZone: DEFAULT_TIMEZONE };
  }

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: event
  });

  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime
  };
}

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteEvent(eventId) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId
  });

  return true;
}

/**
 * Check for scheduling conflicts
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Promise<Array>} Conflicting events
 */
async function checkConflicts(startTime, endTime) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true
  });

  return response.data.items.map(event => ({
    id: event.id,
    title: event.summary,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date
  }));
}

/**
 * Get free/busy info
 * @param {Date} startTime - Range start
 * @param {Date} endTime - Range end
 * @returns {Promise<Array>} Busy periods
 */
async function getFreeBusy(startTime, endTime) {
  const auth = await getAuthClient();
  if (!auth) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: [{ id: 'primary' }]
    }
  });

  return response.data.calendars.primary.busy;
}

module.exports = {
  getAuthClient,
  parseIndonesianTime,
  formatDate,
  getToday,
  getTomorrow,
  getWeek,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  checkConflicts,
  getFreeBusy
};
