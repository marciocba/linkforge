const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { createStorage } = require('./storage');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'links.json');
const CODE_BYTES = 6;

function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function createApp(options = {}) {
  const storage = options.storage || createStorage(options.dataFile || process.env.DATA_FILE || DEFAULT_DATA_FILE);
  const configuredBaseUrl = options.baseUrl || process.env.BASE_URL;
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '16kb' }));

  function getBaseUrl(req) {
    if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host') || 'localhost:3001'}`.replace(/\/+$/, '');
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/links', async (_req, res, next) => {
    try {
      res.json({ links: await storage.list() });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/links', async (req, res, next) => {
    const originalUrl = normalizeHttpUrl(req.body?.url);
    if (!originalUrl) {
      return res.status(400).json({ error: 'Provide a valid HTTP or HTTPS URL.' });
    }

    try {
      let link;
      // Retry the vanishingly unlikely code collision against the persisted set.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = crypto.randomBytes(CODE_BYTES).toString('base64url');
        const exists = (await storage.list()).some((item) => item.code === code);
        if (exists) continue;
        link = {
          code,
          shortUrl: `${getBaseUrl(req)}/r/${code}`,
          originalUrl,
          createdAt: new Date().toISOString(),
          clicks: 0
        };
        await storage.add(link);
        break;
      }
      if (!link) return res.status(503).json({ error: 'Could not allocate a short code. Please retry.' });
      return res.status(201).json({ link });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/links/:code', async (req, res, next) => {
    try {
      const link = await storage.remove(req.params.code);
      if (!link) return res.status(404).json({ error: 'Short link not found.' });
      return res.json({ link });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/r/:code', async (req, res, next) => {
    try {
      const link = await storage.incrementClicks(req.params.code);
      if (!link) return res.status(404).json({ error: 'Short link not found.' });
      return res.redirect(302, link.originalUrl);
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = { createApp, normalizeHttpUrl };
