/**
 * NetworkDiscoveryService - Auto-discovery of ESP32 devices on the network
 * Scans common IP ranges and tests for BantayBot devices
 */
class NetworkDiscoveryService {
  constructor() {
    this.isScanning = false;
    this.foundDevices = [];
  }

  /**
   * Scan a specific IP address for BantayBot devices
   */
  async scanIP(ip, timeout = 2000) {
    const tests = [
      { port: 80, endpoint: '/stream', type: 'camera' },
      { port: 81, endpoint: '/status', type: 'main' },
    ];

    const results = await Promise.allSettled(
      tests.map(async ({ port, endpoint, type }) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(`http://${ip}:${port}${endpoint}`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return { ip, port, type, available: true };
          }
        } catch (error) {
          // Silently fail - device not found
        }
        return null;
      })
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  /**
   * Scan a range of IP addresses
   * Example: scanRange('192.168.1', 1, 255)
   */
  async scanRange(baseIP, startHost, endHost, onProgress = null) {
    this.isScanning = true;
    this.foundDevices = [];

    const total = endHost - startHost + 1;
    let scanned = 0;

    console.log(`🔍 Scanning ${baseIP}.${startHost}-${endHost} for BantayBot devices...`);

    // Scan in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = startHost; i <= endHost; i += batchSize) {
      if (!this.isScanning) break;

      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, endHost + 1); j++) {
        batch.push(
          this.scanIP(`${baseIP}.${j}`).then(devices => {
            scanned++;
            if (onProgress) {
              onProgress((scanned / total) * 100, scanned, total);
            }
            return devices;
          })
        );
      }

      const results = await Promise.all(batch);
      results.forEach(devices => {
        if (devices && devices.length > 0) {
          this.foundDevices.push(...devices);
        }
      });
    }

    this.isScanning = false;
    console.log(`✅ Scan complete. Found ${this.foundDevices.length} devices.`);
    return this.foundDevices;
  }

  /**
   * Auto-detect network and scan common ranges
   */
  async autoDiscover(onProgress = null) {
    // Common private IP ranges for home networks
    const commonRanges = [
      { base: '192.168.1', start: 1, end: 255 },
      { base: '192.168.0', start: 1, end: 255 },
      { base: '10.0.0', start: 1, end: 255 },
      { base: '172.24.26', start: 1, end: 255 }, // Your current network
    ];

    this.foundDevices = [];

    for (const range of commonRanges) {
      if (!this.isScanning) break;

      console.log(`🔍 Scanning ${range.base}.x...`);
      const devices = await this.scanRange(
        range.base,
        range.start,
        range.end,
        onProgress
      );

      if (devices.length > 0) {
        // Found devices, no need to scan other ranges
        break;
      }
    }

    return this.foundDevices;
  }

  /**
   * Quick scan - only scan IPs ending in common ranges (1-50, 100-150, 200-255)
   */
  async quickScan(baseIP, onProgress = null) {
    this.isScanning = true;
    this.foundDevices = [];

    const ranges = [
      { start: 1, end: 50 },
      { start: 100, end: 150 },
      { start: 200, end: 255 },
    ];

    let totalScanned = 0;
    const totalHosts = ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);

    for (const range of ranges) {
      if (!this.isScanning) break;

      const devices = await this.scanRange(
        baseIP,
        range.start,
        range.end,
        (progress, scanned, total) => {
          totalScanned++;
          if (onProgress) {
            onProgress((totalScanned / totalHosts) * 100, totalScanned, totalHosts);
          }
        }
      );

      if (devices.length > 0) {
        break;
      }
    }

    this.isScanning = false;
    return this.foundDevices;
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    this.isScanning = false;
  }

  /**
   * Get found devices
   */
  getFoundDevices() {
    return this.foundDevices;
  }

  /**
   * Get camera device (if found)
   */
  getCameraDevice() {
    return this.foundDevices.find(d => d.type === 'camera');
  }

  /**
   * Get main board device (if found)
   */
  getMainBoardDevice() {
    return this.foundDevices.find(d => d.type === 'main');
  }

  /**
   * Test mDNS discovery (if available)
   * Note: React Native doesn't natively support mDNS, but can try hostname resolution
   */
  async testMDNS() {
    const hostnames = ['bantaybot-main.local', 'bantaybot-camera.local'];

    const results = await Promise.allSettled(
      hostnames.map(async hostname => {
        try {
          // Try to fetch from hostname
          const response = await fetch(`http://${hostname}/status`, {
            method: 'GET',
            timeout: 3000,
          });

          if (response.ok) {
            return {
              hostname,
              available: true,
              type: hostname.includes('camera') ? 'camera' : 'main',
            };
          }
        } catch (error) {
          // mDNS not available or device not found
        }
        return null;
      })
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  /**
   * Extract base IP from full IP (e.g., "192.168.1.100" -> "192.168.1")
   */
  getBaseIP(fullIP) {
    const parts = fullIP.split('.');
    return parts.slice(0, 3).join('.');
  }
}

export default new NetworkDiscoveryService();
