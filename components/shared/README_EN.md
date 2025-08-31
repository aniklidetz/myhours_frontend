# LiquidGlass Refactoring System

## Overview

This refactoring system eliminates code duplication in LiquidGlass components by creating:

1. **GlassContainer** - Shared component for glass effects
2. **useGlassPressable** - Hook for press animations

## Code Savings

### Before refactoring:
- LiquidGlassButton.js: 124 lines
- LiquidGlassCard.js: 153 lines
- **Total**: 277 lines + duplication in 5 other components

### After refactoring:
- LiquidGlassButton.refactored.js: 94 lines (-24%)
- LiquidGlassCard.refactored.js: 100 lines (-35%)
- GlassContainer.js: 97 lines (reusable)
- useGlassPressable.js: 49 lines (reusable)

### Benefits:
- Removes ~240+ lines of duplicated code across all components
- Single point of change for glass effects
- Consistency of animations and styles
- Easy to use for new glass components

## Using GlassContainer

```jsx
import GlassContainer from './shared/GlassContainer';

// Basic glass effect
<GlassContainer
  intensity="medium"
  gradientColors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
  borderRadius={15}
>
  <Text>Your content</Text>
</GlassContainer>

// With border
<GlassContainer
  border={true}
  borderColors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
>
  <Text>Content with border</Text>
</GlassContainer>
```

## Using useGlassPressable

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
        <Text>Press me</Text>
      </GlassContainer>
    </AnimatedPressable>
  );
};
```

## Migrating Existing Components

### Step 1: Replace BlurView + LinearGradient
```jsx
// Old code
<BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
  <LinearGradient
    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
    style={StyleSheet.absoluteFillObject}
  />
</BlurView>

// New code
<GlassContainer
  intensity={20}
  gradientColors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
>
```

### Step 2: Replace press animations
```jsx
// Old code
const scale = useSharedValue(1);
const handlePressIn = () => {
  scale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
};
const handlePressOut = () => {
  scale.value = withSpring(1, { damping: 10, stiffness: 400 });
};

// New code
const { animatedPressableStyle, handlePressIn, handlePressOut } = useGlassPressable();
```

## Components to Refactor

**High Priority:**
- [ ] LiquidGlassButton (done)
- [ ] LiquidGlassCard (done)
- [ ] LiquidGlassInput
- [ ] LiquidGlassToast
- [ ] GlassModal

**Medium Priority:**
- [ ] GlassHeader
- [ ] GlassModalSelector

## Testing

After refactoring each component:

```bash
# Check that component works
npm run start

# Run tests
npm run test

# Check types
npm run typecheck
```

## Migration Plan

### Phase 1: Core Components (2 hours)
1. Deploy GlassContainer and useGlassPressable
2. Refactor LiquidGlassButton and LiquidGlassCard
3. Test in existing screens

### Phase 2: Input Components (1 hour)
1. Refactor LiquidGlassInput with focus animations
2. Update forms using LiquidGlassInput

### Phase 3: Overlay Components (1 hour)
1. Refactor LiquidGlassToast and GlassModal
2. Test modal and toast functionality

### Phase 4: Cleanup (30 min)
1. Remove old implementations
2. Update imports across codebase
3. Run full test suite