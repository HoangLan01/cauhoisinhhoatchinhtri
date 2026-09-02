/**
 * Control Script - Bảng điều khiển Ban tổ chức (control.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const loginView = document.getElementById('control-login-view');
  const dashboardView = document.getElementById('control-dashboard-view');
  const btnLogout = document.getElementById('btn-logout');

  // Login Elements
  const loginForm = document.getElementById('control-login-form');
  const passwordInput = document.getElementById('control-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const loginErrorAlert = document.getElementById('login-error-alert');

  // Dashboard Elements
  const currentStateDisplay = document.getElementById('current-state-display');
  const lastUpdatedEl = document.getElementById('stats-last-updated');
  const btnRefresh = document.getElementById('btn-refresh-stats');
  const btnExportCsv = document.getElementById('btn-export-csv');

  // Metric Elements
  const statRegistered = document.getElementById('stats-registered');
  const statPlaying = document.getElementById('stats-playing');
  const statCompleted = document.getElementById('stats-completed');
  const statRate = document.getElementById('stats-rate');
  const statAvgScore = document.getElementById('stats-avg-score');
  const statPerfect = document.getElementById('stats-perfect');

  // State Action Buttons
  const stateBtns = {
    WAITING: document.getElementById('state-btn-waiting'),
    RUNNING: document.getElementById('state-btn-running'),
    CLOSED: document.getElementById('state-btn-closed'),
    RESULT: document.getElementById('state-btn-result')
  };

  // Reset Modal Elements
  const btnOpenResetModal = document.getElementById('btn-open-reset-modal');
  const resetModal = document.getElementById('reset-modal');
  const resetConfirmInput = document.getElementById('reset-confirm-input');
  const resetErrorMsg = document.getElementById('reset-error-msg');
  const btnResetCancel = document.getElementById('btn-reset-cancel');
  const btnResetConfirm = document.getElementById('btn-reset-confirm');

  // 1. Kiểm tra trạng thái phiên làm việc khi tải trang
  await checkAuthStatus();

  async function checkAuthStatus() {
    try {
      const res = await ApiClient.get('/api/control/me');
      if (res.authenticated) {
        showDashboardView();
        await loadDashboardData();
      } else {
        showLoginView();
      }
    } catch (err) {
      showLoginView();
    }
  }

  function showLoginView() {
    if (loginView) loginView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
  }

  function showDashboardView() {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    if (btnLogout) btnLogout.style.display = 'inline-block';
  }

  // 2. Xử lý Toggle Ẩn / Hiện Mật khẩu
  if (btnTogglePassword && passwordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      btnTogglePassword.textContent = isPassword ? 'Ẩn' : 'Hiện';
    });
  }

  // 3. Xử lý Đăng nhập
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value : '';

      if (!password) return;

      try {
        btnLoginSubmit.classList.add('loading');
        btnLoginSubmit.disabled = true;
        if (loginErrorAlert) loginErrorAlert.style.display = 'none';

        const res = await ApiClient.post('/api/control/login', { password });

        if (res.success) {
          if (passwordInput) passwordInput.value = '';
          showDashboardView();
          await loadDashboardData();
        }
      } catch (err) {
        if (loginErrorAlert) {
          loginErrorAlert.textContent = err.message || 'Mật khẩu không đúng hoặc đã xảy ra lỗi.';
          loginErrorAlert.style.display = 'block';
        }
      } finally {
        btnLoginSubmit.classList.remove('loading');
        btnLoginSubmit.disabled = false;
      }
    });
  }

  // 4. Xử lý Đăng xuất
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        try {
          await ApiClient.post('/api/control/logout');
        } catch (_) {}
        showLoginView();
      }
    });
  }

  // 5. Tải số liệu Dashboard
  async function loadDashboardData() {
    try {
      const data = await ApiClient.get('/api/control/stats');

      // Cập nhật State
      updateCurrentStateDisplay(data.state);

      // Cập nhật 6 chỉ số
      if (statRegistered) statRegistered.textContent = data.registered || 0;
      if (statPlaying) statPlaying.textContent = data.playing || 0;
      if (statCompleted) statCompleted.textContent = data.completed || 0;
      if (statRate) statRate.textContent = `${data.completionRate || 0}%`;
      if (statAvgScore) statAvgScore.textContent = `${data.avgScore || 0} / 20`;
      if (statPerfect) statPerfect.textContent = data.perfectCount || 0;

      if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Cập nhật lúc: ${now.toLocaleTimeString('vi-VN')}`;
      }
    } catch (err) {
      if (err.status === 401) {
        showLoginView();
      } else {
        console.error('[Control] Lỗi nạp số liệu:', err);
      }
    }
  }

  function updateCurrentStateDisplay(state) {
    if (currentStateDisplay) {
      currentStateDisplay.textContent = state;
      switch (state) {
        case 'WAITING':
          currentStateDisplay.className = 'badge badge-warning current-state-badge';
          break;
        case 'RUNNING':
          currentStateDisplay.className = 'badge badge-success current-state-badge';
          break;
        case 'CLOSED':
          currentStateDisplay.className = 'badge badge-primary current-state-badge';
          break;
        case 'RESULT':
          currentStateDisplay.className = 'badge badge-info current-state-badge';
          break;
        default:
          currentStateDisplay.className = 'badge badge-success current-state-badge';
      }
    }

    // Đánh dấu active button tương ứng
    Object.keys(stateBtns).forEach((k) => {
      if (stateBtns[k]) {
        if (k === state) {
          stateBtns[k].classList.add('active');
        } else {
          stateBtns[k].classList.remove('active');
        }
      }
    });
  }

  // 6. Chuyển đổi trạng thái cuộc thi
  Object.keys(stateBtns).forEach((stateKey) => {
    const btn = stateBtns[stateKey];
    if (btn) {
      btn.addEventListener('click', async () => {
        const targetState = btn.getAttribute('data-state');
        if (confirm(`Bạn có chắc chắn muốn chuyển cuộc thi sang trạng thái ${targetState} không?`)) {
          try {
            const res = await ApiClient.post('/api/control/state', { state: targetState });
            if (res.success) {
              updateCurrentStateDisplay(res.state);
              await loadDashboardData();
            }
          } catch (err) {
            alert(`Lỗi chuyển trạng thái: ${err.message}`);
          }
        }
      });
    }
  });

  // 7. Làm mới số liệu tức thời
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      btnRefresh.textContent = 'Đang tải...';
      await loadDashboardData();
      btnRefresh.disabled = false;
      btnRefresh.textContent = '🔄 Làm mới';
    });
  }

  // 8. Xuất file CSV báo cáo kết quả
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      // Gọi trực tiếp URL tải file có xác thực cookie
      window.location.href = '/api/control/export';
    });
  }

  // 9. Xử lý Danger Zone - Reset Data nhiều bước
  if (btnOpenResetModal) {
    btnOpenResetModal.addEventListener('click', () => {
      if (resetConfirmInput) resetConfirmInput.value = '';
      if (resetErrorMsg) resetErrorMsg.style.display = 'none';
      if (resetModal) resetModal.classList.add('active');
    });
  }

  if (btnResetCancel) {
    btnResetCancel.addEventListener('click', () => {
      if (resetModal) resetModal.classList.remove('active');
    });
  }

  if (btnResetConfirm) {
    btnResetConfirm.addEventListener('click', async () => {
      const text = resetConfirmInput ? resetConfirmInput.value.trim().toUpperCase() : '';

      if (text !== 'RESET') {
        if (resetErrorMsg) {
          resetErrorMsg.textContent = 'Vui lòng nhập chính xác từ khóa "RESET"';
          resetErrorMsg.style.display = 'flex';
        }
        return;
      }

      try {
        btnResetConfirm.classList.add('loading');
        btnResetConfirm.disabled = true;

        const res = await ApiClient.post('/api/control/reset', { confirmation: 'RESET' });

        if (res.success) {
          alert('Đã thiết lập lại dữ liệu cuộc thi thành công!');
          if (resetModal) resetModal.classList.remove('active');
          await loadDashboardData();
        }
      } catch (err) {
        if (resetErrorMsg) {
          resetErrorMsg.textContent = err.message || 'Lỗi thiết lập lại dữ liệu';
          resetErrorMsg.style.display = 'flex';
        }
      } finally {
        btnResetConfirm.classList.remove('loading');
        btnResetConfirm.disabled = false;
      }
    });
  }
});
