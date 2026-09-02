/**
 * App Script - Trang đăng ký & chào đón thí sinh (index.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('registration-form');
  const fullNameInput = document.getElementById('fullname');
  const orgSelect = document.getElementById('organization');
  const btnStart = document.getElementById('btn-start');
  const nameError = document.getElementById('fullname-error');
  const orgError = document.getElementById('organization-error');
  const stateBadge = document.getElementById('badge-system-state');
  const stateAlert = document.getElementById('state-alert');
  const stateAlertText = document.getElementById('state-alert-text');
  const resumeBanner = document.getElementById('resume-banner');

  let currentSystemState = 'RUNNING';

  // 1. Kiểm tra trạng thái bài thi đang dở trong localStorage
  checkActiveAttempt();

  // 2. Tải trạng thái cuộc thi và danh mục đơn vị từ server
  await Promise.all([
    fetchSystemStatus(),
    fetchOrganizations()
  ]);

  function checkActiveAttempt() {
    try {
      const savedRaw = localStorage.getItem('quiz_attempt');
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && saved.attemptId && saved.status === 'IN_PROGRESS') {
          if (resumeBanner) resumeBanner.style.display = 'block';
        }
      }
    } catch (e) {
      console.warn('[App] Lỗi kiểm tra local attempt:', e);
    }
  }

  async function fetchSystemStatus() {
    try {
      const res = await ApiClient.get('/api/status');
      currentSystemState = res.state;

      if (stateBadge) {
        stateBadge.textContent = getStateLabel(res.state);
        stateBadge.className = `badge ${getStateBadgeClass(res.state)}`;
      }

      if (res.state !== 'RUNNING') {
        if (stateAlert) {
          stateAlert.style.display = 'block';
          if (stateAlertText) {
            stateAlertText.textContent = getStateAlertMessage(res.state);
          }
        }
        if (btnStart) {
          btnStart.disabled = true;
          btnStart.textContent = 'Cuộc thi tạm thời chưa mở';
        }
      }
    } catch (err) {
      console.error('[App] Không thể tải trạng thái hệ thống:', err);
    }
  }

  async function fetchOrganizations() {
    try {
      const orgs = await ApiClient.get('/api/organizations');
      if (orgSelect && Array.isArray(orgs)) {
        orgSelect.innerHTML = '<option value="">-- Chọn Đơn vị công tác / Chi bộ --</option>';
        orgs.forEach((org) => {
          const opt = document.createElement('option');
          opt.value = org;
          opt.textContent = org;
          orgSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('[App] Không thể tải danh mục đơn vị:', err);
      if (orgSelect) {
        orgSelect.innerHTML = '<option value="">-- Lỗi tải danh mục, vui lòng tải lại trang --</option>';
      }
    }
  }

  function getStateLabel(state) {
    switch (state) {
      case 'WAITING': return 'CHUẨN BỊ';
      case 'RUNNING': return 'ĐANG MỞ';
      case 'CLOSED': return 'ĐÃ ĐÓNG';
      case 'RESULT': return 'CÔNG BỐ KẾT QUẢ';
      default: return state;
    }
  }

  function getStateBadgeClass(state) {
    switch (state) {
      case 'RUNNING': return 'badge-success';
      case 'WAITING': return 'badge-warning';
      case 'CLOSED': return 'badge-primary';
      case 'RESULT': return 'badge-info';
      default: return 'badge-primary';
    }
  }

  function getStateAlertMessage(state) {
    switch (state) {
      case 'WAITING': return 'Hệ thống đang chuẩn bị. Vui lòng chờ Ban tổ chức kích hoạt để bắt đầu.';
      case 'CLOSED': return 'Hội thi đã kết thúc thời gian nhận bài thi.';
      case 'RESULT': return 'Hội thi đã công bố kết quả. Mời các đồng chí theo dõi trên màn hình Live.';
      default: return 'Cuộc thi tạm thời không nhận đăng ký mới.';
    }
  }

  // 3. Xử lý validation inline khi người dùng nhập liệu
  if (fullNameInput) {
    fullNameInput.addEventListener('input', () => {
      if (fullNameInput.value.trim().length >= 2) {
        clearError(fullNameInput, nameError);
      }
    });
  }

  if (orgSelect) {
    orgSelect.addEventListener('change', () => {
      if (orgSelect.value) {
        clearError(orgSelect, orgError);
      }
    });
  }

  function showError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('is-invalid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'flex';
    }
  }

  function clearError(inputEl, errorEl) {
    if (inputEl) inputEl.classList.remove('is-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // 4. Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (currentSystemState !== 'RUNNING') {
        alert('Cuộc thi hiện không mở nhận bài thi.');
        return;
      }

      const fullName = fullNameInput ? fullNameInput.value.trim() : '';
      const organization = orgSelect ? orgSelect.value.trim() : '';

      let isValid = true;

      if (!fullName || fullName.length < 2) {
        showError(fullNameInput, nameError, 'Vui lòng nhập họ và tên của bạn (tối thiểu 2 ký tự)');
        isValid = false;
      } else {
        clearError(fullNameInput, nameError);
      }

      if (!organization) {
        showError(orgSelect, orgError, 'Vui lòng chọn Đơn vị công tác / Chi bộ của bạn');
        isValid = false;
      } else {
        clearError(orgSelect, orgError);
      }

      if (!isValid) {
        return;
      }

      try {
        btnStart.classList.add('loading');
        btnStart.disabled = true;

        const attemptData = await ApiClient.post('/api/start', {
          fullName,
          organization
        });

        // Khởi tạo cấu trúc lưu trữ trạng thái làm bài trong localStorage
        const quizState = {
          attemptId: attemptData.attemptId,
          fullName: attemptData.fullName,
          organization: attemptData.organization,
          startedAt: attemptData.startedAt,
          questions: attemptData.questions,
          answers: {}, // { [questionId]: 'A' | 'B' | 'C' | 'D' }
          currentIndex: 0,
          status: 'IN_PROGRESS'
        };

        localStorage.setItem('quiz_attempt', JSON.stringify(quizState));

        // Chuyển hướng sang trang làm bài
        window.location.href = '/quiz.html';
      } catch (err) {
        btnStart.classList.remove('loading');
        btnStart.disabled = false;
        alert(err.message || 'Không thể bắt đầu lượt thi. Vui lòng thử lại.');
      }
    });
  }
});
