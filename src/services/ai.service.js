import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';

// Cache for selected model id so we call ListModels only once per process.
let SELECTED_MODEL_ID = null;

async function resolveModelId() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (SELECTED_MODEL_ID) return SELECTED_MODEL_ID;
  const genAI = new GoogleGenerativeAI(key);
  try {
    const list = await genAI.listModels();
    // list may be an array or object depending on client; normalize
    const models = Array.isArray(list) ? list : (list?.models || []);
    // prefer any model with 'gemini' in the id/name that supports generateContent
    let candidate = null;
    for (const m of models) {
      const id = m.name || m.model || m.id || '';
      const methods = m.supportedMethods || m.methods || m.supported || [];
      const supports = Array.isArray(methods) ? methods.map(x=>String(x).toLowerCase()) : [];
      if (id.toLowerCase().includes('gemini') && supports.some(s => s.includes('generate'))) { candidate = id; break; }
    }
    if (!candidate) {
      // fallback: pick first model that supports generateContent or any model id
      for (const m of models) {
        const id = m.name || m.model || m.id || '';
        const methods = m.supportedMethods || m.methods || m.supported || [];
        const supports = Array.isArray(methods) ? methods.map(x=>String(x).toLowerCase()) : [];
        if (supports.some(s => s.includes('generate'))) { candidate = id; break; }
      }
      if (!candidate && models.length) candidate = models[0].name || models[0].model || models[0].id;
    }
    if (candidate) SELECTED_MODEL_ID = candidate;
    return SELECTED_MODEL_ID;
  } catch (e) {
    console.error('ListModels failed:', e && e.message ? e.message : e);
    return null;
  }
}

async function getGenerativeModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  // Try to resolve model id dynamically first
  const modelId = await resolveModelId();
  if (modelId) {
    try {
      return genAI.getGenerativeModel({ model: modelId });
    } catch (e) {
      console.error('Failed to get resolved model:', e.message);
    }
  }
  // Fallback to hardcoded models
  const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-pro', 'gemini-1.5-flash-001', 'gemini-1.5-pro-001'];
  for (const modelName of modelsToTry) {
    try {
      return genAI.getGenerativeModel({ model: modelName });
    } catch (e) {
      console.error(`Failed to get model ${modelName}:`, e.message);
    }
  }
  return null;
}

// Attempt a quick model connectivity test. Returns boolean.
export async function isModelAvailableAsync(timeoutMs = 3000) {
  const model = await getGenerativeModel();
  if (!model) return false;
  const prompt = 'Ping: respond with OK';
  const p = (async () => {
    try {
      const resp = await model.generateContent(prompt);
      const txt = (resp && resp.response && typeof resp.response.text === 'function') ? resp.response.text() : (resp?.text || '');
      if (typeof txt === 'string' && txt.toLowerCase().includes('ok')) return true;
      // if we got any response assume available
      if (txt) return true;
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Model connectivity test failed:', e && e.message ? e.message : e);
      return false;
    }
  })();
  const timer = new Promise((res) => setTimeout(() => res(false), timeoutMs));
  return Promise.race([p, timer]);
}

// Backwards-compatible synchronous check (presence of API key)
export function isModelAvailable() {
  try { return !!getModel(); } catch (e) { return false; }
}

async function extractTextFromFile(filePath, mimeType) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return '';
  try {
    if (mimeType?.includes('pdf') || abs.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(fs.readFileSync(abs));
      return data.text || '';
    }
    if (mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(abs)) {
      const { data: { text } } = await Tesseract.recognize(abs, 'eng');
      return text || '';
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to extract text from file', abs, e.message);
  }
  return '';
}

export async function extractSkillsFromCertificates(certificates) {
  const model = await getGenerativeModel();
  const chunks = [];
  for (const cert of certificates) {
    const content = await extractTextFromFile(cert.path, cert.mimeType);
    const safe = content?.trim() ? content.slice(0, 6000) : '';
    chunks.push(`# Certificate: ${cert.originalName}\n${safe}`);
  }
  const corpus = chunks.join('\n\n');
  const prompt = `You are an expert career counselor. Analyze the following extracted certificate texts and infer:
  - skills: array of concise skill names
  - summary: 1-2 sentence skill profile summary
  - jobs: array of 5 job role suggestions
  Return ONLY valid minified JSON like {"skills":[...],"summary":"...","jobs":[...]}.\n\nTEXT:\n${corpus}`;
  try {
    if (!model) throw new Error('No API key, using fallback');
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    const parsed = s !== -1 && e !== -1 ? JSON.parse(raw.substring(s, e + 1)) : JSON.parse(raw || '{}');
    return parsed;
  } catch (_e) {
    return { skills: ['Communication', 'Problem Solving'], summary: 'Baseline skills inferred from certificates.', jobs: ['Intern', 'Junior Engineer', 'Analyst', 'QA', 'Support Engineer'] };
  }
}

export async function generateResumeContent(profile, user) {
  const model = await getGenerativeModel();
  const prompt = `Create resume sections in JSON: objective, skills (array), education, projects (array), experience (array). Use the following user and skills. User: ${JSON.stringify({ name: user.name, course: user.course, branch: user.branch, section: user.section })}. Skills: ${JSON.stringify(profile?.skills || [])}`;
  try {
    if (!model) throw new Error('No API key');
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    return s !== -1 && e !== -1 ? JSON.parse(raw.substring(s, e + 1)) : JSON.parse(raw || '{}');
  } catch (_e) {
    return {
      objective: 'Aspiring engineer seeking opportunities to apply academic knowledge.',
      skills: profile?.skills || ['Communication'],
      education: `${user.course} - ${user.branch}`,
      projects: [{ name: 'Sample Project', description: 'A project showcasing core skills.' }],
      experience: []
    };
  }
}

export async function jobSuggestionsFromSkills(skills) {
  const model = await getGenerativeModel();
  const prompt = `Suggest 5 job roles based on skills: ${skills.join(', ')}. Return JSON array of strings.`;
  try {
    if (!model) throw new Error('No API key');
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    const s = raw.indexOf('[');
    const e = raw.lastIndexOf(']');
    return s !== -1 && e !== -1 ? JSON.parse(raw.substring(s, e + 1)) : JSON.parse(raw || '[]');
  } catch (_e) {
    return ['Intern', 'Junior Developer', 'QA Analyst', 'Support Engineer', 'Data Analyst'];
  }
}

export async function jobRolesWithDetails(skills) {
  const model = await getGenerativeModel();
  const prompt = `You are an expert career advisor. Given the following skills: ${skills.join(', ')}. Provide up to 6 relevant job or internship roles. For each role return an object with keys: title, description (1-2 sentences), and a suggested link where the student can find openings or more information (this can be a general job board or authoritative resource). Return ONLY valid minified JSON like [{"title":"...","description":"...","link":"..."}, ...].`;
  try {
    if (!model) throw new Error('No API key');
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    const s = raw.indexOf('[');
    const e = raw.lastIndexOf(']');
    return s !== -1 && e !== -1 ? JSON.parse(raw.substring(s, e + 1)) : JSON.parse(raw || '[]');
  } catch (_e) {
    return [
      { title: 'Intern', description: 'Entry-level internship to build practical skills.', link: 'https://www.indeed.com' },
      { title: 'Junior Developer', description: 'Assist in software development tasks under mentorship.', link: 'https://www.linkedin.com/jobs' }
    ];
  }
}

export async function chatWithMascot(userContext = {}, message = '') {
  const model = await getGenerativeModel();
  const ctx = JSON.stringify(userContext || {});
  const prompt = `You are MascotBot, a friendly robot assistant for students. Use the provided userContext to personalize answers. Keep responses concise, helpful, and actionable. If the user asks about their skills, certificates, or job suggestions, rely on the supplied context.

CONTEXT: ${ctx}

USER MESSAGE: ${message}

RESPOND in plain text (no JSON).`;
  try {
    if (!model) throw new Error('No API key');
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    return raw;
  } catch (_e) {
    return "Hi! I can't access the AI service right now, but I can tell you to check your uploaded certificates to extract skills or view your profile.";
  }
}

// Parse natural language messages for assignment-related commands.
export async function parseAssignmentCommand(message) {
  const model = await getGenerativeModel();
  const prompt = `You are a parser. Inspect the user's message and determine whether it's an instruction to create an assignment or to query submissions. Return ONLY a minified JSON object with one of the following shapes:
 1) {"action":"create_assignment","title":"...","subject":"...","dueDate":"YYYY-MM-DD","sections":["A","B"],"description":"..."}
 2) {"action":"query_missing","assignmentTitle":"..."}
 3) {"action":null}

Example: "Create assignment: Title=Lab1; Subject=Physics; Due=2025-11-10; Sections=A,B; Description=Complete experiment" -> returns create_assignment JSON.

User message:
"""
${message}
"""
`;
  try {
    if (!model) return { action: null };
    const resp = await model.generateContent(prompt);
    let raw = '';
    if (resp) {
      if (resp.response && typeof resp.response.text === 'function') raw = await resp.response.text();
      else if (typeof resp.text === 'function') raw = await resp.text();
      else raw = resp.response?.text || resp?.text || String(resp);
    }
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s === -1 || e === -1) return { action: null };
    const parsed = JSON.parse(raw.substring(s, e + 1));
    return parsed;
  } catch (e) {
    return { action: null };
  }
}


