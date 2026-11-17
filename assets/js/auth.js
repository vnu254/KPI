/**
 * TỆP: assets/js/auth.js
 * CHỨC NĂNG: Điều khiển sự kiện Đăng nhập, Quên mật khẩu OTP và Cấu hình kết nối.
 */

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('form-login');
  const formForgot = document.getElementById('form-forgot');
  const boxApiConfig = document.getElementById('box-api-config');
  const inputGasUrl = document.getElementById('input-gas-url');

  if (inputGasUrl) {
    const currentUrl = localStorage.getItem('CUSTOM_GAS_URL') || AppConfig.GAS_WEB_APP_URL;
    if (!currentUrl.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT')) {
      inputGasUrl.value = currentUrl;
    }
  }

  // Chuyển đổi giữa màn hình Đăng nhập và Quên mật khẩu
  document.getElementById('link-forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.style.display = 'none';
    formForgot.style.display = 'block';
  });

  document.getElementById('link-back-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    formForgot.style.display = 'none';
    formLogin.style.display = 'block';
  });

  document.getElementById('link-config-api')?.addEventListener('click', (e) => {
    e.preventDefault();
    boxApiConfig.style.display = boxApiConfig.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btn-save-gas-url')?.addEventListener('click', async () => {
    const val = inputGasUrl.value.trim();
    if (!val) {
      App.toast('Vui lòng dán URL Web App (/exec) của Google Apps Script.', 'error');
      return;
    }
    ApiClient.setGasUrl(val);
    try {
      const ping = await ApiClient.call('system.ping');
      if (ping.success) {
        App.toast('Kết nối Google Apps Script thành công!');
        boxApiConfig.style.display = 'none';
      }
    } catch (err) {
      App.toast('Lỗi kết nối: ' + err.message, 'error');
    }
  });

  // Xử lý Đăng nhập
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'Đang xác thực...';

    try {
      const res = await ApiClient.call('auth.login', { email, password });
      if (!res.success) {
        App.toast(res.message || 'Đăng nhập thất bại.', 'error');
        return;
      }
      ApiClient.saveSession(res.data);
      App.toast('Đăng nhập thành công!');
      window.location.href = './dashboard.html';
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Đăng nhập Hệ thống';
    }
  });

  // Gửi mã OTP khôi phục mật khẩu
  document.getElementById('btn-send-otp')?.addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
      App.toast('Vui lòng nhập địa chỉ Email trước khi lấy mã OTP.', 'error');
      return;
    }
    const btn = document.getElementById('btn-send-otp');
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';
    try {
      const res = await ApiClient.call('auth.requestOtp', { email });
      if (res.success) {
        App.toast(res.message);
      } else {
        App.toast(res.message, 'error');
      }
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Lấy mã OTP';
    }
  });

  // Xác nhận đặt lại mật khẩu bằng OTP
  formForgot?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const otpCode = document.getElementById('reset-otp').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    const btn = document.getElementById('btn-submit-reset');
    btn.disabled = true;
    try {
      const res = await ApiClient.call('auth.resetPassword', { email, otpCode, newPassword });
      if (res.success) {
        App.toast(res.message);
        formForgot.reset();
        formForgot.style.display = 'none';
        formLogin.style.display = 'block';
      } else {
        App.toast(res.message, 'error');
      }
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
});