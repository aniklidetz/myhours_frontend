// clear-auth-data.js
// Временный скрипт для очистки старых данных аутентификации

import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAuthData = async () => {
  try {
    console.log('🧹 Clearing old authentication data...');
    
    // Очищаем все ключи аутентификации
    const keysToRemove = [
      '@MyHours:AuthToken',
      '@MyHours:UserData',
      '@MyHours:WorkStatus',
      '@MyHours:EnhancedAuthData',
      '@MyHours:BiometricSession',
      '@MyHours:DeviceId'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    console.log('✅ All authentication data cleared!');
    console.log('📱 Please restart the app and login again.');
    
    // Показываем, что осталось в storage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📦 Remaining keys in storage:', allKeys);
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

// Если запускаем напрямую
if (require.main === module) {
  clearAuthData();
}

export default clearAuthData;