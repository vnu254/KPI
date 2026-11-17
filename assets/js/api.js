/**
 * TỆP: assets/js/api.js
 * CHỨC NĂNG: Kết nối Fetch API từ GitHub Pages sang Google Apps Script (Không lỗi CORS).
 */

const AppConfig = {
  // Dán URL Web App (/exec) của Google Apps Script vào đây (hoặc nhập trực tiếp trên màn hình Đăng nhập)
  GAS_WEB_APP_URL: localStorage.getItem('CUSTOM_GAS_URL') || 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE',
  REQUEST_TIMEOUT_MS: 30000,
  SESSION_STORAGE_KEY: 'INTERNAL_TASK_APP_SESSION'
};

const ApiClient = {
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
    if (url && url.trim()) {
      localStorage.setItem('CUSTOM_GAS_URL', url.trim());
      AppConfig.GAS_WEB_APP_URL = url.trim();
    }
  },

  async call(action, payload = {}) {
    const endpoint = localStorage.getItem('CUSTOM_GAS_URL') || AppConfig.GAS_WEB_APP_URL;
    if (!endpoint || endpoint.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT')) {
      throw new Error('Chưa cấu hình URL Google Apps Script (/exec). Vui lòng nhập URL tại mục Cấu hình kết nối.');
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