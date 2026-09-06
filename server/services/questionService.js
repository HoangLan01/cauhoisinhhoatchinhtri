const fs = require('fs');
const path = require('path');

let cachedQuestions = [];
let sanitizedQuestions = [];
const questionsMap = new Map();

/**
 * Tải và kiểm tra tính hợp lệ của bộ câu hỏi
 */
function loadAndValidateQuestions() {
  const filePath = path.join(__dirname, '../data/questions.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file câu hỏi tại: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(rawData);
  } catch (err) {
    throw new Error(`File questions.json không đúng định dạng JSON: ${err.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Danh sách câu hỏi trong questions.json phải là mảng không rỗng');
  }

  const seenIds = new Set();
  const validOptionKeys = ['A', 'B', 'C', 'D'];

  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i];
    if (q.id === undefined || q.id === null) {
      throw new Error(`Câu hỏi tại vị trí ${i} thiếu trường "id"`);
    }
    if (seenIds.has(q.id)) {
      throw new Error(`Trùng lặp id câu hỏi: ${q.id}`);
    }
    seenIds.add(q.id);

    if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
      throw new Error(`Câu hỏi id ${q.id} có nội dung "question" không hợp lệ`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Câu hỏi id ${q.id} phải có đúng 4 lựa chọn A/B/C/D`);
    }

    const optIds = new Set();
    for (const opt of q.options) {
      if (!opt.id || !validOptionKeys.includes(opt.id)) {
        throw new Error(`Câu hỏi id ${q.id} có option id "${opt.id}" không hợp lệ`);
      }
      if (optIds.has(opt.id)) {
        throw new Error(`Câu hỏi id ${q.id} có option id "${opt.id}" bị lặp lại`);
      }
      optIds.add(opt.id);

      if (!opt.text || typeof opt.text !== 'string' || opt.text.trim().length === 0) {
        throw new Error(`Câu hỏi id ${q.id}, option ${opt.id} thiếu nội dung text`);
      }
    }

    if (!q.correct || !optIds.has(q.correct)) {
      throw new Error(`Câu hỏi id ${q.id} có đáp án "correct" (${q.correct}) không khớp với các options`);
    }

    if (!q.explanation || typeof q.explanation !== 'string') {
      throw new Error(`Câu hỏi id ${q.id} thiếu giải thích "explanation"`);
    }
  }

  cachedQuestions = parsed;
  questionsMap.clear();
  cachedQuestions.forEach(q => questionsMap.set(Number(q.id), q));

  // Tạo sẵn phiên bản an toàn đã loại bỏ hoàn toàn đáp án đúng và giải thích
  sanitizedQuestions = cachedQuestions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options.map(opt => ({
      id: opt.id,
      text: opt.text
    }))
  }));

  console.log(`[QuestionService] Đã tải và xác thực thành công ${cachedQuestions.length} câu hỏi trắc nghiệm.`);
}

// Khởi tạo ngay khi module được nạp
loadAndValidateQuestions();

/**
 * Trả về bộ câu hỏi đã làm sạch an toàn cho thí sinh làm bài
 */
function getSanitizedQuestions() {
  return sanitizedQuestions;
}

/**
 * Lấy tổng số lượng câu hỏi
 */
function getTotalQuestionsCount() {
  return cachedQuestions.length;
}

/**
 * Lấy thông tin câu hỏi theo id (dùng nội bộ server)
 */
function getQuestionById(id) {
  return questionsMap.get(Number(id));
}

/**
 * Chấm điểm danh sách câu trả lời của thí sinh
 * Tuyệt đối thực hiện và tính toán tại Backend
 *
 * @param {Array<{questionId: number|string, selected: string}>} userAnswers
 * @returns {{ score: number, total: number, answersRecord: Array }}
 */
function evaluateAnswers(userAnswers = []) {
  if (!Array.isArray(userAnswers)) {
    throw new Error('Định dạng danh sách câu trả lời không hợp lệ (phải là Array)');
  }

  let correctCount = 0;
  let score = 0;
  const answersRecord = [];
  const processedQuestions = new Set();

  for (const item of userAnswers) {
    if (!item || item.questionId === undefined) continue;
    const qId = Number(item.questionId);

    // Không tính lặp lại nếu người dùng gửi trùng questionId
    if (processedQuestions.has(qId)) continue;
    processedQuestions.add(qId);

    const question = questionsMap.get(qId);
    if (!question) continue;

    const selectedOpt = item.selected ? String(item.selected).trim().toUpperCase() : null;
    const isCorrect = selectedOpt === question.correct;

    if (isCorrect) {
      correctCount += 1;
      score += 10;
    }

    answersRecord.push({
      questionId: qId,
      selected: selectedOpt,
      isCorrect
    });
  }

  return {
    score,
    correctCount,
    total: cachedQuestions.length,
    maxScore: cachedQuestions.length * 10,
    answersRecord
  };
}

module.exports = {
  loadAndValidateQuestions,
  getSanitizedQuestions,
  getTotalQuestionsCount,
  getQuestionById,
  evaluateAnswers
};
