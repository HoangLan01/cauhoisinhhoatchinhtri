/**
 * App Script - Trang đăng ký & chào đón thí sinh (index.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Trang chủ đã sẵn sàng.');

  const startForm = document.getElementById('registration-form');
  if (startForm) {
    startForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('fullname')?.value?.trim();
      const organization = document.getElementById('organization')?.value?.trim();

      if (!fullName || !organization) {
        alert('Vui lòng nhập đầy đủ Họ và tên và Đơn vị công tác.');
        return;
      }

      console.log('[App] Đăng ký tham gia:', { fullName, organization });
      // Lưu thông tin tạm thời vào sessionStorage và chuyển đến trang quiz
      sessionStorage.setItem('quiz_user', JSON.stringify({ fullName, organization }));
      window.location.href = '/quiz.html';
    });
  }
});
