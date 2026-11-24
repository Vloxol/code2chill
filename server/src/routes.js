import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { content } from './content.js';
import { isDbReady } from './db.js';
import { Crew, Port, Project, JoinRequest } from './models.js';

export const api = Router();

const memoryJoins = [];

const clean = ({ _id, __v, ...rest }) => rest;

async function load(Model, key) {
  if (!isDbReady()) return content[key];
  const docs = await Model.find().sort({ order: 1 }).lean();
  return docs.length ? docs.map(clean) : content[key];
}

api.get('/health', (_req, res) => {
  res.json({ ok: true, db: isDbReady() ? 'mongodb' : 'memory' });
});

api.get('/crew', async (_req, res) => res.json(await load(Crew, 'crew')));
api.get('/ports', async (_req, res) => res.json(await load(Port, 'ports')));
api.get('/projects', async (_req, res) => res.json(await load(Project, 'projects')));

// One request for the whole page.
api.get('/content', async (_req, res) => {
  const [crew, ports, projects] = await Promise.all([
    load(Crew, 'crew'),
    load(Port, 'ports'),
    load(Project, 'projects'),
  ]);
  res.json({ club: content.club, charter: content.charter, crew, ports, projects });
});

const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-ups from this connection. Try again in an hour.' },
});

api.post('/join', joinLimiter, async (req, res) => {
  const { name = '', email = '', year = '', branch = '', message = '' } = req.body ?? {};
  const errors = {};
  if (String(name).trim().length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) errors.email = 'Enter a valid email address.';
  if (String(message).length > 600) errors.message = 'Keep it under 600 characters.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Check the highlighted fields.', errors });
  }

  const doc = {
    name: String(name).trim().slice(0, 80),
    email: String(email).trim().toLowerCase().slice(0, 120),
    year: String(year).trim().slice(0, 20),
    branch: String(branch).trim().slice(0, 60),
    message: String(message).trim().slice(0, 600),
  };

  if (isDbReady()) {
    await JoinRequest.create(doc);
    return res.status(201).json({ ok: true, stored: 'mongodb' });
  }
  memoryJoins.push({ ...doc, createdAt: new Date() });
  console.log(`[join] stored in memory only (no database): ${doc.email}`);
  res.status(201).json({ ok: true, stored: 'memory' });
});
