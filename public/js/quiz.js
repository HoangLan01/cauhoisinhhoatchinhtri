/**
 * Quiz Script - Màn hình làm bài thi trắc nghiệm trực tuyến (quiz.html)
 */

document.addEventListener('DOMContentLoaded', async () => {
  let quizData = null;
  let timerInterval = null;

  // DOM Elements
  const candidateNameEl = document.getElementById('candidate-name');
  const candidateOrgEl = document.getElementById('candidate-org');
  const timerDisplay = document.getElementById('quiz-timer-display');
  const progressText = document.getElementById('quiz-progress-text');
  const progressFill = document.getElementById('quiz-progress-fill');
  const gridContainer = document.getElementById('question-grid-container');
  const questionBadge = document.getElementById('question-badge');
  const questionTitle = document.getElementById('question-title');
  const optionsContainer = document.getElementById('options-container');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit-quiz');

  // Modal Elements
  const submitModal = document.getElementById('submit-modal');
  const modalAnsweredCount = document.getElementById('modal-answered-count');
  const modalTotalCount = document.getElementById('modal-total-count');
  const modalUnansweredCount = document.getElementById('modal-unanswered-count');
  const modalWarningBox = document.getElementById('modal-warning-box');
  const modalSuccessBox = document.getElementById('modal-success-box');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');

  // 1. Khởi tạo và khôi phục trạng thái từ localStorage
  await initializeQuiz();

  async function initializeQuiz() {
    const rawSaved = localStorage.getItem('quiz_attempt');
    if (!rawSaved) {
      alert('Không tìm thấy thông tin lượt thi. Vui lòng đăng ký trước khi làm bài.');
      window.location.href = '/';
      return;
    }

    try {
      quizData = JSON.parse(rawSaved);
    } catch (e) {
      console.error('[Quiz] Lỗi parse quiz_attempt:', e);
      window.location.href = '/';
      return;
    }

    if (!quizData || !quizData.attemptId) {
      window.location.href = '/';
      return;
    }

    // Đảm bảo cấu trúc answers là object
    if (!quizData.answers || typeof quizData.answers !== 'object') {
      quizData.answers = {};
    }
    if (typeof quizData.currentIndex !== 'number') {
      quizData.currentIndex = 0;
    }

    // Xác thực trạng thái attempt với backend
    try {
      const serverAttempt = await ApiClient.get(`/api/attempt/${quizData.attemptId}`);
      if (serverAttempt.status === 'SUBMITTED') {
        localStorage.removeItem('quiz_attempt');
        localStorage.setItem('last_attempt_id', quizData.attemptId);
        window.location.href = `/result.html?id=${quizData.attemptId}`;
        return;
      }

      // Cập nhật lại danh sách câu hỏi nếu cần
      if (Array.isArray(serverAttempt.questions) && serverAttempt.questions.length > 0) {
        quizData.questions = serverAttempt.questions;
      }
      quizData.startedAt = serverAttempt.startedAt;
      saveLocalState();
    } catch (err) {
      console.warn('[Quiz] Không thể đồng bộ với server lúc này, tiếp tục với dữ liệu offline:', err.message);
    }

    // Hiển thị thông tin thí sinh
    if (candidateNameEl) candidateNameEl.textContent = quizData.fullName || 'Thí sinh';
    if (candidateOrgEl) candidateOrgEl.textContent = `Đơn vị: ${quizData.organization || 'Chưa cập nhật'}`;

    // Khởi động đồng hồ đếm thời gian
    startTimer(quizData.startedAt);

    // Khởi tạo bảng chọn nhanh câu hỏi (Question Grid)
    renderQuestionGrid();

    // Hiển thị câu hỏi hiện tại
    renderCurrentQuestion();

    // Gắn sự kiện điều hướng
    attachEventListeners();
  }

  function saveLocalState() {
    try {
      localStorage.setItem('quiz_attempt', JSON.stringify(quizData));
    } catch (e) {
      console.warn('[Quiz] Lỗi ghi localStorage:', e);
    }
  }

  // 2. Đồng hồ đếm thời gian thực
  function startTimer(startedAt) {
    if (timerInterval) clearInterval(timerInterval);

    const startTime = new Date(startedAt).getTime();

    function updateTimer() {
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (timerDisplay) timerDisplay.textContent = formatted;
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  // 3. Hiển thị bảng điều hướng câu hỏi (Question Grid Navigator)
  function renderQuestionGrid() {
    if (!gridContainer || !Array.isArray(quizData.questions)) return;

    gridContainer.innerHTML = '';
    const total = quizData.questions.length;

    quizData.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid-btn';
      btn.textContent = String(idx + 1);
      btn.setAttribute('aria-label', `Chuyển tới câu hỏi số ${idx + 1}`);

      const isAnswered = quizData.answers[q.id] !== undefined;
      const isCurrent = idx === quizData.currentIndex;

      if (isAnswered) btn.classList.add('answered');
      if (isCurrent) btn.classList.add('current');

      btn.addEventListener('click', () => {
        quizData.currentIndex = idx;
        saveLocalState();
        renderCurrentQuestion();
        renderQuestionGrid();
      });

      gridContainer.appendChild(btn);
    });

    // Cập nhật tiến độ trên topbar
    updateProgressBar();
  }

  function updateProgressBar() {
    if (!quizData || !Array.isArray(quizData.questions)) return;

    const total = quizData.questions.length;
    const answeredCount = Object.keys(quizData.answers).length;
    const percentage = Math.min(100, Math.round((answeredCount / total) * 100));

    if (progressFill) progressFill.style.width = `${Math.max(5, percentage)}%`;
    if (progressText) {
      progressText.innerHTML = `Đã làm: <strong>${answeredCount}</strong> / <strong>${total}</strong> câu (${percentage}%)`;
    }
  }

  // 4. Hiển thị nội dung câu hỏi hiện tại
  function renderCurrentQuestion() {
    if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) return;

    const currentQ = quizData.questions[quizData.currentIndex];
    if (!currentQ) return;

    const total = quizData.questions.length;

    if (questionBadge) {
      questionBadge.textContent = `Câu hỏi số ${quizData.currentIndex + 1} / ${total}`;
    }

    if (questionTitle) {
      questionTitle.textContent = currentQ.question;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      const selectedOptionId = quizData.answers[currentQ.id];

      currentQ.options.forEach((opt) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.setAttribute('data-id', opt.id);

        if (selectedOptionId === opt.id) {
          optionItem.classList.add('selected');
        }

        optionItem.innerHTML = `
          <div class="option-key">${opt.id}</div>
          <div class="option-content">${escapeHtml(opt.text)}</div>
        `;

        optionItem.addEventListener('click', () => {
          selectAnswer(currentQ.id, opt.id);
        });

        optionsContainer.appendChild(optionItem);
      });
    }

    // Cập nhật trạng thái nút điều hướng
    if (btnPrev) btnPrev.disabled = quizData.currentIndex === 0;

    if (btnNext) {
      if (quizData.currentIndex === total - 1) {
        btnNext.textContent = 'Xem lại & Nộp bài';
      } else {
        btnNext.textContent = 'Câu tiếp theo →';
      }
    }
  }

  function selectAnswer(questionId, optionId) {
    quizData.answers[questionId] = optionId;
    saveLocalState();

    // Cập nhật visual trên các options hiện tại
    const items = optionsContainer.querySelectorAll('.option-item');
    items.forEach((item) => {
      if (item.getAttribute('data-id') === optionId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    // Cập nhật bảng Question Grid và thanh tiến độ
    renderQuestionGrid();
  }

  // 5. Gắn các sự kiện chuyển câu & nộp bài
  function attachEventListeners() {
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (quizData.currentIndex > 0) {
          quizData.currentIndex--;
          saveLocalState();
          renderCurrentQuestion();
          renderQuestionGrid();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const total = quizData.questions.length;
        if (quizData.currentIndex < total - 1) {
          quizData.currentIndex++;
          saveLocalState();
          renderCurrentQuestion();
          renderQuestionGrid();
        } else {
          openSubmitModal();
        }
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        openSubmitModal();
      });
    }

    if (btnModalCancel) {
      btnModalCancel.addEventListener('click', closeSubmitModal);
    }

    if (btnModalConfirm) {
      btnModalConfirm.addEventListener('click', executeSubmit);
    }
  }

  // 6. Xử lý Modal Xác nhận nộp bài
  function openSubmitModal() {
    if (!quizData || !Array.isArray(quizData.questions)) return;

    const total = quizData.questions.length;
    const answeredCount = Object.keys(quizData.answers).length;
    const unansweredCount = total - answeredCount;

    if (modalAnsweredCount) modalAnsweredCount.textContent = answeredCount;
    if (modalTotalCount) modalTotalCount.textContent = total;
    if (modalUnansweredCount) modalUnansweredCount.textContent = unansweredCount;

    if (unansweredCount > 0) {
      if (modalWarningBox) modalWarningBox.style.display = 'block';
      if (modalSuccessBox) modalSuccessBox.style.display = 'none';
    } else {
      if (modalWarningBox) modalWarningBox.style.display = 'none';
      if (modalSuccessBox) modalSuccessBox.style.display = 'block';
    }

    if (submitModal) submitModal.classList.add('active');
  }

  function closeSubmitModal() {
    if (submitModal) submitModal.classList.remove('active');
  }

  // 7. Gửi nộp bài thi lên Backend
  async function executeSubmit() {
    try {
      btnModalConfirm.classList.add('loading');
      btnModalConfirm.disabled = true;
      if (btnModalCancel) btnModalCancel.disabled = true;

      // Chuẩn bị payload dạng mảng [{ questionId, selected }]
      const answersPayload = Object.keys(quizData.answers).map((qId) => ({
        questionId: Number(qId),
        selected: quizData.answers[qId]
      }));

      const submitResult = await ApiClient.post('/api/submit', {
        attemptId: quizData.attemptId,
        answers: answersPayload
      });

      // Dọn dẹp attempt đang thi dở và lưu lại attemptId để xem kết quả
      if (timerInterval) clearInterval(timerInterval);
      localStorage.removeItem('quiz_attempt');
      localStorage.setItem('last_attempt_id', quizData.attemptId);

      // Chuyển hướng sang trang kết quả
      window.location.href = `/result.html?id=${quizData.attemptId}`;
    } catch (err) {
      console.error('[Quiz] Lỗi nộp bài thi:', err);
      btnModalConfirm.classList.remove('loading');
      btnModalConfirm.disabled = false;
      if (btnModalCancel) btnModalCancel.disabled = false;

      // Nếu bài thi đã được nộp trước đó
      if (err.status === 409) {
        alert('Lượt thi này đã nộp bài thành công trước đó. Đang chuyển tới trang kết quả...');
        localStorage.removeItem('quiz_attempt');
        localStorage.setItem('last_attempt_id', quizData.attemptId);
        window.location.href = `/result.html?id=${quizData.attemptId}`;
        return;
      }

      alert(`Không thể nộp bài: ${err.message || 'Lỗi kết nối mạng'}. Vui lòng thử lại.`);
    }
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
