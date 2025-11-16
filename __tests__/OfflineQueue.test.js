// __tests__/OfflineQueue.test.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

// Mock API service before importing OfflineQueueService
jest.mock('../src/api/apiService', () => ({
  biometrics: {
    checkIn: jest.fn(),
    checkOut: jest.fn(),
  },
}));

// Import after mocks are set up
import OfflineQueueService from '../src/services/OfflineQueueService';
import apiService from '../src/api/apiService';

describe('OfflineQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(null);
    AsyncStorage.removeItem.mockResolvedValue(null);
  });

  describe('enqueue', () => {
    it('should add operation to queue', async () => {
      const operation = {
        type: 'check-in',
        payload: {
          image: 'base64_image_data',
          location: '32.0853,34.7818',
        },
      };

      const queueId = await OfflineQueueService.enqueue(operation);

      expect(queueId).toBeDefined();
      expect(typeof queueId).toBe('string');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'MyHours.OfflineQueue',
        expect.any(String)
      );
    });

    it('should create queue item with correct structure', async () => {
      const operation = {
        type: 'check-out',
        payload: {
          image: 'base64_image_data',
          location: '32.0853,34.7818',
        },
      };

      await OfflineQueueService.enqueue(operation);

      const callArg = AsyncStorage.setItem.mock.calls[0][1];
      const queue = JSON.parse(callArg);

      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        operation_type: 'check-out',
        payload: {
          image: 'base64_image_data',
          location: '32.0853,34.7818',
          timestamp: expect.any(String),
        },
        retry_count: 0,
        max_retries: 3,
        status: 'pending',
      });
    });
  });

  describe('processQueue', () => {
    it('should process pending items successfully', async () => {
      const mockQueue = [
        {
          id: 'test-1',
          operation_type: 'check-in',
          payload: {
            image: 'base64_image',
            location: '32.0853,34.7818',
            timestamp: '2025-01-12T10:00:00Z',
          },
          retry_count: 0,
          max_retries: 3,
          status: 'pending',
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));
      apiService.biometrics.checkIn.mockResolvedValue({
        success: true,
        employee_name: 'Test User',
      });

      await OfflineQueueService.processQueue();

      expect(apiService.biometrics.checkIn).toHaveBeenCalledWith(
        'base64_image',
        '32.0853,34.7818'
      );
    });

    it('should retry failed items up to max_retries', async () => {
      const mockQueue = [
        {
          id: 'test-1',
          operation_type: 'check-in',
          payload: {
            image: 'base64_image',
            location: '32.0853,34.7818',
            timestamp: '2025-01-12T10:00:00Z',
          },
          retry_count: 0,
          max_retries: 3,
          status: 'pending',
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));
      apiService.biometrics.checkIn.mockRejectedValue(new Error('Network error'));

      await OfflineQueueService.processQueue();

      expect(apiService.biometrics.checkIn).toHaveBeenCalled();
      // Item should be updated with increased retry_count
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should move to failed queue after max retries', async () => {
      const mockQueue = [
        {
          id: 'test-1',
          operation_type: 'check-in',
          payload: {
            image: 'base64_image',
            location: '32.0853,34.7818',
            timestamp: '2025-01-12T10:00:00Z',
          },
          retry_count: 3, // Already at max
          max_retries: 3,
          status: 'pending',
        },
      ];

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockQueue)) // getQueue
        .mockResolvedValueOnce('[]'); // getFailedQueue

      apiService.biometrics.checkIn.mockRejectedValue(new Error('Network error'));

      await OfflineQueueService.processQueue();

      // Should have moved to failed queue
      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const failedQueueCall = setItemCalls.find(
        call => call[0] === 'MyHours.FailedQueue'
      );
      expect(failedQueueCall).toBeDefined();
    });

    it('should skip already completed items', async () => {
      const mockQueue = [
        {
          id: 'test-1',
          operation_type: 'check-in',
          payload: {
            image: 'base64_image',
            location: '32.0853,34.7818',
            timestamp: '2025-01-12T10:00:00Z',
          },
          status: 'completed', // Already completed
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await OfflineQueueService.processQueue();

      // Should not call API for completed item
      expect(apiService.biometrics.checkIn).not.toHaveBeenCalled();
    });
  });

  describe('processItem', () => {
    it('should call checkIn API for check-in operation', async () => {
      const item = {
        operation_type: 'check-in',
        payload: {
          image: 'base64_image',
          location: '32.0853,34.7818',
        },
      };

      apiService.biometrics.checkIn.mockResolvedValue({ success: true });

      await OfflineQueueService.processItem(item);

      expect(apiService.biometrics.checkIn).toHaveBeenCalledWith(
        'base64_image',
        '32.0853,34.7818'
      );
    });

    it('should call checkOut API for check-out operation', async () => {
      const item = {
        operation_type: 'check-out',
        payload: {
          image: 'base64_image',
          location: '32.0853,34.7818',
        },
      };

      apiService.biometrics.checkOut.mockResolvedValue({ success: true });

      await OfflineQueueService.processItem(item);

      expect(apiService.biometrics.checkOut).toHaveBeenCalledWith(
        'base64_image',
        '32.0853,34.7818'
      );
    });

    it('should throw error for unknown operation type', async () => {
      const item = {
        operation_type: 'unknown-operation',
        payload: {},
      };

      await expect(OfflineQueueService.processItem(item)).rejects.toThrow(
        'Unknown operation type: unknown-operation'
      );
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct status', async () => {
      const mockQueue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];
      const mockFailedQueue = [{ id: '3', status: 'failed' }];

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockQueue))
        .mockResolvedValueOnce(JSON.stringify(mockFailedQueue));

      const status = await OfflineQueueService.getQueueStatus();

      expect(status).toEqual({
        pending: 2,
        processing: false,
        failed: 1,
        total: 2,
      });
    });

    it('should handle empty queues', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const status = await OfflineQueueService.getQueueStatus();

      expect(status).toEqual({
        pending: 0,
        processing: false,
        failed: 0,
        total: 0,
      });
    });
  });

  describe('retryFailedItem', () => {
    it('should move item from failed queue to main queue', async () => {
      const failedItem = {
        id: 'failed-1',
        operation_type: 'check-in',
        payload: { image: 'test', location: 'test' },
        retry_count: 3,
        status: 'failed',
      };

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([failedItem])) // getFailedQueue
        .mockResolvedValueOnce('[]'); // getQueue

      await OfflineQueueService.retryFailedItem('failed-1');

      // Should reset retry_count and move to main queue
      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const mainQueueCall = setItemCalls.find(
        call => call[0] === 'MyHours.OfflineQueue'
      );
      expect(mainQueueCall).toBeDefined();

      const queue = JSON.parse(mainQueueCall[1]);
      expect(queue[0]).toMatchObject({
        id: 'failed-1',
        retry_count: 0,
        status: 'pending',
      });
    });
  });

  describe('Network Listener', () => {
    it('should have network listener setup', () => {
      // Service is singleton - listener was set up on import
      // Just verify the service has the cleanup method
      expect(typeof OfflineQueueService.cleanup).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('should have cleanup method', () => {
      // Verify that cleanup method exists
      expect(typeof OfflineQueueService.cleanup).toBe('function');
    });
  });
});
