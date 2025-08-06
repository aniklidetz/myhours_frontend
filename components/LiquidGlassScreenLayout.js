/* LiquidGlassScreenLayout.js
   Liquid Glass screen wrapper that properly handles safe areas and tab bar spacing
   without interfering with the glass background effect */

import React from 'react';
import { View, ScrollView, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlassLayout from './LiquidGlassLayout';
import GlassHeader from './GlassHeader';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

/**
 * Liquid Glass Screen Layout Component
 * 
 * Handles proper spacing for tab bar without breaking the glass effect.
 * Does NOT wrap in SafeAreaView at the root to avoid interfering with
 * the liquid glass background that should extend to screen edges.
 * 
 * Props:
 * - children: React elements to render
 * - scrollable: boolean (default: true) - whether content should be scrollable  
 * - keyboardAware: boolean (default: true) - whether to handle keyboard
 * - style: additional styles for the container
 * - contentContainerStyle: additional styles for scroll content
 * - header: React element to render as fixed header
 * - footer: React element to render as fixed footer
 * - noPadding: boolean (default: false) - disable default padding
 * - noBottomPadding: boolean (default: false) - disable bottom tab bar padding
 */
export default function LiquidGlassScreenLayout({
    children,
    scrollable = true,
    keyboardAware = true,
    safeArea = true,
    style,
    contentContainerStyle,
    header,
    footer,
    noPadding = false,
    noBottomPadding = false,
    ...props
}) {
    const theme = useLiquidGlassTheme();
    const insets = useSafeAreaInsets();

    if (!theme) {
        return null;
    }

    // Calculate proper spacing that won't interfere with tab bar
    const getBottomPadding = () => {
        if (noBottomPadding) return 0;

        // Tab bar configuration from _layout.js
        const tabBarHeight = Platform.OS === 'ios' ? 88 : 68;
        // Add extra padding for visual comfort
        const extraPadding = 16;

        return tabBarHeight + extraPadding;
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: 'transparent', // Important: keep transparent for glass effect
        },
        scrollContent: {
            flexGrow: 1,
            paddingTop: noPadding ? 0 : theme.spacing.lg,
            paddingHorizontal: noPadding ? 0 : theme.spacing.lg,
            paddingBottom: getBottomPadding(),
        },
        nonScrollContent: {
            flex: 1,
            paddingTop: noPadding ? 0 : theme.spacing.lg,
            paddingHorizontal: noPadding ? 0 : theme.spacing.lg,
            paddingBottom: getBottomPadding(),
        },
        header: {
            zIndex: 10,
            backgroundColor: 'transparent',
        },
        footer: {
            position: 'absolute',
            bottom: insets.bottom,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: 'transparent',
        },
    });

    const renderContent = () => {
        if (scrollable) {
            return (
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={{ backgroundColor: 'transparent' }}
                    {...props}
                >
                    {children}
                </ScrollView>
            );
        } else {
            return (
                <View style={[styles.nonScrollContent, contentContainerStyle]}>
                    {children}
                </View>
            );
        }
    };

    const content = (
        <>
            {header && <View style={styles.header}>{header}</View>}
            {renderContent()}
            {footer && <View style={styles.footer}>{footer}</View>}
        </>
    );

    const containerContent = keyboardAware && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
            style={[styles.container, style]} 
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

    // Use LiquidGlassLayout as the base wrapper (which handles the glass background)
    // Pass safeArea prop to control safe area handling
    return (
        <LiquidGlassLayout scrollable={scrollable} safeArea={safeArea}>
            {containerContent}
        </LiquidGlassLayout>
    );
}

/**
 * Variant for full-screen content (like camera screens)
 */
LiquidGlassScreenLayout.FullScreen = ({ children, ...props }) => {
    return (
        <LiquidGlassScreenLayout
            scrollable={false}
            noPadding={true}
            noBottomPadding={true}
            {...props}
        >
            {children}
        </LiquidGlassScreenLayout>
    );
};

/**
 * Variant with GlassHeader
 */
LiquidGlassScreenLayout.WithGlassHeader = ({ 
    title, 
    subtitle, 
    onBack,
    backDestination,
    showBackButton = true,
    showLogout = false,
    rightIcon,
    onRightPress,
    footerContent,
    children, 
    ...props 
}) => {
    const header = (
        <GlassHeader
            title={title}
            subtitle={subtitle}
            onBack={onBack}
            backDestination={backDestination}
            showBackButton={showBackButton}
            showLogout={showLogout}
            rightIcon={rightIcon}
            onRightPress={onRightPress}
        />
    );
    
    return (
        <LiquidGlassScreenLayout 
            header={header}
            footer={footerContent}
            {...props}
        >
            {children}
        </LiquidGlassScreenLayout>
    );
};

/**
 * Legacy support - redirect to new GlassHeader version
 */
LiquidGlassScreenLayout.WithHeaderFooter = LiquidGlassScreenLayout.WithGlassHeader;