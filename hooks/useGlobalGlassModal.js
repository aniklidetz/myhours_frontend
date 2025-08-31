import { useState } from 'react';
import GlassModal from '../components/GlassModal';

let globalModalInstance = null;

const useGlobalGlassModal = () => {
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    closeOnBackdrop: true,
    closeOnBackButton: true,
    onClose: null,
  });

  // Register this instance as the global modal controller
  if (!globalModalInstance) {
    globalModalInstance = setModalState;
  }

  const hideModal = () => {
    setModalState(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const showModal = config => {
    const {
      title = '',
      message = '',
      buttons = [],
      closeOnBackdrop = true,
      closeOnBackButton = true,
      onClose = hideModal,
    } = config;

    setModalState({
      visible: true,
      title,
      message,
      buttons,
      closeOnBackdrop,
      closeOnBackButton,
      onClose,
    });
  };

  const showAlert = ({ title = 'Alert', message = '', onConfirm = null }) => {
    showModal({
      title,
      message,
      buttons: [
        {
          label: 'OK',
          type: 'primary',
          onPress: () => {
            hideModal();
            if (onConfirm) onConfirm();
          },
        },
      ],
    });
  };

  const showError = ({ title = 'Error', message = '', onConfirm = null }) => {
    showModal({
      title,
      message,
      buttons: [
        {
          label: 'OK',
          type: 'danger',
          onPress: () => {
            hideModal();
            if (onConfirm) onConfirm();
          },
        },
      ],
    });
  };

  const showConfirm = ({
    title = 'Confirm',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmType = 'primary',
    onConfirm = null,
    onCancel = null,
  }) => {
    showModal({
      title,
      message,
      buttons: [
        {
          label: cancelText,
          type: 'secondary',
          onPress: () => {
            hideModal();
            if (onCancel) onCancel();
          },
        },
        {
          label: confirmText,
          type: confirmType,
          onPress: () => {
            hideModal();
            if (onConfirm) onConfirm();
          },
        },
      ],
    });
  };

  return {
    modalState,
    showModal,
    showAlert,
    showError,
    showConfirm,
    hideModal,
    GlassModal,
  };
};

// Global functions to replace Alert.alert()
export const showGlassAlert = (title, message, buttons = []) => {
  if (!globalModalInstance) {
    console.warn('Global GlassModal not initialized, falling back to Alert.alert');
    return;
  }

  if (typeof title === 'object') {
    // Handle new style: showGlassAlert({ title, message, onConfirm })
    const config = title;
    globalModalInstance({
      visible: true,
      title: config.title || 'Alert',
      message: config.message || '',
      buttons: [
        {
          label: 'OK',
          type: 'primary',
          onPress: () => {
            globalModalInstance(prev => ({ ...prev, visible: false }));
            if (config.onConfirm) config.onConfirm();
          },
        },
      ],
      closeOnBackdrop: true,
      closeOnBackButton: true,
      onClose: () => globalModalInstance(prev => ({ ...prev, visible: false })),
    });
    return;
  }

  // Handle classic Alert.alert style
  if (buttons.length === 0) {
    buttons = [{ text: 'OK', style: 'default' }];
  }

  const glassButtons = buttons.map((button, index) => ({
    label: button.text || 'Button',
    type:
      button.style === 'destructive' || button.style === 'cancel'
        ? button.style === 'destructive'
          ? 'danger'
          : 'secondary'
        : 'primary',
    onPress: () => {
      globalModalInstance(prev => ({ ...prev, visible: false }));
      if (button.onPress) button.onPress();
    },
  }));

  globalModalInstance({
    visible: true,
    title: title || 'Alert',
    message: message || '',
    buttons: glassButtons,
    closeOnBackdrop: true,
    closeOnBackButton: true,
    onClose: () => globalModalInstance(prev => ({ ...prev, visible: false })),
  });
};

export const showGlassConfirm = (title, message, onConfirm, onCancel) => {
  if (!globalModalInstance) {
    console.warn('Global GlassModal not initialized, falling back to Alert.alert');
    return;
  }

  globalModalInstance({
    visible: true,
    title: title || 'Confirm',
    message: message || '',
    buttons: [
      {
        label: 'Cancel',
        type: 'secondary',
        onPress: () => {
          globalModalInstance(prev => ({ ...prev, visible: false }));
          if (onCancel) onCancel();
        },
      },
      {
        label: 'Confirm',
        type: 'primary',
        onPress: () => {
          globalModalInstance(prev => ({ ...prev, visible: false }));
          if (onConfirm) onConfirm();
        },
      },
    ],
    closeOnBackdrop: true,
    closeOnBackButton: true,
    onClose: () => globalModalInstance(prev => ({ ...prev, visible: false })),
  });
};

export default useGlobalGlassModal;
