import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../api/apiService';
import { useUser } from './UserContext';
import { APP_CONFIG } from '../config';

const WORK_STATUS_KEY = '@MyHours:WorkStatus';

// Create context
const WorkStatusContext = createContext();

// Provider component
export const WorkStatusProvider = ({ children }) => {
  const [workStatus, setWorkStatus] = useState('off-shift'); // 'off-shift' | 'on-shift'
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { user } = useUser();

  // Load work status from backend
  const loadWorkStatus = useCallback(async (forceRefresh = false) => {
    if (!user || !user.id) {
      console.log('❌ No user found, skipping work status load');
      setWorkStatus('off-shift');
      setShiftStartTime(null);
      setCurrentSession(null);
      setLoading(false);
      return;
    }

    // Prevent too frequent updates (unless forced)
    if (!forceRefresh && lastUpdate) {
      const timeSinceLastUpdate = Date.now() - lastUpdate;
      if (timeSinceLastUpdate < 5000) { // 5 seconds
        console.log('⏭️ Skipping work status update (too soon)');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('🔄 Loading work status from backend...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Work status load timeout')), 8000);
      });
      
      const response = await Promise.race([
        ApiService.biometrics.checkStatus(),
        timeoutPromise
      ]);
      
      if (response.success || response.is_checked_in !== undefined) {
        const isCheckedIn = response.is_checked_in;
        const session = response.current_session;
        
        console.log('✅ Work status loaded:', {
          isCheckedIn,
          hasSession: !!session,
          employeeName: response.employee_info?.employee_name
        });
        
        if (isCheckedIn && session) {
          setWorkStatus('on-shift');
          setShiftStartTime(session.check_in_time);
          setCurrentSession(session);
          
          // Save to AsyncStorage
          const statusData = {
            status: 'on-shift',
            shiftStartTime: session.check_in_time,
            worklogId: session.worklog_id,
            location: session.location_check_in,
            updatedAt: new Date().toISOString()
          };
          await AsyncStorage.setItem(
            `${WORK_STATUS_KEY}_${user.id}`,
            JSON.stringify(statusData)
          );
        } else {
          setWorkStatus('off-shift');
          setShiftStartTime(null);
          setCurrentSession(null);
          
          // Clear from AsyncStorage
          await AsyncStorage.removeItem(`${WORK_STATUS_KEY}_${user.id}`);
        }
        
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('❌ Error loading work status:', error);
      
      // Don't let work status errors block the UI
      if (error.message?.includes('timeout')) {
        console.warn('⏰ Work status load timed out, using default state');
      }
      
      // Try to load from local storage as fallback
      try {
        const savedStatus = await AsyncStorage.getItem(`${WORK_STATUS_KEY}_${user.id}`);
        if (savedStatus) {
          const statusData = JSON.parse(savedStatus);
          console.log('📱 Using cached work status:', statusData);
          setWorkStatus(statusData.status);
          setShiftStartTime(statusData.shiftStartTime);
          setCurrentSession({
            worklog_id: statusData.worklogId,
            check_in_time: statusData.shiftStartTime,
            location_check_in: statusData.location
          });
        } else {
          // Default to off-shift if no cache
          setWorkStatus('off-shift');
          setShiftStartTime(null);
          setCurrentSession(null);
        }
      } catch (localError) {
        console.error('❌ Error loading cached status:', localError);
        // Final fallback
        setWorkStatus('off-shift');
        setShiftStartTime(null);
        setCurrentSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, lastUpdate]);

  // Check in handler
  const handleCheckInSuccess = useCallback(async (checkInData) => {
    console.log('✅ Check-in successful, updating global status:', checkInData);
    
    setWorkStatus('on-shift');
    setShiftStartTime(checkInData.check_in_time);
    setCurrentSession({
      worklog_id: checkInData.worklog_id,
      check_in_time: checkInData.check_in_time,
      location_check_in: checkInData.location
    });
    
    // Save to AsyncStorage
    if (user && user.id) {
      const statusData = {
        status: 'on-shift',
        shiftStartTime: checkInData.check_in_time,
        worklogId: checkInData.worklog_id,
        location: checkInData.location,
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(
        `${WORK_STATUS_KEY}_${user.id}`,
        JSON.stringify(statusData)
      );
    }
    
    // Clear employees cache to refresh hours data
    try {
      const ApiService = require('../api/apiService').default;
      await ApiService.employees.clearCache();
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
    
    setLastUpdate(Date.now());
  }, [user]);

  // Check out handler
  const handleCheckOutSuccess = useCallback(async (checkOutData) => {
    console.log('✅ Check-out successful, updating global status:', checkOutData);
    
    // Optimistic UI update
    setWorkStatus('off-shift');
    setShiftStartTime(null);
    setCurrentSession(null);
    
    // Clear from AsyncStorage
    if (user && user.id) {
      await AsyncStorage.removeItem(`${WORK_STATUS_KEY}_${user.id}`);
    }
    
    // Clear employees cache to refresh hours data
    try {
      const ApiService = require('../api/apiService').default;
      await ApiService.employees.clearCache();
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
    
    setLastUpdate(Date.now());
    
    // Delayed verification of actual status
    setTimeout(() => {
      console.log('🔄 Verifying status after check-out...');
      loadWorkStatus(true);
    }, 3000);
  }, [user, loadWorkStatus]);

  // Calculate current duration
  const getCurrentDuration = useCallback(() => {
    if (!shiftStartTime) return '0h 0m';
    
    const startTime = new Date(shiftStartTime);
    const now = new Date();
    const diffMs = now - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }, [shiftStartTime]);

  // Initial load when user changes
  useEffect(() => {
    if (user && user.id) {
      loadWorkStatus(true);
    }
  }, [user?.id]); // Don't include loadWorkStatus in deps to avoid circular dependency

  // Auto-refresh when on shift
  useEffect(() => {
    let intervalId = null;
    
    if (workStatus === 'on-shift') {
      // Refresh every 5 minutes when on shift
      intervalId = setInterval(() => {
        loadWorkStatus();
      }, 5 * 60 * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [workStatus, loadWorkStatus]);

  const value = {
    // State
    workStatus,
    shiftStartTime,
    currentSession,
    loading,
    lastUpdate,
    
    // Actions
    loadWorkStatus,
    handleCheckInSuccess,
    handleCheckOutSuccess,
    getCurrentDuration,
    
    // Computed
    isOnShift: workStatus === 'on-shift',
    isOffShift: workStatus === 'off-shift'
  };

  return (
    <WorkStatusContext.Provider value={value}>
      {children}
    </WorkStatusContext.Provider>
  );
};

// Custom hook
export const useWorkStatus = () => {
  const context = useContext(WorkStatusContext);
  if (!context) {
    throw new Error('useWorkStatus must be used within WorkStatusProvider');
  }
  return context;
};

export default WorkStatusContext;