import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';
import GlassModal from '../components/GlassModal';
import useGlassModal from '../hooks/useGlassModal';

export default function ModalDemoScreen() {
  const theme = useLiquidGlassTheme();
  const { modalState, showModal, showConfirm, showAlert, showError } = useGlassModal();

  if (!theme) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.title.fontSize * 0.8,
      fontWeight: theme.typography.title.fontWeight,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    buttonsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      justifyContent: 'center',
    },
    buttonContainer: {
      minWidth: '45%',
    },
  });

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <View style={styles.content}>
        <LiquidGlassCard variant="elevated" padding="lg">
          <View style={styles.buttonsGrid}>
            <LiquidGlassButton
              title="Simple Alert"
              variant="primary"
              style={styles.buttonContainer}
              onPress={() => showAlert({
                title: 'Success',
                message: 'Operation completed successfully!',
              })}
            />
            
            <LiquidGlassButton
              title="Error Alert"
              variant="danger"
              style={styles.buttonContainer}
              onPress={() => showError({
                message: 'Something went wrong! Please try again.',
              })}
            />
            
            <LiquidGlassButton
              title="Confirmation"
              variant="secondary"
              style={styles.buttonContainer}
              onPress={() => showConfirm({
                title: 'Delete Item',
                message: 'Are you sure you want to delete this item? This action cannot be undone.',
                confirmText: 'Delete',
                confirmType: 'danger',
                onConfirm: () => {
                  showAlert({
                    title: 'Deleted',
                    message: 'Item has been deleted successfully.',
                  });
                },
              })}
            />
            
            <LiquidGlassButton
              title="3 Button Modal"
              variant="ghost"
              style={styles.buttonContainer}
              onPress={() => showModal({
                title: 'Choose Action',
                message: 'What would you like to do?',
                buttons: [
                  {
                    label: 'Edit',
                    type: 'primary',
                    onPress: () => showAlert({
                      title: 'Edit',
                      message: 'Edit action selected.',
                    }),
                  },
                  {
                    label: 'Archive',
                    type: 'secondary',
                    onPress: () => showAlert({
                      title: 'Archive',
                      message: 'Archive action selected.',
                    }),
                  },
                  {
                    label: 'Delete',
                    type: 'danger',
                    onPress: () => showAlert({
                      title: 'Delete',
                      message: 'Delete action selected.',
                    }),
                  },
                ],
              })}
            />
            
            <LiquidGlassButton
              title="Long Message"
              variant="warning"
              style={styles.buttonContainer}
              onPress={() => showAlert({
                title: 'Important Notice',
                message: 'This is a longer message to demonstrate how the glass modal handles text content that spans multiple lines. The modal should gracefully expand to accommodate the content while maintaining its beautiful liquid glass appearance.',
              })}
            />
            
            <LiquidGlassButton
              title="No Close on Backdrop"
              variant="primary"
              style={styles.buttonContainer}
              onPress={() => showModal({
                title: 'Required Action',
                message: 'This modal cannot be closed by tapping outside. You must choose an option.',
                closeOnBackdrop: false,
                closeOnBackButton: false,
                buttons: [
                  {
                    label: 'Option A',
                    type: 'primary',
                    onPress: () => showAlert({
                      title: 'Selected',
                      message: 'Option A was selected.',
                    }),
                  },
                  {
                    label: 'Option B',
                    type: 'secondary',
                    onPress: () => showAlert({
                      title: 'Selected',
                      message: 'Option B was selected.',
                    }),
                  },
                ],
              })}
            />
          </View>
        </LiquidGlassCard>
      </View>

      {/* Glass Modal */}
      <GlassModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        buttons={modalState.buttons}
        onClose={modalState.onClose}
        closeOnBackdrop={modalState.closeOnBackdrop}
        closeOnBackButton={modalState.closeOnBackButton}
      />
    </LiquidGlassLayout>
  );
}