/**
 * Result Script - Màn hình kết quả bài thi cá nhân (result.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Result] Màn hình kết quả cá nhân đã sẵn sàng.');

  const storedUser = sessionStorage.getItem('quiz_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      const nameEl = document.getElementById('user-fullname');
      const orgEl = document.getElementById('user-org');
      if (nameEl) nameEl.textContent = user.fullName;
      if (orgEl) orgEl.textContent = user.organization;
    } catch (e) {
      console.error('[Result] Lỗi đọc dữ liệu người dùng:', e);
    }
  }
});
