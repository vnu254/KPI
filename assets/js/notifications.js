/**
 * TỆP: assets/js/notifications.js
 * CHỨC NĂNG: Điều khiển hiển thị Trung tâm Thông báo, Lịch sử gửi Zalo Bot / Gmail,
 *            Kích hoạt quét nhắc việc tức thì và Thử gửi lại tin nhắn lỗi.
 */

const NotificationsController = {
  TYPE_LABELS: {
    TASK_NEW:         'Giao nhiệm vụ mới',
    TASK_GROUP_NEW:   'Nhiệm vụ nhóm mới',
    TASK_UPDATED:     'Cập nhật nhiệm vụ',
    TASK_EXTENDED:    'Gia hạn nhiệm vụ',
    TASK_CANCELLED:   'Hủy nhiệm vụ',
    REMIND_DEADLINE:  'Nhắc việc sắp đến hạn',
    REMIND_REPORT:    'Báo cáo tiến độ mới',
    TASK_OVERDUE:     'Cảnh báo quá hạn',
    REQUEST_PROGRESS: 'Yêu cầu báo cáo tiến độ',
    REPORT_APPROVED:  'Xác nhận hoàn thành',
    REPORT_REJECTED:  'Yêu cầu bổ sung / Làm lại',
    NEW_COMMENT:      'Trao đổi mới',
    TEST_BOT:         'Kiểm thử Zalo Bot',
    TEST_EMAIL:       'Kiểm thử Gmail'
  },

  renderChannelBadge(channel) {
    if (channel === 'ZALO_BOT') {
      return '<span class="status-badge" style="background:#dbeafe;color:#1d4ed8;">💬 Zalo Bot</span>';
    }
    if (channel === 'FALLBACK_EMAIL') {
      return '<span class="status-badge" style="background:#fef3c7;color:#b45309;">📧 Gmail Dự phòng</span>';
    }
    return `<span class="status-badge" style="background:#e0f2fe;color:#0369a1;">📧 ${App.escapeHtml(channel)}</span>`;
  },

  renderSendStatusBadge(status) {
    if (status === 'SENT' || status === 'FALLBACK_SENT') {
      return `<span class="status-badge status-ACTIVE">✅ Thành công (${App.escapeHtml(status)})</span>`;
    }
    if (status === 'FAILED') {
      return '<span class="status-badge status-LOCKED">❌ Thất bại</span>';
    }
    return `<span class="status-badge">${App.escapeHtml(status)}</span>`;
  },

  async loadNotifications() {
    const scopeEl = document.getElementById('ntf-flt-scope');
    const payload = {
      scope: scopeEl ? scopeEl.value : 'MINE',
      channel: document.getElementById('ntf-flt-channel').value,
      sendStatus: document.getElementById('ntf-flt-status').value,
      notifyType: document.getElementById('ntf-flt-type').value,
      limit: 120
    };

    const res = await ApiClient.call('notifications.list', payload);
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    const list = res.data.notifications || [];
    const sum = res.data.summary || {};

    document.getElementById('ntf-st-total').textContent = sum.total || 0;
    document.getElementById('ntf-st-zalo').textContent = sum.sentZalo || 0;
    document.getElementById('ntf-st-email').textContent = sum.sentEmail || 0;
    document.getElementById('ntf-st-failed').textContent = sum.failed || 0;

    const tbody = document.getElementById('tbody-notifications');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">Chưa có bản ghi thông báo nào.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(n => {
      const typeLabel = this.TYPE_LABELS[n.Notify_Type] || n.Notify_Type;
      const taskLink = n.Related_Task_ID
        ? `<a href="./task-detail.html?id=${encodeURIComponent(n.Related_Task_ID)}" style="font-weight:700;color:var(--blue-600);text-decoration:none;">${App.escapeHtml(n.Related_Task_ID)}</a>`
        : '---';

      return `
        <tr style="${!n.Is_Read_In_App ? 'background:#f8fafc;' : ''}">
          <td>
            <strong>${App.escapeHtml(n.Notification_ID)}</strong>
            <div style="font-size:11px;color:var(--slate-500);">${App.escapeHtml(n.Created_At)}</div>
          </td>
          <td>
            <span class="role-badge role-SUPER_ADMIN">${App.escapeHtml(typeLabel)}</span>
            <div style="margin-top:4px;">Nhiệm vụ: ${taskLink}</div>
          </td>
          <td>
            <strong>${App.escapeHtml(n.Recipient_Name)}</strong>
            <div style="font-size:11px;color:var(--slate-500);">
              ${n.Target_Zalo_Chat_ID ? `ChatID: <code>${App.escapeHtml(n.Target_Zalo_Chat_ID)}</code>` : App.escapeHtml(n.Target_Email)}
            </div>
          </td>
          <td>
            <div style="font-weight:700;color:var(--navy-800);">${App.escapeHtml(n.Title)}</div>
            <div style="font-size:12px;white-space:pre-wrap;color:var(--slate-700);max-width:380px;">${App.escapeHtml(n.Message_Body)}</div>
          </td>
          <td>${this.renderChannelBadge(n.Channel)}</td>
          <td>
            ${this.renderSendStatusBadge(n.Send_Status)}
            ${n.Error_Message ? `<div style="font-size:11px;color:var(--danger);margin-top:3px;">${App.escapeHtml(n.Error_Message)}</div>` : ''}
          </td>
          <td><small>${n.Retry_Count || 0} lần</small></td>
          <td style="white-space:nowrap;">
            ${!n.Is_Read_In_App ? `<button class="btn btn-outline btn-sm" onclick="markSingleRead('${App.escapeHtml(n.Notification_ID)}')">Đã đọc</button>` : ''}
            ${n.Send_Status === 'FAILED' ? `<button class="btn btn-primary btn-sm" onclick="retrySingleNotif('${App.escapeHtml(n.Notification_ID)}')">🔄 Gửi lại</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }
};

window.NotificationsController = NotificationsController;