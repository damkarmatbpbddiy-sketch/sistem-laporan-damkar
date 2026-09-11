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

test('refresh endpoint issues a new access token', async () => {
  const server = await startServer();
  try {
    const registerResponse = await requestJson(server, 'POST', '/auth/register', {
      name: 'Refresh Tester',
      email: 'refresh.tester@example.com',
      password: 'password123',
    });

    assert.equal(registerResponse.statusCode, 201);

    const loginResponse = await requestJson(server, 'POST', '/auth/login', {
      email: 'refresh.tester@example.com',
      password: 'password123',
    });

    const loginPayload = JSON.parse(loginResponse.body);
    assert.equal(loginResponse.statusCode, 200);
    assert.ok(loginPayload.refreshToken);

    const refreshResponse = await requestJson(server, 'POST', '/auth/refresh', {
      refreshToken: loginPayload.refreshToken,
    });

    const refreshPayload = JSON.parse(refreshResponse.body);
    assert.equal(refreshResponse.statusCode, 200);
    assert.ok(refreshPayload.token);
  } finally {
    server.close();
  }
});
