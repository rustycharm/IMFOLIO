import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// For using with serverless environments like Neon database
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use a full configuration with max pool size for better performance and connection handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients the pool should contain
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Maximum time to wait for a connection
  // Add retry logic to handle temporary connection failures
  retryStrategy: {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000
  }
});

// Configure robust connection event handlers
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Log more details for debugging connection issues
  console.error(`Error details: ${err.message}, code: ${err.code}`);
  
  // Don't crash the application on connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection error occurred - attempting recovery');
    // The pool will automatically attempt to reconnect
  }
});

pool.on('connect', () => {
  console.log(`Connected to PostgreSQL database (${process.env.NODE_ENV} environment)`);
});

// Only log connection pool events in development environment
if (process.env.NODE_ENV !== 'production') {
  pool.on('acquire', () => {
    console.debug('Database client acquired from pool');
  });

  pool.on('remove', () => {
    console.debug('Database client removed from pool');
  });
} else {
  // In production, only log connection pool metrics periodically
  let acquireCount = 0;
  let removeCount = 0;
  
  pool.on('acquire', () => { acquireCount++; });
  pool.on('remove', () => { removeCount++; });
  
  // Log connection pool stats every 5 minutes in production
  setInterval(() => {
    console.log(`Database pool stats - Acquired: ${acquireCount}, Removed: ${removeCount}`);
    acquireCount = 0;
    removeCount = 0;
  }, 5 * 60 * 1000);
}

// Add health check function
export const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return { connected: true, timestamp: result.rows[0].now };
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { connected: false, error: error.message };
  }
};

// Export the drizzle instance with our schema
export const db = drizzle(pool, { schema });