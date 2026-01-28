/**
 * Indeed Job Search Automation
 *
 * Uses Puppeteer to search for jobs on Indeed Indonesia.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const INDEED_URL = 'https://id.indeed.com';
const COOKIES_PATH = path.join(__dirname, 'indeed-cookies.json');

let browser = null;
let page = null;

/**
 * Initialize browser
 */
async function initialize() {
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  page = await browser.newPage();

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
 * Save cookies
 */
async function saveCookies() {
  if (!page) return;
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

/**
 * Search for jobs on Indeed
 */
async function searchJobs(keywords, location, experience, posted) {
  if (!page) await initialize();

  // Build search URL
  const params = new URLSearchParams({
    q: keywords,
    l: location === 'Indonesia' ? '' : location,
    fromage: getTimeFilter(posted)
  });

  const searchUrl = `${INDEED_URL}/jobs?${params.toString()}`;

  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  // Wait for job listings
  await page.waitForSelector('.jobsearch-ResultsList', { timeout: 10000 });

  // Add delay
  await delay(1500 + Math.random() * 1500);

  // Extract job listings
  const jobs = await page.evaluate(() => {
    const jobCards = document.querySelectorAll('.job_seen_beacon');
    const results = [];

    jobCards.forEach((card, index) => {
      if (index >= 10) return;

      const titleEl = card.querySelector('.jobTitle a');
      const companyEl = card.querySelector('.companyName');
      const locationEl = card.querySelector('.companyLocation');
      const salaryEl = card.querySelector('.salary-snippet-container');
      const postedEl = card.querySelector('.date');

      if (titleEl && companyEl) {
        const jobKey = titleEl.getAttribute('data-jk') || index;

        results.push({
          id: `indeed-${jobKey}`,
          title: titleEl.textContent.trim(),
          company: companyEl.textContent.trim(),
          location: locationEl?.textContent?.trim() || 'Not specified',
          salary: salaryEl?.textContent?.trim() || 'Not disclosed',
          posted: postedEl?.textContent?.trim() || 'Recently',
          url: `https://id.indeed.com/viewjob?jk=${jobKey}`
        });
      }
    });

    return results;
  });

  await saveCookies();

  return jobs;
}

/**
 * Get job details from Indeed
 */
async function getJobDetails(jobId) {
  if (!page) await initialize();

  const jobKey = jobId.replace('indeed-', '');
  const jobUrl = `${INDEED_URL}/viewjob?jk=${jobKey}`;

  await page.goto(jobUrl, { waitUntil: 'networkidle2' });

  await delay(1500 + Math.random() * 1500);

  const details = await page.evaluate(() => {
    const title = document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim();
    const company = document.querySelector('[data-company-name="true"]')?.textContent?.trim();
    const location = document.querySelector('[data-testid="job-location"]')?.textContent?.trim();
    const salary = document.querySelector('#salaryInfoAndJobType')?.textContent?.trim();
    const descriptionEl = document.querySelector('#jobDescriptionText');
    const description = descriptionEl?.textContent?.trim();

    // Extract requirements from description
    const requirements = [];
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
      salary,
      description: description?.substring(0, 1000),
      requirements: requirements.slice(0, 10)
    };
  });

  return details;
}

/**
 * Convert time filter to Indeed parameter
 */
function getTimeFilter(posted) {
  const filters = {
    '24h': '1',
    'week': '7',
    'month': '30'
  };
  return filters[posted] || filters['week'];
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
  saveCookies,
  searchJobs,
  getJobDetails,
  close
};
