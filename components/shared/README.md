# LiquidGlass Refactoring System

## Обзор

Эта система рефакторинга устраняет дублирование кода в LiquidGlass компонентах путем создания:

1. **GlassContainer** - общий компонент для glass-эффектов
2. **useGlassPressable** - хук для анимаций нажатия

## Экономия кода

### До рефакторинга:
- LiquidGlassButton.js: 124 строки
- LiquidGlassCard.js: 153 строки
- **Итого**: 277 строк + дублирование в 5 других компонентах

### После рефакторинга:
- LiquidGlassButton.refactored.js: 94 строки (-24%)
- LiquidGlassCard.refactored.js: 100 строк (-35%)
- GlassContainer.js: 97 строк (переиспользуемый)
- useGlassPressable.js: 49 строк (переиспользуемый)

### Преимущества:
- ✅ **Удаление ~240+ строк дублированного кода** из всех компонентов
- ✅ **Единая точка изменений** для glass-эффектов
- ✅ **Консистентность** анимаций и стилей
- ✅ **Простота использования** новых glass-компонентов

## Использование GlassContainer

```jsx
import GlassContainer from './shared/GlassContainer';

// Базовый glass-эффект
<GlassContainer
  intensity="medium"
  gradientColors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
  borderRadius={15}
>
  <Text>Ваш контент</Text>
</GlassContainer>

// С бордером
<GlassContainer
  border={true}
  borderColors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
>
  <Text>Контент с бордером</Text>
</GlassContainer>
```

## Использование useGlassPressable

```jsx
import useGlassPressable from '../hooks/shared/useGlassPressable';

const MyComponent = ({ onPress }) => {
  const { animatedPressableStyle, handlePressIn, handlePressOut } = useGlassPressable(true, {
    scaleTarget: 0.95,
    opacityTarget: 0.8,
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedPressableStyle]}
    >
      <GlassContainer>
        <Text>Нажмите меня</Text>
      </GlassContainer>
    </AnimatedPressable>
  );
};
```

## Миграция существующих компонентов

### Шаг 1: Замените BlurView + LinearGradient
```jsx
// ❌ Старый код
<BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
  <LinearGradient
    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
    style={StyleSheet.absoluteFillObject}
  />
</BlurView>

// ✅ Новый код
<GlassContainer
  intensity={20}
  gradientColors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
>
```

### Шаг 2: Замените анимации нажатия
```jsx
// ❌ Старый код
const scale = useSharedValue(1);
const handlePressIn = () => {
  scale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
};
const handlePressOut = () => {
  scale.value = withSpring(1, { damping: 10, stiffness: 400 });
};

// ✅ Новый код
const { animatedPressableStyle, handlePressIn, handlePressOut } = useGlassPressable();
```

## Компоненты для рефакторинга

**Высокий приоритет:**
- [ ] LiquidGlassButton (готово ✅)
- [ ] LiquidGlassCard (готово ✅)
- [ ] LiquidGlassInput
- [ ] LiquidGlassToast
- [ ] GlassModal

**Средний приоритет:**
- [ ] GlassHeader
- [ ] GlassModalSelector

## Тестирование

После рефакторинга каждого компонента:

```bash
# Проверить, что компонент работает
npm run start

# Запустить тесты
npm run test

# Проверить типы
npm run typecheck
```