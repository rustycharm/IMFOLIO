
/**
 * IMFOLIO Server Scripts Index
 * 
 * This file serves as documentation for all scripts in the server folder,
 * making it easier to understand what each script does and whether it's
 * currently in active use.
 */

export const scriptIndex = {
  // Core application files
  'index.ts': {
    purpose: 'Main server entry point that sets up Express, middleware, and starts the server',
    status: 'active',
    dependencies: ['routes.ts', 'vite.ts', 'db.ts']
  },
  'routes.ts': {
    purpose: 'Defines all API routes and connects them to handlers',
    status: 'active',
    dependencies: ['auth.ts', 'storage.ts', 'admin.ts', 'portfolio.ts']
  },
  'db.ts': {
    purpose: 'Database connection and query utilities',
    status: 'active',
    dependencies: []
  },
  'vite.ts': {
    purpose: 'Vite integration for development environment',
    status: 'active',
    dependencies: []
  },
  
  // Core functionality modules
  'auth.ts': {
    purpose: 'Authentication logic for user registration, login, and session management',
    status: 'active',
    dependencies: ['db.ts']
  },
  'storage.ts': {
    purpose: 'Core storage interface for photos and other application data',
    status: 'active',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  'objectStorage.ts': {
    purpose: 'Interface to Replit Object Storage for file operations',
    status: 'active',
    dependencies: []
  },
  'portfolio.ts': {
    purpose: 'Handles portfolio page data and photographer profiles',
    status: 'active',
    dependencies: ['db.ts', 'storage.ts']
  },
  'admin.ts': {
    purpose: 'Admin dashboard functionality and moderation tools',
    status: 'active',
    dependencies: ['db.ts', 'storage.ts']
  },
  'user-profile.ts': {
    purpose: 'User profile management including profile images',
    status: 'active',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  'hero-image-manager.ts': {
    purpose: 'Manages hero images for the site homepage and user portfolios',
    status: 'active',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  
  // Storage management and monitoring
  'storage-cleanup.ts': {
    purpose: 'Advanced storage cleanup and audit system',
    status: 'active',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  'storage-tracking.ts': {
    purpose: 'Tracks storage usage metrics over time',
    status: 'active',
    dependencies: ['db.ts']
  },
  'simple-storage-check.ts': {
    purpose: 'Utility for checking storage usage estimates',
    status: 'active',
    dependencies: ['objectStorage.ts']
  },
  
  // Utilities and monitoring
  'domain-monitor.ts': {
    purpose: 'Monitors and logs custom domain access',
    status: 'active',
    dependencies: []
  },
  'debug-storage.ts': {
    purpose: 'Debugging utility for storage issues',
    status: 'active',
    dependencies: ['objectStorage.ts']
  },
  
  // Migration scripts (one-time use)
  'migration.ts': {
    purpose: 'Database migration utility',
    status: 'utility',
    dependencies: ['db.ts']
  },
  'seed.ts': {
    purpose: 'Seeds database with initial data',
    status: 'utility',
    dependencies: ['db.ts']
  },
  'create-admin.ts': {
    purpose: 'Creates admin user',
    status: 'utility',
    dependencies: ['db.ts']
  },
  'add-hero-images.ts': {
    purpose: 'Adds default hero images to storage',
    status: 'utility',
    dependencies: ['objectStorage.ts', 'db.ts']
  },
  'check-hero-images.ts': {
    purpose: 'Verifies hero images in database and storage',
    status: 'utility',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  'complete-hero-migration.ts': {
    purpose: 'Completes hero image migration from file system to object storage',
    status: 'utility',
    dependencies: ['db.ts', 'objectStorage.ts']
  },
  
  // Integrations
  'appleService.ts': {
    purpose: 'Apple Photos integration service',
    status: 'planned',
    dependencies: []
  },
  'image-proxy.ts': {
    purpose: 'Proxies and caches external images',
    status: 'utility',
    dependencies: []
  },
  
  // Migrations subfolder
  'migrations/create-hero-images.ts': {
    purpose: 'Migration to create hero_images table',
    status: 'migration',
    dependencies: ['db.ts']
  },
  'migrations/add-default-to-hero-images.ts': {
    purpose: 'Migration to add isDefault field to hero_images table',
    status: 'migration',
    dependencies: ['db.ts']
  },
  
  // Database utilities
  'reset-db.ts': {
    purpose: 'Utility to reset database tables',
    status: 'utility',
    dependencies: ['db.ts']
  }
};

// Script categories for better organization
export const scriptCategories = {
  core: [
    'index.ts',
    'routes.ts',
    'db.ts',
    'vite.ts',
    'auth.ts',
    'storage.ts',
    'objectStorage.ts',
    'admin.ts',
    'portfolio.ts',
    'user-profile.ts'
  ],
  monitoring: [
    'storage-cleanup.ts',
    'storage-tracking.ts',
    'simple-storage-check.ts',
    'domain-monitor.ts'
  ],
  utilities: [
    'debug-storage.ts',
    'image-proxy.ts',
    'hero-image-manager.ts'
  ],
  migrations: [
    'migration.ts',
    'migrations/create-hero-images.ts',
    'migrations/add-default-to-hero-images.ts'
  ],
  setup: [
    'seed.ts',
    'create-admin.ts',
    'add-hero-images.ts',
    'complete-hero-migration.ts',
    'check-hero-images.ts',
    'reset-db.ts'
  ],
  integrations: [
    'appleService.ts'
  ]
};

/**
 * Returns information about a specific script
 */
export function getScriptInfo(scriptName: string) {
  return scriptIndex[scriptName] || {
    purpose: 'Unknown script',
    status: 'unknown',
    dependencies: []
  };
}

/**
 * Lists all active scripts by category
 */
export function listActiveScripts() {
  const active: Record<string, string[]> = {};
  
  Object.entries(scriptCategories).forEach(([category, scripts]) => {
    active[category] = scripts.filter(script => 
      scriptIndex[script]?.status === 'active'
    );
  });
  
  return active;
}

// If this script is run directly, print script information
if (import.meta.url.endsWith(process.argv[1])) {
  console.log('IMFOLIO Server Scripts Index');
  console.log('===========================\n');
  
  const activeScripts = listActiveScripts();
  
  console.log('Active scripts by category:\n');
  Object.entries(activeScripts).forEach(([category, scripts]) => {
    console.log(`${category.toUpperCase()} (${scripts.length}):`);
    scripts.forEach(script => {
      const info = scriptIndex[script];
      console.log(`  - ${script}: ${info.purpose}`);
    });
    console.log('');
  });
  
  console.log('Utility and one-time scripts:');
  Object.entries(scriptIndex)
    .filter(([_, info]) => info.status === 'utility' || info.status === 'migration')
    .forEach(([script, info]) => {
      console.log(`  - ${script}: ${info.purpose} (${info.status})`);
    });
}
