/**
 * Cross-Browser Compatibility Testing Framework
 * Ensures IMFOLIO.COM works flawlessly across all browsers and environments
 */

export interface CompatibilityTestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface BrowserInfo {
  userAgent: string;
  browser: string;
  version: string;
  platform: string;
  mobile: boolean;
  cookies: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  webgl: boolean;
  webp: boolean;
}

export class CompatibilityTester {
  private results: CompatibilityTestResult[] = [];

  // Get comprehensive browser information
  getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    const browser = this.detectBrowser(ua);
    const version = this.detectVersion(ua);
    
    return {
      userAgent: ua,
      browser,
      version,
      platform: navigator.platform,
      mobile: /Mobile|Android|iPhone|iPad/.test(ua),
      cookies: navigator.cookieEnabled,
      localStorage: this.testLocalStorage(),
      sessionStorage: this.testSessionStorage(),
      webgl: this.testWebGL(),
      webp: this.testWebP()
    };
  }

  private detectBrowser(ua: string): string {
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private detectVersion(ua: string): string {
    const patterns = [
      /Chrome\/([0-9.]+)/,
      /Firefox\/([0-9.]+)/,
      /Safari\/([0-9.]+)/,
      /Edg\/([0-9.]+)/,
      /Opera\/([0-9.]+)/
    ];
    
    for (const pattern of patterns) {
      const match = ua.match(pattern);
      if (match) return match[1];
    }
    return 'Unknown';
  }

  private testLocalStorage(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testSessionStorage(): boolean {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!context;
    } catch {
      return false;
    }
  }

  private testWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }

  // Test core IMFOLIO functionality
  async runCompatibilityTests(): Promise<CompatibilityTestResult[]> {
    this.results = [];

    // Browser support tests
    await this.testBrowserSupport();
    
    // API connectivity tests
    await this.testAPIConnectivity();
    
    // Image loading tests
    await this.testImageLoading();
    
    // Authentication tests
    await this.testAuthentication();
    
    // Navigation tests
    await this.testNavigation();
    
    // Performance tests
    await this.testPerformance();

    return this.results;
  }

  private async testBrowserSupport(): Promise<void> {
    const info = this.getBrowserInfo();
    
    this.addResult({
      test: 'Browser Support',
      passed: info.browser !== 'Unknown',
      message: `Detected: ${info.browser} ${info.version} on ${info.platform}`,
      details: info
    });

    this.addResult({
      test: 'Cookies Support',
      passed: info.cookies,
      message: info.cookies ? 'Cookies enabled' : 'Cookies disabled - authentication may fail'
    });

    this.addResult({
      test: 'Local Storage',
      passed: info.localStorage,
      message: info.localStorage ? 'Local storage available' : 'Local storage unavailable'
    });

    this.addResult({
      test: 'WebP Support',
      passed: info.webp,
      message: info.webp ? 'WebP images supported' : 'WebP not supported, using fallback formats'
    });
  }

  private async testAPIConnectivity(): Promise<void> {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
      });
      
      this.addResult({
        test: 'API Connectivity',
        passed: response.status === 200 || response.status === 401,
        message: `API reachable (${response.status})`,
        details: { status: response.status, statusText: response.statusText }
      });
    } catch (error) {
      this.addResult({
        test: 'API Connectivity',
        passed: false,
        message: `API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testImageLoading(): Promise<void> {
    try {
      // Test hero image loading
      const heroResponse = await fetch('/api/hero-images/default');
      const heroData = await heroResponse.json();
      
      if (heroData?.url) {
        const imageLoadTest = await this.testImageURL(heroData.url);
        this.addResult({
          test: 'Hero Image Loading',
          passed: imageLoadTest.success,
          message: imageLoadTest.message,
          details: { url: heroData.url, ...imageLoadTest.details }
        });
      } else {
        this.addResult({
          test: 'Hero Image Loading',
          passed: false,
          message: 'No hero image URL found in API response',
          details: heroData
        });
      }
    } catch (error) {
      this.addResult({
        test: 'Hero Image Loading',
        passed: false,
        message: `Hero image test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private testImageURL(url: string): Promise<{ success: boolean; message: string; details: any }> {
    return new Promise((resolve) => {
      const img = new Image();
      const startTime = Date.now();
      
      img.onload = () => {
        const loadTime = Date.now() - startTime;
        resolve({
          success: true,
          message: `Image loaded successfully in ${loadTime}ms`,
          details: { loadTime, width: img.width, height: img.height }
        });
      };
      
      img.onerror = () => {
        resolve({
          success: false,
          message: 'Image failed to load',
          details: { url }
        });
      };
      
      // Set timeout for slow loading images
      setTimeout(() => {
        resolve({
          success: false,
          message: 'Image load timeout (5s)',
          details: { url, timeout: true }
        });
      }, 5000);
      
      img.src = url;
    });
  }

  private async testAuthentication(): Promise<void> {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
      });
      
      this.addResult({
        test: 'Authentication Flow',
        passed: true,
        message: response.status === 200 ? 'User authenticated' : 'User not authenticated (normal)',
        details: { authenticated: response.status === 200 }
      });
    } catch (error) {
      this.addResult({
        test: 'Authentication Flow',
        passed: false,
        message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  private async testNavigation(): Promise<void> {
    const currentPath = window.location.pathname;
    
    this.addResult({
      test: 'Navigation State',
      passed: true,
      message: `Current path: ${currentPath}`,
      details: {
        pathname: currentPath,
        search: window.location.search,
        hash: window.location.hash,
        host: window.location.host
      }
    });

    // Test if this is custom domain
    const isCustomDomain = !window.location.host.includes('replit.dev') && 
                          !window.location.host.includes('localhost');
    
    this.addResult({
      test: 'Domain Detection',
      passed: true,
      message: isCustomDomain ? 'Running on custom domain' : 'Running on development domain',
      details: { 
        host: window.location.host,
        isCustomDomain,
        protocol: window.location.protocol
      }
    });
  }

  private async testPerformance(): Promise<void> {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
    
    this.addResult({
      test: 'Page Load Performance',
      passed: loadTime < 5000, // 5 second threshold
      message: `Page loaded in ${loadTime}ms (DOM ready: ${domReady}ms)`,
      details: {
        loadTime,
        domReady,
        threshold: 5000
      }
    });

    // Test memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.addResult({
        test: 'Memory Usage',
        passed: memory.usedJSHeapSize < 50 * 1024 * 1024, // 50MB threshold
        message: `Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        details: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  private addResult(result: Omit<CompatibilityTestResult, 'timestamp'>): void {
    this.results.push({
      ...result,
      timestamp: new Date()
    });
  }

  // Generate compatibility report
  generateReport(): string {
    const info = this.getBrowserInfo();
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    let report = `IMFOLIO.COM Compatibility Report\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Browser: ${info.browser} ${info.version} on ${info.platform}\n`;
    report += `Mobile: ${info.mobile ? 'Yes' : 'No'}\n`;
    report += `Score: ${passed}/${total} tests passed\n\n`;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `${status} ${result.test}: ${result.message}\n`;
      if (!result.passed && result.details) {
        report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
      }
    });
    
    return report;
  }

  // Save report to local storage for debugging
  saveReport(): void {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        browserInfo: this.getBrowserInfo(),
        results: this.results
      };
      localStorage.setItem('imfolio-compatibility-report', JSON.stringify(report));
    } catch (error) {
      console.warn('Could not save compatibility report:', error);
    }
  }
}

// Global instance for easy access
export const compatibilityTester = new CompatibilityTester();

// Auto-run tests on page load in development
if (import.meta.env.DEV) {
  window.addEventListener('load', async () => {
    console.log('🔍 Running IMFOLIO compatibility tests...');
    await compatibilityTester.runCompatibilityTests();
    console.log('📊 Compatibility Report:\n' + compatibilityTester.generateReport());
    compatibilityTester.saveReport();
  });
}