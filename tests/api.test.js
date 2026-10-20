import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let appServer;
let baseUrl;
let dataDirectory;
let previousDataFile;

before(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), 'linkforge-api-'));
  previousDataFile = process.env.DATA_FILE;
  process.env.DATA_FILE = path.join(dataDirectory, 'links.json');

  // Import after setting DATA_FILE so the server uses the isolated test store.
  const { createApp } = await import('../server/src/app.js');
  const app = createApp();
  appServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    appServer.once('listening', resolve);
    appServer.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${appServer.address().port}`;
});

after(async () => {
  if (appServer) {
    await new Promise((resolve, reject) => {
      appServer.close((error) => error ? reject(error) : resolve());
    });
  }
  if (previousDataFile === undefined) delete process.env.DATA_FILE;
  else process.env.DATA_FILE = previousDataFile;
  if (dataDirectory) await rm(dataDirectory, { recursive: true, force: true });
});

describe('LinkForge API contract', () => {
  it('reports health, creates a link, redirects, and records clicks', async () => {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: 'ok' });

    const initialResponse = await fetch(`${baseUrl}/api/links`);
    assert.equal(initialResponse.status, 200);
    assert.deepEqual(await initialResponse.json(), { links: [] });

    const createResponse = await fetch(`${baseUrl}/api/links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/path?q=linkforge' }),
    });
    assert.equal(createResponse.status, 201);
    const { link } = await createResponse.json();
    assert.equal(link.originalUrl, 'https://example.com/path?q=linkforge');
    assert.equal(typeof link.code, 'string');
    assert.ok(link.code.length > 0);
    assert.equal(typeof link.shortUrl, 'string');
    assert.equal(Number.isNaN(Date.parse(link.createdAt)), false);
    assert.equal(link.clicks, 0);

    const redirectResponse = await fetch(`${baseUrl}/r/${encodeURIComponent(link.code)}`, {
      redirect: 'manual',
    });
    assert.equal(redirectResponse.status, 302);
    assert.equal(redirectResponse.headers.get('location'), link.originalUrl);

    const listResponse = await fetch(`${baseUrl}/api/links`);
    const { links } = await listResponse.json();
    assert.equal(links.length, 1);
    assert.equal(links[0].code, link.code);
    assert.equal(links[0].clicks, 1);
  });

  it('rejects malformed URL input and unknown short codes', async () => {
    const invalidResponse = await fetch(`${baseUrl}/api/links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'not a URL' }),
    });
    assert.ok(invalidResponse.status >= 400 && invalidResponse.status < 500);

    const unknownResponse = await fetch(`${baseUrl}/r/no-such-linkforge-code`, {
      redirect: 'manual',
    });
    assert.ok(unknownResponse.status >= 400 && unknownResponse.status < 500);
  });

  it('deletes an existing link and returns 404 for a missing link', async () => {
    const createResponse = await fetch(`${baseUrl}/api/links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/delete-me' }),
    });
    assert.equal(createResponse.status, 201);
    const { link } = await createResponse.json();

    const deleteResponse = await fetch(`${baseUrl}/api/links/${encodeURIComponent(link.code)}`, {
      method: 'DELETE',
    });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { link });

    const listResponse = await fetch(`${baseUrl}/api/links`);
    const { links } = await listResponse.json();
    assert.equal(links.some((item) => item.code === link.code), false);

    const missingResponse = await fetch(`${baseUrl}/api/links/${encodeURIComponent(link.code)}`, {
      method: 'DELETE',
    });
    assert.equal(missingResponse.status, 404);
    assert.deepEqual(await missingResponse.json(), { error: 'Short link not found.' });
  });
});
