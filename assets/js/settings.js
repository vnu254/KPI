/**
 * TỆP: assets/js/settings.js
 * CHỨC NĂNG: Quản trị Cài đặt hệ thống (SETTINGS), Cấu hình bảo mật Zalo Bot & Google Calendar,
 *            Quản lý Triggers tự động, Công tắc & Xoay vòng Sao lưu CSDL và Tra cứu Nhật ký (AUDIT_LOG).
 */

const SettingsController = {
  ALL_REMIND_PRESETS: [
    { mins: 15,   label: '15 phút trước hạn' },
    { mins: 30,   label: '30 phút trước hạn' },
    { mins: 60,   label: '1 giờ trước hạn' },
    { mins: 120,  label: '2 giờ trước hạn' },
    { mins: 180,  label: '3 giờ trước hạn' },
    { mins: 360,  label: '6 giờ trước hạn' },
    { mins: 720,  label: '12 giờ trước hạn' },
    { mins: 1440, label: '1 ngày (24 giờ) trước hạn' },
    { mins: 2880, label: '2 ngày (48 giờ) trước hạn' }
  ],

  ALL_NOTIFY_TYPES: [
    { code: 'TASK_NEW',         label: 'Khi có nhiệm vụ mới được giao' },
    { code: 'TASK_GROUP_NEW',   label: 'Khi có nhiệm vụ nhóm mới' },
    { code: 'TASK_UPDATED',     label: 'Khi nhiệm vụ được chỉnh sửa' },
    { code: 'TASK_EXTENDED',    label: 'Khi nhiệm vụ được gia hạn' },
    { code: 'TASK_CANCELLED',   label: 'Khi nhiệm vụ bị hủy' },
    { code: 'REMIND_DEADLINE',  label: 'Khi sắp đến thời hạn hoàn thành (Nhắc việc)' },
    { code: 'TASK_OVERDUE',     label: 'Khi nhiệm vụ đã quá hạn (Cảnh báo quá hạn)' },
    { code: 'REQUEST_PROGRESS', label: 'Khi người quản lý yêu cầu cập nhật tiến độ' },
    { code: 'REMIND_REPORT',    label: 'Khi cán bộ gửi báo cáo tiến độ mới' },
    { code: 'REPORT_APPROVED',  label: 'Khi báo cáo được xác nhận hoàn thành' },
    { code: 'REPORT_REJECTED',  label: 'Khi báo cáo bị yêu cầu bổ sung / làm lại' },
    { code: 'NEW_COMMENT',      label: 'Khi có nội dung trao đổi / bình luận mới' }
  ],

  async init() {
    this.renderRemindPresetCheckboxes();
    this.renderNotifyTypesCheckboxes();
    await this.loadAllSettings();
  },

  renderRemindPresetCheckboxes() {
    const box = document.getElementById('box-remind-presets');
    if (!box) return;
    box.innerHTML = this.ALL_REMIND_PRESETS.map(p => `
      <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--slate-100);border-radius:6px;cursor:pointer;">
        <input type="checkbox" class="chk-remind-preset" value="${p.mins}">
        <span>${App.escapeHtml(p.label)}</span>
      </label>
    `).join('');
  },

  renderNotifyTypesCheckboxes() {
    const box = document.getElementById('box-notify-types');
    if (!box) return;
    box.innerHTML = this.ALL_NOTIFY_TYPES.map(t => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--slate-100);border-radius:6px;cursor:pointer;">
        <input type="checkbox" class="chk-notify-type" value="${t.code}" checked>
        <span>${App.escapeHtml(t.label)}</span>
      </label>
    `).join('');
  },

  async loadAllSettings() {
    const res = await ApiClient.call('settings.get');
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    const s = res.data.settings || {};
    const sec = res.data.secretsSummary || {};
    const trig = res.data.triggersStatus || {};
    const quota = res.data.gmailQuota || {};

    // Tab 1: Cài đặt chung & Nhắc việc
    document.getElementById('set-unit-name').value = s['UNIT_NAME'] || 'ĐƠN VỊ QUẢN LÝ CÔNG VIỆC NỘI BỘ';
    document.getElementById('set-session-hours').value = s['SESSION_TIMEOUT_HOURS'] || '24';
    document.getElementById('set-enable-zalo').checked = String(s['ENABLE_ZALO_BOT']).toLowerCase() !== 'false';
    document.getElementById('set-enable-fallback').checked = String(s['ENABLE_EMAIL_FALLBACK']).toLowerCase() !== 'false';
    document.getElementById('set-enable-calendar').checked = String(s['ENABLE_CALENDAR_SYNC']).toLowerCase() !== 'false';

    let savedMins = [];
    try { savedMins = JSON.parse(s['DEFAULT_REMIND_MINS'] || '[1440, 180, 60, 30]'); } catch (e) { savedMins = [1440, 180, 60, 30]; }
    const presetValues = this.ALL_REMIND_PRESETS.map(p => p.mins);
    const customMins = savedMins.filter(m => !presetValues.includes(Number(m)));

    document.querySelectorAll('.chk-remind-preset').forEach(chk => {
      chk.checked = savedMins.map(Number).includes(Number(chk.value));
    });
    document.getElementById('set-custom-remind').value = customMins.join(', ');

    let disabledTypes = [];
    try { disabledTypes = JSON.parse(s['DISABLED_NOTIFY_TYPES'] || '[]'); } catch (e) { disabledTypes = []; }
    document.querySelectorAll('.chk-notify-type').forEach(chk => {
      chk.checked = !disabledTypes.includes(chk.value);
    });

    // Tab 2: Cấu hình Zalo Bot (Script Properties)
    document.getElementById('sec-zalo-url').value = sec.ZALO_BOT_API_URL || 'https://bot-api.zapps.me';
    document.getElementById('sec-zalo-token-masked').textContent = sec.ZALO_BOT_TOKEN_MASKED || '(Chưa cấu hình)';
    document.getElementById('sec-spreadsheet-id').textContent = sec.SPREADSHEET_ID || '';

    // Tab 3: Calendar, Gmail, Triggers & Công tắc Sao lưu / Xoay vòng
    document.getElementById('sec-trigger-15m').innerHTML = trig.has15MinScanner
      ? '<span class="status-badge status-ACTIVE">✅ Đang chạy (15 phút/lần)</span>'
      : '<span class="status-badge status-LOCKED">⚠️ Chưa kích hoạt</span>';
    document.getElementById('sec-trigger-daily').innerHTML = trig.hasDailyMaintenance
      ? '<span class="status-badge status-ACTIVE">✅ Đang chạy (00:15 hằng ngày)</span>'
      : '<span class="status-badge status-LOCKED">⚠️ Chưa kích hoạt</span>';
    document.getElementById('sec-gmail-quota').textContent = `${quota.remainingQuota !== undefined ? quota.remainingQuota : '--'} email còn lại trong ngày`;

    const retInput = document.getElementById('set-backup-retention');
    if (retInput) {
      retInput.value = (s['BACKUP_RETENTION_DAYS'] !== undefined && s['BACKUP_RETENTION_DAYS'] !== '') ? s['BACKUP_RETENTION_DAYS'] : '7';
    }

    const calInput = document.getElementById('sec-calendar-id');
    if (calInput) {
      calInput.value = sec.GOOGLE_CALENDAR_ID || sec.googleCalendarId || '';
    }

    window.isAutoBackupEnabled = (s['ENABLE_DAILY_BACKUP'] === undefined || String(s['ENABLE_DAILY_BACKUP']).trim().toLowerCase() !== 'false');
    if (typeof window.renderAutoBackupToggleUI === 'function') {
      window.renderAutoBackupToggleUI();
    }
  },

  async loadAuditLogs() {
    const mod = document.getElementById('aud-flt-module').value;
    const res = await ApiClient.call('audit.list', { module: mod, limit: 100 });
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    const logs = res.data.logs || [];
    const tbody = document.getElementById('tbody-audit-logs');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Không có bản ghi nhật ký nào.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><code>${App.escapeHtml(l.Audit_ID)}</code><br><small style="color:var(--slate-500);">${App.escapeHtml(l.Created_At)}</small></td>
        <td><strong>${App.escapeHtml(l.Actor_Email || l.Actor_ID)}</strong><br><span class="role-badge role-${App.escapeHtml(l.Actor_Role)}">${App.escapeHtml(l.Actor_Role)}</span></td>
        <td><strong>${App.escapeHtml(l.Module)}</strong></td>
        <td><code style="color:var(--blue-600);font-weight:700;">${App.escapeHtml(l.Action)}</code></td>
        <td>${App.escapeHtml(l.Target_ID)}</td>
        <td><div style="font-size:12px;max-width:340px;word-break:break-all;">${App.escapeHtml(l.Detail_JSON)}</div></td>
        <td><span class="status-badge status-${l.Result === 'SUCCESS' ? 'ACTIVE' : 'LOCKED'}">${App.escapeHtml(l.Result)}</span></td>
      </tr>
    `).join('');
  }
};

window.SettingsController = SettingsController;