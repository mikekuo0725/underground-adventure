const ALLOWED_SUFFIXES = ['.underground-adventure.pages.dev'];
const ALLOWED_ORIGINS = [
  'https://underground-adventure.pages.dev',
  'https://mike-underground-adventure.web.app',
];
const MAX_SCORE = 60000;
const MAX_DEPTH = 520;
const RATE_LIMIT_SECONDS = 10;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOWED_SUFFIXES.some((suf) => origin.endsWith(suf))) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin, { allowWrite } = {}) {
  const headers = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (allowWrite) {
    if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

function json(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

async function hashIp(ip) {
  const enc = new TextEncoder().encode('underground-adventure-salt:' + ip);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handleGetScores(env, origin) {
  const { results } = await env.DB.prepare(
    'SELECT name, score, depth, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
  ).all();
  return json({ scores: results }, { headers: corsHeaders(origin) });
}

async function handlePostScore(request, env, origin) {
  if (!isAllowedOrigin(origin)) {
    return json({ error: 'origin not allowed' }, { status: 403, headers: corsHeaders(origin, { allowWrite: true }) });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid json' }, { status: 400, headers: corsHeaders(origin, { allowWrite: true }) });
  }
  const name = String(body.name || '').toUpperCase();
  const score = Math.floor(Number(body.score));
  const depth = Math.floor(Number(body.depth));

  if (!/^[A-Z]{3}$/.test(name)) {
    return json({ error: 'name must be 3 letters A-Z' }, { status: 400, headers: corsHeaders(origin, { allowWrite: true }) });
  }
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: 'score out of range' }, { status: 400, headers: corsHeaders(origin, { allowWrite: true }) });
  }
  if (!Number.isFinite(depth) || depth < 0 || depth > MAX_DEPTH) {
    return json({ error: 'depth out of range' }, { status: 400, headers: corsHeaders(origin, { allowWrite: true }) });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashIp(ip);
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - RATE_LIMIT_SECONDS;
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM scores WHERE ip_hash = ? AND created_at > ?'
  ).bind(ipHash, cutoff).first();
  if (recent && recent.c > 0) {
    return json({ error: 'too many submissions, slow down' }, { status: 429, headers: corsHeaders(origin, { allowWrite: true }) });
  }

  await env.DB.prepare(
    'INSERT INTO scores (name, score, depth, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, score, depth, ipHash, now).run();

  const { results } = await env.DB.prepare(
    'SELECT name, score, depth, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
  ).all();
  const rank = results.findIndex((r) => r.name === name && r.score === score && r.depth === depth);
  return json({ scores: results, rank: rank >= 0 ? rank + 1 : null }, { headers: corsHeaders(origin, { allowWrite: true }) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin, { allowWrite: true }) });
    }

    if (url.pathname === '/api/scores' && request.method === 'GET') {
      return handleGetScores(env, origin);
    }
    if (url.pathname === '/api/scores' && request.method === 'POST') {
      return handlePostScore(request, env, origin);
    }
    return json({ error: 'not found' }, { status: 404, headers: corsHeaders(origin) });
  },
};
