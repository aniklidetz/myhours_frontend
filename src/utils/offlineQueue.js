import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@MyHours:OfflineQueue';

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.listeners = [];
    this.loadQueue();
    this.setupNetworkListener();
  }

  async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async add(request) {
    const queueItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      request: {
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers
      }
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.notifyListeners();

    console.log('📥 Added request to offline queue:', queueItem);
    return queueItem.id;
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.queue.length} offline requests...`);

    const processedIds = [];

    for (const item of this.queue) {
      try {
        // Import apiClient dynamically to avoid circular dependency
        const { default: apiClient } = await import('../api/apiService');
        
        const response = await apiClient.request({
          method: item.request.method,
          url: item.request.url,
          data: item.request.data,
          headers: item.request.headers
        });

        console.log(`✅ Processed offline request ${item.id}`);
        processedIds.push(item.id);
      } catch (error) {
        console.error(`❌ Failed to process offline request ${item.id}:`, error);
        
        // Remove from queue if it's a client error (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          processedIds.push(item.id);
        }
      }
    }

    // Remove processed items
    this.queue = this.queue.filter(item => !processedIds.includes(item.id));
    await this.saveQueue();
    
    this.isProcessing = false;
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.queue));
  }

  getQueueSize() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
  }
}

export default new OfflineQueue();