import React, { createContext, useContext, useState, useCallback } from 'react';
import LiquidGlassToast from '../components/LiquidGlassToast';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      visible: true,
      duration: options.duration || 3000,
      position: options.position || 'top',
      ...options,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-hide after duration (if duration > 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const hideToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message, options = {}) => {
      return showToast(message, 'success', options);
    },
    [showToast]
  );

  const showError = useCallback(
    (message, options = {}) => {
      return showToast(message, 'error', options);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message, options = {}) => {
      return showToast(message, 'warning', options);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message, options = {}) => {
      return showToast(message, 'info', options);
    },
    [showToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        clearAll,
      }}
    >
      {children}
      {toasts.map(toast => (
        <LiquidGlassToast
          key={toast.id}
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          duration={0} // Controlled by context
          position={toast.position}
          onHide={() => hideToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
