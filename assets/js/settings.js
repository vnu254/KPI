/**
 * TỆP: assets/js/settings.js
 * CHỨC NĂNG: Điều khiển trang Cấu hình Hệ thống, Quản trị Zalo Bot, Trigger nhắc hạn và Nhật ký Notifications (Giai đoạn 7).
 */

const SettingsPage = {
  async init() {
    const user = await App.initProtectedPage('settings', 'Cấu hình Hệ thống & Quản trị Zalo Bot');
    if (!user) return;

    if (user.Role !== 'SUPER_ADMIN') {
      App.toast('Chỉ Quản trị viên tối cao (SUPER_ADMIN) mới có quyền truy cập trang này.', 'error');
      setTimeout(() => { window.location.href = '../dashboard.html'; }, 1500);
      return;
    }

    this.bindEvents();
    await this.loadOverview();
  },

  bindEvents() {
    document.getElementById('form-system-settings').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveSettings();
    });

    document.getElementById('btn-refresh-settings').addEventListener('click', () => this.loadOverview());

    document.getElementById('btn-test-admin-zalo').addEventListener('click', async () => {
      const chatId = document.getElementById('cfg-admin-chatid').value.trim();
      try {
        const res = await ApiClient.call('zalo.testDirectSend', {
          chatId: chatId,
          message: '🔔 Tin nhắn kiểm thử từ Trang Cấu hình Hệ thống (Giai đoạn 7).'
        });
        App.toast(res.message, res.success ? 'success' : 'error');
        await this.loadOverview();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    document.getElementById('btn-run-reminder-now').addEventListener('click', async () => {
      try {
        App.toast('Đang quét công việc sắp đến hạn & quá hạn...', 'info');
        const res = await ApiClient.call('settings.runReminderScan', {});
        if (res.success) {
          App.toast(res.message, 'success');
          await this.loadOverview();
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    document.getElementById('btn-install-triggers').addEventListener('click', async () => {
      try {
        const res = await ApiClient.call('settings.installAutomationTriggers', {});
        if (res.success) {
          App.toast(res.message, 'success');
          this.renderOverviewData(res.data);
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    document.getElementById('btn-verify-db').addEventListener('click', async () => {
      try {
        const res = await ApiClient.call('system.verifyDatabase', {});
        if (res.success) {
          App.toast(res.message, 'success');
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  async loadOverview() {
    try {
      const res = await ApiClient.call('settings.getOverview', {});
      if (res.success && res.data) {
        this.renderOverviewData(res.data);
      }
    } catch (err) {
      App.toast('Lỗi tải cấu hình: ' + err.message, 'error');
    }
  },

  renderOverviewData(data) {
    const cfg = data.botConfig || {};
    const st = data.stats || {};

    // KPI Cards
    document.getElementById('stat-zalo-sent').textContent = st.sentNotifications || 0;
    document.getElementById('stat-zalo-total').textContent = `Tổng: ${st.totalNotifications || 0} bản ghi`;
    document.getElementById('stat-zalo-failed').textContent = st.failedNotifications || 0;
    document.getElementById('stat-linked-users').textContent = `${st.linkedUsersCount || 0} / ${st.totalUsersCount || 0}`;
    document.getElementById('stat-synced-cal').textContent = `${st.syncedCalendarTasksCount || 0} / ${st.totalTasksCount || 0}`;
    document.getElementById('stat-email-quota').textContent = `Quota Email còn lại: ${st.remainingEmailQuota ?? '--'}/ngày`;

    // Form inputs
    document.getElementById('lbl-masked-token').textContent = cfg.hasToken ? cfg.maskedToken : 'Chưa cài đặt';
    document.getElementById('cfg-bot-token').value = '';
    document.getElementById('cfg-api-url').value = cfg.apiUrl || 'https://bot-api.zapps.me/bot';
    document.getElementById('cfg-admin-chatid').value = cfg.adminChatId || '';
    document.getElementById('cfg-calendar-id').value = cfg.unitCalendarId || 'primary';
    document.getElementById('cfg-remind-hours').value = cfg.remindBeforeHours || 24;
    document.getElementById('cfg-session-hours').value = cfg.sessionTimeoutHours || 24;
    document.getElementById('cfg-auto-remind').checked = cfg.enableAutoRemind !== false;
    document.getElementById('cfg-email-fallback').checked = cfg.enableEmailFallback !== false;

    // Triggers
    const trigUl = document.getElementById('trigger-list-ul');
    const triggers = data.triggers || [];
    if (triggers.length === 0) {
      trigUl.innerHTML = `<li style="color:#dc2626;">Chưa có Trigger tự động nào được cài đặt.</li>`;
    } else {
      trigUl.innerHTML = triggers.map(t =>
        `<li><strong>${App.escapeHtml(t.handlerFunction)}</strong> (${App.escapeHtml(t.eventType)})</li>`
      ).join('');
    }

    // Notifications table
    const tbody = document.getElementById('notif-log-tbody');
    const logs = data.recentNotifications || [];
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748b;">Chưa có bản ghi thông báo nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(n => {
      const status = String(n.Status || 'PENDING').toUpperCase();
      const canRetry = status === 'FAILED' || status === 'ERROR';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; white-space: nowrap;">${App.escapeHtml(n.Sent_At || n.Created_At || '')}</td>
          <td style="padding: 10px;"><span class="badge">${App.escapeHtml(n.Notify_Type || '')}</span></td>
          <td style="padding: 10px;">${App.escapeHtml(n.Recipient_User_ID || '')}</td>
          <td style="padding: 10px; font-family: monospace;">${App.escapeHtml(n.Target_Zalo_Chat_ID || '')}</td>
          <td style="padding: 10px; max-width: 280px;">
            <div style="font-weight: 600;">${App.escapeHtml(n.Title || '')}</div>
            ${n.Error_Message ? `<div style="color:#dc2626; font-size:11px;">Lỗi: ${App.escapeHtml(n.Error_Message)}</div>` : ''}
          </td>
          <td style="padding: 10px;">
            <span class="status-pill status-${App.escapeHtml(status)}">${App.escapeHtml(status)}</span>
          </td>
          <td style="padding: 10px;">
            ${canRetry ? `<button class="btn btn-outline btn-sm btn-retry-notif" data-id="${App.escapeHtml(n.Notification_ID)}">🔁 Gửi lại</button>` : '—'}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-retry-notif').forEach(btn => {
      btn.addEventListener('click', async () => {
        const notifId = btn.getAttribute('data-id');
        try {
          const res = await ApiClient.call('settings.retryNotification', { notificationId: notifId });
          App.toast(res.message, res.success ? 'success' : 'error');
          await this.loadOverview();
        } catch (err) {
          App.toast(err.message, 'error');
        }
      });
    });
  },

  async saveSettings() {
    try {
      const payload = {
        botToken: document.getElementById('cfg-bot-token').value.trim(),
        apiUrl: document.getElementById('cfg-api-url').value.trim(),
        adminChatId: document.getElementById('cfg-admin-chatid').value.trim(),
        unitCalendarId: document.getElementById('cfg-calendar-id').value.trim(),
        remindBeforeHours: Number(document.getElementById('cfg-remind-hours').value || 24),
        sessionTimeoutHours: Number(document.getElementById('cfg-session-hours').value || 24),
        enableAutoRemind: document.getElementById('cfg-auto-remind').checked,
        enableEmailFallback: document.getElementById('cfg-email-fallback').checked
      };

      const res = await ApiClient.call('settings.save', payload);
      if (res.success) {
        App.toast(res.message, 'success');
        this.renderOverviewData(res.data);
      }
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

window.addEventListener('DOMContentLoaded', () => SettingsPage.init());