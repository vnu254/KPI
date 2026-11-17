/**
 * TỆP: assets/js/calendar.js
 * CHỨC NĂNG: Tích hợp thư viện FullCalendar hiển thị Lịch cá nhân, Lịch nhiệm vụ giao,
 *            Lịch nhiệm vụ nhóm và điều khiển đồng bộ Google Calendar + Gmail.
 */

let calendarInstance = null;
let cachedCalendarEvents = [];
let selectedEventTaskId = '';

const CalendarController = {
  async init() {
    const calendarEl = document.getElementById('fullcalendar-box');
    if (!calendarEl) return;

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
      initialView: window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth',
      locale: 'vi',
      firstDay: 1, // Bắt đầu tuần từ Thứ Hai
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
      },
      buttonText: {
        today: 'Hôm nay',
        month: 'Tháng',
        week: 'Tuần',
        day: 'Ngày',
        list: 'Lịch biểu'
      },
      eventClick: (info) => {
        this.openEventModal(info.event);
      }
    });

    calendarInstance.render();
    await this.loadFilterDropdowns();
    await this.refreshEvents();
    await this.loadGmailQuota();
  },

  async loadFilterDropdowns() {
    const res = await ApiClient.call('groups.list');
    if (res.success) {
      const groups = res.data.groups || [];
      const sel = document.getElementById('cal-flt-group');
      if (sel) {
        sel.innerHTML = '<option value="ALL">Tất cả đơn vị / bộ phận</option>' +
          groups.map(g => `<option value="${App.escapeHtml(g.Group_ID)}">${App.escapeHtml(g.Group_Code)} - ${App.escapeHtml(g.Group_Name)}</option>`).join('');
      }
    }
  },

  async loadGmailQuota() {
    const res = await ApiClient.call('gmail.quota');
    if (res.success && res.data) {
      const el = document.getElementById('gmail-quota-badge');
      if (el) {
        el.textContent = `Hạn mức Gmail còn lại hôm nay: ${res.data.remainingQuota} email`;
      }
    }
  },

  async refreshEvents() {
    const scope = document.getElementById('cal-flt-scope').value;
    const groupId = document.getElementById('cal-flt-group').value;
    const status = document.getElementById('cal-flt-status').value;

    const res = await ApiClient.call('calendar.events', {
      calendarScope: scope,
      groupId: groupId,
      status: status
    });

    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    cachedCalendarEvents = res.data.events || [];
    const syncLogs = res.data.syncLogs || [];

    if (calendarInstance) {
      calendarInstance.removeAllEvents();
      calendarInstance.addEventSource(cachedCalendarEvents);
    }

    this.renderSyncLogsTable(syncLogs);
  },

  renderSyncLogsTable(logs) {
    const tbody = document.getElementById('tbody-calendar-logs');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;color:#64748b;">Chưa có bản ghi đồng bộ Google Calendar nào.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><code>${App.escapeHtml(l.Sync_ID)}</code></td>
        <td><a href="./task-detail.html?id=${encodeURIComponent(l.Task_ID)}" style="font-weight:700;color:var(--blue-600);text-decoration:none;">${App.escapeHtml(l.Task_ID)}</a></td>
        <td><strong>${App.escapeHtml(l.Event_Title)}</strong></td>
        <td><small>${App.escapeHtml(l.Start_Time)} → ${App.escapeHtml(l.End_Time)}</small></td>
        <td>
          <span class="status-badge status-${l.Sync_Status === 'SYNC_ERROR' ? 'LOCKED' : 'ACTIVE'}">
            ${App.escapeHtml(l.Sync_Status)}
          </span>
          ${l.Error_Log ? `<div style="font-size:11px;color:var(--danger);">${App.escapeHtml(l.Error_Log)}</div>` : ''}
        </td>
        <td><small>${App.escapeHtml(l.Last_Synced_At)}</small></td>
      </tr>
    `).join('');
  },

  openEventModal(fcEvent) {
    const p = fcEvent.extendedProps || {};
    selectedEventTaskId = p.Task_ID;

    document.getElementById('ev-modal-title').textContent = p.Raw_Title || fcEvent.title;
    document.getElementById('ev-modal-body').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div><small style="color:var(--slate-500);">Mã nhiệm vụ:</small><br><strong>${App.escapeHtml(p.Task_ID)}</strong></div>
        <div><small style="color:var(--slate-500);">Phân loại:</small><br>${TaskUI.renderCategoryBadge(p.Task_Category)}</div>
        <div><small style="color:var(--slate-500);">Người giao:</small><br><strong>${App.escapeHtml(p.Assigner_Name)}</strong></div>
        <div><small style="color:var(--slate-500);">Người thực hiện:</small><br><strong>${App.escapeHtml(p.Primary_Assignee_Name)}</strong></div>
        <div><small style="color:var(--slate-500);">Đơn vị:</small><br><strong>${App.escapeHtml(p.Group_Name)}</strong></div>
        <div><small style="color:var(--slate-500);">Thời hạn:</small><br><strong style="color:var(--danger);">${TaskUI.formatVnDate(p.Due_Date, p.Due_Time)}</strong></div>
        <div><small style="color:var(--slate-500);">Trạng thái:</small><br>${TaskUI.renderStatusBadge(p.Status)}</div>
        <div><small style="color:var(--slate-500);">Tiến độ:</small><br>${TaskUI.renderProgressBar(p.Progress)}</div>
      </div>
      <div style="padding:10px 12px;background:var(--slate-100);border-radius:8px;font-size:12px;">
        <strong>Trạng thái Google Calendar:</strong>
        ${p.Calendar_Synced
          ? `<span style="color:var(--success);font-weight:700;">✅ Đã đồng bộ (${App.escapeHtml(p.Last_Synced_At)})</span>`
          : `<span style="color:var(--warning);font-weight:700;">⏳ Chưa đồng bộ</span>`
        }
      </div>
    `;

    document.getElementById('btn-ev-goto-detail').href = `./task-detail.html?id=${encodeURIComponent(p.Task_ID)}`;
    document.getElementById('modal-cal-event').classList.add('open');
  }
};

window.CalendarController = CalendarController;