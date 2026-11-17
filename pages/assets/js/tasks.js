/**
 * TỆP: assets/js/tasks.js
 * CHỨC NĂNG: Tiện ích hiển thị trạng thái, mức độ ưu tiên, chu kỳ lặp và upload tệp lên Google Drive (Giai đoạn 3 & 4).
 */

const TaskUI = {
  STATUS_META: {
    PENDING:         { label: 'Chưa tiếp nhận', bg: '#f1f5f9', color: '#475569' },
    ACCEPTED:        { label: 'Đã tiếp nhận',   bg: '#e0f2fe', color: '#0369a1' },
    IN_PROGRESS:     { label: 'Đang thực hiện', bg: '#dbeafe', color: '#1d4ed8' },
    WAITING_REPORT:  { label: 'Chờ báo cáo',    bg: '#fef3c7', color: '#b45309' },
    REPORTED:        { label: 'Đã báo cáo',     bg: '#ede9fe', color: '#6d28d9' },
    WAITING_CONFIRM: { label: 'Chờ xác nhận',   bg: '#ffedd5', color: '#c2410c' },
    COMPLETED:       { label: 'Hoàn thành',     bg: '#dcfce7', color: '#15803d' },
    OVERDUE:         { label: 'Quá hạn',        bg: '#fee2e2', color: '#b91c1c' },
    PAUSED:          { label: 'Tạm dừng',       bg: '#f3f4f6', color: '#374151' },
    CANCELLED:       { label: 'Đã hủy',         bg: '#fae8ff', color: '#86198f' }
  },

  PRIORITY_META: {
    LOW:    { label: 'Thấp',       bg: '#f1f5f9', color: '#475569' },
    MEDIUM: { label: 'Trung bình', bg: '#e0f2fe', color: '#0369a1' },
    HIGH:   { label: 'Cao',        bg: '#fef3c7', color: '#b45309' },
    URGENT: { label: 'Khẩn cấp',   bg: '#fee2e2', color: '#b91c1c' }
  },

  CATEGORY_META: {
    PERSONAL: 'Cá nhân',
    ASSIGNED: 'Nhiệm vụ giao',
    GROUP:    'Nhiệm vụ nhóm'
  },

  NATURE_META: {
    REGULAR:  'Thường xuyên',
    ADHOC:    'Đột xuất',
    PERIODIC: 'Định kỳ'
  },

  renderStatusBadge(status) {
    const m = this.STATUS_META[status] || { label: status, bg: '#f1f5f9', color: '#334155' };
    return `<span class="status-badge" style="background:${m.bg};color:${m.color};">${App.escapeHtml(m.label)}</span>`;
  },

  renderPriorityBadge(priority) {
    const m = this.PRIORITY_META[priority] || { label: priority, bg: '#f1f5f9', color: '#334155' };
    return `<span class="status-badge" style="background:${m.bg};color:${m.color};">${App.escapeHtml(m.label)}</span>`;
  },

  renderCategoryBadge(category) {
    const label = this.CATEGORY_META[category] || category;
    return `<span class="role-badge role-SUPER_ADMIN">${App.escapeHtml(label)}</span>`;
  },

  renderProgressBar(percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const barColor = p === 100 ? '#15803d' : (p >= 50 ? '#2563eb' : '#f59e0b');
    return `
      <div style="display:flex;align-items:center;gap:8px;min-width:110px;">
        <div style="flex:1;height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="width:${p}%;height:100%;background:${barColor};"></div>
        </div>
        <span style="font-size:12px;font-weight:700;color:#334155;">${p}%</span>
      </div>
    `;
  },

  formatVnDate(dateStr, timeStr) {
    if (!dateStr) return '---';
    const parts = String(dateStr).split('-');
    const vn = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
    return timeStr ? `${timeStr} - ${vn}` : vn;
  },

  /**
   * Hiển thị mô tả chu kỳ lặp dễ hiểu bằng tiếng Việt
   */
  formatFrequencyText(rec) {
    const freq = rec.Frequency_Type;
    const iv = Number(rec.Interval_Value) || 1;
    const dayNames = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

    if (freq === 'DAILY') {
      return iv === 1 ? 'Hằng ngày' : `Mỗi ${iv} ngày/lần`;
    }
    if (freq === 'WEEKLY') {
      const days = (rec.Days_Of_Week || []).map(d => dayNames[d] || d).join(', ');
      return (iv === 1 ? 'Hằng tuần' : `Mỗi ${iv} tuần`) + (days ? ` (${days})` : '');
    }
    if (freq === 'MONTHLY') {
      const dom = Number(rec.Day_Of_Month);
      const dayText = dom === -1 ? 'Ngày cuối tháng' : `Ngày ${dom}`;
      return (iv === 1 ? 'Hằng tháng' : `Mỗi ${iv} tháng`) + ` - ${dayText}`;
    }
    if (freq === 'YEARLY') {
      const dom = Number(rec.Day_Of_Month) === -1 ? 'cuối tháng' : `ngày ${rec.Day_Of_Month}`;
      return `Hằng năm (${dom} tháng ${rec.Month_Of_Year})`;
    }
    if (freq === 'CUSTOM_DAYS') {
      return `Định kỳ ${iv} ngày/lần`;
    }
    return freq;
  },

  fileToBase64(fileObj) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileObj);
    });
  },

  async uploadFilesToDrive(fileInputEl, taskId = '') {
    const files = fileInputEl && fileInputEl.files ? Array.from(fileInputEl.files) : [];
    const uploadedList = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const base64Data = await this.fileToBase64(f);
      const res = await ApiClient.call('drive.uploadFile', {
        fileName: f.name,
        mimeType: f.type || 'application/octet-stream',
        base64Data: base64Data,
        taskId: taskId
      });
      if (!res.success) {
        throw new Error(`Lỗi tải tệp ${f.name}: ${res.message}`);
      }
      uploadedList.push(res.data.file);
    }
    return uploadedList;
  }
};

window.TaskUI = TaskUI;