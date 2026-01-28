/**
 * Job Search & Application Module
 *
 * Searches for jobs on LinkedIn and Indeed, matches to resume,
 * and drafts applications for user review.
 */

const fs = require('fs').promises;
const path = require('path');

// Data paths
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const RESUME_PATH = path.join(DATA_DIR, 'resume.json');
const APPLICATIONS_PATH = path.join(DATA_DIR, 'applications.json');
const ALERTS_PATH = path.join(DATA_DIR, 'job-alerts.json');

// Import platform-specific modules
let linkedinAutomation, indeedAutomation;
try {
  linkedinAutomation = require('./linkedin-automation');
  indeedAutomation = require('./indeed-automation');
} catch (err) {
  console.warn('Platform automation modules not loaded:', err.message);
}

/**
 * Load resume data
 */
async function loadResume() {
  try {
    const data = await fs.readFile(RESUME_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

/**
 * Save resume data
 */
async function saveResume(resume) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(RESUME_PATH, JSON.stringify(resume, null, 2));
}

/**
 * Load applications tracking
 */
async function loadApplications() {
  try {
    const data = await fs.readFile(APPLICATIONS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { applications: [] };
  }
}

/**
 * Save applications tracking
 */
async function saveApplications(apps) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(APPLICATIONS_PATH, JSON.stringify(apps, null, 2));
}

/**
 * Load job alerts
 */
async function loadAlerts() {
  try {
    const data = await fs.readFile(ALERTS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { alerts: [] };
  }
}

/**
 * Save job alerts
 */
async function saveAlerts(alerts) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ALERTS_PATH, JSON.stringify(alerts, null, 2));
}

/**
 * Calculate match score between job and resume
 */
function calculateMatchScore(job, resume) {
  if (!resume) return 0;

  let score = 0;
  let totalWeight = 0;

  // Skills matching (weight: 40%)
  const resumeSkills = [
    ...(resume.skills?.technical || []),
    ...(resume.skills?.soft || [])
  ].map(s => s.toLowerCase());

  const jobSkills = (job.requirements || [])
    .join(' ')
    .toLowerCase()
    .split(/[\s,;]+/);

  const matchedSkills = resumeSkills.filter(skill =>
    jobSkills.some(js => js.includes(skill) || skill.includes(js))
  );

  score += (matchedSkills.length / Math.max(resumeSkills.length, 1)) * 40;
  totalWeight += 40;

  // Experience matching (weight: 30%)
  const requiredExp = extractYearsExperience(job.requirements?.join(' ') || '');
  const actualExp = calculateTotalExperience(resume.experience || []);

  if (requiredExp > 0) {
    const expRatio = Math.min(actualExp / requiredExp, 1);
    score += expRatio * 30;
  } else {
    score += 30; // No experience requirement
  }
  totalWeight += 30;

  // Education matching (weight: 15%)
  if (resume.education && resume.education.length > 0) {
    score += 15; // Has education
  }
  totalWeight += 15;

  // Location matching (weight: 15%)
  const resumeLocation = resume.personal?.location?.toLowerCase() || '';
  const jobLocation = (job.location || '').toLowerCase();

  if (
    jobLocation.includes('remote') ||
    jobLocation.includes(resumeLocation) ||
    resumeLocation.includes(jobLocation.split(',')[0])
  ) {
    score += 15;
  }
  totalWeight += 15;

  return Math.round((score / totalWeight) * 100);
}

/**
 * Extract years of experience from text
 */
function extractYearsExperience(text) {
  const match = text.match(/(\d+)\+?\s*(?:years?|tahun)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Calculate total years of experience from resume
 */
function calculateTotalExperience(experiences) {
  let totalMonths = 0;

  for (const exp of experiences) {
    const start = new Date(exp.startDate);
    const end = exp.endDate === 'present' ? new Date() : new Date(exp.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 +
                   (end.getMonth() - start.getMonth());
    totalMonths += months;
  }

  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

/**
 * Search for jobs across platforms
 */
async function searchJobs({
  keywords,
  location = 'Indonesia',
  experience = 'any',
  posted = 'week',
  platforms = 'both',
  limit = 10
}) {
  const resume = await loadResume();
  const results = [];

  // Search LinkedIn
  if (platforms === 'both' || platforms === 'linkedin') {
    try {
      const linkedinJobs = await searchLinkedIn(keywords, location, experience, posted);
      results.push(...linkedinJobs.map(job => ({
        ...job,
        platform: 'linkedin',
        matchScore: calculateMatchScore(job, resume)
      })));
    } catch (err) {
      console.error('LinkedIn search error:', err.message);
    }
  }

  // Search Indeed
  if (platforms === 'both' || platforms === 'indeed') {
    try {
      const indeedJobs = await searchIndeed(keywords, location, experience, posted);
      results.push(...indeedJobs.map(job => ({
        ...job,
        platform: 'indeed',
        matchScore: calculateMatchScore(job, resume)
      })));
    } catch (err) {
      console.error('Indeed search error:', err.message);
    }
  }

  // Sort by match score
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results.slice(0, limit);
}

/**
 * Search LinkedIn for jobs
 */
async function searchLinkedIn(keywords, location, experience, posted) {
  if (!linkedinAutomation) {
    // Return mock data for testing
    return [
      {
        id: 'linkedin-001',
        title: 'Data Analyst',
        company: 'Tokopedia',
        location: 'Jakarta Selatan',
        salary: 'Rp 15-25 juta',
        type: 'Full-time',
        posted: '2 hari lalu',
        url: 'https://linkedin.com/jobs/view/123',
        requirements: [
          'Bachelor degree in Statistics or related',
          '2+ years experience in data analysis',
          'Proficient in SQL, Python, Tableau'
        ],
        description: 'We are looking for a Data Analyst...'
      },
      {
        id: 'linkedin-002',
        title: 'Business Analyst',
        company: 'Shopee',
        location: 'Jakarta',
        salary: 'Competitive',
        type: 'Full-time',
        posted: '1 minggu lalu',
        url: 'https://linkedin.com/jobs/view/456',
        requirements: [
          'Bachelor degree in Business or related',
          '1+ years experience',
          'Strong analytical skills'
        ],
        description: 'Join our team as a Business Analyst...'
      }
    ];
  }

  return await linkedinAutomation.searchJobs(keywords, location, experience, posted);
}

/**
 * Search Indeed for jobs
 */
async function searchIndeed(keywords, location, experience, posted) {
  if (!indeedAutomation) {
    // Return mock data for testing
    return [
      {
        id: 'indeed-001',
        title: 'Junior Data Analyst',
        company: 'Gojek',
        location: 'Jakarta / Remote',
        salary: 'Rp 12-18 juta',
        type: 'Full-time',
        posted: '5 hari lalu',
        url: 'https://indeed.com/viewjob?jk=abc123',
        requirements: [
          'Fresh graduate welcome',
          'Basic SQL knowledge',
          'Eager to learn'
        ],
        description: 'Great opportunity for fresh graduates...'
      }
    ];
  }

  return await indeedAutomation.searchJobs(keywords, location, experience, posted);
}

/**
 * Get detailed job information
 */
async function getJobDetails(jobId) {
  // In production, this would fetch from the platform
  // For now, return cached/mock data

  const mockJobs = {
    'linkedin-001': {
      id: 'linkedin-001',
      title: 'Data Analyst',
      company: 'Tokopedia',
      companyDescription: 'Leading e-commerce platform in Indonesia',
      location: 'Jakarta Selatan',
      salary: 'Rp 15-25 juta/bulan',
      type: 'Full-time',
      posted: '2 hari lalu',
      applicants: '50-100',
      url: 'https://linkedin.com/jobs/view/123',
      requirements: [
        'Bachelor\'s degree in Statistics, Math, or related field',
        '2+ years experience in data analysis',
        'Proficient in SQL, Python, Tableau',
        'Strong communication skills',
        'Experience with A/B testing is a plus'
      ],
      responsibilities: [
        'Analyze business metrics and KPIs',
        'Create dashboards and reports',
        'Collaborate with product teams',
        'Present insights to stakeholders',
        'Identify opportunities for optimization'
      ],
      benefits: [
        'Competitive salary',
        'Health insurance',
        'Flexible working hours',
        'Learning budget'
      ]
    }
  };

  return mockJobs[jobId] || null;
}

/**
 * Generate cover letter for a job
 */
async function generateCoverLetter(job, resume) {
  if (!resume) {
    throw new Error('RESUME_NOT_FOUND');
  }

  const name = resume.personal?.name || '[Nama Anda]';
  const experience = resume.experience?.[0];
  const skills = resume.skills?.technical?.slice(0, 3).join(', ') || 'berbagai keahlian teknis';

  // Calculate experience highlights
  const highlights = experience?.highlights?.slice(0, 3) || [
    'Berkontribusi pada proyek-proyek penting',
    'Bekerja dalam tim yang dinamis',
    'Mengembangkan solusi inovatif'
  ];

  const coverLetter = `Yth. Tim Rekrutmen ${job.company},

Dengan hormat,

Saya sangat tertarik dengan posisi ${job.title} yang tersedia di ${job.company}. Dengan pengalaman saya dalam ${skills}, saya yakin dapat memberikan kontribusi positif untuk tim Anda.

Di posisi saya sebelumnya${experience ? ` sebagai ${experience.title} di ${experience.company}` : ''}, saya berhasil:
${highlights.map(h => `• ${h}`).join('\n')}

Saya sangat mengagumi ${job.company} dan ingin menjadi bagian dari pertumbuhan perusahaan. Saya percaya bahwa kombinasi keahlian teknis dan kemampuan analitis saya akan menjadi aset berharga bagi tim.

Saya sangat berharap dapat mendiskusikan lebih lanjut bagaimana saya dapat berkontribusi untuk ${job.company}.

Terima kasih atas waktu dan pertimbangan Bapak/Ibu.

Hormat saya,
${name}
${resume.personal?.email || ''}
${resume.personal?.phone || ''}`;

  return coverLetter;
}

/**
 * Generate answers for common application questions
 */
function generateCommonAnswers(job, resume) {
  const companyName = job.company;
  const position = job.title;
  const salary = job.salary;

  return {
    'Why do you want to work here?': `Saya tertarik bekerja di ${companyName} karena reputasinya sebagai perusahaan yang inovatif dan berpengaruh di industri ini. Saya melihat posisi ${position} sebagai kesempatan untuk mengembangkan karir sambil berkontribusi pada misi perusahaan.`,

    'What are your strengths?': `Kekuatan utama saya adalah kemampuan analitis yang kuat, perhatian terhadap detail, dan kemampuan untuk berkomunikasi temuan kompleks dengan cara yang mudah dipahami. Saya juga cepat belajar dan adaptif terhadap teknologi baru.`,

    'What are your weaknesses?': `Saya terkadang terlalu fokus pada detail yang bisa memperlambat pekerjaan. Namun, saya telah belajar untuk menetapkan deadline yang jelas dan memprioritaskan tugas untuk menjaga keseimbangan antara kualitas dan efisiensi.`,

    'Expected salary': salary ?
      `Berdasarkan range yang ditawarkan (${salary}) dan pengalaman saya, saya berharap kompensasi yang kompetitif sesuai dengan tanggung jawab posisi ini.` :
      `Saya terbuka untuk mendiskusikan kompensasi yang sesuai dengan tanggung jawab posisi dan standar industri.`,

    'Why should we hire you?': `Saya membawa kombinasi keahlian teknis yang solid dan pengalaman praktis yang relevan dengan posisi ini. Saya adalah pekerja yang berdedikasi, cepat belajar, dan mampu bekerja baik secara mandiri maupun dalam tim.`
  };
}

/**
 * Draft a complete application
 */
async function draftApplication(jobId, customNotes = null) {
  const job = await getJobDetails(jobId);
  if (!job) {
    throw new Error('JOB_NOT_FOUND');
  }

  const resume = await loadResume();
  if (!resume) {
    throw new Error('RESUME_NOT_FOUND');
  }

  const coverLetter = await generateCoverLetter(job, resume);
  const commonAnswers = generateCommonAnswers(job, resume);
  const matchScore = calculateMatchScore(job, resume);

  // Analyze skill matches
  const skillMatches = analyzeSkillMatches(job, resume);

  const draft = {
    id: `draft-${Date.now()}`,
    jobId: jobId,
    job: job,
    coverLetter: coverLetter,
    commonAnswers: commonAnswers,
    matchScore: matchScore,
    skillMatches: skillMatches,
    customNotes: customNotes,
    createdAt: new Date().toISOString(),
    status: 'draft'
  };

  return draft;
}

/**
 * Analyze skill matches between job and resume
 */
function analyzeSkillMatches(job, resume) {
  const resumeSkills = [
    ...(resume.skills?.technical || []),
  ].map(s => s.toLowerCase());

  const requirements = job.requirements || [];
  const matches = [];

  for (const req of requirements) {
    const reqLower = req.toLowerCase();
    const matchedSkill = resumeSkills.find(skill =>
      reqLower.includes(skill) || skill.includes(reqLower.split(' ')[0])
    );

    matches.push({
      requirement: req,
      matched: !!matchedSkill,
      skill: matchedSkill || null
    });
  }

  return matches;
}

/**
 * Save a draft application
 */
async function saveApplication(draft, status = 'draft') {
  const apps = await loadApplications();

  const application = {
    id: `app-${Date.now()}`,
    jobId: draft.jobId,
    company: draft.job.company,
    position: draft.job.title,
    platform: draft.job.platform || 'unknown',
    url: draft.job.url,
    draftId: draft.id,
    coverLetter: draft.coverLetter,
    status: status,
    appliedDate: status === 'submitted' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    notes: '',
    nextAction: status === 'submitted' ? 'Follow up in 1 week' : 'Review and submit'
  };

  apps.applications.push(application);
  await saveApplications(apps);

  return application;
}

/**
 * Set up a job alert
 */
async function setJobAlert({
  keywords,
  location = 'Indonesia',
  experience = 'any',
  frequency = 'daily'
}) {
  const alerts = await loadAlerts();

  const alert = {
    id: `alert-${Date.now()}`,
    keywords: keywords,
    location: location,
    experience: experience,
    frequency: frequency,
    createdAt: new Date().toISOString(),
    lastRun: null,
    enabled: true
  };

  alerts.alerts.push(alert);
  await saveAlerts(alerts);

  return alert;
}

/**
 * Get all job alerts
 */
async function getJobAlerts() {
  const alerts = await loadAlerts();
  return alerts.alerts.filter(a => a.enabled);
}

/**
 * List all applications
 */
async function listApplications(status = 'all') {
  const apps = await loadApplications();

  if (status === 'all') {
    return apps.applications;
  }

  return apps.applications.filter(a => a.status === status);
}

/**
 * Update application status
 */
async function updateApplicationStatus(appId, status, notes = null) {
  const apps = await loadApplications();
  const app = apps.applications.find(a => a.id === appId);

  if (!app) {
    throw new Error('APPLICATION_NOT_FOUND');
  }

  app.status = status;
  app.lastUpdate = new Date().toISOString();

  if (notes) {
    app.notes = notes;
  }

  if (status === 'submitted' && !app.appliedDate) {
    app.appliedDate = new Date().toISOString();
  }

  await saveApplications(apps);
  return app;
}

module.exports = {
  loadResume,
  saveResume,
  searchJobs,
  getJobDetails,
  draftApplication,
  saveApplication,
  setJobAlert,
  getJobAlerts,
  listApplications,
  updateApplicationStatus,
  calculateMatchScore
};
