const stateService = require('../server/services/stateService');

const targetState = process.argv[2] || 'RUNNING';

async function main() {
  try {
    const updated = await stateService.setQuizState(targetState);
    console.log(`[SetState] Trạng thái cuộc thi đã được chuyển sang: ${updated.state}`);
    process.exit(0);
  } catch (err) {
    console.error('[SetState] Lỗi cập nhật trạng thái:', err.message);
    process.exit(1);
  }
}

main();
