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

    // Ưu tiên domain production cau-hoi.phuongtungthien.vn
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const targetUrl = isLocal ? window.location.origin : 'https://cau-hoi.phuongtungthien.vn';

    if (qrDomainText) {
      qrDomainText.textContent = targetUrl;
    }

    if (window.QRCode) {
      qrCodeInstance = new window.QRCode(qrContainer, {
        text: targetUrl,
        width: 220,
        height: 220,
        colorDark: '#991b1b',
        colorLight: '#ffffff'
      });
    }
  }

  // =========================================================================
  // LOGIC TOÀN MÀN HÌNH (FULLSCREEN)
  // =========================================================================
  function initFullscreenToggle() {
    if (!btnFullscreen) return;

    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('[Live] Lỗi bật fullscreen:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        if (fullscreenBtnText) fullscreenBtnText.textContent = 'Thu nhỏ';
      } else {
        if (fullscreenBtnText) fullscreenBtnText.textContent = 'Toàn màn hình';
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

    if (regEl) regEl.textContent = data.registered || 0;
    if (playEl) playEl.textContent = data.playing || 0;
    if (compEl) compEl.textContent = data.completed || 0;
    if (rateEl) rateEl.textContent = `${data.completionRate || 0}%`;

    if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, data.completionRate || 0))}%`;
    if (percentEl) percentEl.textContent = `${data.completionRate || 0}%`;
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
          <div class="podium-score">${item.score} <span style="font-size: 1rem; color: var(--text-muted);">/ 20</span></div>
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
          <td style="text-align: center;" class="score-cell">${item.score} / 20</td>
          <td style="text-align: right;" class="duration-cell">${formatDuration(item.durationMs)}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
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
