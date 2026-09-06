/**
 * Live Screen Script - Màn hình trình chiếu trực tiếp hội trường 16:9 (live.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  let pollingInterval = null;
  let currentPollingRateMs = 2000;
  let currentState = null;
  let qrCodeInstance = null;

  // DOM Elements
  const stateBadge = document.getElementById('live-state-badge');
  const stateBadgeText = document.getElementById('state-badge-text');
  const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
  const fullscreenBtnText = document.getElementById('fullscreen-btn-text');
  const compTitle = document.getElementById('live-competition-title');

  // View Containers
  const views = {
    WAITING: document.getElementById('view-waiting'),
    RUNNING: document.getElementById('view-running'),
    CLOSED: document.getElementById('view-closed'),
    RESULT: document.getElementById('view-result')
  };

  // 1. Khởi tạo mã QR Code
  initQRCode();

  // 2. Khởi tạo Fullscreen Toggle
  initFullscreenToggle();

  // 3. Khởi động vòng lặp Polling
  startPolling();

  // Tối ưu hóa khi tab bị ẩn / hiển thị lại (Page Visibility API)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Giảm tần suất polling khi ẩn tab xuống 5s để tiết kiệm tài nguyên
      setPollingRate(5000);
    } else {
      // Trở lại 2s và kích hoạt cập nhật ngay lập tức
      setPollingRate(2000);
      fetchLiveUpdate();
    }
  });

  // =========================================================================
  // LOGIC KHỞI TẠO QR CODE
  // =========================================================================
  function initQRCode() {
    const qrContainer = document.getElementById('qr-code-container');
    const qrDomainText = document.getElementById('qr-domain-text');
    if (!qrContainer) return;

    const targetUrl = 'https://cau-hoi.phuongtungthien.vn';

    if (qrDomainText) {
      qrDomainText.textContent = targetUrl;
    }

    qrContainer.innerHTML = `
      <img src="/assets/icqr-tree.png?v=20250903_v2" alt="Mã QR tham gia Hội thi" class="qr-image-display" width="260" height="260" style="width: 260px; height: 260px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto; border-radius: 8px;">
    `;
  }

  // =========================================================================
  // LOGIC TOÀN MÀN HÌNH (FULLSCREEN & PSEUDO-FULLSCREEN FALLBACK)
  // =========================================================================
  function initFullscreenToggle() {
    if (!btnFullscreen) return;

    function isCurrentlyFullscreen() {
      return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        document.body.classList.contains('pseudo-fullscreen')
      );
    }

    function updateFullscreenUI() {
      const active = isCurrentlyFullscreen();
      if (fullscreenBtnText) {
        fullscreenBtnText.textContent = active ? 'Thu nhỏ' : 'Toàn màn hình';
      }
      btnFullscreen.setAttribute('title', active ? 'Thu nhỏ màn hình (Esc hoặc bấm lại)' : 'Phóng to toàn màn hình máy chiếu');

      const svg = btnFullscreen.querySelector('svg');
      if (svg) {
        if (active) {
          // Icon thu nhỏ (Compress)
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h6v6m10-10h-6V4m0 6l7-7M10 14l-7 7" />';
        } else {
          // Icon phóng to (Expand)
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />';
        }
      }
    }

    async function toggleFullscreen() {
      if (isCurrentlyFullscreen()) {
        // Đang toàn màn hình -> Thu nhỏ
        document.body.classList.remove('pseudo-fullscreen');
        const exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFn && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
          try {
            await exitFn.call(document);
          } catch (_) {}
        }
        updateFullscreenUI();
      } else {
        // Chưa toàn màn hình -> Phóng to
        const docEl = document.documentElement;
        const requestFn = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        
        let nativeSuccess = false;
        if (requestFn) {
          try {
            await requestFn.call(docEl);
            nativeSuccess = true;
          } catch (err) {
            console.warn('[Live] Trình duyệt chặn Fullscreen API, chuyển sang chế độ giả lập Fullscreen:', err);
          }
        }

        // Nếu Native API bị trình duyệt / iframe chặn, kích hoạt CSS Pseudo-Fullscreen
        if (!nativeSuccess) {
          document.body.classList.add('pseudo-fullscreen');
        }
        updateFullscreenUI();
      }
    }

    btnFullscreen.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFullscreen();
    });

    // Lắng nghe các sự kiện thay đổi toàn màn hình chuẩn & vendor prefixes
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
      document.addEventListener(evt, updateFullscreenUI);
    });

    // Hỗ trợ phím ESC để thoát chế độ giả lập toàn màn hình
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('pseudo-fullscreen')) {
        document.body.classList.remove('pseudo-fullscreen');
        updateFullscreenUI();
      }
    });
  }

  // =========================================================================
  // POLLING ENGINE (2S interval, lỗi bắt nhẹ nhàng)
  // =========================================================================
  function startPolling() {
    fetchLiveUpdate();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchLiveUpdate, currentPollingRateMs);
  }

  function setPollingRate(newRateMs) {
    if (currentPollingRateMs === newRateMs) return;
    currentPollingRateMs = newRateMs;
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchLiveUpdate, currentPollingRateMs);
  }

  async function fetchLiveUpdate() {
    try {
      const data = await ApiClient.get('/api/live');
      renderLiveDashboard(data);
    } catch (err) {
      // Bắt lỗi nhẹ nhàng, không spam console
      console.warn('[Live Polling] Tạm thời gián đoạn kết nối:', err.message);
    }
  }

  // =========================================================================
  // RENDER DỮ LIỆU THỜI GIAN THỰC
  // =========================================================================
  function renderLiveDashboard(data) {
    if (!data) return;

    if (compTitle && data.title) {
      compTitle.textContent = data.title;
    }

    // Chuyển đổi trạng thái nếu có thay đổi
    if (data.state !== currentState) {
      currentState = data.state;
      switchStateView(data.state);
    }

    // Cập nhật dữ liệu tương ứng với từng view
    switch (data.state) {
      case 'WAITING':
        updateWaitingView(data);
        break;
      case 'RUNNING':
        updateRunningView(data);
        break;
      case 'CLOSED':
        updateClosedView(data);
        break;
      case 'RESULT':
        updateResultView(data);
        break;
      default:
        updateRunningView(data);
    }
  }

  function switchStateView(state) {
    // Ẩn tất cả các view và chỉ bật view tương ứng
    Object.keys(views).forEach((key) => {
      if (views[key]) views[key].classList.remove('active');
    });

    if (views[state]) {
      views[state].classList.add('active');
    } else if (views.RUNNING) {
      views.RUNNING.classList.add('active');
    }

    // Cập nhật Top Badge
    if (stateBadge && stateBadgeText) {
      switch (state) {
        case 'WAITING':
          stateBadge.className = 'badge badge-warning badge-pulse';
          stateBadgeText.textContent = 'CHỜ KHAI MẠC';
          break;
        case 'RUNNING':
          stateBadge.className = 'badge badge-success badge-pulse';
          stateBadgeText.textContent = 'ĐANG DIỄN RA';
          break;
        case 'CLOSED':
          stateBadge.className = 'badge badge-primary badge-pulse';
          stateBadgeText.textContent = 'ĐÃ KHÓA BÀI THI';
          break;
        case 'RESULT':
          stateBadge.className = 'badge badge-info badge-pulse';
          stateBadgeText.textContent = 'CÔNG BỐ KẾT QUẢ';
          break;
        default:
          stateBadge.className = 'badge badge-success badge-pulse';
          stateBadgeText.textContent = state;
      }
    }
  }

  // View WAITING
  function updateWaitingView(data) {
    const regEl = document.getElementById('waiting-registered-count');
    if (regEl) regEl.textContent = data.registered || 0;
  }

  // View RUNNING
  function updateRunningView(data) {
    const regEl = document.getElementById('stat-registered');
    const playEl = document.getElementById('stat-playing');
    const compEl = document.getElementById('stat-completed');
    const rateEl = document.getElementById('stat-rate');
    const fillEl = document.getElementById('giant-progress-fill');
    const percentEl = document.getElementById('giant-progress-percent');
    const raceGrid = document.getElementById('live-race-grid');

    if (regEl) regEl.textContent = data.registered || 0;
    if (playEl) playEl.textContent = data.playing || 0;
    if (compEl) compEl.textContent = data.completed || 0;
    if (rateEl) rateEl.textContent = `${data.completionRate || 0}%`;

    if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, data.completionRate || 0))}%`;
    if (percentEl) percentEl.textContent = `${data.completionRate || 0}%`;

    // Render Bảng Đua Top thời gian thực
    if (raceGrid) {
      const topList = Array.isArray(data.top) ? data.top : [];
      const totalQ = data.totalQuestions || 15;
      const maxSc = data.maxScore || 150;

      if (topList.length === 0) {
        raceGrid.innerHTML = `
          <div class="live-race-empty" id="live-race-empty">
            <div class="empty-spinner"></div>
            <p>Các thí sinh đang bắt đầu làm bài thi. Bảng xếp hạng đua top sẽ nhảy số ngay khi có câu trả lời đầu tiên...</p>
          </div>
        `;
      } else {
        raceGrid.innerHTML = '';
        topList.slice(0, 10).forEach((item, index) => {
          const rankNum = index + 1;
          const card = document.createElement('div');
          let rankClass = `rank-${rankNum}`;
          if (rankNum > 3) rankClass = 'rank-other-card';

          let medalHtml = '';
          if (rankNum === 1) {
            medalHtml = '🥇 1';
          } else if (rankNum === 2) {
            medalHtml = '🥈 2';
          } else if (rankNum === 3) {
            medalHtml = '🥉 3';
          } else {
            medalHtml = `<span class="racer-rank-badge rank-other">${rankNum}</span>`;
          }

          const isSubmitted = item.status === 'SUBMITTED';
          const answeredCount = item.answeredCount || 0;
          const progressPercent = Math.min(100, Math.round((answeredCount / totalQ) * 100));

          const statusHtml = isSubmitted
            ? `<span class="racer-status-tag submitted">Đã nộp bài ✓</span>`
            : `<span class="racer-status-tag playing">Câu ${Math.min(totalQ, answeredCount + 1)}</span>`;

          const initials = getInitials(item.fullName);
          const avatarColor = getAvatarColor(item.organization);

          card.className = `racer-card ${rankClass}`;
          card.innerHTML = `
            <div class="racer-rank-badge ${rankNum <= 3 ? 'rank-' + rankNum : ''}">${medalHtml}</div>
            <div class="racer-avatar" style="background: ${avatarColor};">${initials}</div>
            <div class="racer-info">
              <div class="racer-name">${escapeHtml(item.fullName)}</div>
              <div class="racer-org">${escapeHtml(item.organization)}</div>
            </div>
            <div class="racer-progress-section">
              <div class="racer-status-row">
                ${statusHtml}
                <span class="racer-count-text">${answeredCount}/${totalQ}</span>
              </div>
              <div class="racer-mini-bar-track">
                <div class="racer-mini-bar-fill" style="width: ${progressPercent}%;"></div>
              </div>
            </div>
            <div class="racer-score-box">
              <div class="racer-score-num">${item.score}</div>
              <span class="racer-score-sub">/${maxSc} đ</span>
            </div>
          `;
          raceGrid.appendChild(card);
        });
      }
    }
  }

  // View CLOSED
  function updateClosedView(data) {
    const regEl = document.getElementById('closed-total-registered');
    const compEl = document.getElementById('closed-total-completed');
    if (regEl) regEl.textContent = data.registered || 0;
    if (compEl) compEl.textContent = data.completed || 0;
  }

  // View RESULT (Vinh danh Top 10)
  function updateResultView(data) {
    const podiumContainer = document.getElementById('podium-container');
    const tableBody = document.getElementById('leaderboard-table-body');
    const topList = Array.isArray(data.top) ? data.top : [];
    const maxSc = data.maxScore || 150;

    // Tách Top 3 và Ranks 4-10
    const top3 = topList.slice(0, 3);
    const ranks4to10 = topList.slice(3, 10);

    // 1. Render Top 3 Podium
    if (podiumContainer) {
      podiumContainer.innerHTML = '';

      // Sắp xếp thứ tự hiển thị bục vinh quang: Hạng 2 (Bạc) bên trái, Hạng 1 (Vàng) ở giữa, Hạng 3 (Đồng) bên phải
      const displayOrder = [1, 0, 2]; // index 1 (rank 2), index 0 (rank 1), index 2 (rank 3)

      displayOrder.forEach((idx) => {
        const item = top3[idx];
        if (!item) return;

        const rankNum = idx + 1;
        const card = document.createElement('div');
        let typeClass = 'gold';
        let medalIcon = '🥇';
        let medalClass = 'medal-gold';

        if (rankNum === 2) {
          typeClass = 'silver';
          medalIcon = '🥈';
          medalClass = 'medal-silver';
        } else if (rankNum === 3) {
          typeClass = 'bronze';
          medalIcon = '🥉';
          medalClass = 'medal-bronze';
        }

        card.className = `podium-card ${typeClass}`;
        card.innerHTML = `
          <div class="podium-medal ${medalClass}">
            ${medalIcon}
          </div>
          <div style="font-size: var(--font-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px;">
            HẠNG ${rankNum}
          </div>
          <div class="podium-name">${escapeHtml(item.fullName)}</div>
          <div class="podium-org">${escapeHtml(item.organization)}</div>
          <div class="podium-score">${item.score} <span style="font-size: 1rem; color: var(--text-muted);">/ ${maxSc} đ</span></div>
          <div class="podium-duration">Thời gian: ${formatDuration(item.durationMs)}</div>
        `;
        podiumContainer.appendChild(card);
      });
    }

    // 2. Render Ranks 4 to 10 Table
    if (tableBody) {
      tableBody.innerHTML = '';

      if (ranks4to10.length === 0 && top3.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
              Chưa có dữ liệu bài thi hoàn thành.
            </td>
          </tr>
        `;
        return;
      }

      ranks4to10.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align: center;">
            <span class="rank-badge rank-other">${index + 4}</span>
          </td>
          <td><strong>${escapeHtml(item.fullName)}</strong></td>
          <td>${escapeHtml(item.organization)}</td>
          <td style="text-align: center;" class="score-cell">${item.score} / ${maxSc} đ</td>
          <td style="text-align: right;" class="duration-cell">${formatDuration(item.durationMs)}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  function getInitials(fullName) {
    if (!fullName) return 'TS';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(orgName) {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #06b6d4, #0e7490)',
      'linear-gradient(135deg, #b91c1c, #991b1b)'
    ];
    if (!orgName) return colors[0];
    let hash = 0;
    for (let i = 0; i < orgName.length; i++) {
      hash = orgName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  function formatDuration(durationMs) {
    if (!durationMs || durationMs < 0) return '00:00';
    const totalSeconds = Math.round(durationMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
