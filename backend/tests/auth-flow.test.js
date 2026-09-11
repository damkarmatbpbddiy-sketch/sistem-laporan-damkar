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

function requestJson(server, method, path, body, token) {
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

test('register endpoint returns 201 for valid user', async () => {
  const server = await startServer();
  try {
    const response = await requestJson(server, 'POST', '/auth/register', {
      name: 'Api Tester',
      email: 'apitester@example.com',
      password: 'password123',
    });

    assert.equal(response.statusCode, 201);
    const payload = JSON.parse(response.body);
    assert.equal(payload.success, true);
    assert.ok(payload.user);
  } finally {
    server.close();
  }
});

test('admin login and password change work', async () => {
  const server = await startServer();
  try {
    const adminEmail = 'admin-login@example.com';
    const adminPassword = 'admin123';

    const registerResponse = await requestJson(server, 'POST', '/auth/register-admin', {
      name: 'Admin Login',
      email: adminEmail,
      password: adminPassword,
    });

    assert.equal(registerResponse.statusCode, 201);

    const loginResponse = await requestJson(server, 'POST', '/auth/admin/login', {
      identifier: adminEmail,
      password: adminPassword,
    });

    assert.equal(loginResponse.statusCode, 200);
    const loginPayload = JSON.parse(loginResponse.body);
    assert.equal(loginPayload.success, true);
    assert.equal(loginPayload.user.role, 'admin');
    assert.ok(loginPayload.token);

    const changePasswordResponse = await requestJson(
      server,
      'POST',
      '/auth/change-password',
      {
        currentPassword: adminPassword,
        newPassword: 'newAdmin123',
      },
      loginPayload.token
    );

    assert.equal(changePasswordResponse.statusCode, 200);
    const changePayload = JSON.parse(changePasswordResponse.body);
    assert.equal(changePayload.success, true);
  } finally {
    server.close();
  }
});
