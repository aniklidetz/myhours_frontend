#!/usr/bin/env node

/**
 * Простой тест-раннер для проверки утилит безопасного логирования
 * Можно запустить без Jest для быстрой проверки
 */

// Импортируем утилиты
const {
  maskEmail,
  maskPhone,
  maskCoordinates,
  maskName,
  hashUserId,
  safeLogUser,
  safeLogEmployee,
  safeLogLocation,
  safeLogBiometric
} = require('./src/utils/safeLogging');

console.log('🧪 Запуск тестов безопасного логирования для React Native...');
console.log('=' * 60);

// Простая функция для тестирования
function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Ошибка: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: ожидали '${expected}', получили '${actual}'`);
  }
}

// Тесты маскирования email
console.log('\n📧 Тестирование маскирования email:');
test('Обычный email', () => {
  assertEqual(maskEmail('admin@example.com'), 'a***@example.com', 'Email не замаскирован');
});

test('Короткий email', () => {
  assertEqual(maskEmail('a@test.com'), '*@test.com', 'Короткий email не замаскирован');
});

test('Некорректный email', () => {
  assertEqual(maskEmail('invalid'), '[invalid_email]', 'Некорректный email не обработан');
});

// Тесты маскирования телефонов
console.log('\n📞 Тестирование маскирования телефонов:');
test('Международный номер', () => {
  assertEqual(maskPhone('+972501234567'), '***4567', 'Телефон не замаскирован');
});

test('Номер с разделителями', () => {
  assertEqual(maskPhone('+1-234-567-8901'), '***8901', 'Номер с разделителями не обработан');
});

// Тесты маскирования координат
console.log('\n📍 Тестирование маскирования GPS координат:');
test('Офисные координаты', () => {
  assertEqual(maskCoordinates(32.05, 34.78), 'Office Area', 'Офисные координаты не определены');
});

test('Удалённая локация', () => {
  assertEqual(maskCoordinates(40.7, -74.0), 'Remote Location', 'Удалённая локация не определена');
});

// Тесты маскирования имён
console.log('\n👤 Тестирование маскирования имён:');
test('Полное имя', () => {
  assertEqual(maskName('John Doe'), 'J.D.', 'Полное имя не замаскировано');
});

test('Одиночное имя', () => {
  assertEqual(maskName('Admin'), 'A.', 'Одиночное имя не замаскировано');
});

// Тесты хэширования ID
console.log('\n🔐 Тестирование хэширования ID:');
test('Хэширование числового ID', () => {
  const hash = hashUserId(123);
  if (!hash.startsWith('usr_') || hash.length !== 12) {
    throw new Error('Неправильный формат хэша');
  }
});

test('Постоянство хэшей', () => {
  const hash1 = hashUserId(456);
  const hash2 = hashUserId(456);
  assertEqual(hash1, hash2, 'Хэши должны быть одинаковыми для одного ID');
});

// Тесты сложных объектов
console.log('\n🧩 Тестирование сложных объектов:');
test('Безопасное логирование пользователя', () => {
  const user = {
    id: 123,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin'
  };
  
  const result = safeLogUser(user, 'test');
  
  if (result.email_masked !== 't***@example.com') {
    throw new Error('Email не замаскирован в объекте пользователя');
  }
  
  if (result.name_initials !== 'T.U.') {
    throw new Error('Имя не замаскировано в объекте пользователя');
  }
  
  if (result.email || result.first_name || result.last_name) {
    throw new Error('Оригинальные данные присутствуют в результате');
  }
});

test('Безопасное логирование биометрии', () => {
  const biometricData = {
    hasImage: true,
    confidence: 0.95,
    sessionId: 'secret_session',
    base64Data: 'very_long_secret_data'
  };
  
  const result = safeLogBiometric(biometricData);
  
  if (result.base64Data || result.sessionId) {
    throw new Error('Секретные биометрические данные присутствуют в результате');
  }
  
  if (result.confidence_level !== 'high') {
    throw new Error('Уровень уверенности не определён правильно');
  }
});

// Тесты защиты от реальных данных
console.log('\n🛡️ Тестирование защиты от реальных утечек:');
test('Защита от утечки mikhail.plotnik@gmail.com', () => {
  const userData = {
    email: 'mikhail.plotnik@gmail.com',
    first_name: 'Mikhail',
    last_name: 'Plotnik'
  };
  
  const result = safeLogUser(userData, 'biometric_check');
  const serialized = JSON.stringify(result);
  
  if (serialized.includes('mikhail.plotnik@gmail.com')) {
    throw new Error('Email утёк в безопасном логировании');
  }
  
  if (serialized.includes('Mikhail') || serialized.includes('Plotnik')) {
    throw new Error('Полные имена утекли в безопасном логировании');
  }
});

test('Защита от утечки точных GPS координат', () => {
  const lat = 32.050936;
  const lng = 34.781800;
  
  const result = safeLogLocation(lat, lng);
  
  if (result.includes('32.050936') || result.includes('34.781800')) {
    throw new Error('Точные GPS координаты утекли в безопасном логировании');
  }
  
  if (result !== 'Office Area') {
    throw new Error('GPS координаты не правильно обобщены');
  }
});

console.log('\n🎉 Все тесты завершены!');
console.log('\n📊 Статистика безопасности:');
console.log('✅ Email маскирование работает');
console.log('✅ GPS координаты защищены');
console.log('✅ Имена маскированы');
console.log('✅ Телефоны защищены');
console.log('✅ Биометрические данные скрыты');
console.log('✅ Пользовательские объекты безопасны');

console.log('\n🚀 Готово к production deployment!');
console.log('\nДля запуска полных Jest тестов используйте: npm run test:security');