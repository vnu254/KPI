/**
 * TỆP: Code.gs
 * CHỨC NĂNG: Cổng giao tiếp Web App (doGet, doPost) điều phối toàn bộ API Giai đoạn 1 -> Giai đoạn 5.
 */

function doGet(e) {
  return Utils.jsonResponse(true, 'Backend Google Apps Script (Phase 5 - Reports & Evaluation) đang hoạt động.', {
    appName: SYSTEM_CONFIG.APP_NAME,
    version: '5.0.0-PHASE5',
    serverTime: Utils.nowStr()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return Utils.jsonResponse(false, 'Yêu cầu không có dữ liệu đầu vào.', null, 'EMPTY_BODY');
    }

    const req = Utils.safeJsonParse(e.postData.contents, null);
    if (!req || !req.action) {
      return Utils.jsonResponse(false, 'Định dạng yêu cầu API không hợp lệ (Thiếu trường action).', null, 'INVALID_REQUEST');
    }

    return handleWebAppApiRequest(req);
  } catch (err) {
    const errorCode = err.code || (String(err.message).indexOf('UNAUTHORIZED') === 0 ? 'UNAUTHORIZED' : 'SERVER_ERROR');
    const cleanMessage = String(err.message).replace(/^(UNAUTHORIZED|FORBIDDEN):\s*/, '');
    return Utils.jsonResponse(false, cleanMessage, null, errorCode);
  }
}

function handleWebAppApiRequest(req) {
  const action = String(req.action || '').trim();
  const payload = req.payload || {};
  const token = String(req.token || '').trim();
  const clientInfo = String(req.clientInfo || '');

  // =========================================================================
  // NHÓM 1: CÁC API CÔNG KHAI (Không yêu cầu Session Token)
  // =========================================================================
  switch (action) {
    case 'system.ping':
      return Utils.jsonResponse(true, 'Kết nối GitHub Pages <-> Google Apps Script thành công!', {
        serverTime: Utils.nowStr(),
        version: '5.0.0-PHASE5'
      });

    case 'auth.login':
      return Utils.jsonResponse(true, 'Đăng nhập hệ thống thành công.', Auth.login(payload, clientInfo));

    case 'auth.logout':
      return Utils.jsonResponse(true, 'Đã đăng xuất khỏi hệ thống.', Auth.logout(token, clientInfo));

    case 'auth.requestOtp': {
      const otpInfo = Auth.requestPasswordResetOtp(payload, clientInfo);
      return Utils.jsonResponse(true, `Đã gửi mã xác minh OTP qua: ${otpInfo.channels.join(', ')}.`, otpInfo);
    }

    case 'auth.resetPassword':
      return Utils.jsonResponse(true, 'Đặt lại mật khẩu mới thành công.', Auth.resetPasswordWithOtp(payload, clientInfo));
  }

  // =========================================================================
  // NHÓM 2: CÁC API BẮT BUỘC XÁC THỰC PHIÊN ĐĂNG NHẬP (Protected APIs)
  // =========================================================================
  const currentUser = Auth.verifySession(token);

  switch (action) {
    // --- Xác thực & Hồ sơ cá nhân (Giai đoạn 2) ---
    case 'auth.me':
      return Utils.jsonResponse(true, 'Phiên làm việc hợp lệ.', {
        user: currentUser,
        groups: Users.listGroups()
      });

    case 'auth.changePassword':
      return Utils.jsonResponse(true, 'Đổi mật khẩu thành công.', Auth.changePassword(currentUser, payload, clientInfo));

    case 'profile.update':
      return Utils.jsonResponse(true, 'Đã cập nhật thông tin cá nhân.', { user: Users.updateMyProfile(currentUser, payload, clientInfo) });

    case 'profile.generateZaloCode':
      return Utils.jsonResponse(true, 'Đã tạo mã liên kết Zalo Bot.', Users.generateMyZaloLinkCode(currentUser));

    // --- Liên kết & Kiểm thử trực tiếp Zalo Bot (Giai đoạn 1 & 2) ---
    case 'zalo.linkDirectChatId': {
      const targetType = payload.targetType || 'USER';
      const targetId = (targetType === 'USER' && currentUser.Role !== ROLES.SUPER_ADMIN)
        ? currentUser.User_ID
        : (payload.targetId || currentUser.User_ID);
      const res = ZaloBotService.linkDirectChatId(targetType, targetId, payload.chatId || '', true);
      return Utils.jsonResponse(true, 'Đã lưu mã Zalo Chat ID và gửi tin nhắn xác nhận trực tiếp!', res);
    }

    case 'zalo.verifyLinkByPolling': {
      const pollRes = ZaloBotService.verifyLinkCodeByPolling(currentUser.User_ID, payload.linkCode || '');
      return Utils.jsonResponse(pollRes.linked, pollRes.message || 'Đã liên kết Zalo Chat ID thành công!', pollRes);
    }

    case 'zalo.testDirectSend': {
      const chatId = String(payload.chatId || currentUser.Zalo_Chat_ID || '').trim();
      if (!chatId) {
        return Utils.jsonResponse(false, 'Vui lòng nhập hoặc lưu mã Zalo Chat ID trước khi gửi thử.', null, 'MISSING_CHAT_ID');
      }
      const customText = payload.message || Utils.buildZaloMessageTemplate(
        'TIN NHẮN KIỂM THỬ KẾT NỐI ZALO BOT',
        [
          `Người kiểm thử: ${currentUser.Full_Name} (${currentUser.Role})`,
          `Mã nhận tin (Chat ID): ${chatId}`,
          `Thời gian: ${Utils.nowStr()}`
        ],
        'Kết nối thông báo tự động từ Hệ thống Quản lý Công việc hoạt động tốt!'
      );
      const dispatchRes = ZaloBotService.dispatchNotification({
        dedupeKey: 'TEST_BOT_' + new Date().getTime(),
        recipientUserId: currentUser.User_ID,
        targetZaloChatId: chatId,
        notifyType: 'TEST_BOT',
        title: 'KIỂM THỬ ZALO BOT',
        messageBody: customText
      });
      if (dispatchRes.success) {
        return Utils.jsonResponse(true, 'Đã gửi tin nhắn kiểm thử tới Zalo của bạn thành công!', dispatchRes);
      }
      return Utils.jsonResponse(false, 'Gửi Zalo Bot thất bại: ' + dispatchRes.errorMessage, dispatchRes);
    }

    // --- Quản lý Tài khoản Cán bộ & Nhóm/Đơn vị (Giai đoạn 2) ---
    case 'users.list':
      return Utils.jsonResponse(true, 'Tải danh sách cán bộ thành công.', {
        users: Users.listUsers(currentUser),
        groups: Users.listGroups()
      });

    case 'users.create':
      return Utils.jsonResponse(true, 'Đã tạo tài khoản cán bộ mới thành công.', { user: Users.createUser(currentUser, payload, clientInfo) });

    case 'users.update':
      return Utils.jsonResponse(true, 'Đã cập nhật thông tin tài khoản.', { user: Users.updateUser(currentUser, payload, clientInfo) });

    case 'users.toggleLock': {
      const lockRes = Users.toggleUserLock(currentUser, payload, clientInfo);
      const msg = lockRes.status === 'LOCKED' ? 'Đã khóa tài khoản và thu hồi phiên đăng nhập.' : 'Đã mở khóa tài khoản.';
      return Utils.jsonResponse(true, msg, lockRes);
    }

    case 'users.adminResetPassword':
      return Utils.jsonResponse(true, 'Đã cấp lại mật khẩu mới cho cán bộ.', Users.adminResetPassword(currentUser, payload, clientInfo));

    case 'users.softDelete':
      return Utils.jsonResponse(true, 'Đã xóa mềm tài khoản khỏi danh sách hoạt động.', Users.softDeleteUser(currentUser, payload, clientInfo));

    case 'groups.list':
      return Utils.jsonResponse(true, 'Tải danh sách đơn vị/bộ phận thành công.', { groups: Users.listGroups() });

    case 'groups.save':
      return Utils.jsonResponse(true, 'Đã lưu thông tin đơn vị/bộ phận.', { group: Users.saveGroup(currentUser, payload, clientInfo) });

    case 'audit.list':
      return Utils.jsonResponse(true, 'Tải nhật ký hoạt động thành công.', { logs: AuditLog.getRecentLogs(currentUser, payload) });

    // --- Quản lý Công việc, Nhiệm vụ & Google Drive (Giai đoạn 3) ---
    case 'tasks.list':
      return Utils.jsonResponse(true, 'Tải danh sách công việc thành công.', Tasks.listTasks(currentUser, payload));

    case 'tasks.detail': {
      const detailData = Tasks.getTaskDetail(currentUser, payload);
      const repData = Reports.listReportsAndScores(currentUser, { taskId: payload.taskId });
      detailData.reports = repData.reports;
      detailData.scores = repData.scores;
      return Utils.jsonResponse(true, 'Tải chi tiết công việc thành công.', detailData);
    }

    case 'tasks.create':
      return Utils.jsonResponse(true, 'Đã tạo công việc / nhiệm vụ thành công.', { task: Tasks.createTask(currentUser, payload, clientInfo) });

    case 'tasks.update':
      return Utils.jsonResponse(true, 'Đã cập nhật thông tin công việc.', { task: Tasks.updateTask(currentUser, payload, clientInfo) });

    case 'tasks.accept':
      return Utils.jsonResponse(true, 'Đã xác nhận tiếp nhận nhiệm vụ.', Tasks.acceptTask(currentUser, payload, clientInfo));

    case 'tasks.updateProgress':
      return Utils.jsonResponse(true, 'Đã cập nhật tiến độ và trạng thái công việc.', Tasks.updateProgressAndStatus(currentUser, payload, clientInfo));

    case 'tasks.extend':
      return Utils.jsonResponse(true, 'Đã gia hạn thời gian hoàn thành nhiệm vụ.', Tasks.extendTaskDeadline(currentUser, payload, clientInfo));

    case 'tasks.transfer':
      return Utils.jsonResponse(true, 'Đã chuyển giao nhiệm vụ thành công.', Tasks.transferTask(currentUser, payload, clientInfo));

    case 'tasks.duplicate':
      return Utils.jsonResponse(true, 'Đã sao chép công việc sang bản ghi mới.', { task: Tasks.duplicateTask(currentUser, payload, clientInfo) });

    case 'tasks.cancel':
      return Utils.jsonResponse(true, 'Đã hủy nhiệm vụ.', Tasks.cancelTask(currentUser, payload, clientInfo));

    case 'tasks.softDelete':
      return Utils.jsonResponse(true, 'Đã chuyển công việc vào thùng rác (Xóa mềm).', Tasks.softDeleteTask(currentUser, payload, clientInfo));

    case 'tasks.restore':
      return Utils.jsonResponse(true, 'Đã khôi phục công việc thành công.', Tasks.restoreTask(currentUser, payload, clientInfo));

    case 'tasks.addComment':
      return Utils.jsonResponse(true, 'Đã gửi nội dung trao đổi.', { comment: Tasks.addTaskComment(currentUser, payload, clientInfo) });

    case 'drive.uploadFile':
      return Utils.jsonResponse(true, 'Đã tải tệp đính kèm lên Google Drive.', { file: DriveService.uploadBase64File(currentUser, payload, clientInfo) });

    // --- Quản lý Nhiệm vụ Định kỳ & Ngày nghỉ lễ (Giai đoạn 4) ---
    case 'recurring.list':
      return Utils.jsonResponse(true, 'Tải danh sách chuỗi định kỳ thành công.', {
        series: RecurringTasks.listRecurringSeries(currentUser),
        holidays: RecurringTasks.listHolidays()
      });

    case 'recurring.create':
      return Utils.jsonResponse(true, 'Đã thiết lập chuỗi nhiệm vụ định kỳ thành công.', RecurringTasks.createRecurringSeries(currentUser, payload, clientInfo));

    case 'recurring.editScope': {
      const editRes = RecurringTasks.editRecurringWithScope(currentUser, payload, clientInfo);
      return Utils.jsonResponse(true, `Đã cập nhật theo phạm vi (${editRes.scope}) cho ${editRes.updatedTasksCount} nhiệm vụ.`, editRes);
    }

    case 'recurring.changeStatus': {
      const stRes = RecurringTasks.changeSeriesStatus(currentUser, payload, clientInfo);
      return Utils.jsonResponse(true, `Đã chuyển trạng thái chuỗi ${stRes.recurringId} sang ${stRes.status}.`, stRes);
    }

    case 'recurring.generateDue': {
      const genRes = RecurringTasks.generateDueTasksNow(currentUser, payload);
      return Utils.jsonResponse(
        true,
        `Đã quét và sinh ${genRes.generatedCount} nhiệm vụ đến kỳ (Bỏ qua ${genRes.skippedDuplicatesCount} bản ghi trùng).`,
        genRes
      );
    }

    case 'recurring.setupTrigger':
      return Utils.jsonResponse(true, 'Đã cài đặt Trigger tự động sinh nhiệm vụ hằng ngày.', RecurringTasks.installDailyRecurringTrigger(currentUser));

    case 'holidays.list':
      return Utils.jsonResponse(true, 'Tải danh mục ngày nghỉ lễ thành công.', { holidays: RecurringTasks.listHolidays() });

    case 'holidays.save':
      return Utils.jsonResponse(true, 'Đã lưu ngày nghỉ lễ / ngày đặc biệt.', { holiday: RecurringTasks.saveHoliday(currentUser, payload, clientInfo) });

    case 'holidays.delete':
      return Utils.jsonResponse(true, 'Đã xóa ngày nghỉ lễ.', RecurringTasks.deleteHoliday(currentUser, payload, clientInfo));

    // =========================================================================
    // NHÓM 5: BÁO CÁO TIẾN ĐỘ, XÉT DUYỆT & ĐÁNH GIÁ CHẤM ĐIỂM (GIAI ĐOẠN 5)
    // =========================================================================
    case 'reports.list':
      return Utils.jsonResponse(true, 'Tải dữ liệu báo cáo và đánh giá thành công.', Reports.listReportsAndScores(currentUser, payload));

    case 'reports.submit':
      return Utils.jsonResponse(true, 'Đã gửi báo cáo tiến độ và thông báo cho người giao việc.', Reports.submitReport(currentUser, payload, clientInfo));

    case 'reports.review': {
      const revRes = Reports.reviewReport(currentUser, payload, clientInfo);
      return Utils.jsonResponse(true, `Đã xét duyệt báo cáo (${revRes.decisionLabel}) và cập nhật kết quả.`, revRes);
    }

    case 'reports.requestUpdate':
      return Utils.jsonResponse(true, 'Đã gửi yêu cầu cập nhật báo cáo qua Zalo Bot.', Reports.requestProgressUpdate(currentUser, payload, clientInfo));

    case 'system.verifyDatabase': {
      Permissions.requireRole(currentUser, [ROLES.SUPER_ADMIN]);
      return Utils.jsonResponse(true, 'Kiểm tra cấu trúc 16 bảng dữ liệu thành công.', Database.initializeFullDatabase());
    }

    default:
      return Utils.jsonResponse(false, 'Chức năng API chưa được hỗ trợ: ' + action, null, 'UNKNOWN_ACTION');
  }
}

function RUN_FIRST_TIME_SETUP() {
  const result = Database.initializeFullDatabase();
  Logger.log(JSON.stringify(result, null, 2));
}