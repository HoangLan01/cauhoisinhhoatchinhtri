/**
 * Result Script - Màn hình kết quả bài thi cá nhân (result.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.getElementById('user-fullname');
  const orgEl = document.getElementById('user-org');
  const scoreEl = document.getElementById('score-val');
  const totalEl = document.getElementById('total-val');
  const timeEl = document.getElementById('time-val');
  const rankEl = document.getElementById('rank-val');
  const completedCountEl = document.getElementById('completed-count-val');

  // Lấy attemptId từ tham số URL hoặc từ localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let attemptId = urlParams.get('id');

  if (!attemptId) {
    attemptId = localStorage.getItem('last_attempt_id');
  }

  if (!attemptId) {
    alert('Không tìm thấy thông tin kết quả bài thi. Đang chuyển về trang chủ.');
    window.location.href = '/';
    return;
  }

  try {
    const result = await ApiClient.get(`/api/result/${attemptId}`);

    if (nameEl) nameEl.textContent = result.fullName || 'Thí sinh';
    if (orgEl) orgEl.textContent = result.organization || 'Chưa cập nhật';
    if (scoreEl) scoreEl.textContent = result.score;
    if (totalEl) totalEl.textContent = result.totalQuestions || 20;
    if (rankEl) rankEl.textContent = result.rank;
    if (completedCountEl) completedCountEl.textContent = result.totalCompleted;

    if (timeEl) {
      timeEl.textContent = formatDuration(result.durationMs);
    }
  } catch (err) {
    console.error('[Result] Lỗi tải kết quả:', err);
    alert(err.message || 'Không thể tải kết quả bài thi. Vui lòng thử lại.');
    if (nameEl) nameEl.textContent = 'Lỗi nạp dữ liệu';
  }

  function formatDuration(durationMs) {
    if (!durationMs || durationMs < 0) return '00:00';
    const totalSeconds = Math.round(durationMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins} phút ${String(secs).padStart(2, '0')} giây`;
    }
    return `${secs} giây`;
  }
});
