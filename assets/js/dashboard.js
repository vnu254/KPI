/**
 * TỆP: assets/js/dashboard.js
 * CHỨC NĂNG: Điều khiển hiển thị 3 Dashboard chuyên biệt (SUPER_ADMIN, MANAGER, USER),
 *            vẽ 6 Biểu đồ thực tế bằng Chart.js và Xuất 7 loại Báo cáo ra Excel (.xlsx) / PDF (.pdf).
 */

const DashboardController = {
  chartInstances: {},
  rawData: null,

  async init() {
    await this.loadFilterGroups();
    await this.refreshDashboard();
  },

  async loadFilterGroups() {
    const res = await ApiClient.call('groups.list');
    if (res.success) {
      const groups = res.data.groups || [];
      const sel = document.getElementById('db-flt-group');
      if (sel) {
        sel.innerHTML = '<option value="ALL">Toàn bộ đơn vị / bộ phận</option>' +
          groups.map(g => `<option value="${App.escapeHtml(g.Group_ID)}">${App.escapeHtml(g.Group_Code)} - ${App.escapeHtml(g.Group_Name)}</option>`).join('');
      }
      const expGroupSel = document.getElementById('exp-group-id');
      if (expGroupSel) {
        expGroupSel.innerHTML = '<option value="ALL">Toàn bộ đơn vị / bộ phận</option>' +
          groups.map(g => `<option value="${App.escapeHtml(g.Group_ID)}">${App.escapeHtml(g.Group_Code)} - ${App.escapeHtml(g.Group_Name)}</option>`).join('');
      }
    }
  },

  async refreshDashboard() {
    const groupId = document.getElementById('db-flt-group')?.value || 'ALL';
    const dateFrom = document.getElementById('db-flt-from')?.value || '';
    const dateTo = document.getElementById('db-flt-to')?.value || '';

    const res = await ApiClient.call('dashboard.getData', { groupId, dateFrom, dateTo });
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    this.rawData = res.data;
    const role = App.currentUser.Role;

    // Hiển thị các nút chuyển đổi góc nhìn theo phân quyền
    document.getElementById('btn-view-admin').style.display = (role === 'SUPER_ADMIN') ? 'inline-flex' : 'none';
    document.getElementById('btn-view-manager').style.display = (role === 'SUPER_ADMIN' || role === 'MANAGER') ? 'inline-flex' : 'none';

    this.renderSuperAdminSection(res.data.superAdmin);
    this.renderManagerSection(res.data.manager);
    this.renderUserSection(res.data.user);
    this.renderAllSixCharts(res.data.charts);

    // Mặc định mở đúng góc nhìn theo cấp quyền của tài khoản
    if (role === 'SUPER_ADMIN') {
      this.switchRoleView('SUPER_ADMIN');
    } else if (role === 'MANAGER') {
      this.switchRoleView('MANAGER');
    } else {
      this.switchRoleView('USER');
    }
  },

  switchRoleView(viewRole) {
    document.getElementById('section-role-superadmin').style.display = (viewRole === 'SUPER_ADMIN') ? 'block' : 'none';
    document.getElementById('section-role-manager').style.display = (viewRole === 'MANAGER') ? 'block' : 'none';
    document.getElementById('section-role-user').style.display = (viewRole === 'USER') ? 'block' : 'none';

    document.getElementById('btn-view-admin').className = (viewRole === 'SUPER_ADMIN') ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    document.getElementById('btn-view-manager').className = (viewRole === 'MANAGER') ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    document.getElementById('btn-view-user').className = (viewRole === 'USER') ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  },

  /**
   * 1. RENDER DASHBOARD SUPER ADMIN
   */
  renderSuperAdminSection(sa) {
    if (!sa) return;
    document.getElementById('sa-total-users').textContent = sa.totalAccounts || 0;
    document.getElementById('sa-active-users').textContent = `${sa.activeAccounts || 0} đang hoạt động`;
    document.getElementById('sa-total-tasks').textContent = sa.totalTasks || 0;
    document.getElementById('sa-completed-tasks').textContent = sa.completedTasks || 0;
    document.getElementById('sa-inprogress-tasks').textContent = sa.inProgressTasks || 0;
    document.getElementById('sa-overdue-tasks').textContent = sa.overdueTasks || 0;
    document.getElementById('sa-duesoon-tasks').textContent = sa.dueSoonTasks || 0;
    document.getElementById('sa-recurring-count').textContent = sa.recurringSeriesCount || 0;

    document.getElementById('sa-zalo-status').innerHTML = `
      <div>Thành công: <strong style="color:var(--success);">${sa.zaloStats.sent}</strong></div>
      <div>Dự phòng Email: <strong>${sa.zaloStats.fallbackEmail}</strong> | Lỗi: <strong style="color:var(--danger);">${sa.zaloStats.failed}</strong></div>
    `;

    document.getElementById('sa-cal-status').innerHTML = `
      <div>Đã đồng bộ: <strong style="color:var(--blue-600);">${sa.calendarStats.synced}</strong> sự kiện</div>
      <div>Lỗi đồng bộ: <strong style="color:var(--danger);">${sa.calendarStats.error}</strong></div>
    `;

    const tbodyGrp = document.getElementById('tbody-sa-groups');
    const grpList = sa.groupStatsTable || [];
    tbodyGrp.innerHTML = grpList.map(g => `
      <tr>
        <td><span class="role-badge role-SUPER_ADMIN">${App.escapeHtml(g.Group_Code)}</span></td>
        <td><strong>${App.escapeHtml(g.Group_Name)}</strong></td>
        <td><strong>${g.Total_Tasks}</strong></td>
        <td style="color:var(--success);font-weight:700;">${g.Completed_Tasks}</td>
        <td style="color:var(--blue-600);font-weight:700;">${g.In_Progress_Tasks}</td>
        <td style="color:var(--danger);font-weight:700;">${g.Overdue_Tasks}</td>
        <td>${TaskUI.renderProgressBar(g.Avg_Progress)}</td>
        <td><strong>${g.Completion_Rate}%</strong></td>
      </tr>
    `).join('');
  },

  /**
   * 2. RENDER DASHBOARD MANAGER
   */
  renderManagerSection(mg) {
    if (!mg) return;
    document.getElementById('mg-assigned').textContent = mg.assignedCount || 0;
    document.getElementById('mg-inprogress').textContent = mg.inProgressCount || 0;
    document.getElementById('mg-completed').textContent = mg.completedCount || 0;
    document.getElementById('mg-overdue').textContent = mg.overdueCount || 0;
    document.getElementById('mg-waiting-confirm').textContent = mg.waitingConfirmCount || 0;
    document.getElementById('mg-need-remind').textContent = mg.needRemindCount || 0;

    // Bảng nhiệm vụ cần xác nhận
    const tbodyConfirm = document.getElementById('tbody-mg-confirm');
    const confirmList = mg.tasksWaitingConfirmList || [];
    if (confirmList.length === 0) {
      tbodyConfirm.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748b;">Không có nhiệm vụ nào đang chờ xác nhận.</td></tr>';
    } else {
      tbodyConfirm.innerHTML = confirmList.map(t => `
        <tr>
          <td><a href="./pages/task-detail.html?id=${encodeURIComponent(t.Task_ID)}" style="font-weight:700;color:var(--blue-600);text-decoration:none;">${App.escapeHtml(t.Task_ID)}</a></td>
          <td><strong>${App.escapeHtml(t.Title)}</strong></td>
          <td>${App.escapeHtml(t.Primary_Assignee_Name)}</td>
          <td>${TaskUI.renderProgressBar(t.Progress)}</td>
          <td><a href="./pages/task-detail.html?id=${encodeURIComponent(t.Task_ID)}" class="btn btn-primary btn-sm">✅ Kiểm tra & Duyệt</a></td>
        </tr>
      `).join('');
    }

    // Bảng nhiệm vụ cần nhắc báo cáo
    const tbodyRemind = document.getElementById('tbody-mg-remind');
    const remindList = mg.tasksNeedRemindList || [];
    if (remindList.length === 0) {
      tbodyRemind.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748b;">Tất cả nhiệm vụ đang bám sát tiến độ.</td></tr>';
    } else {
      tbodyRemind.innerHTML = remindList.map(t => `
        <tr>
          <td><a href="./pages/task-detail.html?id=${encodeURIComponent(t.Task_ID)}" style="font-weight:700;color:var(--blue-600);text-decoration:none;">${App.escapeHtml(t.Task_ID)}</a></td>
          <td><strong>${App.escapeHtml(t.Title)}</strong><br><small style="color:var(--danger);">Hạn: ${TaskUI.formatVnDate(t.Due_Date, t.Due_Time)}</small></td>
          <td>${App.escapeHtml(t.Primary_Assignee_Name)}</td>
          <td>${TaskUI.renderStatusBadge(t.Status)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="DashboardController.quickRemindZalo('${App.escapeHtml(t.Task_ID)}')">📢 Nhắc Zalo</button></td>
        </tr>
      `).join('');
    }

    // Bảng tiến độ từng cán bộ
    const tbodyStaff = document.getElementById('tbody-mg-staff');
    const staffList = mg.staffProgressTable || [];
    tbodyStaff.innerHTML = staffList.map(s => `
      <tr>
        <td><strong>${App.escapeHtml(s.Full_Name)}</strong><br><small style="color:var(--slate-500);">${App.escapeHtml(s.Position)}</small></td>
        <td>${App.escapeHtml(s.Group_Name)}</td>
        <td><strong>${s.Total_Assigned}</strong></td>
        <td style="color:var(--blue-600);font-weight:700;">${s.In_Progress}</td>
        <td style="color:var(--success);font-weight:700;">${s.Completed}</td>
        <td style="color:var(--danger);font-weight:700;">${s.Overdue}</td>
        <td>${TaskUI.renderProgressBar(s.Avg_Progress)}</td>
        <td><strong>${s.Avg_Score !== null ? s.Avg_Score + '/100' : '---'}</strong></td>
      </tr>
    `).join('');
  },

  /**
   * 3. RENDER DASHBOARD USER
   */
  renderUserSection(us) {
    if (!us) return;
    document.getElementById('us-personal').textContent = us.personalCount || 0;
    document.getElementById('us-assigned').textContent = us.assignedCount || 0;
    document.getElementById('us-duesoon').textContent = us.dueSoonCount || 0;
    document.getElementById('us-overdue').textContent = us.overdueCount || 0;
    document.getElementById('us-inprogress').textContent = us.inProgressCount || 0;
    document.getElementById('us-completed').textContent = us.completedCount || 0;
    document.getElementById('us-avg-progress').textContent = `${us.personalProgressRate || 0}%`;

    const tbodyMyTasks = document.getElementById('tbody-us-tasks');
    const myTasks = us.myActiveTasksList || [];
    if (myTasks.length === 0) {
      tbodyMyTasks.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;color:#64748b;">Bạn không có công việc nào đang tồn đọng.</td></tr>';
    } else {
      tbodyMyTasks.innerHTML = myTasks.map(t => `
        <tr>
          <td><a href="./pages/task-detail.html?id=${encodeURIComponent(t.Task_ID)}" style="font-weight:700;color:var(--blue-600);text-decoration:none;">${App.escapeHtml(t.Task_ID)}</a></td>
          <td><strong>${App.escapeHtml(t.Title)}</strong></td>
          <td>${TaskUI.renderCategoryBadge(t.Task_Category)}</td>
          <td style="white-space:nowrap;">${TaskUI.formatVnDate(t.Due_Date, t.Due_Time)}</td>
          <td>${TaskUI.renderProgressBar(t.Progress)}</td>
          <td><a href="./pages/task-detail.html?id=${encodeURIComponent(t.Task_ID)}" class="btn btn-primary btn-sm">Cập nhật / Báo cáo</a></td>
        </tr>
      `).join('');
    }

    const boxNotifs = document.getElementById('box-us-notifications');
    const notifs = us.myRecentNotifications || [];
    if (notifs.length === 0) {
      boxNotifs.innerHTML = '<p style="color:#94a3b8;font-size:13px;">Chưa có thông báo mới.</p>';
    } else {
      boxNotifs.innerHTML = notifs.map(n => `
        <div style="padding:8px 0;border-bottom:1px solid var(--slate-100);font-size:13px;">
          <div style="font-weight:700;color:var(--navy-800);">${App.escapeHtml(n.Title)}</div>
          <div style="font-size:12px;color:var(--slate-500);">${App.escapeHtml(n.Created_At)} — Kênh: ${App.escapeHtml(n.Channel)}</div>
        </div>
      `).join('');
    }
  },

  /**
   * 4. VẼ 6 BIỂU ĐỒ THỐNG KÊ CHART.JS LẤY TỪ DỮ LIỆU THỰC TẾ
   */
  destroyChart(key) {
    if (this.chartInstances[key]) {
      this.chartInstances[key].destroy();
      delete this.chartInstances[key];
    }
  },

  renderAllSixCharts(charts) {
    if (!charts || typeof Chart === 'undefined') return;

    // Biểu đồ 1: Tỷ lệ hoàn thành (Doughnut)
    this.destroyChart('c1');
    const ctx1 = document.getElementById('chart-completion-rate');
    if (ctx1) {
      this.chartInstances['c1'] = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: charts.completionRateChart.labels,
          datasets: [{
            data: charts.completionRateChart.data,
            backgroundColor: ['#15803d', '#2563eb', '#64748b', '#b91c1c', '#cbd5e1']
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Biểu đồ 2: Nhiệm vụ theo trạng thái (Bar)
    this.destroyChart('c2');
    const ctx2 = document.getElementById('chart-status-dist');
    if (ctx2) {
      this.chartInstances['c2'] = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: charts.statusDistributionChart.labels,
          datasets: [{
            label: 'Số lượng nhiệm vụ',
            data: charts.statusDistributionChart.data,
            backgroundColor: '#1d4ed8',
            borderRadius: 5
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // Biểu đồ 3: Xu hướng công việc theo thời gian (Line)
    this.destroyChart('c3');
    const ctx3 = document.getElementById('chart-timeline-trend');
    if (ctx3) {
      this.chartInstances['c3'] = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: charts.timelineTrendChart.labels,
          datasets: [
            {
              label: 'Giao mới / Tạo mới',
              data: charts.timelineTrendChart.createdSeries,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,0.1)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Đã hoàn thành',
              data: charts.timelineTrendChart.completedSeries,
              borderColor: '#15803d',
              backgroundColor: 'rgba(21,128,61,0.1)',
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Biểu đồ 4: So sánh tiến độ giữa các nhóm / bộ phận (Grouped Bar)
    this.destroyChart('c4');
    const ctx4 = document.getElementById('chart-group-compare');
    if (ctx4) {
      this.chartInstances['c4'] = new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: charts.groupComparisonChart.labels,
          datasets: [
            { label: 'Tổng số việc', data: charts.groupComparisonChart.totalSeries, backgroundColor: '#0f2942' },
            { label: 'Đã hoàn thành', data: charts.groupComparisonChart.completedSeries, backgroundColor: '#15803d' },
            { label: 'Tiến độ TB (%)', data: charts.groupComparisonChart.avgProgressSeries, backgroundColor: '#3b82f6' }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Biểu đồ 5: Thống kê nhiệm vụ quá hạn & đang xử lý theo Cán bộ (Horizontal Bar)
    this.destroyChart('c5');
    const ctx5 = document.getElementById('chart-overdue');
    if (ctx5) {
      this.chartInstances['c5'] = new Chart(ctx5, {
        type: 'bar',
        data: {
          labels: charts.overdueChart.labels,
          datasets: [
            { label: 'Nhiệm vụ Quá hạn', data: charts.overdueChart.overdueSeries, backgroundColor: '#b91c1c' },
            { label: 'Đang thực hiện', data: charts.overdueChart.inProgressSeries, backgroundColor: '#f59e0b' }
          ]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Biểu đồ 6: Kết quả thực hiện theo tháng trong năm (Combo Bar + Line)
    this.destroyChart('c6');
    const ctx6 = document.getElementById('chart-monthly-perf');
    if (ctx6) {
      this.chartInstances['c6'] = new Chart(ctx6, {
        type: 'bar',
        data: {
          labels: charts.monthlyPerformanceChart.labels,
          datasets: [
            {
              type: 'bar',
              label: 'Tổng nhiệm vụ tháng',
              data: charts.monthlyPerformanceChart.totalTasks,
              backgroundColor: '#93c5fd'
            },
            {
              type: 'bar',
              label: 'Hoàn thành trong tháng',
              data: charts.monthlyPerformanceChart.completedTasks,
              backgroundColor: '#1d4ed8'
            },
            {
              type: 'line',
              label: 'Điểm đánh giá TB',
              data: charts.monthlyPerformanceChart.avgScores,
              borderColor: '#15803d',
              borderWidth: 2,
              tension: 0.2
            }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
  },

  async quickRemindZalo(taskId) {
    const note = prompt('Nhập lời nhắc gửi qua Zalo Bot cho cán bộ:', 'Đề nghị đồng chí khẩn trương cập nhật tiến độ và gửi báo cáo kết quả.');
    if (!note) return;
    const res = await ApiClient.call('reports.requestUpdate', { taskId, note });
    App.toast(res.message, res.success ? 'success' : 'error');
  },

  /**
   * 5. XUẤT BÁO CÁO RA TỆP EXCEL (.XLSX) HOẶC PDF (.PDF) TẢI VỀ TRỰC TIẾP & LƯU DRIVE
   */
  async executeExportReport(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-do-export');
    btn.disabled = true;
    btn.textContent = 'Đang kết xuất tệp báo cáo trên Google Drive...';

    try {
      const payload = {
        reportType: document.getElementById('exp-report-type').value,
        format: document.getElementById('exp-format').value,
        groupId: document.getElementById('exp-group-id').value,
        periodMonth: document.getElementById('exp-month').value,
        periodYear: document.getElementById('exp-year').value
      };

      const res = await ApiClient.call('dashboard.exportReport', payload);
      if (!res.success) {
        App.toast(res.message, 'error');
        return;
      }

      App.toast(res.message);
      const d = res.data;

      // Tự động kích hoạt tải tệp trực tiếp về máy tính / điện thoại từ Base64
      if (d.base64Data) {
        const byteCharacters = atob(d.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: d.mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = d.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      document.getElementById('exp-result-box').innerHTML = `
        <div style="padding:12px;background:#dcfce7;color:#166534;border-radius:8px;margin-top:12px;font-size:13px;">
          ✅ Đã tạo và tải xuống tệp: <strong>${App.escapeHtml(d.fileName)}</strong> (${d.rowsCount} dòng dữ liệu) —
          <a href="${App.escapeHtml(d.fileUrl)}" target="_blank" style="color:#15803d;font-weight:700;">Mở xem trên Google Drive →</a>
        </div>
      `;
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📥 Kết xuất & Tải Báo cáo Ngay';
    }
  }
};

window.DashboardController = DashboardController;