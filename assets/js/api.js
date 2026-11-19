/**
 * TỆP: assets/js/api.js
 * CHỨC NĂNG: Kết nối Fetch API từ GitHub Pages sang Google Apps Script (Không lỗi CORS).
 */

// ===> BẠN DÁN LINK WEB APP (/exec) CỦA GOOGLE APPS SCRIPT VÀO DÒNG DƯỚI ĐÂY <===
const DEFAULT_GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbw7sQStbA-7k5svIcl3ik0HGBG23zHX_xXXRzaUQitLG-AgdJjCCID3e4YlAYqTDP9H/exec';

const AppConfig = {
  GAS_WEB_APP_URL: localStorage.getItem('CUSTOM_GAS_URL') || DEFAULT_GAS_EXEC_URL,
  REQUEST_TIMEOUT_MS: 30000,
  SESSION_STORAGE_KEY: 'INTERNAL_TASK_APP_SESSION'
};

const ApiClient = {
  normalizeGasUrl(rawUrl) {
    if (!rawUrl) return '';
    return String(rawUrl).trim().replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');
  },

  getSession() {
    try {
      const raw = localStorage.getItem(AppConfig.SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveSession(sessionObj) {
    localStorage.setItem(AppConfig.SESSION_STORAGE_KEY, JSON.stringify(sessionObj));
  },

  clearSession() {
    localStorage.removeItem(AppConfig.SESSION_STORAGE_KEY);
  },

  getSessionToken() {
    const sess = this.getSession();
    return (sess && sess.token) ? sess.token : '';
  },

  setGasUrl(url) {
    const cleanUrl = this.normalizeGasUrl(url);
    if (cleanUrl) {
      localStorage.setItem('CUSTOM_GAS_URL', cleanUrl);
      AppConfig.GAS_WEB_APP_URL = cleanUrl;
    }
  },

  async call(action, payload = {}) {
    const rawEndpoint = localStorage.getItem('CUSTOM_GAS_URL') || AppConfig.GAS_WEB_APP_URL;
    const endpoint = this.normalizeGasUrl(rawEndpoint);

    if (!endpoint || endpoint.includes('PASTE_YOUR_') || endpoint.includes('THAY_MA_DEPLOYMENT')) {
      throw new Error('Chưa cấu hình URL Google Apps Script (/exec). Vui lòng dán link vào dòng 6 của tệp assets/js/api.js hoặc nhập tại mục Cấu hình API URL.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AppConfig.REQUEST_TIMEOUT_MS);

    const requestBody = JSON.stringify({
      action: action,
      token: this.getSessionToken(),
      payload: payload,
      clientInfo: navigator.userAgent
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        credentials: 'omit', // Chống lỗi xung đột khi trình duyệt đăng nhập nhiều Gmail
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Lỗi kết nối HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success && (result.errorCode === 'SESSION_EXPIRED' || result.errorCode === 'UNAUTHORIZED')) {
        this.clearSession();
        if (!window.location.pathname.endsWith('login.html')) {
          const rootPrefix = window.location.pathname.includes('/pages/') ? '../' : './';
          window.location.href = rootPrefix + 'login.html?reason=expired';
        }
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Yêu cầu quá thời gian chờ (30 giây). Vui lòng thử lại.');
      }
      throw error;
    }
  }
};

window.AppConfig = AppConfig;
window.ApiClient = ApiClient;
