import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import firebaseConfig from '../config/firebase.config';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize Firebase app and services
   */
  async initialize() {
    if (this.initialized) {
      return this.db;
    }

    try {
      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        this.app = await firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        this.app = firebase.app();
        console.log('✅ Firebase app already initialized');
      }

      // Initialize Firestore
      this.db = firestore();

      // Enable offline persistence
      await this.db.settings({
        persistence: true,
        cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
      });

      this.initialized = true;
      console.log('✅ Firestore initialized with offline persistence');

      return this.db;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Firestore database instance
   */
  getDatabase() {
    if (!this.initialized) {
      console.warn('⚠️ Firebase not initialized. Call initialize() first.');
      return null;
    }
    return this.db;
  }

  /**
   * Get Firebase app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export default new FirebaseService();

// Export database instance for direct use
export const getFirestore = () => {
  const service = new FirebaseService();
  return service.getDatabase();
};