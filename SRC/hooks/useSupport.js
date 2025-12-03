import { useContext } from 'react';
import { SupportContext } from '../contexts/SupportContextContext.js';

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
};
