import React from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, View, StyleSheet } from 'react-native';
import LiquidGlassBackground from './LiquidGlassBackground';

const LiquidGlassLayout = ({ 
  children, 
  scrollable = true,
  keyboardAvoiding = true,
  safeArea = true,
  style,
  contentStyle,
  showsVerticalScrollIndicator = false
}) => {
  const content = (
    <>
      {scrollable ? (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>
          {children}
        </View>
      )}
    </>
  );

  const keyboardContent = keyboardAvoiding ? (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      {content}
    </KeyboardAvoidingView>
  ) : content;

  const safeContent = safeArea ? (
    <SafeAreaView style={[styles.container, style]}>
      {keyboardContent}
    </SafeAreaView>
  ) : (
    <View style={[styles.container, style]}>
      {keyboardContent}
    </View>
  );

  return (
    <LiquidGlassBackground>
      {safeContent}
    </LiquidGlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});

export default LiquidGlassLayout;