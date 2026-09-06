/**
 * Control Script - Bảng điều khiển Ban tổ chức (control.html)
 * Phường Tùng Thiện Quiz System
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

  const stateLabels = {
    WAITING: '1. Chờ khai mạc (WAITING)',
    RUNNING: '2. Bắt đầu làm bài (RUNNING)',
    CLOSED: '3. Đóng nhận bài (CLOSED)',
    RESULT: '4. Công bố kết quả (RESULT)'
  };

  // Reset Modal Elements
  const btnOpenResetModal = document.getElementById('btn-open-reset-modal');
  const resetModal = document.getElementById('reset-modal');
  const resetConfirmInput = document.getElementById('reset-confirm-input');
  const resetErrorMsg = document.getElementById('reset-error-msg');
  const btnResetCancel = document.getElementById('btn-reset-cancel');
  const btnResetConfirm = document.getElementById('btn-reset-confirm');

  // Auto-refresh timer
  let refreshTimer = null;

  // Toast Notification System
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️';
    
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
      <button type="button" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;opacity:0.8;padding:0 4px;">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4500);
  }

  // 1. Kiểm tra trạng thái phiên làm việc khi tải trang
  await checkAuthStatus();

  async function checkAuthStatus() {
    try {
      const res = await ApiClient.get('/api/control/me');
      if (res && res.authenticated) {
        showDashboardView();
        await loadDashboardData();
        startAutoRefresh();
      } else {
        showLoginView();
      }
    } catch (err) {
      showLoginView();
    }
  }

  function showLoginView() {
    stopAutoRefresh();
    if (loginView) loginView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
  }

  function showDashboardView() {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    if (btnLogout) btnLogout.style.display = 'inline-block';
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (dashboardView && dashboardView.style.display !== 'none') {
        loadDashboardData(true);
      }
    }, 4000);
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
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

        if (res && res.success) {
          if (res.token) {
            localStorage.setItem('control_token', res.token);
          }
          if (passwordInput) passwordInput.value = '';
          showDashboardView();
          await loadDashboardData();
          startAutoRefresh();
          showToast('Đăng nhập thành công! Chào mừng Ban Tổ chức.', 'success');
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
      try {
        await ApiClient.post('/api/control/logout');
      } catch (_) {}
      localStorage.removeItem('control_token');
      stopAutoRefresh();
      showLoginView();
      showToast('Đã đăng xuất khỏi trang quản trị.', 'info');
    });
  }

  // 5. Tải số liệu Dashboard
  async function loadDashboardData(isSilent = false) {
    try {
      const data = await ApiClient.get('/api/control/stats');

      // Cập nhật State
      updateCurrentStateDisplay(data.state);

      // Cập nhật 6 chỉ số
      if (statRegistered) statRegistered.textContent = data.registered || 0;
      if (statPlaying) statPlaying.textContent = data.playing || 0;
      if (statCompleted) statCompleted.textContent = data.completed || 0;
      if (statRate) statRate.textContent = `${data.completionRate || 0}%`;
      if (statAvgScore) statAvgScore.textContent = `${data.avgScore || 0} / 150`;
      if (statPerfect) statPerfect.textContent = data.perfectCount || 0;

      if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Cập nhật lúc: ${now.toLocaleTimeString('vi-VN')}`;
      }
    } catch (err) {
      if (err.status === 401) {
        showLoginView();
      } else if (!isSilent) {
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

  // 6. Chuyển đổi trạng thái cuộc thi (Mượt mà, không bị chặn bới browser dialog)
  Object.keys(stateBtns).forEach((stateKey) => {
    const btn = stateBtns[stateKey];
    if (btn) {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetState = btn.getAttribute('data-state');
        if (!targetState) return;

        // Visual loading state
        btn.classList.add('loading');
        btn.disabled = true;

        try {
          const res = await ApiClient.post('/api/control/state', { state: targetState });
          if (res && res.success) {
            updateCurrentStateDisplay(res.state);
            await loadDashboardData();
            showToast(`Đã chuyển cuộc thi sang: ${stateLabels[res.state] || res.state}`, 'success');
          }
        } catch (err) {
          console.error('[Control] Lỗi chuyển trạng thái:', err);
          showToast(`Lỗi chuyển trạng thái: ${err.message || 'Không thể kết nối'}`, 'danger');
          if (err.status === 401) {
            showLoginView();
          }
        } finally {
          btn.classList.remove('loading');
          btn.disabled = false;
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
      showToast('Đã làm mới số liệu thống kê.', 'info');
    });
  }

  // 8. Xử lý Danger Zone - Reset Data nhiều bước
  if (btnOpenResetModal) {
    btnOpenResetModal.addEventListener('click', () => {
      if (resetConfirmInput) {
        resetConfirmInput.value = '';
        setTimeout(() => resetConfirmInput.focus(), 100);
      }
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

        if (res && res.success) {
          if (resetModal) resetModal.classList.remove('active');
          updateCurrentStateDisplay('WAITING');
          await loadDashboardData();
          showToast('Đã thiết lập lại dữ liệu cuộc thi thành công! Hệ thống ở trạng thái Chờ (WAITING).', 'success');
        }
      } catch (err) {
        if (resetErrorMsg) {
          resetErrorMsg.textContent = err.message || 'Lỗi thiết lập lại dữ liệu';
          resetErrorMsg.style.display = 'flex';
        }
        showToast(`Lỗi thiết lập lại: ${err.message}`, 'danger');
      } finally {
        btnResetConfirm.classList.remove('loading');
        btnResetConfirm.disabled = false;
      }
    });
  }
});
