/**
 * TỆP: assets/js/calendar.js
 * CHỨC NĂNG: Điều khiển giao diện FullCalendar, lọc sự kiện, đồng bộ Google Calendar và gửi Email nhắc việc (Giai đoạn 6).
 */

const CalendarPage = {
  calendarInstance: null,
  rawEvents: [],
  selectedTaskProps: null,

  async init() {
    const user = await App.initProtectedPage('calendar', 'Lịch công việc & Đồng bộ Google Calendar');
    if (!user) return;

    this.bindEvents();
    this.initFullCalendar();
    await this.loadCalendarEvents();
  },

  bindEvents() {
    document.getElementById('btn-cal-refresh').addEventListener('click', () => this.loadCalendarEvents());
    document.getElementById('filter-cal-status').addEventListener('change', () => this.applyClientFilters());
    document.getElementById('filter-cal-priority').addEventListener('change', () => this.applyClientFilters());

    document.getElementById('btn-sync-all-calendar').addEventListener('click', async () => {
      try {
        App.toast('Đang đồng bộ dữ liệu lên Google Calendar...', 'info');
        const res = await ApiClient.call('calendar.syncAll', {});
        if (res.success) {
          App.toast(res.message, 'success');
          await this.loadCalendarEvents();
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    document.getElementById('btn-close-event-modal').addEventListener('click', () => {
      document.getElementById('event-detail-modal').style.display = 'none';
    });

    document.getElementById('btn-sync-single-event').addEventListener('click', async () => {
      if (!this.selectedTaskProps || !this.selectedTaskProps.taskId) return;
      try {
        const res = await ApiClient.call('calendar.syncTask', { taskId: this.selectedTaskProps.taskId });
        if (res.success) {
          App.toast(res.message, 'success');
          await this.loadCalendarEvents();
          document.getElementById('event-detail-modal').style.display = 'none';
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    document.getElementById('btn-send-email-reminder').addEventListener('click', async () => {
      if (!this.selectedTaskProps || !this.selectedTaskProps.taskId) return;
      const note = prompt(
        'Nhập nội dung nhắc việc gửi qua Email cho ' + this.selectedTaskProps.assigneeName + ':',
        'Đề nghị đồng chí khẩn trương hoàn thành nhiệm vụ và báo cáo kết quả đúng thời hạn.'
      );
      if (note === null) return;

      try {
        const res = await ApiClient.call('calendar.sendEmailReminder', {
          taskId: this.selectedTaskProps.taskId,
          note: note
        });
        if (res.success) {
          App.toast(res.message, 'success');
        }
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  initFullCalendar() {
    const container = document.getElementById('fullcalendar-container');
    this.calendarInstance = new FullCalendar.Calendar(container, {
      locale: 'vi',
      initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
      },
      buttonText: {
        today: 'Hôm nay',
        month: 'Tháng',
        week: 'Tuần',
        list: 'Danh sách'
      },
      events: [],
      eventClick: (info) => {
        this.openEventModal(info.event);
      }
    });

    this.calendarInstance.render();
  },

  async loadCalendarEvents() {
    try {
      const res = await ApiClient.call('calendar.listEvents', {});
      if (!res.success) return;

      this.rawEvents = res.data.events || [];
      const stats = res.data.stats || {};

      document.getElementById('cal-kpi-total').textContent = stats.totalEvents || 0;
      document.getElementById('cal-kpi-completed').textContent = stats.completed || 0;
      document.getElementById('cal-kpi-overdue').textContent = stats.overdue || 0;
      document.getElementById('cal-kpi-synced').textContent = stats.syncedCalendar || 0;

      this.applyClientFilters();
    } catch (err) {
      App.toast('Lỗi tải lịch công việc: ' + err.message, 'error');
    }
  },

  applyClientFilters() {
    const stFilter = document.getElementById('filter-cal-status').value;
    const priFilter = document.getElementById('filter-cal-priority').value;

    const filtered = this.rawEvents.filter(ev => {
      const p = ev.extendedProps || {};
      if (p.eventType === 'HOLIDAY') return true;
      if (stFilter && p.status !== stFilter) return false;
      if (priFilter && p.priority !== priFilter) return false;
      return true;
    });

    this.calendarInstance.removeAllEvents();
    this.calendarInstance.addEventSource(filtered);
  },

  openEventModal(eventObj) {
    const p = eventObj.extendedProps || {};
    const modal = document.getElementById('event-detail-modal');
    const body = document.getElementById('modal-event-body');

    if (p.eventType === 'HOLIDAY') {
      document.getElementById('modal-event-title').textContent = p.title;
      body.innerHTML = `<p>${App.escapeHtml(p.description)}</p>`;
      document.getElementById('btn-sync-single-event').style.display = 'none';
      document.getElementById('btn-send-email-reminder').style.display = 'none';
      modal.style.display = 'flex';
      return;
    }

    this.selectedTaskProps = p;
    document.getElementById('btn-sync-single-event').style.display = 'inline-block';
    document.getElementById('btn-send-email-reminder').style.display = 'inline-block';

    document.getElementById('modal-event-title').textContent = `Nhiệm vụ: ${p.taskId}`;
    body.innerHTML = `
      <div><strong>Nội dung:</strong> ${App.escapeHtml(p.title)}</div>
      <div><strong>Người thực hiện:</strong> ${App.escapeHtml(p.assigneeName)}</div>
      <div><strong>Mức độ ưu tiên:</strong> <span class="badge">${App.escapeHtml(p.priority)}</span></div>
      <div><strong>Trạng thái:</strong> ${App.escapeHtml(p.status)} (${p.progress}%)</div>
      <div><strong>Hạn hoàn thành:</strong> <span style="color:#dc2626;font-weight:bold;">${App.escapeHtml(p.dueDateStr)}</span></div>
      <div><strong>Đồng bộ Google Calendar:</strong> ${p.calendarEventId ? '✅ Đã đồng bộ' : '⚪ Chưa đồng bộ'}</div>
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid #e2e8f0;">
      <div><strong>Mô tả chi tiết:</strong><br>${App.escapeHtml(p.description || 'Không có mô tả')}</div>
    `;

    modal.style.display = 'flex';
  }
};

window.addEventListener('DOMContentLoaded', () => CalendarPage.init());