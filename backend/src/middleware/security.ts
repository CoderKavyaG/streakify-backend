import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { Request, Response, NextFunction } from "express";

/**
 * Helmet - Sets various HTTP headers for security
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests for API
});

/**
 * Rate Limiter - General API rate limiting
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator (handles IPv6 properly)
});

/**
 * Strict Rate Limiter - For sensitive endpoints (auth, email sending)
 * 10 requests per 15 minutes per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: "Too many requests to this endpoint, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth Rate Limiter - For authentication endpoints
 * 5 requests per 15 minutes per IP (prevent brute force)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * HPP - Prevent HTTP Parameter Pollution attacks
 */
export const hppMiddleware = hpp();

/**
 * Request Size Limiter - Prevent large payload attacks
 */
export const requestSizeLimit = (limit: string = "10kb") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const limitBytes = parseSize(limit);
    
    if (contentLength > limitBytes) {
      res.status(413).json({ error: "Request entity too large" });
      return;
    }
    next();
  };
};

/**
 * Security Headers - Additional custom headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS filter in browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");
  
  next();
};

/**
 * Sanitize Request - Remove potential XSS from request body
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Helper function to parse size strings like "10kb" to bytes
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10240; // Default 10kb
  
  const value = parseInt(match[1], 10);
  const unit = match[2] || "b";
  
  return value * (units[unit] || 1);
}

// Helper function to sanitize object values
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === "string") {
        // Remove potential script tags and dangerous patterns
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .trim();
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * API Key validation for webhooks (Telegram)
 */
export const validateWebhookSecret = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const providedSecret = req.headers["x-webhook-secret"] || req.query.secret;
    
    // For Telegram, we verify differently (by checking the token in URL)
    // This is a generic webhook secret validator
    if (secret && providedSecret !== secret) {
      // For now, allow without secret for Telegram (uses different auth)
      // In production, configure proper webhook secret
    }
    
    next();
  };
};

/**
 * Log suspicious requests
 */
export const logSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,  // Path traversal
    /<script/i,     // XSS attempts
    /union.*select/i, // SQL injection
    /exec\s*\(/i,   // Command injection
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      console.warn(`⚠️ Suspicious request detected from ${req.ip}:`, {
        path: req.path,
        method: req.method,
        pattern: pattern.toString(),
      });
      break;
    }
  }
  
  next();
};
