/**
 * TỆP: assets/js/app.js
 * CHỨC NĂNG: Quản lý khung giao diện Sidebar, Topbar (Kèm chuông thông báo), kiểm tra phiên và điều hướng.
 */

const App = {
  currentUser: null,
  groups: [],
  unreadCount: 0,
 enabledPages: ['dashboard', 'tasks', 'calendar', 'reports', 'notifications', 'users', 'profile', 'settings', 'kpi'],

  getRootPrefix() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  toast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => item.remove(), 4000);
  },

  async initProtectedPage(pageKey, pageTitle) {
    const sess = ApiClient.getSession();
    const root = this.getRootPrefix();

    if (!sess || !sess.token) {
      window.location.href = root + 'login.html';
      return null;
    }

    try {
      const res = await ApiClient.call('auth.me');
      if (!res.success) {
        ApiClient.clearSession();
        window.location.href = root + 'login.html';
        return null;
      }

      this.currentUser = res.data.user;
      this.groups = res.data.groups || [];
      this.unreadCount = Number(res.data.unreadNotificationsCount) || 0;
      sess.user = this.currentUser;
      ApiClient.saveSession(sess);

      this.renderShell(pageKey, pageTitle);
      return this.currentUser;
    } catch (err) {
      this.toast(err.message, 'error');
      return null;
    }
  },

  renderShell(activeKey, pageTitle) {
    const root = this.getRootPrefix();
    const u = this.currentUser;
    const isAdmin = u.Role === 'SUPER_ADMIN';
    const isManagerOrAdmin = (u.Role === 'SUPER_ADMIN' || u.Role === 'MANAGER');
    const badgeHtml = this.unreadCount > 0
      ? `<span style="background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:auto;">${this.unreadCount}</span>`
      : '';

    // 1. Tạo màn che tối (Overlay) cho Mobile
    let overlayEl = document.getElementById('sidebar-overlay');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'sidebar-overlay';
      overlayEl.className = 'sidebar-overlay';
      document.body.appendChild(overlayEl);

      // Bấm vào vùng tối sẽ tự đóng Sidebar
      overlayEl.addEventListener('click', () => {
        const sb = document.getElementById('app-sidebar');
        if (sb) sb.classList.remove('open');
        overlayEl.classList.remove('open');
      });
    }

    const sidebarEl = document.getElementById('app-sidebar');
    if (sidebarEl) {
      sidebarEl.innerHTML = `
        <div class="sidebar-brand">
          <div class="brand-badge">QL</div>
          <div>
            <div class="brand-title">QUẢN LÝ CÔNG VIỆC</div>
            <div class="brand-subtitle">Hệ thống điều hành nội bộ</div>
          </div>
        </div>
        <div class="sidebar-nav">
          <div class="nav-section-label">Điều hành chung</div>
          <a href="${root}dashboard.html" data-page="dashboard" class="nav-item ${activeKey === 'dashboard' ? 'active' : ''}">📊 Bảng điều khiển</a>
          <a href="${root}pages/tasks.html" data-page="tasks" class="nav-item ${activeKey === 'tasks' ? 'active' : ''}">📋 Quản lý Công việc</a>
          <a href="${root}pages/calendar.html" data-page="calendar" class="nav-item ${activeKey === 'calendar' ? 'active' : ''}">📅 Lịch công việc</a>
          <a href="${root}pages/reports.html" data-page="reports" class="nav-item ${activeKey === 'reports' ? 'active' : ''}">📈 Báo cáo & Đánh giá</a>
<a href="${root}pages/kpi-monthly.html" data-page="kpi" class="nav-item ${activeKey === 'kpi' ? 'active' : ''}">🏅 Đánh giá KPI</a>
          <a href="${root}pages/notifications.html" data-page="notifications" class="nav-item ${activeKey === 'notifications' ? 'active' : ''}">
            🔔 Thông báo & Zalo ${badgeHtml}
          </a>

          <div class="nav-section-label">Tổ chức & Hệ thống</div>
          ${isManagerOrAdmin ? `<a href="${root}pages/users.html" data-page="users" class="nav-item ${activeKey === 'users' ? 'active' : ''}">👥 Quản lý Cán bộ & Đơn vị</a>` : ''}
          <a href="${root}pages/profile.html" data-page="profile" class="nav-item ${activeKey === 'profile' ? 'active' : ''}">👤 Hồ sơ & Zalo Bot</a>
          ${isAdmin ? `<a href="${root}pages/settings.html" data-page="settings" class="nav-item ${activeKey === 'settings' ? 'active' : ''}">⚙️ Cài đặt Hệ thống</a>` : ''}
        </div>
        <div class="sidebar-footer">
          <div>Phiên bản: 8.0 (Mobile UI)</div>
          <div>Trạng thái Zalo: <strong>${u.Zalo_Linked ? '✅ Đã liên kết' : '⚠️ Chưa liên kết'}</strong></div>
        </div>
      `;

      // Xử lý chặn lỗi 404 và tự đóng menu trên Mobile
      sidebarEl.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
          const pageKey = link.getAttribute('data-page');
          if (pageKey && !this.enabledPages.includes(pageKey)) {
            e.preventDefault();
            this.toast('Phân hệ này sẽ được kích hoạt ở giai đoạn tiếp theo.', 'error');
            return;
          }
          // Tự đóng menu khi chọn trang (trên thiết bị di động)
          if (window.innerWidth <= 900) {
            sidebarEl.classList.remove('open');
            overlayEl.classList.remove('open');
          }
        });
      });
    }

    const topbarEl = document.getElementById('app-topbar');
    if (topbarEl) {
      topbarEl.innerHTML = `
        <div class="topbar-left">
          <button class="menu-toggle-btn" id="btn-toggle-sidebar">☰</button>
          <div class="page-heading">${this.escapeHtml(pageTitle)}</div>
        </div>
        <div class="topbar-right">
          <a href="${root}pages/notifications.html" class="btn btn-outline btn-sm" style="position:relative;border:none;">
            🔔
            ${this.unreadCount > 0 ? `<span style="position:absolute;top:-2px;right:-2px;background:var(--danger);color:#fff;padding:1px 5px;border-radius:10px;font-size:10px;font-weight:bold;">${this.unreadCount}</span>` : ''}
          </a>
          <div class="user-pill">
            <span><strong>${this.escapeHtml(u.Full_Name)}</strong></span>
            <span class="role-badge role-${this.escapeHtml(u.Role)}">${this.escapeHtml(u.Role)}</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-logout" title="Đăng xuất">⎋</button>
        </div>
      `;

      // Bật/tắt Sidebar và Màn che tối
      document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
        overlayEl.classList.toggle('open');
      });

      document.getElementById('btn-logout').addEventListener('click', async () => {
        await ApiClient.call('auth.logout');
        ApiClient.clearSession();
        window.location.href = root + 'login.html';
      });
    }
  }
};

window.App = App;
// TÍCH HỢP SERVICE WORKER (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Đăng ký sw.js từ thư mục gốc
    const rootPath = window.location.pathname.includes('/pages/') ? '../sw.js' : './sw.js';
    navigator.serviceWorker.register(rootPath).catch(err => {
      console.log('Lỗi đăng ký PWA: ', err);
    });
  });
}