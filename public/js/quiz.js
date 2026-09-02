/**
 * Quiz Script - Màn hình làm bài thi (quiz.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Quiz] Màn hình làm bài thi đã khởi tạo.');

  // Cho phép chọn đáp án tương tác
  const optionItems = document.querySelectorAll('.option-item');
  optionItems.forEach((item) => {
    item.addEventListener('click', () => {
      optionItems.forEach((opt) => opt.classList.remove('selected'));
      item.classList.add('selected');
      const selectedId = item.getAttribute('data-id');
      console.log('[Quiz] Đã chọn đáp án:', selectedId);
    });
  });

  const submitBtn = document.getElementById('btn-submit-quiz');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn nộp bài thi không?')) {
        window.location.href = '/result.html';
      }
    });
  }
});
