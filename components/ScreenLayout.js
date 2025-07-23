/* ScreenLayout.js
   Universal screen wrapper component that provides consistent layout and spacing
   for all screens in the application, especially handling bottom tab bar spacing */

import React from 'react';
import { View, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiquidGlassLayout from './LiquidGlassLayout';
import LiquidGlassButton from './LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

/**
 * Universal screen layout component
 * 
 * Props:
 * - children: React elements to render
 * - scrollable: boolean (default: true) - whether content should be scrollable
 * - keyboardAware: boolean (default: true) - whether to handle keyboard
 * - edges: array (default: ['bottom']) - safe area edges to respect
 * - style: additional styles for the container
 * - contentContainerStyle: additional styles for scroll content
 * - header: React element to render as fixed header
 * - footer: React element to render as fixed footer
 * - noPadding: boolean (default: false) - disable default padding
 * - customPaddingBottom: number - custom bottom padding (overrides default)
 */
export default function ScreenLayout({
    children,
    scrollable = true,
    keyboardAware = true,
    edges = ['bottom'],
    style,
    contentContainerStyle,
    header,
    footer,
    noPadding = false,
    customPaddingBottom,
    ...props
}) {
    const theme = useLiquidGlassTheme();

    if (!theme) {
        return null;
    }

    // Calculate bottom padding based on platform and tab bar height
    const getBottomPadding = () => {
        if (customPaddingBottom !== undefined) {
            return customPaddingBottom;
        }
        
        // Tab bar heights from _layout.js
        const tabBarHeight = Platform.OS === 'ios' ? 88 : 68;
        const additionalPadding = 20; // Extra padding for visual comfort
        
        return tabBarHeight + additionalPadding;
    };

    const styles = StyleSheet.create({
        safeArea: {
            flex: 1,
        },
        container: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: getBottomPadding(),
            paddingHorizontal: noPadding ? 0 : theme.spacing.lg,
            paddingTop: noPadding ? 0 : theme.spacing.lg,
        },
        nonScrollContent: {
            flex: 1,
            paddingBottom: getBottomPadding(),
            paddingHorizontal: noPadding ? 0 : theme.spacing.lg,
            paddingTop: noPadding ? 0 : theme.spacing.lg,
        },
        header: {
            zIndex: 10,
        },
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for home indicator
            zIndex: 10,
        },
    });

    const content = (
        <>
            {header && <View style={styles.header}>{header}</View>}
            
            {scrollable ? (
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    {...props}
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.nonScrollContent, contentContainerStyle]}>
                    {children}
                </View>
            )}
            
            {footer && <View style={styles.footer}>{footer}</View>}
        </>
    );

    const containerContent = keyboardAware && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior="padding"
            keyboardVerticalOffset={0}
        >
            {content}
        </KeyboardAvoidingView>
    ) : (
        <View style={[styles.container, style]}>
            {content}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={edges}>
            <LiquidGlassLayout>
                {containerContent}
            </LiquidGlassLayout>
        </SafeAreaView>
    );
}

/**
 * Common screen patterns as static methods
 */

// Standard screen with header
ScreenLayout.WithHeader = ({ title, subtitle, children, ...props }) => {
    const theme = useLiquidGlassTheme();
    
    if (!theme) return null;
    
    const headerStyles = StyleSheet.create({
        header: {
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
        },
        title: {
            fontSize: theme.typography.title.fontSize * 0.7,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
            textShadowColor: theme.shadows.text.color,
            textShadowOffset: theme.shadows.text.offset,
            textShadowRadius: theme.shadows.text.radius,
        },
        subtitle: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.secondary,
            textAlign: 'center',
        },
    });
    
    const header = (
        <View style={headerStyles.header}>
            {typeof title === 'string' ? (
                <Text style={headerStyles.title}>{title}</Text>
            ) : (
                title
            )}
            {subtitle && (
                <Text style={headerStyles.subtitle}>{subtitle}</Text>
            )}
        </View>
    );
    
    return (
        <ScreenLayout header={header} {...props}>
            {children}
        </ScreenLayout>
    );
};

// Form screen with save button footer
ScreenLayout.WithForm = ({ children, onSave, saveLabel = 'Save', saving = false, ...props }) => {
    const theme = useLiquidGlassTheme();
    
    if (!theme) return null;
    
    const footer = onSave && (
        <View style={{ 
            paddingHorizontal: theme.spacing.lg, 
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.glass.dark,
        }}>
            <LiquidGlassButton
                title={saving ? 'Saving...' : saveLabel}
                onPress={onSave}
                disabled={saving}
                variant="primary"
            />
        </View>
    );
    
    return (
        <ScreenLayout footer={footer} {...props}>
            {children}
        </ScreenLayout>
    );
};