const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve(server);
    });
  });
}

function requestJson(server, method, path, body) {
  const { port } = server.address();
  const payload = JSON.stringify(body ?? {});

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

test('register rejects invalid email', async () => {
  const server = await startServer();
  try {
    const response = await requestJson(server, 'POST', '/auth/register', {
      name: 'Test User',
      email: 'not-an-email',
      password: 'password123',
    });

    assert.equal(response.statusCode, 400);
    const payload = JSON.parse(response.body);
    assert.equal(payload.success, false);
  } finally {
    server.close();
  }
});

test('create report rejects overly long title', async () => {
  const server = await startServer();
  try {
    const response = await requestJson(server, 'POST', '/reports', {
      title: 'x'.repeat(300),
      description: 'Valid description',
    });

    assert.equal(response.statusCode, 401);
  } finally {
    server.close();
  }
});
