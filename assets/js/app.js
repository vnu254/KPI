/**
 * TỆP: assets/js/app.js
 * CHỨC NĂNG: Quản lý khung giao diện Sidebar, Topbar, Bottom Bar di động (Android + iPhone),
 *            kiểm tra phiên đăng nhập và điều hướng.
 */

const App = {
  currentUser: null,
  groups: [],
  unreadCount: 0,
  enabledPages: ['dashboard', 'tasks', 'calendar', 'reports', 'notifications', 'users', 'profile', 'settings', 'kpi'],

  getRootPrefix() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
  },

  isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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

  async toggleAndroidLandscapeFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          await screen.orientation.lock('landscape');
        }
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      }
      this.closeMobileSidebar();
    } catch (e) {
      this.toast('Hãy tắt khóa xoay trên điện thoại rồi xoay ngang máy để xem rộng hơn.', 'error');
    }
  },

  closeMobileSidebar() {
    const sb = document.getElementById('app-sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('open');
  },

  toggleMobileSidebar() {
    const sb = document.getElementById('app-sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.toggle('open');
    if (ov) ov.classList.toggle('open');
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

    const canLockLandscape = !this.isIOS() && screen.orientation && typeof screen.orientation.lock === 'function';

    // 1. Tạo màn che tối (Overlay) cho Mobile
    let overlayEl = document.getElementById('sidebar-overlay');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'sidebar-overlay';
      overlayEl.className = 'sidebar-overlay';
      document.body.appendChild(overlayEl);
      overlayEl.addEventListener('click', () => this.closeMobileSidebar());
    }

    // 2. Render Sidebar
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
          ${canLockLandscape ? `
            <button type="button" id="btn-toggle-land-mode" class="btn btn-outline btn-sm" style="width:100%;margin-bottom:8px;background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.22);">
              🔄 Bật/Tắt Màn hình ngang
            </button>
          ` : ''}
          <div>Tài khoản: <strong style="color:#fff;">${this.escapeHtml(u.Full_Name)}</strong></div>
          <div>Phiên bản: 9.0 (KPI & Mobile)</div>
          <div>Zalo: <strong>${u.Zalo_Linked ? '✅ Đã liên kết' : '⚠️ Chưa liên kết'}</strong></div>
        </div>
      `;

      const landBtn = document.getElementById('btn-toggle-land-mode');
      if (landBtn) {
        landBtn.addEventListener('click', () => this.toggleAndroidLandscapeFullscreen());
      }

      sidebarEl.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
          const pageKey = link.getAttribute('data-page');
          if (pageKey && !this.enabledPages.includes(pageKey)) {
            e.preventDefault();
            this.toast('Phân hệ này sẽ được kích hoạt ở giai đoạn tiếp theo.', 'error');
            return;
          }
          if (window.innerWidth <= 960 || window.innerHeight <= 520) {
            this.closeMobileSidebar();
          }
        });
      });
    }

    // 3. Render Topbar
    const topbarEl = document.getElementById('app-topbar');
    if (topbarEl) {
      topbarEl.innerHTML = `
        <div class="topbar-left">
          <button class="menu-toggle-btn" id="btn-toggle-sidebar" aria-label="Mở danh mục">☰</button>
          <div class="page-heading">${this.escapeHtml(pageTitle)}</div>
        </div>
        <div class="topbar-right">
          <a href="${root}pages/notifications.html" class="btn btn-outline btn-sm" style="position:relative;border:none;padding:6px 8px;" title="Thông báo">
            🔔
            ${this.unreadCount > 0 ? `<span style="position:absolute;top:0;right:0;background:var(--danger);color:#fff;padding:1px 5px;border-radius:10px;font-size:10px;font-weight:bold;">${this.unreadCount}</span>` : ''}
          </a>
          <div class="user-pill">
            <span><strong>${this.escapeHtml(u.Full_Name)}</strong></span>
            <span class="role-badge role-${this.escapeHtml(u.Role)}">${this.escapeHtml(u.Role)}</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-logout" title="Đăng xuất">⎋</button>
        </div>
      `;

      document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
        this.toggleMobileSidebar();
      });

      document.getElementById('btn-logout').addEventListener('click', async () => {
        await ApiClient.call('auth.logout');
        ApiClient.clearSession();
        window.location.href = root + 'login.html';
      });
    }

    // 4. Render Thanh điều hướng 1 tay dưới đáy cho Điện thoại (Android + iPhone)
    this.renderMobileBottomNav(activeKey, root);
  },

  renderMobileBottomNav(activeKey, root) {
    let nav = document.getElementById('mob-bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'mob-bottom-nav';
      document.body.appendChild(nav);
    }

    const isMoreActive = ['calendar', 'notifications', 'users', 'profile', 'settings'].includes(activeKey);
    const notifDot = this.unreadCount > 0
      ? `<span class="mbn-dot">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>`
      : '';

    nav.innerHTML = `
      <a href="${root}dashboard.html" class="${activeKey === 'dashboard' ? 'active' : ''}">
        <span class="mbn-ico">📊</span><span>Tổng quan</span>
      </a>
      <a href="${root}pages/tasks.html" class="${activeKey === 'tasks' ? 'active' : ''}">
        <span class="mbn-ico">📋</span><span>Công việc</span>
      </a>
      <a href="${root}pages/reports.html" class="${activeKey === 'reports' ? 'active' : ''}">
        <span class="mbn-ico">📑</span><span>Báo cáo</span>
      </a>
      <a href="${root}pages/kpi-monthly.html" class="${activeKey === 'kpi' ? 'active' : ''}">
        <span class="mbn-ico">🏅</span><span>KPI</span>
      </a>
      <button type="button" id="mbn-open-more" class="${isMoreActive ? 'active' : ''}">
        ${notifDot}
        <span class="mbn-ico">☰</span><span>Thêm</span>
      </button>
    `;

    document.getElementById('mbn-open-more').addEventListener('click', () => {
      this.toggleMobileSidebar();
    });
  }
};

window.App = App;

// TÍCH HỢP SERVICE WORKER (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const rootPath = window.location.pathname.includes('/pages/') ? '../sw.js' : './sw.js';
    navigator.serviceWorker.register(rootPath).catch(err => {
      console.log('Lỗi đăng ký PWA: ', err);
    });
  });
}