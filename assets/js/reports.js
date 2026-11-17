/**
 * TỆP: assets/js/reports.js
 * CHỨC NĂNG: Tiện ích hiển thị nhãn trạng thái xét duyệt báo cáo, xếp loại cán bộ và tính điểm.
 */

const ReportUI = {
  REVIEW_META: {
    PENDING_REVIEW:      { label: 'Chờ xét duyệt',     bg: '#ffedd5', color: '#c2410c' },
    APPROVED:            { label: 'Đã xác nhận',       bg: '#dcfce7', color: '#15803d' },
    SUPPLEMENT_REQUIRED: { label: 'Yêu cầu bổ sung',   bg: '#fef3c7', color: '#b45309' },
    REDO_REQUIRED:       { label: 'Yêu cầu làm lại',   bg: '#fee2e2', color: '#b91c1c' }
  },

  RANK_META: {
    EXCELLENT: { label: 'Hoàn thành xuất sắc', bg: '#dcfce7', color: '#15803d' },
    GOOD:      { label: 'Hoàn thành tốt',      bg: '#dbeafe', color: '#1d4ed8' },
    AVERAGE:   { label: 'Hoàn thành',          bg: '#fef3c7', color: '#b45309' },
    POOR:      { label: 'Chưa hoàn thành',     bg: '#fee2e2', color: '#b91c1c' }
  },

  renderReviewBadge(status) {
    const m = this.REVIEW_META[status] || { label: status, bg: '#f1f5f9', color: '#334155' };
    return `<span class="status-badge" style="background:${m.bg};color:${m.color};">${App.escapeHtml(m.label)}</span>`;
  },

  renderRankBadge(rank) {
    const m = this.RANK_META[rank] || { label: rank, bg: '#f1f5f9', color: '#334155' };
    return `<span class="status-badge" style="background:${m.bg};color:${m.color};">${App.escapeHtml(m.label)}</span>`;
  },

  renderEvidenceLinks(filesArray) {
    if (!Array.isArray(filesArray) || filesArray.length === 0) {
      return '<span style="color:#94a3b8;font-size:12px;">Không đính kèm</span>';
    }
    return filesArray.map(f => `
      <a href="${App.escapeHtml(f.fileUrl)}" target="_blank" class="btn btn-outline btn-sm" style="margin:2px;">
        📎 ${App.escapeHtml(f.fileName)}
      </a>
    `).join('');
  },

  computeTotalAndRank(timeliness, quality) {
    const t = Math.max(0, Math.min(100, Number(timeliness) || 0));
    const q = Math.max(0, Math.min(100, Number(quality) || 0));
    const total = Math.round((t * 0.4 + q * 0.6) * 10) / 10;
    let rank = 'POOR';
    if (total >= 90) rank = 'EXCELLENT';
    else if (total >= 75) rank = 'GOOD';
    else if (total >= 50) rank = 'AVERAGE';
    return { total, rank };
  }
};

window.ReportUI = ReportUI;