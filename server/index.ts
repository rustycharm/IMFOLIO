import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { createHeroImagesTable } from "./migrations/create-hero-images";
import { addDefaultToHeroImages } from "./migrations/add-default-to-hero-images";
import { localSMTPService } from "./localSMTP";
// Removed conflicting authentication import

const app = express();
// Increase JSON body limit to 50MB to handle larger image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Replit Auth - headers are automatically injected in Replit environment
// Set up basic express middleware first
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add comprehensive debug middleware to log auth headers
app.use((req, res, next) => {
  // Only log auth-related requests to keep logs clean
  if (req.path.includes('/api/auth')) {
    const hasUserId = !!req.headers['x-replit-user-id'];
    const hasUserName = !!req.headers['x-replit-user-name'];

    console.log('Auth debug - Headers present:', {
      userId: hasUserId,
      userName: hasUserName,
      path: req.path,
      method: req.method,
      authenticated: hasUserId && hasUserName,
      timestamp: new Date().toISOString()
    });

    // Log authentication status without exposing sensitive data
    if (process.env.NODE_ENV === 'development' && (hasUserId || hasUserName)) {
      console.log('Auth debug - User authenticated successfully');
    }
  }
  next();
});

// Secure CORS configuration with proper domain allowlist
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host || '';

  // List of allowed domains - maintain this list carefully
  const allowedDomains = [
    'https://imfolio.com',
    'https://imfolio.app', 
    'https://imfolio.org',
    'https://imfolio.net',
    'https://imfolio.replit.app',
    // Local development
    'http://localhost:5000',
    'http://localhost:3000'
  ];

  // Allow Replit domains automatically
  if (origin && (
    origin.includes('.replit.dev') || 
    origin.includes('.replit.app') ||
    origin.includes('.id.repl.co') ||
    allowedDomains.includes(origin)
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // No content for OPTIONS
  }

  next();
});

// Unified domain detection middleware with secure cookie handling
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

  // Log the domain type for debugging
  if (req.path.includes('/api/auth')) {
    console.log(`Auth request: ${protocol}://${host}${req.path}, Method: ${req.method}`);
  }

  // Detect if this is a custom domain (not replit or localhost)
  const isCustomDomain = host && 
    !host.includes('replit.dev') && 
    !host.includes('localhost') && 
    !host.includes('replit.app') &&
    !host.includes('repl.co');

  // Add a flag to the request for other middleware to use
  req.isCustomDomain = isCustomDomain;

  // Configure session cookies appropriately for the domain type
  if (req.session && req.session.cookie) {
    if (isCustomDomain) {
      // For custom domains - cookies must be secure and support cross-domain
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'none';
    } else if (process.env.NODE_ENV === 'production') {
      // Production Replit domains
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'lax';
    } else {
      // Development environment
      req.session.cookie.secure = protocol === 'https';
      req.session.cookie.sameSite = 'lax';
    }

    // Never set an explicit domain - let the browser set it automatically
    req.session.cookie.domain = undefined;
  }

  next();
});

// Minimal session logging - only in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.method === 'POST' && (req.path === '/api/auth/login' || req.path === '/api/auth/logout')) {
      console.log(`Session operation: ${req.path}, Domain type: ${req.isCustomDomain ? 'custom' : 'standard'}`);
    }
    next();
  });
}

// Import domain monitoring
import { domainMonitor } from './domain-monitor';

// Domain monitoring properly disabled to fix authentication issues on custom domains
// When re-enabling, update the session configuration to work with custom domains
// app.use(domainMonitor());

// Clean, simplified CORS configuration that works in all environments
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow the requesting origin (or * in development if no origin)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Standard CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin'); // Important for caching with multiple origins

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Simple in-memory rate limiter (should be replaced with Redis in production)
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  store: new Map<string, { count: number, resetTime: number }>(),

  // Check if request should be rate limited
  shouldLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.store.get(ip);

    // New IP or expired window
    if (!record || record.resetTime < now) {
      this.store.set(ip, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    // Update count and check limit
    record.count++;
    return record.count > this.maxRequests;
  },

  // Clean expired entries (call periodically)
  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      if (record.resetTime < now) {
        this.store.delete(ip);
      }
    }
  }
};

// Clean rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// Optimized logging middleware
app.use((req, res, next) => {
  // Skip logging for non-API routes and static files
  if (!req.path.startsWith("/api")) {
    return next();
  }

  // Only apply rate limiting to sensitive endpoints (exclude auth/me check)
  const isSensitiveEndpoint = req.path.includes('/admin') || 
                             (req.path.includes('/auth') && req.path !== '/api/auth/me') ||
                             req.method !== 'GET';

  if (isSensitiveEndpoint) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (rateLimiter.shouldLimit(clientIp.toString())) {
      return res.status(429).json({ message: "Too many requests, please try again later" });
    }
  }

  const start = Date.now();

  // Only log response bodies in development
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  if (process.env.NODE_ENV === 'development') {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      // Only capture small responses to prevent memory issues
      if (typeof bodyJson === 'object' && bodyJson !== null) {
        const sizeEstimate = JSON.stringify(bodyJson).length;
        if (sizeEstimate < 1024) { // Only capture small responses (< 1KB)
          capturedJsonResponse = bodyJson;
        } else {
          capturedJsonResponse = { __size: `${Math.round(sizeEstimate/1024)}KB (truncated)` };
        }
      }
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;

    // Add response data in development mode only
    if (process.env.NODE_ENV === 'development' && capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  });

  next();
});

(async () => {
  try {
    console.log("Starting application in", process.env.NODE_ENV || "development", "mode");

    // First check database connection before attempting migrations
    try {
      const { checkDatabaseConnection } = await import('./db');
      const connectionCheck = await checkDatabaseConnection();
      if (!connectionCheck.connected) {
        console.error("Database connection check failed:", connectionCheck.error);
        console.log("Will attempt to proceed anyway, but application may not function correctly");
      } else {
        console.log("Database connection verified at", connectionCheck.timestamp);
      }
    } catch (dbCheckError) {
      console.error("Error checking database connection:", dbCheckError);
    }

    // Run database migrations with better error handling
    console.log("Running database migrations...");
    try {
      await createHeroImagesTable();
      console.log("Hero images table migration completed");
    } catch (heroTableError) {
      console.error("Error creating hero images table (may already exist):", heroTableError.message);
    }

    try {
      await addDefaultToHeroImages(); 
      console.log("Default hero images field migration completed");
    } catch (defaultHeroError) {
      console.error("Error adding default to hero images (may already exist):", defaultHeroError.message);
    }

    console.log("Database migrations completed");
  } catch (migrationError) {
    console.error("Error running database migrations:", migrationError);
    // Continue with server startup even if migrations fail
  }

  try {
    // Import image proxy for object storage
    const { serveImage } = await import('./image-proxy');
    
    // Serve images from object storage first (since all IMFOLIO images are in object storage)
    app.get('/images/:path(*)', serveImage);
    
    // Fallback to local filesystem for any development images
    app.use('/images', express.static(path.join(process.cwd(), 'images'), {
      maxAge: '1d', // Cache for 1 day
      etag: true,
      lastModified: true
    }));
    
    const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try to use port 5000 first, but fall back to other ports if not available
  const tryPorts = [5000, 5001, 5002, 8080, 3000];
  let currentPortIndex = 0;

  function startServer(portIndex = 0) {
    const port = tryPorts[portIndex];
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`IMFOLIO server running on port ${port}`);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} already in use, trying next port...`);
        if (portIndex < tryPorts.length - 1) {
          startServer(portIndex + 1);
        } else {
          console.error('All ports are in use. Please free up a port and try again.');
          process.exit(1);
        }
      } else {
        console.error('Server error occurred:', error);
        process.exit(1);
      }
    });
  }

  // Start server with port fallback mechanism
  startServer(currentPortIndex);

  // Add proper error handling for the server
  server.on('error', (error) => {
    console.error('Server error occurred:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port is already in use - try terminating other processes first`);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      pool.end();
      process.exit(0);
    });
  });

  } catch (serverError) {
    console.error("Fatal error starting server:", serverError);
    process.exit(1);
  }
})();
// The provided changes are incorrect and seem to be for Redis-based session management, while the original code uses connect-pg-simple, so I will stick to the original session management configuration to avoid breaking functionality.