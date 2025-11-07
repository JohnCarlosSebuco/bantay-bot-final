/**
 * MDNSService - Native mDNS/Zeroconf device discovery
 * Requires: react-native-zeroconf native module
 *
 * Installation:
 * 1. npm install react-native-zeroconf
 * 2. Create custom Expo dev client: npx expo prebuild
 * 3. Set USE_MDNS: true in config.js
 */

import { CONFIG } from '../config/config';

class MDNSService {
  constructor() {
    this.zeroconf = null;
    this.isScanning = false;
    this.foundDevices = new Map();
    this.listeners = [];

    // Try to load native module
    this.initializeModule();
  }

  /**
   * Initialize the native mDNS module
   */
  initializeModule() {
    try {
      // Dynamic import to prevent crashes if module not installed
      const Zeroconf = require('react-native-zeroconf');
      this.zeroconf = new Zeroconf();

      // Setup event listeners
      this.zeroconf.on('start', () => {
        console.log('✅ mDNS scanning started');
      });

      this.zeroconf.on('found', (service) => {
        console.log('🔍 Found service:', service.name);
      });

      this.zeroconf.on('resolved', (service) => {
        console.log('✅ Resolved service:', service);
        this.handleServiceResolved(service);
      });

      this.zeroconf.on('remove', (service) => {
        console.log('❌ Service removed:', service.name);
        this.foundDevices.delete(service.name);
        this.notifyListeners();
      });

      this.zeroconf.on('error', (error) => {
        console.error('❌ mDNS error:', error);
      });

      this.zeroconf.on('stop', () => {
        console.log('⏹️ mDNS scanning stopped');
        this.isScanning = false;
      });

      console.log('✅ mDNS module loaded successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ mDNS module not available:', error.message);
      console.warn('   Install: npm install react-native-zeroconf');
      console.warn('   Then run: npx expo prebuild');
      this.zeroconf = null;
      return false;
    }
  }

  /**
   * Check if mDNS is available
   */
  isAvailable() {
    return this.zeroconf !== null;
  }

  /**
   * Handle resolved mDNS service
   */
  handleServiceResolved(service) {
    // Check if this is a BantayBot device
    const isBantayBot =
      service.name.includes('bantaybot') ||
      service.name.includes('BantayBot');

    if (!isBantayBot) return;

    // Determine device type
    let type = 'unknown';
    if (service.name.includes('camera')) {
      type = 'camera';
    } else if (service.name.includes('main')) {
      type = 'main';
    }

    // Extract IP address
    const ip = service.addresses && service.addresses.length > 0
      ? service.addresses[0]
      : null;

    if (!ip) {
      console.warn('⚠️ No IP address for service:', service.name);
      return;
    }

    const device = {
      name: service.name,
      hostname: service.host,
      ip: ip,
      port: service.port,
      type: type,
      available: true,
      useMDNS: true,
      txt: service.txt || {},
    };

    console.log('✅ BantayBot device resolved:', device);
    this.foundDevices.set(service.name, device);
    this.notifyListeners();
  }

  /**
   * Start scanning for BantayBot devices
   * @param {string} serviceType - mDNS service type (default: '_http._tcp.')
   * @param {string} domain - mDNS domain (default: 'local.')
   */
  async scan(serviceType = CONFIG.MDNS_SERVICE_TYPE, domain = 'local.') {
    if (!this.isAvailable()) {
      console.warn('⚠️ mDNS not available, cannot scan');
      return [];
    }

    if (this.isScanning) {
      console.log('⚠️ Already scanning, stopping previous scan');
      this.stop();
    }

    try {
      this.isScanning = true;
      this.foundDevices.clear();

      console.log(`🔍 Starting mDNS scan for ${serviceType}${domain}`);
      this.zeroconf.scan(serviceType, 'tcp', domain);

      // Wait for devices to be discovered (timeout after 5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5000));

      return Array.from(this.foundDevices.values());
    } catch (error) {
      console.error('❌ mDNS scan failed:', error);
      return [];
    }
  }

  /**
   * Stop scanning
   */
  stop() {
    if (this.zeroconf && this.isScanning) {
      try {
        this.zeroconf.stop();
        this.isScanning = false;
        console.log('⏹️ mDNS scan stopped');
      } catch (error) {
        console.error('❌ Error stopping mDNS scan:', error);
      }
    }
  }

  /**
   * Get camera device
   */
  getCameraDevice() {
    return Array.from(this.foundDevices.values()).find(d => d.type === 'camera');
  }

  /**
   * Get main board device
   */
  getMainBoardDevice() {
    return Array.from(this.foundDevices.values()).find(d => d.type === 'main');
  }

  /**
   * Get all found devices
   */
  getFoundDevices() {
    return Array.from(this.foundDevices.values());
  }

  /**
   * Subscribe to device discovery updates
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    const devices = this.getFoundDevices();
    this.listeners.forEach(callback => {
      try {
        callback(devices);
      } catch (error) {
        console.error('Error in mDNS listener:', error);
      }
    });
  }

  /**
   * Quick scan - scan for 3 seconds only
   */
  async quickScan() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      this.isScanning = true;
      this.foundDevices.clear();

      console.log('🔍 Starting quick mDNS scan (3s)');
      this.zeroconf.scan(CONFIG.MDNS_SERVICE_TYPE, 'tcp', 'local.');

      await new Promise(resolve => setTimeout(resolve, 3000));
      this.stop();

      return Array.from(this.foundDevices.values());
    } catch (error) {
      console.error('❌ Quick mDNS scan failed:', error);
      return [];
    }
  }
}

export default new MDNSService();
