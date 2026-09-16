/**
 * Security Middleware for Damkar Emergency System
 * - HTTP Security Headers (OWASP recommendations)
 * - Anti-Brute-Force & Rate Limiting
 * - Input Sanitization (Stored/Reflected XSS Mitigation)
 */

// 1. Injected Security Headers
const securityHeaders = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Download-Options', 'noopen');
  next();
};

// 2. Anti-Brute-Force / Rate Limiter (In-Memory IP Bucket)
const rateLimitBuckets = new Map();

// Periodic cleanup of expired rate limit buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetTime <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}, 10 * 60 * 1000);

const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 mins default
  const maxRequests = options.max || 100;
  const message = options.message || 'Terlalu banyak permintaan dari IP Anda. Silakan coba lagi nanti.';

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const routeKey = `${options.prefix || 'global'}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitBuckets.get(routeKey);
    if (!bucket || bucket.resetTime <= now) {
      bucket = { count: 1, resetTime: now + windowMs };
      rateLimitBuckets.set(routeKey, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds
      });
    }

    next();
  };
};

// Rate limiter instances for specific sensitive routes
const loginRateLimiter = createRateLimiter({
  prefix: 'auth_login',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts
  message: 'Terlalu banyak percobaan login yang gagal. Silakan tunggu 15 menit sebelum mencoba lagi.'
});

const reportRateLimiter = createRateLimiter({
  prefix: 'public_report',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 submissions per 15 mins
  message: 'Batas pengiriman laporan tercapai dari perangkat ini. Harap tunggu beberapa menit.'
});

// 3. Input Sanitization helper to neutralize HTML script injection
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

const sanitizeInputs = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }
  next();
};

module.exports = {
  securityHeaders,
  createRateLimiter,
  loginRateLimiter,
  reportRateLimiter,
  sanitizeInputs
};
