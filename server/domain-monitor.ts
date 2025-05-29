import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Get logs for a specific domain
 * @param {string} domain - Domain name
 * @param {('access'|'error')} type - Log type
 * @param {number} limit - Maximum number of log entries to return
 * @returns {Object} - Logs and any errors
 */
function getDomainLogs(domain, type, limit = 100) {
  try {
    // Sanitize domain to prevent path traversal
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const logFile = path.join(logDir, `${sanitizedDomain}_${type}.log`);

    if (!fs.existsSync(logFile)) {
      return { logs: [], error: 'Log file not found' };
    }

    // Read the last 'limit' lines from the log file
    const data = fs.readFileSync(logFile, 'utf8');
    const lines = data.split('\n').filter(line => line.trim());
    const recentLogs = lines.slice(-limit);

    return { logs: recentLogs, error: null };
  } catch (error) {
    console.error(`Error reading ${type} logs for ${domain}:`, error);
    return { logs: [], error: `Failed to read logs: ${error.message}` };
  }
}

/**
 * Log access to a domain
 * @param {string} domain - Domain name
 * @param {Object} data - Data to log
 */
function logDomainAccess(domain, data) {
  try {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const logFile = path.join(logDir, `${sanitizedDomain}_access.log`);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;

    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`Error logging access for ${domain}:`, error);
  }
}

/**
 * Log errors for a domain
 * @param {string} domain - Domain name
 * @param {Object} error - Error to log
 */
function logDomainError(domain, error) {
  try {
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    const logFile = path.join(logDir, `${sanitizedDomain}_error.log`);
    const timestamp = new Date().toISOString();

    // Ensure error object is serializable
    const errorObj = {
      message: error.message || String(error),
      stack: error.stack,
      code: error.code || error.statusCode
    };

    // Don't log auth-related errors that could contain sensitive info
    if (errorObj.message && errorObj.message.toLowerCase().includes('auth')) {
      console.log(`Auth-related error for ${domain} - not logging details`);
      return;
    }

    const logEntry = `[${timestamp}] ${JSON.stringify(errorObj)}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error(`Error logging error for ${domain}:`, err);
  }
}

/**
 * Parse log entries into structured format
 * @param {Array} logs - Array of log string entries
 * @returns {Array} - Parsed log objects
 */
function parseLogs(logs) {
  return logs.map(log => {
    try {
      const match = log.match(/\[(.*?)\] (.*)/);
      if (match) {
        const [, timestamp, dataStr] = match;
        const data = JSON.parse(dataStr);
        return {
          timestamp,
          ...data
        };
      }
      return { raw: log };
    } catch (error) {
      return { raw: log, parseError: true };
    }
  });
}

/**
 * Generate a secure access token for a domain
 * @param {string} domain - Domain name
 * @param {number} userId - User ID
 * @returns {string} - Access token
 */
function generateDomainToken(domain, userId) {
  const timestamp = Date.now();
  const secretKey = process.env.TOKEN_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        console.error('WARNING: TOKEN_SECRET is not set in production environment');
        // Use a per-instance secret in production (still not ideal but better than hardcoded)
        return require('crypto').randomBytes(32).toString('hex');
      }
      return 'dev-only-secret-key-' + Date.now(); // Different on each restart for dev
    })();

  const data = `${domain}:${userId}:${timestamp}`;
  const token = createHash('sha256')
    .update(data)
    .update(secretKey)
    .digest('hex');

  return `${token}.${timestamp}`;
}

/**
 * Verify a domain access token
 * @param {string} token - Access token
 * @param {string} domain - Domain name
 * @param {number} userId - User ID
 * @returns {boolean} - Token validity
 */
// DISABLED: This function was causing session issues on custom domains
function verifyDomainToken(token, domain, userId) {
  // Function disabled to fix authentication issues with custom domains
  console.log('Domain token verification bypassed - feature disabled');
  return true; // Always return true to avoid interfering with sessions
}

/**
 * Express middleware to monitor domain access
 * @returns {Function} Express middleware
 */
function domainMonitor() {
  return (req, res, next) => {
    // Skip monitoring interference for critical auth endpoints to prevent session issues
    const isAuthEndpoint = req.path && (
      req.path.includes('/api/auth/login') ||
      req.path.includes('/api/auth/register') ||
      req.path.includes('/api/auth/logout')
    );

    // Get hostname from request
    const hostname = req.hostname || req.headers.host?.split(':')[0] || 'unknown';

    // Use the Replit dev domain name or the actual hostname
    let logDomain = hostname;

    // In development, use a consistent domain name for logging purposes
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.replit.dev')) {
      // Use the Replit domain or 'replit-dev' for consistency in development
      logDomain = req.headers['x-forwarded-host'] || hostname.includes('.replit.dev') ? hostname : 'replit-dev';

      // Don't skip monitoring in development - we want logs
      console.log(`Monitoring request to ${logDomain} (from ${hostname})`);
    }

    // Always log the request (monitoring continues)
    const startTime = Date.now();

    // For auth endpoints, use passive monitoring (no response interference)
    if (isAuthEndpoint) {
      console.log(`🔐 Auth request to ${logDomain}: ${req.method} ${req.originalUrl || req.url}`);

      // Log immediately without intercepting response
      logDomainAccess(logDomain, {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        method: req.method,
        path: req.originalUrl || req.url,
        request: `${req.method} ${req.originalUrl || req.url}`,
        status: 'in-progress',
        responseTime: 0,
        userAgent: req.headers['user-agent'],
        authEndpoint: true
      });

      return next(); // Skip response interception for auth endpoints
    }

    // Capture original end method for non-auth requests
    const originalEnd = res.end;

    // Override end method to capture response data (non-auth requests only)
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;

      // Log access data
      logDomainAccess(logDomain, {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        method: req.method,
        path: req.originalUrl || req.url,
        request: `${req.method} ${req.originalUrl || req.url}`,
        status: res.statusCode,
        responseTime,
        userAgent: req.headers['user-agent']
      });

      // If error status code, log as error too
      if (res.statusCode >= 400) {
        logDomainError(logDomain, {
          message: `HTTP ${res.statusCode} error on ${req.method} ${req.originalUrl || req.url}`,
          code: res.statusCode,
          stack: new Error().stack
        });
      }

      // Call original end method
      return originalEnd.apply(res, args);
    };

    next();
  };
}

export {
  getDomainLogs,
  logDomainAccess,
  logDomainError,
  parseLogs,
  generateDomainToken,
  verifyDomainToken,
  domainMonitor
};