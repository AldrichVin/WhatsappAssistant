/**
 * LinkedIn Job Search Automation
 *
 * Uses Puppeteer to search for jobs on LinkedIn.
 * Note: LinkedIn has strict anti-bot measures. Use responsibly.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const LINKEDIN_URL = 'https://www.linkedin.com';
const COOKIES_PATH = path.join(__dirname, 'linkedin-cookies.json');

let browser = null;
let page = null;

/**
 * Initialize browser
 */
async function initialize() {
  browser = await puppeteer.launch({
    headless: false, // LinkedIn often blocks headless browsers
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  page = await browser.newPage();

  // Set realistic viewport and user agent
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Load cookies if available
  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, 'utf8'));
    await page.setCookie(...cookies);
  } catch (err) {
    // No saved cookies
  }

  return { success: true };
}

/**
 * Check if logged in to LinkedIn
 */
async function isLoggedIn() {
  if (!page) await initialize();

  await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });

  // Check for feed or profile elements that indicate logged in state
  const feedElement = await page.$('.feed-identity-module');
  const signInButton = await page.$('.nav__button-secondary');

  return !!feedElement && !signInButton;
}

/**
 * Get login URL for manual authentication
 */
function getLoginUrl() {
  return `${LINKEDIN_URL}/login`;
}

/**
 * Save cookies after manual login
 */
async function saveCookies() {
  if (!page) return;
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

/**
 * Search for jobs on LinkedIn
 */
async function searchJobs(keywords, location, experience, posted) {
  if (!page) await initialize();

  // Build search URL
  const params = new URLSearchParams({
    keywords: keywords,
    location: location,
    f_TPR: getTimeFilter(posted),
    f_E: getExperienceFilter(experience)
  });

  const searchUrl = `${LINKEDIN_URL}/jobs/search/?${params.toString()}`;

  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  // Wait for job listings to load
  await page.waitForSelector('.jobs-search-results-list', { timeout: 10000 });

  // Add delay to appear more human
  await delay(2000 + Math.random() * 2000);

  // Extract job listings
  const jobs = await page.evaluate(() => {
    const jobCards = document.querySelectorAll('.job-card-container');
    const results = [];

    jobCards.forEach((card, index) => {
      if (index >= 10) return; // Limit to 10 results

      const titleEl = card.querySelector('.job-card-list__title');
      const companyEl = card.querySelector('.job-card-container__primary-description');
      const locationEl = card.querySelector('.job-card-container__metadata-item');
      const linkEl = card.querySelector('a.job-card-container__link');

      if (titleEl && companyEl) {
        results.push({
          id: `linkedin-${linkEl?.href?.match(/\/(\d+)\//)?.[1] || index}`,
          title: titleEl.textContent.trim(),
          company: companyEl.textContent.trim(),
          location: locationEl?.textContent?.trim() || 'Not specified',
          url: linkEl?.href || '',
          posted: card.querySelector('time')?.textContent?.trim() || 'Recently'
        });
      }
    });

    return results;
  });

  // Save cookies to maintain session
  await saveCookies();

  return jobs;
}

/**
 * Get job details from LinkedIn
 */
async function getJobDetails(jobId) {
  if (!page) await initialize();

  const jobUrl = `${LINKEDIN_URL}/jobs/view/${jobId.replace('linkedin-', '')}`;

  await page.goto(jobUrl, { waitUntil: 'networkidle2' });

  // Add delay
  await delay(1500 + Math.random() * 1500);

  const details = await page.evaluate(() => {
    const title = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim();
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim();
    const location = document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim();
    const description = document.querySelector('.jobs-description__content')?.textContent?.trim();

    // Extract requirements from description
    const requirements = [];
    const descriptionEl = document.querySelector('.jobs-description__content');
    if (descriptionEl) {
      const listItems = descriptionEl.querySelectorAll('li');
      listItems.forEach(li => {
        const text = li.textContent.trim();
        if (text.length > 10 && text.length < 200) {
          requirements.push(text);
        }
      });
    }

    return {
      title,
      company,
      location,
      description: description?.substring(0, 1000),
      requirements: requirements.slice(0, 10)
    };
  });

  return details;
}

/**
 * Convert time filter to LinkedIn parameter
 */
function getTimeFilter(posted) {
  const filters = {
    '24h': 'r86400',
    'week': 'r604800',
    'month': 'r2592000'
  };
  return filters[posted] || filters['week'];
}

/**
 * Convert experience filter to LinkedIn parameter
 */
function getExperienceFilter(experience) {
  const filters = {
    'entry': '1,2',
    'mid': '3,4',
    'senior': '5,6',
    'any': ''
  };
  return filters[experience] || '';
}

/**
 * Helper delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Close browser
 */
async function close() {
  if (browser) {
    await saveCookies();
    await browser.close();
    browser = null;
    page = null;
  }
}

module.exports = {
  initialize,
  isLoggedIn,
  getLoginUrl,
  saveCookies,
  searchJobs,
  getJobDetails,
  close
};
