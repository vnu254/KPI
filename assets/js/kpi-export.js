/**
 * TỆP: assets/js/kpi-export.js
 * CHỨC NĂNG:
 *  1. Xuất tệp Word (.doc) khổ A4 ngang và Excel (.xlsx) có công thức sống cho Mẫu 1 & Mẫu 2.
 *  2. Tải tệp Excel mẫu nhập liệu chuẩn 10 cột Danh mục sản phẩm/công việc.
 *  3. Đọc & phân tích tệp Excel (.xlsx/.xls) tải lên để tự động nạp danh sách nhiệm vụ vào KPI.
 */

const KpiExporter = {
  esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  fmtNum(n) {
    const val = Number(n);
    if (isNaN(val)) return '';
    return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, '');
  },

  safeFileSuffix(data) {
    const pKey = String(data.periodKey || data.periodMonth || 'KPI').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${pKey}_${data.user.User_ID}`;
  },

  /* =========================================================================
   * PHẦN 1: XUẤT FILE WORD (.doc) KHỔ A4 NGANG - FONT TIMES NEW ROMAN
   * ========================================================================= */
  buildCommonHeaderHtml(summary, titleText, fullName, position) {
    const now = new Date();
    const partyCommittee = this.esc(summary.Party_Committee || '.....................');
    const partyCell = this.esc(summary.Party_Cell || '...............');
    const loc = this.esc(summary.Location_Name || 'Quảng Trị');

    return `
      <table style="width:100%; border:none; border-collapse:collapse; margin-bottom:10pt;">
        <tr>
          <td style="width:45%; text-align:center; vertical-align:top; border:none; font-size:12pt;">
            <div>ĐẢNG ỦY ${partyCommittee}</div>
            <div style="font-weight:bold;">CHI BỘ ${partyCell}</div>
            <div>*</div>
          </td>
          <td style="width:55%; text-align:center; vertical-align:top; border:none; font-size:12pt;">
            <div style="font-weight:bold; text-decoration:underline;">ĐẢNG CỘNG SẢN VIỆT NAM</div>
            <div style="font-style:italic; margin-top:6pt;">${loc}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</div>
          </td>
        </tr>
      </table>
      <div style="text-align:center; font-weight:bold; font-size:13pt; margin:10pt 0;">
        ${this.esc(titleText)}
      </div>
      <div style="margin-left:30pt; margin-bottom:10pt; font-size:12pt; line-height:1.4;">
        <div>Họ và tên: ${this.esc(fullName || '................................')}</div>
        <div>Chức vụ: ${this.esc(position || '..................................')}</div>
      </div>
    `;
  },

  exportPlanWord(data, selectedItems) {
    const label = data.periodLabel || `THÁNG ${data.periodMonth || '...'}`;
    const headerHtml = this.buildCommonHeaderHtml(
      data.summary,
      `XÂY DỰNG DANH MỤC SẢN PHẨM/CÔNG VIỆC ${label}`,
      data.user.Full_Name,
      data.user.Position
    );

    const rowsHtml = (selectedItems || []).map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${this.esc(item.Title)}</td>
        <td style="text-align:center;">${this.esc(item.Submit_Level)}</td>
        <td>${this.esc(item.Complexity_Scope)}</td>
        <td>${this.esc(item.Product_Name)}</td>
        <td style="text-align:center;">${this.fmtNum(item.Plan_Quantity)}</td>
        <td style="text-align:center;">${this.esc(item.Progress_Plan_Text)}</td>
        <td>${this.esc(item.Notes)}</td>
        <td style="text-align:center;">${this.fmtNum(item.Task_Base_Score)}</td>
        <td style="text-align:center;">${this.fmtNum(item.Conversion_Coeff)}</td>
      </tr>
    `).join('');

    const bodyHtml = `
      ${headerHtml}
      <table class="data-tbl">
        <thead>
          <tr>
            <th style="width:4%;">TT</th>
            <th style="width:18%;">Nhiệm vụ theo tháng</th>
            <th style="width:9%;">Cấp trình</th>
            <th style="width:16%;">Độ khó, mới, phức tạp; phạm vi tác động</th>
            <th style="width:14%;">Sản phẩm</th>
            <th style="width:7%;">Số lượng</th>
            <th style="width:9%;">Tiến độ</th>
            <th style="width:9%;">Ghi chú</th>
            <th style="width:7%;">Điểm chấm công việc</th>
            <th style="width:7%;">Hệ số quy đổi</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" style="text-align:center;">Không có nhiệm vụ nào được chọn</td></tr>'}
        </tbody>
      </table>
      <table style="width:100%; border:none; margin-top:18pt; page-break-inside:avoid;">
        <tr>
          <td style="width:50%; text-align:center; vertical-align:top; border:none; font-size:12pt;">
            <div style="font-weight:bold;">NGƯỜI LẬP</div>
            <div style="height:55pt;"></div>
            <div style="font-weight:bold;">${this.esc(data.user.Full_Name)}</div>
          </td>
          <td style="width:50%; text-align:center; vertical-align:top; border:none; font-size:12pt;">
            <div style="font-weight:bold;">T/M CẤP ỦY (CHI BỘ)</div>
            <div>BÍ THƯ</div>
            <div style="height:45pt;"></div>
            <div style="font-weight:bold;">${this.esc(data.summary.Secretary_Name || '................................')}</div>
          </td>
        </tr>
      </table>
    `;

    this.downloadWordDoc(bodyHtml, `Danh_Muc_Cong_Viec_${this.safeFileSuffix(data)}.doc`);
  },

  exportKpiWord(data, selectedItems, calc) {
    const label = data.periodLabel || `THÁNG ${data.periodMonth || '...'}`;
    const headerHtml = this.buildCommonHeaderHtml(
      data.summary,
      `BIỂU TÍNH ĐIỂM THEO CHỈ SỐ ĐÁNH GIÁ HIỆU QUẢ CÔNG VIỆC (KPI) CÁ NHÂN ${label}`,
      data.user.Full_Name,
      data.user.Position
    );

    const rowsHtml = (selectedItems || []).map((item, idx) => {
      const c4 = Number(item.Plan_Quantity) || 0;
      const c6 = Number(item.Conversion_Coeff) || 1;
      const c8 = Number(item.Kpi_Qty_Actual) || 0;
      const c10 = Number(item.Kpi_Qual_Actual) || 0;
      const c12 = Number(item.Kpi_Time_Actual) || 0;
      const c14 = Number(item.Kpi_Lead_Actual) || 0;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${this.esc(item.Title)}</td>
          <td>${this.esc(item.Product_Name)}</td>
          <td style="text-align:center;">${this.fmtNum(c4)}</td>
          <td style="text-align:center;">${this.esc(item.Progress_Plan_Text)}</td>
          <td style="text-align:center;">${this.fmtNum(c6)}</td>
          <td style="text-align:center;">${this.fmtNum(c4 * c6)}</td>
          <td style="text-align:center;">${this.fmtNum(c8)}</td>
          <td style="text-align:center;">${this.fmtNum(c8 * c6)}</td>
          <td style="text-align:center;">${this.fmtNum(c10)}</td>
          <td style="text-align:center;">${this.fmtNum(c10 * c6)}</td>
          <td style="text-align:center;">${this.fmtNum(c12)}</td>
          <td style="text-align:center;">${this.fmtNum(c12 * c6)}</td>
          <td style="text-align:center;">${this.fmtNum(c14)}</td>
          <td style="text-align:center;">${this.fmtNum(c14 * c6)}</td>
          <td>${this.esc(item.Self_Evaluation_Note)}</td>
        </tr>
      `;
    }).join('');

    const bodyHtml = `
      ${headerHtml}
      <table class="data-tbl kpi-tbl">
        <thead>
          <tr>
            <th rowspan="3" style="width:3%;">TT</th>
            <th colspan="6">NHIỆM VỤ ĐỀ RA KẾ HOẠCH</th>
            <th colspan="9">THỰC TẾ TRIỂN KHAI</th>
          </tr>
          <tr>
            <th rowspan="2" style="width:13%;">Nhiệm vụ</th>
            <th rowspan="2" style="width:9%;">Sản phẩm</th>
            <th rowspan="2" style="width:4.5%;">Số lượng</th>
            <th rowspan="2" style="width:6%;">Tiến độ</th>
            <th rowspan="2" style="width:4.5%;">Hệ số quy đổi</th>
            <th rowspan="2" style="width:5.5%;">Số lượng quy đổi</th>
            <th colspan="2">KPI<br>(Số lượng)</th>
            <th colspan="2">KPI<br>(Chất lượng)</th>
            <th colspan="2">KPI<br>(Tiến độ)</th>
            <th colspan="2">KPI<br>Lãnh đạo, chỉ đạo điều hành<br><span style="font-weight:normal;font-size:8.5pt;">(Tham mưu, phối hợp và hiệu quả thực hiện)</span></th>
            <th rowspan="2" style="width:10%;">Cá nhân tự đánh giá</th>
          </tr>
          <tr>
            <th style="width:5.5%;">Thực tế hoàn thành</th><th style="width:5%;">Quy đổi</th>
            <th style="width:5.5%;">Thực tế hoàn thành</th><th style="width:5%;">Quy đổi</th>
            <th style="width:5.5%;">Thực tế hoàn thành</th><th style="width:5%;">Quy đổi</th>
            <th style="width:5.5%;">Thực tế hoàn thành</th><th style="width:5%;">Quy đổi</th>
          </tr>
          <tr style="font-style:italic; font-weight:normal; font-size:9pt;">
            <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td>
            <td>(7)<br>=(4)*(6)</td>
            <td>(8)</td><td>(9)<br>=(8)*(6)</td>
            <td>(10)</td><td>(11)<br>=(10)*(6)</td>
            <td>(12)</td><td>(13)<br>=(12)*(6)</td>
            <td>(14)</td><td>(15)<br>=(14)*(6)</td>
            <td>(16)<br><span style="font-size:8pt;">(mỗi lỗi trừ 0.25 vào thực tế hoàn thành)</span></td>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="font-weight:bold;">
            <td></td><td>Tổng</td><td></td>
            <td style="text-align:center;">${this.fmtNum(calc.sum4)}</td>
            <td></td><td></td>
            <td style="text-align:center;">${this.fmtNum(calc.sum7)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum8)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum9)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum10)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum11)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum12)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum13)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum14)}</td>
            <td style="text-align:center;">${this.fmtNum(calc.sum15)}</td>
            <td></td>
          </tr>
          <tr style="font-weight:bold;">
            <td></td><td>Tổng %</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
            <td style="text-align:center;">${calc.A}%</td><td></td>
            <td style="text-align:center;">${calc.B}%</td><td></td>
            <td style="text-align:center;">${calc.C}%</td><td></td>
            <td style="text-align:center;">${calc.D}%</td><td></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:12pt; font-size:11.5pt; line-height:1.5; page-break-inside:avoid;">
        <table style="width:100%; border:none; border-collapse:collapse;">
          <tr><td style="border:none; width:74%;">- A = Tổng KPI số lượng thực tế / Tổng KPI số lượng quy đổi × 100%.</td><td style="border:none; font-weight:bold;">${calc.A} %</td></tr>
          <tr><td style="border:none;">- B = Tổng KPI chất lượng thực tế / Tổng KPI chất lượng quy đổi × 100%.</td><td style="border:none; font-weight:bold;">${calc.B} %</td></tr>
          <tr><td style="border:none;">- C = Tổng KPI tiến độ thực tế / Tổng KPI tiến độ quy đổi × 100%.</td><td style="border:none; font-weight:bold;">${calc.C} %</td></tr>
          <tr><td style="border:none;">- D = Tổng KPI lãnh đạo, chỉ đạo điều hành thực tế / Tổng KPI lãnh đạo, chỉ đạo điều × 100%.</td><td style="border:none; font-weight:bold;">${calc.D} %</td></tr>
          <tr><td style="border:none;">- KPI kết quả thực hiện nhiệm vụ (%) = (A + B + C + D) / 4.</td><td style="border:none; font-weight:bold;">${calc.kpiAvg} %</td></tr>
          <tr><td style="border:none;">- Tổng điểm đánh giá = (Tiêu chí chung không quá 30 điểm: <b>${calc.generalScore}</b>) + KPI (%) × 70 điểm.</td><td style="border:none; font-weight:bold;">${calc.totalFinal} điểm</td></tr>
          <tr><td style="border:none; font-weight:bold;">- Tự nhận mức xếp loại chất lượng cán bộ</td><td style="border:none; font-weight:bold;">${this.esc(calc.ratingLevel)}</td></tr>
        </table>
        <table style="width:100%; border:none; margin-top:14pt;">
          <tr>
            <td style="width:60%; border:none;"></td>
            <td style="width:40%; text-align:center; border:none;">
              <div style="font-weight:bold; font-size:12pt;">NGƯỜI LẬP</div>
              <div style="height:50pt;"></div>
              <div style="font-weight:bold; font-size:12pt;">${this.esc(data.user.Full_Name)}</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    this.downloadWordDoc(bodyHtml, `Bieu_KPI_Ca_Nhan_${this.safeFileSuffix(data)}.doc`);
  },

  downloadWordDoc(innerBodyHtml, filename) {
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          @page Section1 {
            size: 841.9pt 595.3pt;
            mso-page-orientation: landscape;
            margin: 1.5cm 1.2cm 1.5cm 1.5cm;
          }
          div.Section1 { page: Section1; }
          body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; }
          table.data-tbl { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
          table.kpi-tbl { font-size: 9.5pt; }
          table.data-tbl th, table.data-tbl td { border: 1px solid #000; padding: 4pt 3pt; vertical-align: middle; }
          table.data-tbl thead { display: table-header-group; }
          table.data-tbl tr { page-break-inside: avoid; }
          table.data-tbl th { text-align: center; font-weight: bold; }
        </style>
      </head>
      <body><div class="Section1">${innerBodyHtml}</div></body>
      </html>
    `;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  /* =========================================================================
   * PHẦN 2: XUẤT FILE EXCEL (.xlsx) CÓ CÔNG THỨC SỐNG + KẺ KHUNG CHUẨN MẪU
   * ========================================================================= */
  _borderThin() {
    return {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };
  },

  _setCell(ws, r, c, cellObj) {
    ws[XLSX.utils.encode_cell({ r, c })] = cellObj;
  },

  _styleRange(ws, r1, c1, r2, c2, style) {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = Object.assign({}, ws[ref].s || {}, style);
      }
    }
  },

  exportPlanExcel(data, selectedItems, customFilename) {
    if (typeof XLSX === 'undefined') {
      alert('Chưa tải được thư viện xuất Excel. Vui lòng kiểm tra kết nối mạng.');
      return;
    }

    const label = data.periodLabel || `THÁNG ${data.periodMonth || '...'}`;
    const now = new Date();
    const s = data.summary || {};
    const ws = {};
    const merges = [];
    const fontBase = { name: 'Times New Roman', sz: 11 };

    this._setCell(ws, 0, 0, { t: 's', v: `ĐẢNG ỦY ${s.Party_Committee || '.....................'}`, s: { font: { ...fontBase, sz: 12 }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 0, 5, { t: 's', v: 'ĐẢNG CỘNG SẢN VIỆT NAM', s: { font: { ...fontBase, sz: 12, bold: true, underline: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 1, 0, { t: 's', v: `CHI BỘ ${s.Party_Cell || '...............'}`, s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 1, 5, { t: 's', v: `${s.Location_Name || 'Quảng Trị'}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`, s: { font: { ...fontBase, sz: 12, italic: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 2, 0, { t: 's', v: '*', s: { font: { ...fontBase, sz: 12 }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 3, 0, { t: 's', v: `XÂY DỰNG DANH MỤC SẢN PHẨM/CÔNG VIỆC ${label}`, s: { font: { ...fontBase, sz: 13, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 4, 1, { t: 's', v: `Họ và tên: ${data.user.Full_Name || ''}`, s: { font: { ...fontBase, sz: 12 } } });
    this._setCell(ws, 5, 1, { t: 's', v: `Chức vụ: ${data.user.Position || ''}`, s: { font: { ...fontBase, sz: 12 } } });

    merges.push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
      { s: { r: 4, c: 1 }, e: { r: 4, c: 9 } }, { s: { r: 5, c: 1 }, e: { r: 5, c: 9 } }
    );

    const headers = [
      'TT', 'Nhiệm vụ theo tháng', 'Cấp trình', 'Độ khó, mới, phức tạp; phạm vi tác động',
      'Sản phẩm', 'Số lượng', 'Tiến độ', 'Ghi chú', 'Điểm chấm công việc', 'Hệ số quy đổi'
    ];
    headers.forEach((h, idx) => {
      this._setCell(ws, 7, idx, {
        t: 's', v: h,
        s: { font: { ...fontBase, bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: this._borderThin() }
      });
    });

    const items = (selectedItems && selectedItems.length) ? selectedItems : [{}];
    items.forEach((it, idx) => {
      const r = 8 + idx;
      const rowVals = [
        { t: 'n', v: idx + 1, align: 'center' },
        { t: 's', v: it.Title || '', align: 'left' },
        { t: 's', v: it.Submit_Level || '', align: 'center' },
        { t: 's', v: it.Complexity_Scope || '', align: 'left' },
        { t: 's', v: it.Product_Name || '', align: 'left' },
        { t: 'n', v: Number(it.Plan_Quantity) || 0, align: 'center' },
        { t: 's', v: it.Progress_Plan_Text || '', align: 'center' },
        { t: 's', v: it.Notes || '', align: 'left' },
        { t: 'n', v: Number(it.Task_Base_Score) || 0, align: 'center' },
        { t: 'n', v: Number(it.Conversion_Coeff) || 1, align: 'center' }
      ];
      rowVals.forEach((cell, c) => {
        this._setCell(ws, r, c, {
          t: cell.t, v: cell.v,
          s: { font: fontBase, alignment: { horizontal: cell.align, vertical: 'center', wrapText: true }, border: this._borderThin() }
        });
      });
    });

    const sigRow = 8 + items.length + 2;
    this._setCell(ws, sigRow, 0, { t: 's', v: 'NGƯỜI LẬP', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, sigRow, 5, { t: 's', v: 'T/M CẤP ỦY (CHI BỘ)', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, sigRow + 1, 5, { t: 's', v: 'BÍ THƯ', s: { font: { ...fontBase, sz: 12 }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, sigRow + 5, 0, { t: 's', v: data.user.Full_Name || '', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, sigRow + 5, 5, { t: 's', v: s.Secretary_Name || '..............................', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });

    merges.push(
      { s: { r: sigRow, c: 0 }, e: { r: sigRow, c: 4 } }, { s: { r: sigRow, c: 5 }, e: { r: sigRow, c: 9 } },
      { s: { r: sigRow + 1, c: 5 }, e: { r: sigRow + 1, c: 9 } },
      { s: { r: sigRow + 5, c: 0 }, e: { r: sigRow + 5, c: 4 } }, { s: { r: sigRow + 5, c: 5 }, e: { r: sigRow + 5, c: 9 } }
    );

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 5 }, { wch: 28 }, { wch: 13 }, { wch: 24 }, { wch: 20 },
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 11 }
    ];
    ws['!rows'] = [{ hpt: 20 }, { hpt: 20 }, { hpt: 16 }, { hpt: 26 }, { hpt: 20 }, { hpt: 20 }, { hpt: 10 }, { hpt: 42 }];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigRow + 6, c: 9 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhMucCongViec');
    XLSX.writeFile(wb, customFilename || `Danh_Muc_Cong_Viec_${this.safeFileSuffix(data)}.xlsx`);
  },

  /**
   * TẢI FILE EXCEL MẪU NHẬP LIỆU CHUẨN 10 CỘT (Kèm 2 dòng ví dụ để điền nhanh rồi tải lên lại)
   */
  downloadPlanImportTemplate(data) {
    const sampleItems = [
      {
        Title: 'Xây dựng kế hoạch công tác hậu cần - kỹ thuật tháng',
        Submit_Level: 'Đảng ủy / Chỉ huy',
        Complexity_Scope: 'Quan trọng, phạm vi toàn đơn vị',
        Product_Name: 'Kế hoạch công tác tháng',
        Plan_Quantity: 1,
        Progress_Plan_Text: 'Trước ngày 05 hàng tháng',
        Notes: 'Xóa dòng ví dụ này khi nhập thực tế',
        Task_Base_Score: 10,
        Conversion_Coeff: 1.5
      },
      {
        Title: 'Kiểm tra công tác bảo đảm ăn uống và vệ sinh an toàn thực phẩm',
        Submit_Level: 'Ban Hậu cần - Kỹ thuật',
        Complexity_Scope: 'Thường xuyên, phạm vi các bếp ăn',
        Product_Name: 'Biên bản kiểm tra tuần',
        Plan_Quantity: 4,
        Progress_Plan_Text: 'Hàng tuần',
        Notes: '',
        Task_Base_Score: 8,
        Conversion_Coeff: 1
      }
    ];
    this.exportPlanExcel(data, sampleItems, `Mau_Nhap_Danh_Muc_Cong_Viec_${this.safeFileSuffix(data)}.xlsx`);
  },

  exportKpiExcel(data, selectedItems, calc) {
    if (typeof XLSX === 'undefined') {
      alert('Chưa tải được thư viện xuất Excel. Vui lòng kiểm tra kết nối mạng.');
      return;
    }

    const label = data.periodLabel || `THÁNG ${data.periodMonth || '...'}`;
    const now = new Date();
    const s = data.summary || {};
    const ws = {};
    const merges = [];
    const fontBase = { name: 'Times New Roman', sz: 10 };
    const border = this._borderThin();

    this._setCell(ws, 0, 0, { t: 's', v: `ĐẢNG ỦY ${s.Party_Committee || '.....................'}`, s: { font: { ...fontBase, sz: 12 }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 0, 7, { t: 's', v: 'ĐẢNG CỘNG SẢN VIỆT NAM', s: { font: { ...fontBase, sz: 12, bold: true, underline: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 1, 0, { t: 's', v: `CHI BỘ ${s.Party_Cell || '...............'}`, s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 1, 7, { t: 's', v: `${s.Location_Name || 'Quảng Trị'}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`, s: { font: { ...fontBase, sz: 12, italic: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 2, 0, { t: 's', v: '*', s: { font: { ...fontBase, sz: 12 }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 3, 0, { t: 's', v: `BIỂU TÍNH ĐIỂM THEO CHỈ SỐ ĐÁNH GIÁ HIỆU QUẢ CÔNG VIỆC (KPI) CÁ NHÂN ${label}`, s: { font: { ...fontBase, sz: 13, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, 4, 1, { t: 's', v: `Họ và tên: ${data.user.Full_Name || ''}`, s: { font: { ...fontBase, sz: 11 } } });
    this._setCell(ws, 5, 1, { t: 's', v: `Chức vụ: ${data.user.Position || ''}`, s: { font: { ...fontBase, sz: 11 } } });

    merges.push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 0, c: 7 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, { s: { r: 1, c: 7 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, { s: { r: 3, c: 0 }, e: { r: 3, c: 15 } },
      { s: { r: 4, c: 1 }, e: { r: 4, c: 15 } }, { s: { r: 5, c: 1 }, e: { r: 5, c: 15 } }
    );

    const thStyle = { font: { ...fontBase, bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
    const subStyle = { font: { ...fontBase, italic: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };

    this._setCell(ws, 7, 0, { t: 's', v: 'TT' });
    this._setCell(ws, 7, 1, { t: 's', v: 'NHIỆM VỤ ĐỀ RA KẾ HOẠCH' });
    this._setCell(ws, 7, 7, { t: 's', v: 'THỰC TẾ TRIỂN KHAI' });

    this._setCell(ws, 8, 1, { t: 's', v: 'Nhiệm vụ' });
    this._setCell(ws, 8, 2, { t: 's', v: 'Sản phẩm' });
    this._setCell(ws, 8, 3, { t: 's', v: 'Số lượng' });
    this._setCell(ws, 8, 4, { t: 's', v: 'Tiến độ' });
    this._setCell(ws, 8, 5, { t: 's', v: 'Hệ số quy đổi' });
    this._setCell(ws, 8, 6, { t: 's', v: 'Số lượng quy đổi' });
    this._setCell(ws, 8, 7, { t: 's', v: 'KPI\n(Số lượng)' });
    this._setCell(ws, 8, 9, { t: 's', v: 'KPI\n(Chất lượng)' });
    this._setCell(ws, 8, 11, { t: 's', v: 'KPI\n(Tiến độ)' });
    this._setCell(ws, 8, 13, { t: 's', v: 'KPI\nLãnh đạo, chỉ đạo điều hành\n(Tham mưu, phối hợp và hiệu quả thực hiện)' });
    this._setCell(ws, 8, 15, { t: 's', v: 'Cá nhân tự đánh giá' });

    [7, 9, 11, 13].forEach(c => {
      this._setCell(ws, 9, c, { t: 's', v: 'Thực tế hoàn thành' });
      this._setCell(ws, 9, c + 1, { t: 's', v: 'Quy đổi' });
    });

    this._styleRange(ws, 7, 0, 9, 15, thStyle);

    const colLabels = [
      '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)\n=(4)*(6)',
      '(8)', '(9)\n=(8)*(6)', '(10)', '(11)\n=(10)*(6)', '(12)', '(13)\n=(12)*(6)',
      '(14)', '(15)\n=(14)*(6)', '(16)\n(mỗi lỗi trừ 0.25 vào thực tế hoàn thành)'
    ];
    colLabels.forEach((lbl, c) => this._setCell(ws, 10, c, { t: 's', v: lbl, s: subStyle }));

    merges.push(
      { s: { r: 7, c: 0 }, e: { r: 9, c: 0 } },   { s: { r: 7, c: 1 }, e: { r: 7, c: 6 } },
      { s: { r: 7, c: 7 }, e: { r: 7, c: 15 } },  { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },
      { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } },   { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } },
      { s: { r: 8, c: 4 }, e: { r: 9, c: 4 } },   { s: { r: 8, c: 5 }, e: { r: 9, c: 5 } },
      { s: { r: 8, c: 6 }, e: { r: 9, c: 6 } },   { s: { r: 8, c: 7 }, e: { r: 8, c: 8 } },
      { s: { r: 8, c: 9 }, e: { r: 8, c: 10 } },  { s: { r: 8, c: 11 }, e: { r: 8, c: 12 } },
      { s: { r: 8, c: 13 }, e: { r: 8, c: 14 } }, { s: { r: 8, c: 15 }, e: { r: 9, c: 15 } }
    );

    const items = (selectedItems && selectedItems.length) ? selectedItems : [{}];
    const firstRowNum = 12;
    const tdCenter = { font: fontBase, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
    const tdLeft = { font: fontBase, alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border };

    items.forEach((it, idx) => {
      const rIdx = 11 + idx;
      const rNum = firstRowNum + idx;
      const c4 = Number(it.Plan_Quantity) || 0, c6 = Number(it.Conversion_Coeff) || 1;
      const c8 = Number(it.Kpi_Qty_Actual) || 0, c10 = Number(it.Kpi_Qual_Actual) || 0;
      const c12 = Number(it.Kpi_Time_Actual) || 0, c14 = Number(it.Kpi_Lead_Actual) || 0;

      this._setCell(ws, rIdx, 0, { t: 'n', v: idx + 1, s: tdCenter });
      this._setCell(ws, rIdx, 1, { t: 's', v: it.Title || '', s: tdLeft });
      this._setCell(ws, rIdx, 2, { t: 's', v: it.Product_Name || '', s: tdLeft });
      this._setCell(ws, rIdx, 3, { t: 'n', v: c4, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 4, { t: 's', v: it.Progress_Plan_Text || '', s: tdCenter });
      this._setCell(ws, rIdx, 5, { t: 'n', v: c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 6, { t: 'n', f: `D${rNum}*F${rNum}`, v: c4 * c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 7, { t: 'n', v: c8, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 8, { t: 'n', f: `H${rNum}*F${rNum}`, v: c8 * c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 9, { t: 'n', v: c10, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 10, { t: 'n', f: `J${rNum}*F${rNum}`, v: c10 * c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 11, { t: 'n', v: c12, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 12, { t: 'n', f: `L${rNum}*F${rNum}`, v: c12 * c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 13, { t: 'n', v: c14, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 14, { t: 'n', f: `N${rNum}*F${rNum}`, v: c14 * c6, z: '0.##', s: tdCenter });
      this._setCell(ws, rIdx, 15, { t: 's', v: it.Self_Evaluation_Note || '', s: tdLeft });
    });

    const lastRowNum = firstRowNum + items.length - 1;
    const sumIdx = 11 + items.length;
    const sumRowNum = sumIdx + 1;
    const pctIdx = sumIdx + 1;
    const pctRowNum = pctIdx + 1;

    const boldCenter = { font: { ...fontBase, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border };
    const boldLeft = { font: { ...fontBase, bold: true }, alignment: { horizontal: 'left', vertical: 'center' }, border };

    this._styleRange(ws, sumIdx, 0, sumIdx, 15, boldCenter);
    this._setCell(ws, sumIdx, 1, { t: 's', v: 'Tổng', s: boldLeft });
    const sumDefs = [
      { c: 3, ltr: 'D', v: calc.sum4 }, { c: 6, ltr: 'G', v: calc.sum7 },
      { c: 7, ltr: 'H', v: calc.sum8 }, { c: 8, ltr: 'I', v: calc.sum9 },
      { c: 9, ltr: 'J', v: calc.sum10 }, { c: 10, ltr: 'K', v: calc.sum11 },
      { c: 11, ltr: 'L', v: calc.sum12 }, { c: 12, ltr: 'M', v: calc.sum13 },
      { c: 13, ltr: 'N', v: calc.sum14 }, { c: 14, ltr: 'O', v: calc.sum15 }
    ];
    sumDefs.forEach(d => {
      this._setCell(ws, sumIdx, d.c, { t: 'n', f: `SUM(${d.ltr}${firstRowNum}:${d.ltr}${lastRowNum})`, v: d.v, z: '0.##', s: boldCenter });
    });

    this._styleRange(ws, pctIdx, 0, pctIdx, 15, boldCenter);
    this._setCell(ws, pctIdx, 1, { t: 's', v: 'Tổng %', s: boldLeft });
    [
      { c: 8, ltr: 'I', v: calc.A / 100 }, { c: 10, ltr: 'K', v: calc.B / 100 },
      { c: 12, ltr: 'M', v: calc.C / 100 }, { c: 14, ltr: 'O', v: calc.D / 100 }
    ].forEach(obj => {
      this._setCell(ws, pctIdx, obj.c, {
        t: 'n', f: `IF(G${sumRowNum}>0,${obj.ltr}${sumRowNum}/G${sumRowNum},0)`, v: obj.v, z: '0.00%', s: boldCenter
      });
    });

    const fStart = pctIdx + 2;
    const rA = fStart + 1, rB = fStart + 2, rC = fStart + 3, rD = fStart + 4;
    const rKpi = fStart + 5, rGen = fStart + 6;
    const noteStyle = { font: { ...fontBase, sz: 11 }, alignment: { horizontal: 'left', vertical: 'center' } };
    const valBold = { font: { ...fontBase, sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } };

    const summaryLines = [
      { idx: fStart,     text: '- A = Tổng KPI số lượng thực tế / Tổng KPI số lượng quy đổi × 100%.', f: `I${pctRowNum}`, v: calc.A / 100, z: '0.00%' },
      { idx: fStart + 1, text: '- B = Tổng KPI chất lượng thực tế / Tổng KPI chất lượng quy đổi × 100%.', f: `K${pctRowNum}`, v: calc.B / 100, z: '0.00%' },
      { idx: fStart + 2, text: '- C = Tổng KPI tiến độ thực tế / Tổng KPI tiến độ quy đổi × 100%.', f: `M${pctRowNum}`, v: calc.C / 100, z: '0.00%' },
      { idx: fStart + 3, text: '- D = Tổng KPI lãnh đạo, chỉ đạo điều hành thực tế / Tổng KPI lãnh đạo, chỉ đạo điều × 100%.', f: `O${pctRowNum}`, v: calc.D / 100, z: '0.00%' },
      { idx: fStart + 4, text: '- KPI kết quả thực hiện nhiệm vụ (%) = (A + B + C + D) / 4.', f: `(L${rA}+L${rB}+L${rC}+L${rD})/4`, v: calc.kpiAvg / 100, z: '0.00%' },
      { idx: fStart + 5, text: '- Điểm tiêu chí chung (không quá 30 điểm):', v: Number(calc.generalScore) || 0, z: '0.##' },
      { idx: fStart + 6, text: '- Tổng điểm đánh giá = (Tiêu chí chung không quá 30 điểm) + KPI (%) × 70 điểm.', f: `MIN(30,L${rGen})+L${rKpi}*70`, v: calc.totalFinal, z: '0.00' }
    ];

    summaryLines.forEach(line => {
      this._setCell(ws, line.idx, 1, { t: 's', v: line.text, s: noteStyle });
      merges.push({ s: { r: line.idx, c: 1 }, e: { r: line.idx, c: 10 } });
      this._setCell(ws, line.idx, 11, line.f
        ? { t: 'n', f: line.f, v: line.v, z: line.z, s: valBold }
        : { t: 'n', v: line.v, z: line.z, s: valBold });
      merges.push({ s: { r: line.idx, c: 11 }, e: { r: line.idx, c: 12 } });
    });

    this._setCell(ws, fStart + 7, 1, { t: 's', v: '- Tự nhận mức xếp loại chất lượng cán bộ:', s: { font: { ...fontBase, sz: 11, bold: true } } });
    merges.push({ s: { r: fStart + 7, c: 1 }, e: { r: fStart + 7, c: 10 } });
    this._setCell(ws, fStart + 7, 11, { t: 's', v: calc.ratingLevel || '', s: { font: { ...fontBase, sz: 11, bold: true }, alignment: { horizontal: 'left' } } });
    merges.push({ s: { r: fStart + 7, c: 11 }, e: { r: fStart + 7, c: 15 } });

    const sigIdx = fStart + 9;
    this._setCell(ws, sigIdx, 10, { t: 's', v: 'NGƯỜI LẬP', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    this._setCell(ws, sigIdx + 4, 10, { t: 's', v: data.user.Full_Name || '', s: { font: { ...fontBase, sz: 12, bold: true }, alignment: { horizontal: 'center' } } });
    merges.push(
      { s: { r: sigIdx, c: 10 }, e: { r: sigIdx, c: 15 } },
      { s: { r: sigIdx + 4, c: 10 }, e: { r: sigIdx + 4, c: 15 } }
    );

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 4.5 }, { wch: 24 }, { wch: 16 }, { wch: 8 }, { wch: 11 }, { wch: 8 }, { wch: 9 },
      { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 22 }
    ];
    ws['!rows'] = [
      { hpt: 19 }, { hpt: 19 }, { hpt: 15 }, { hpt: 26 }, { hpt: 19 }, { hpt: 19 }, { hpt: 8 },
      { hpt: 22 }, { hpt: 52 }, { hpt: 32 }, { hpt: 34 }
    ];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigIdx + 5, c: 15 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BieuKPI_CaNhan');
    XLSX.writeFile(wb, `Bieu_KPI_Ca_Nhan_${this.safeFileSuffix(data)}.xlsx`);
  },

  /* =========================================================================
   * PHẦN 3: ĐỌC TỆP EXCEL MẪU DANH MỤC SẢN PHẨM/CÔNG VIỆC ĐỂ TỰ ĐỘNG THÊM NHIỆM VỤ
   * ========================================================================= */
  _normText(v) {
    return String(v === undefined || v === null ? '' : v)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  _parseViNumber(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const cleaned = String(val).trim().replace(/\s+/g, '').replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? fallback : num;
  },

  _formatCellTextOrDate(val) {
    if (val === undefined || val === null || val === '') return '';
    // Nếu ô Excel là số ngày serial (VD: 46345)
    if (typeof val === 'number' && val > 35000 && val < 65000 && XLSX.SSF && XLSX.SSF.parse_date_code) {
      const d = XLSX.SSF.parse_date_code(val);
      if (d && d.y && d.m && d.d) {
        return `${String(d.d).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.y}`;
      }
    }
    return String(val).trim();
  },

  _extractIsoDateFromText(text, fallbackDate) {
    if (!text) return fallbackDate;
    const s = String(text).trim();
    let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return fallbackDate;
  },

  parsePlanExcelFile(file, defaultDates = {}) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Chưa tải được thư viện đọc Excel. Vui lòng kiểm tra kết nối mạng.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc tệp Excel đã chọn.'));
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

          if (!rows || rows.length === 0) {
            reject(new Error('Tệp Excel trống, không có dữ liệu.'));
            return;
          }

          // 1. Tự dò tìm hàng tiêu đề của bảng 10 cột
          let headerRowIdx = -1;
          const scanLimit = Math.min(rows.length, 25);
          for (let r = 0; r < scanLimit; r++) {
            const joined = rows[r].map(c => this._normText(c)).join(' | ');
            const hasTaskCol = joined.includes('nhiệm vụ') || joined.includes('nhiem vu');
            const hasOtherCol =
              joined.includes('sản phẩm') || joined.includes('san pham') ||
              joined.includes('cấp trình') || joined.includes('cap trinh') ||
              joined.includes('hệ số') || joined.includes('he so') ||
              joined.includes('số lượng') || joined.includes('so luong');

            if (hasTaskCol && hasOtherCol) {
              headerRowIdx = r;
              break;
            }
          }

          // 2. Xác định vị trí từng cột (Tự ánh xạ theo tên cột, dự phòng theo thứ tự chuẩn 10 cột)
          const colMap = {
            title: 1,
            submitLevel: 2,
            complexity: 3,
            product: 4,
            planQty: 5,
            progressText: 6,
            notes: 7,
            baseScore: 8,
            coeff: 9,
            dueDate: -1
          };

          if (headerRowIdx !== -1) {
            const headerCells = rows[headerRowIdx].map(c => this._normText(c));
            headerCells.forEach((h, idx) => {
              if (!h) return;
              if (h.includes('nhiệm vụ') || h.includes('nhiem vu')) colMap.title = idx;
              else if (h.includes('cấp trình') || h.includes('cap trinh')) colMap.submitLevel = idx;
              else if (h.includes('độ khó') || h.includes('phức tạp') || h.includes('tác động') || h.includes('do kho')) colMap.complexity = idx;
              else if (h.includes('sản phẩm') || h.includes('san pham')) colMap.product = idx;
              else if ((h.includes('số lượng') || h.includes('so luong')) && !h.includes('quy đổi') && !h.includes('quy doi')) colMap.planQty = idx;
              else if (h.includes('tiến độ') || h.includes('tien do')) colMap.progressText = idx;
              else if (h.includes('ghi chú') || h.includes('ghi chu')) colMap.notes = idx;
              else if (h.includes('điểm chấm') || h.includes('diem cham')) colMap.baseScore = idx;
              else if (h.includes('hệ số') || h.includes('he so')) colMap.coeff = idx;
              else if (h.includes('hạn hoàn thành') || h.includes('ngày đến hạn') || h.includes('han hoan thanh')) colMap.dueDate = idx;
            });
          }

          // 3. Duyệt từng dòng dữ liệu nhiệm vụ
          const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
          const stopKeywords = ['người lập', 'nguoi lap', 't/m cấp ủy', 'tm cấp ủy', 'bí thư', 'bi thu', 'tổng cộng', 'tong cong', 'tổng %'];
          const parsedItems = [];

          for (let r = startIdx; r < rows.length; r++) {
            const row = rows[r] || [];
            const rowJoined = row.map(c => this._normText(c)).join(' ');
            if (!rowJoined) continue;

            // Dừng đọc khi gặp khối chữ ký hoặc dòng tổng cuối bảng
            if (stopKeywords.some(kw => rowJoined.includes(kw))) {
              if (parsedItems.length > 0 || r > startIdx + 1) break;
              continue;
            }

            const titleRaw = String(row[colMap.title] !== undefined ? row[colMap.title] : '').trim();
            const titleNorm = this._normText(titleRaw);

            // Bỏ qua dòng trống hoặc dòng đánh số cột (1), (2), (3)
            if (!titleRaw || titleNorm === '(2)' || titleNorm === 'nhiệm vụ theo tháng' || titleNorm === 'nhiệm vụ') {
              continue;
            }

            const progressText = this._formatCellTextOrDate(row[colMap.progressText]);
            const rawDueCell = colMap.dueDate !== -1 ? this._formatCellTextOrDate(row[colMap.dueDate]) : '';
            const detectedDue = this._extractIsoDateFromText(
              rawDueCell || progressText,
              defaultDates.toDate || ''
            );

            parsedItems.push({
              Task_ID: '',
              _isNew: true,
              _selected: true,
              Title: titleRaw,
              Start_Date: defaultDates.fromDate || '',
              Due_Date: detectedDue,
              Submit_Level: String(row[colMap.submitLevel] !== undefined ? row[colMap.submitLevel] : '').trim(),
              Complexity_Scope: String(row[colMap.complexity] !== undefined ? row[colMap.complexity] : '').trim(),
              Product_Name: String(row[colMap.product] !== undefined ? row[colMap.product] : '').trim(),
              Plan_Quantity: this._parseViNumber(row[colMap.planQty], 1),
              Progress_Plan_Text: progressText,
              Notes: String(row[colMap.notes] !== undefined ? row[colMap.notes] : '').trim(),
              Task_Base_Score: this._parseViNumber(row[colMap.baseScore], 0),
              Conversion_Coeff: Math.max(0.1, this._parseViNumber(row[colMap.coeff], 1)),
              Kpi_Qty_Actual: '',
              Kpi_Qual_Actual: '',
              Kpi_Time_Actual: '',
              Kpi_Lead_Actual: '',
              Error_Count: 0,
              Self_Evaluation_Note: '',
              Can_Edit_Title: true
            });
          }

          if (parsedItems.length === 0) {
            reject(new Error('Không tìm thấy dòng nhiệm vụ hợp lệ nào trong tệp Excel. Hãy kiểm tra đúng cấu trúc cột mẫu.'));
            return;
          }

          resolve({ items: parsedItems });
        } catch (err) {
          reject(new Error('Lỗi đọc tệp Excel: ' + err.message));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
};