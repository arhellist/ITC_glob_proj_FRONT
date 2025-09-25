/**
 * Утилита для получения IP адреса пользователя
 */
class IPFinder {
  /**
   * Получить публичный IP адрес через внешние сервисы
   */
  static async getPublicIP() {
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://jsonip.com',
      'https://api.myip.com'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          timeout: 5000
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Разные сервисы возвращают IP в разных полях
        const ip = data.ip || data.ipaddress || data.query;
        
        if (ip && this.isValidIP(ip)) {
          console.log(`Public IP obtained from ${service}: ${ip}`);
          return ip;
        }
      } catch (error) {
        console.warn(`Сервис ${service} недоступен:`, error.message);
      }
    }
    
    throw new Error('Все сервисы для получения публичного IP недоступны');
  }
  
  /**
   * Получить локальный IP адрес через WebRTC
   */
  static getLocalIP() {
    return new Promise((resolve) => {
      const peerConnection = new RTCPeerConnection({ 
        iceServers: [] 
      });
      
      peerConnection.createDataChannel('');
      
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .catch(error => {
          console.warn('Ошибка создания WebRTC offer:', error);
          resolve(null);
        });
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const ipMatch = event.candidate.candidate.match(ipRegex);
          
          if (ipMatch && this.isValidIP(ipMatch[1])) {
            console.log(`Local IP obtained via WebRTC: ${ipMatch[1]}`);
            resolve(ipMatch[1]);
            peerConnection.close();
          }
        }
      };
      
      // Таймаут для WebRTC
      setTimeout(() => {
        peerConnection.close();
        resolve(null);
      }, 3000);
    });
  }
  
  /**
   * Получить IP адрес (сначала локальный, потом публичный)
   */
  static async getIP() {
    try {
      // Сначала пробуем получить локальный IP
      const localIP = await this.getLocalIP();
      if (localIP) {
        return localIP;
      }
      
      // Если локальный IP не получили, пробуем публичный
      const publicIP = await this.getPublicIP();
      return publicIP;
      
    } catch (error) {
      console.warn('Не удалось получить IP адрес:', error.message);
      return 'Unknown';
    }
  }
  
  /**
   * Проверить валидность IP адреса
   */
  static isValidIP(ip) {
    if (!ip || typeof ip !== 'string') {
      return false;
    }
    
    // Проверяем IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) {
      return true;
    }
    
    // Проверяем IPv6 (упрощенная проверка)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Получить информацию о браузере и устройстве
   */
  static getBrowserInfo() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const cookieEnabled = navigator.cookieEnabled;
    const onLine = navigator.onLine;
    
    return {
      userAgent,
      platform,
      language,
      cookieEnabled,
      onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

export default IPFinder;
