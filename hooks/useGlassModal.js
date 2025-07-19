import { useState, useCallback } from 'react';

const useGlassModal = () => {
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    onClose: null,
    closeOnBackdrop: true,
    closeOnBackButton: true,
  });

  const showModal = useCallback(({
    title,
    message,
    buttons = [],
    closeOnBackdrop = true,
    closeOnBackButton = true,
    onClose = null,
  }) => {
    setModalState({
      visible: true,
      title,
      message,
      buttons,
      closeOnBackdrop,
      closeOnBackButton,
      onClose,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Helper methods for common modal patterns
  const showConfirm = useCallback(({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmType = 'primary',
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
      onClose: onCancel ? () => {
        hideModal();
        onCancel();
      } : hideModal,
    });
  }, [showModal, hideModal]);

  const showAlert = useCallback(({
    title,
    message,
    buttonText = 'OK',
    onPress,
  }) => {
    showModal({
      title,
      message,
      buttons: [
        {
          label: buttonText,
          type: 'primary',
          onPress: () => {
            hideModal();
            if (onPress) onPress();
          },
        },
      ],
      onClose: hideModal,
    });
  }, [showModal, hideModal]);

  const showError = useCallback(({
    title = 'Error',
    message,
    buttonText = 'OK',
    onPress,
  }) => {
    showModal({
      title,
      message,
      buttons: [
        {
          label: buttonText,
          type: 'danger',
          onPress: () => {
            hideModal();
            if (onPress) onPress();
          },
        },
      ],
      onClose: hideModal,
    });
  }, [showModal, hideModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showConfirm,
    showAlert,
    showError,
  };
};

export default useGlassModal;