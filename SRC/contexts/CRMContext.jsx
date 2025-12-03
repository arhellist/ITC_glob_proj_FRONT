import React, { createContext, useContext, useState } from 'react';

const CRMContext = createContext();

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

export const CRMProvider = ({ children }) => {
  const [dealsUnreadCount, setDealsUnreadCount] = useState(0);
  const [clientUnreadMessages, setClientUnreadMessages] = useState({});

  const incrementDealsCount = () => {
    console.log('📈 incrementDealsCount вызвана');
    setDealsUnreadCount(prev => {
      console.log(`📊 incrementDealsCount: ${prev} -> ${prev + 1}`);
      return prev + 1;
    });
  };

  const resetDealsCount = () => {
    console.log('🔄 resetDealsCount вызвана');
    setDealsUnreadCount(0);
  };

  const setClientUnread = (clientId, count) => {
    setClientUnreadMessages(prev => ({
      ...prev,
      [clientId]: count
    }));
  };

  const incrementClientUnread = (clientId) => {
    console.log(`📈 incrementClientUnread вызвана для клиента ${clientId}`);
    setClientUnreadMessages(prev => {
      const newCount = (prev[clientId] || 0) + 1;
      console.log(`📊 incrementClientUnread: клиент ${clientId}: ${prev[clientId] || 0} -> ${newCount}`);
      return {
        ...prev,
        [clientId]: newCount
      };
    });
  };

  const resetClientUnread = (clientId) => {
    console.log(`🔄 resetClientUnread вызвана для клиента ${clientId}`);
    setClientUnreadMessages(prev => ({
      ...prev,
      [clientId]: 0
    }));
  };

  const value = {
    dealsUnreadCount,
    clientUnreadMessages,
    incrementDealsCount,
    resetDealsCount,
    setClientUnread,
    incrementClientUnread,
    resetClientUnread,
    setClientUnreadMessages
  };

  return (
    <CRMContext.Provider value={value}>
      {children}
    </CRMContext.Provider>
  );
};
