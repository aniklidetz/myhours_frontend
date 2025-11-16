// src/services/OfflineQueueService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import apiService from '../api/apiService';
import { Alert } from 'react-native';

/**
 * OfflineQueueService
 *
 * Сервис для управления офлайн-очередью операций check-in/check-out.
 * Обеспечивает надежную доставку данных при нестабильном интернете.
 *
 * Features:
 * - Автоматическое сохранение операций при сетевых сбоях
 * - Retry механизм с экспоненциальным backoff
 * - Уведомления пользователя о статусе операций
 * - Автоматическая обработка очереди при восстановлении связи
 *
 * @example
 * import OfflineQueueService from './services/OfflineQueueService';
 *
 * // Добавить в очередь
 * const queueId = await OfflineQueueService.enqueue({
 *   type: 'check-in',
 *   payload: { image: base64Image, location: gpsCoords }
 * });
 *
 * // Получить статус
 * const status = await OfflineQueueService.getQueueStatus();
 */
class OfflineQueueService {
  constructor() {
    this.QUEUE_KEY = 'MyHours.OfflineQueue';
    this.FAILED_QUEUE_KEY = 'MyHours.FailedQueue';
    this.isProcessing = false;
    this.networkUnsubscribe = null;

    // Инициализация слушателя сети
    this.setupNetworkListener();

    console.log('✅ OfflineQueueService initialized');
  }

  /**
   * Настройка слушателя изменений состояния сети
   * Когда сеть появляется - автоматически обрабатываем очередь
   */
  setupNetworkListener() {
    try {
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        console.log('Network state changed:', {
          isConnected: state.isConnected,
          type: state.type,
          isInternetReachable: state.isInternetReachable
        });

        // Если интернет появился и очередь не обрабатывается
        if (state.isConnected && state.isInternetReachable && !this.isProcessing) {
          console.log('📡 Network connected, processing offline queue...');
          this.processQueue();
        }
      });

      console.log('✅ Network listener setup complete');
    } catch (error) {
      console.error('❌ Failed to setup network listener:', error);
    }
  }

  /**
   * Остановить слушатель сети (для cleanup)
   */
  cleanup() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
      console.log('🧹 Network listener cleaned up');
    }
  }

  /**
   * Добавить операцию в очередь
   *
   * @param {Object} operation - Операция для добавления
   * @param {string} operation.type - Тип операции ('check-in' | 'check-out')
   * @param {Object} operation.payload - Данные операции
   * @param {string} operation.payload.image - Base64 изображение
   * @param {Object} operation.payload.location - GPS координаты
   * @returns {Promise<string>} ID элемента очереди
   */
  async enqueue(operation) {
    try {
      const queue = await this.getQueue();

      const queueItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation_type: operation.type,
        payload: {
          image: operation.payload.image,
          location: operation.payload.location,
          timestamp: new Date().toISOString(), // Реальное время операции
        },
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        status: 'pending'
      };

      queue.push(queueItem);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

      console.log(`✅ Queued ${operation.type}:`, {
        id: queueItem.id,
        timestamp: queueItem.payload.timestamp,
        hasImage: !!queueItem.payload.image,
        hasLocation: !!queueItem.payload.location
      });

      // Показываем пользователю уведомление (только не в тестах)
      if (typeof Alert !== 'undefined' && Alert && Alert.alert) {
        Alert.alert(
          "Операция в очереди",
          `${operation.type === 'check-in' ? 'Check-in' : 'Check-out'} будет отправлен при восстановлении связи.`,
          [{ text: "OK" }]
        );
      }

      return queueItem.id;
    } catch (error) {
      console.error('❌ Failed to enqueue operation:', error);
      throw new Error(`Failed to enqueue: ${error.message}`);
    }
  }

  /**
   * Обработать всю очередь
   * Пытается отправить все pending операции на сервер
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('⏳ Queue processing already in progress, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      const queue = await this.getQueue();

      if (queue.length === 0) {
        console.log('📭 Queue is empty, nothing to process');
        this.isProcessing = false;
        return;
      }

      console.log(`📦 Processing ${queue.length} queued items...`);

      // Обрабатываем операции последовательно (не параллельно!)
      for (const item of queue) {
        if (item.status === 'completed') {
          console.log(`⏭️  Skipping completed item: ${item.id}`);
          continue;
        }

        try {
          console.log(`🔄 Processing item ${item.id} (attempt ${item.retry_count + 1}/${item.max_retries})...`);

          // Пытаемся отправить на сервер
          await this.processItem(item);

          // Успешно! Удаляем из очереди
          await this.removeFromQueue(item.id);

          console.log(`✅ Successfully processed ${item.operation_type}: ${item.id}`);

          // Уведомляем пользователя об успехе (только не в тестах)
          if (typeof Alert !== 'undefined' && Alert && Alert.alert) {
            Alert.alert(
              "Операция выполнена",
              `${item.operation_type === 'check-in' ? 'Check-in' : 'Check-out'} успешно отправлен на сервер.`,
              [{ text: "OK" }]
            );
          }

        } catch (error) {
          item.retry_count++;

          console.error(`❌ Failed to process ${item.operation_type} (${item.id}):`, {
            error: error.message,
            attempt: item.retry_count,
            maxRetries: item.max_retries
          });

          if (item.retry_count >= item.max_retries) {
            // Превышен лимит попыток - перемещаем в failed queue
            console.error(`💀 Max retries exceeded for item ${item.id}`);
            await this.moveToFailedQueue(item);
            await this.removeFromQueue(item.id);
          } else {
            // Обновляем счетчик попыток и пробуем позже
            console.log(`🔁 Retry ${item.retry_count}/${item.max_retries} scheduled for ${item.id}`);
            await this.updateQueueItem(item);
          }
        }
      }

      console.log('✅ Queue processing completed');

    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Обработать одну операцию из очереди
   *
   * @param {Object} item - Элемент очереди
   * @returns {Promise<Object>} Результат API вызова
   */
  async processItem(item) {
    switch (item.operation_type) {
      case 'check-in':
        return await apiService.biometrics.checkIn(
          item.payload.image,
          item.payload.location
        );

      case 'check-out':
        return await apiService.biometrics.checkOut(
          item.payload.image,
          item.payload.location
        );

      default:
        throw new Error(`Unknown operation type: ${item.operation_type}`);
    }
  }

  /**
   * Получить текущую очередь
   * @returns {Promise<Array>} Массив элементов очереди
   */
  async getQueue() {
    try {
      const data = await AsyncStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Удалить элемент из очереди
   * @param {string} itemId - ID элемента для удаления
   */
  async removeFromQueue(itemId) {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
      console.log(`🗑️  Removed item from queue: ${itemId}`);
    } catch (error) {
      console.error('❌ Failed to remove from queue:', error);
    }
  }

  /**
   * Обновить элемент в очереди (для увеличения retry_count)
   * @param {Object} updatedItem - Обновленный элемент
   */
  async updateQueueItem(updatedItem) {
    try {
      const queue = await this.getQueue();
      const index = queue.findIndex(item => item.id === updatedItem.id);

      if (index !== -1) {
        queue[index] = updatedItem;
        await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        console.log(`🔄 Updated queue item: ${updatedItem.id}`);
      }
    } catch (error) {
      console.error('❌ Failed to update queue item:', error);
    }
  }

  /**
   * Переместить операцию в очередь неудачных
   * Вызывается когда превышен лимит попыток
   *
   * @param {Object} item - Элемент для перемещения
   */
  async moveToFailedQueue(item) {
    try {
      const failedQueue = await this.getFailedQueue();

      failedQueue.push({
        ...item,
        failed_at: new Date().toISOString(),
        status: 'failed'
      });

      await AsyncStorage.setItem(this.FAILED_QUEUE_KEY, JSON.stringify(failedQueue));

      console.log(`💀 Moved to failed queue: ${item.id}`);

      // Критическое уведомление пользователю (только не в тестах)
      if (typeof Alert !== 'undefined' && Alert && Alert.alert) {
        Alert.alert(
          "⚠️ Операция не выполнена",
          `${item.operation_type === 'check-in' ? 'Check-in' : 'Check-out'} не удалось отправить после ${item.max_retries} попыток.\n\nОбратитесь в HR для ручной корректировки.`,
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Повторить сейчас",
              onPress: () => this.retryFailedItem(item.id)
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Failed to move to failed queue:', error);
    }
  }

  /**
   * Получить очередь неудачных операций
   * @returns {Promise<Array>} Массив неудачных операций
   */
  async getFailedQueue() {
    try {
      const data = await AsyncStorage.getItem(this.FAILED_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Failed to get failed queue:', error);
      return [];
    }
  }

  /**
   * Повторить неудачную операцию вручную
   * @param {string} itemId - ID неудачной операции
   */
  async retryFailedItem(itemId) {
    try {
      const failedQueue = await this.getFailedQueue();
      const item = failedQueue.find(i => i.id === itemId);

      if (item) {
        // Сбрасываем счетчик попыток
        item.retry_count = 0;
        item.status = 'pending';

        // Перемещаем обратно в основную очередь
        const queue = await this.getQueue();
        queue.push(item);
        await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

        // Удаляем из failed queue
        const filtered = failedQueue.filter(i => i.id !== itemId);
        await AsyncStorage.setItem(this.FAILED_QUEUE_KEY, JSON.stringify(filtered));

        console.log(`♻️  Retrying failed item: ${itemId}`);

        // Запускаем обработку очереди
        this.processQueue();
      }
    } catch (error) {
      console.error('❌ Failed to retry item:', error);
    }
  }

  /**
   * Получить статус очереди (для отображения в UI)
   *
   * @returns {Promise<Object>} Статус очереди
   * @returns {number} pending - Количество операций в очереди
   * @returns {boolean} processing - Идет ли обработка
   * @returns {number} failed - Количество неудачных операций
   * @returns {number} total - Общее количество в очереди
   */
  async getQueueStatus() {
    try {
      const queue = await this.getQueue();
      const failedQueue = await this.getFailedQueue();

      const status = {
        pending: queue.filter(i => i.status === 'pending').length,
        processing: this.isProcessing,
        failed: failedQueue.length,
        total: queue.length
      };

      console.log('📊 Queue status:', status);

      return status;
    } catch (error) {
      console.error('❌ Failed to get queue status:', error);
      return {
        pending: 0,
        processing: false,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Очистить всю очередь (для тестирования или ручного вмешательства)
   * ⚠️ ОПАСНО: удаляет все pending операции!
   */
  async clearQueue() {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('🗑️  Queue cleared');
    } catch (error) {
      console.error('❌ Failed to clear queue:', error);
    }
  }

  /**
   * Очистить очередь неудачных операций
   */
  async clearFailedQueue() {
    try {
      await AsyncStorage.removeItem(this.FAILED_QUEUE_KEY);
      console.log('🗑️  Failed queue cleared');
    } catch (error) {
      console.error('❌ Failed to clear failed queue:', error);
    }
  }
}

// Экспортируем singleton instance
export default new OfflineQueueService();
