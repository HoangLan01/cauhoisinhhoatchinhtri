/**
 * Control Script - Bảng điều khiển Ban tổ chức (control.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Control] Bảng điều khiển Ban tổ chức đã sẵn sàng.');

  const stateBtns = document.querySelectorAll('.state-btn');
  stateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stateBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const targetState = btn.getAttribute('data-state');
      console.log('[Control] Chuyển trạng thái sang:', targetState);
      const badge = document.getElementById('current-state-display');
      if (badge) {
        badge.textContent = targetState;
      }
    });
  });
});
