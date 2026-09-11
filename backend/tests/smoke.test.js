const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const { shouldSkipMigrationError } = require('../src/utils/migrationErrorUtils');

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve(server);
    });
  });
}

function request(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', reject);
  });
}

test('root endpoint returns API info', async () => {
  const server = await startServer();
  try {
    const response = await request(server, '/');
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.equal(payload.name, 'Sistem Laporan Damkar API');
  } finally {
    server.close();
  }
});

test('docs endpoint is available', async () => {
  const server = await startServer();
  try {
    const response = await request(server, '/docs');
    assert.equal(response.statusCode, 200);
  } finally {
    server.close();
  }
});

test('duplicate column migration errors are skipped', () => {
  const err = {
    errno: 1060,
    sqlMessage: "Duplicate column name 'role'",
  };

  assert.equal(shouldSkipMigrationError(err), true);
});
