import type { Request, Response, NextFunction } from "express";

/**
 * Basic in-memory rate limiter for upload endpoints.
 * Configurable via environment variables.
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000).unref();

export function uploadRateLimiter(req: Request, res: Response, next: NextFunction) {
  const windowMs = parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || "60000", 10);
  const isDev = process.env.NODE_ENV !== "production";
  const defaultMax = isDev ? 100 : 20; // 20 uploads/min in prod, 100 in dev
  const maxRequests = parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || String(defaultMax), 10);

  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Upload rate limit exceeded. Please wait before attempting another upload.",
      },
    });
  }

  record.count += 1;
  next();
}

/**
 * Production-safe CORS middleware.
 * Dev: allows local origins (localhost, 127.0.0.1).
 * Prod: restricts strictly to configured FRONTEND_URL or explicit origins.
 * Never uses wildcard '*' in production.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const isDev = process.env.NODE_ENV !== "production";

  if (!origin) {
    // Same-origin / direct server requests are allowed
    return next();
  }

  let isAllowed = false;

  if (isDev) {
    // In development, allow localhost or 127.0.0.1 on any port, or configured URL
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const configuredDevUrl = process.env.FRONTEND_URL;
    if (isLocalhost || (configuredDevUrl && origin === configuredDevUrl)) {
      isAllowed = true;
    }
  } else {
    // In production, strictly match FRONTEND_URL or ALLOWED_ORIGINS
    const configuredFrontend = process.env.FRONTEND_URL;
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
      : [];

    if (configuredFrontend && origin === configuredFrontend) {
      isAllowed = true;
    } else if (allowedOrigins.includes(origin)) {
      isAllowed = true;
    }
  }

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(isAllowed ? 204 : 403);
  }

  next();
}

/**
 * OWASP-compliant security headers.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Frame protection against clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Cross-site scripting legacy filter disable (modern browser recommendation)
  res.setHeader("X-XSS-Protection", "0");

  // Prevent caching of sensitive API requests
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
}
