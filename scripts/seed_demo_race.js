const db = require('../server/db');

async function seed() {
  await db.query("DELETE FROM attempts WHERE full_name LIKE 'Thí sinh %'");
  
  const racers = [
    { name: 'Thí sinh Nguyễn Văn An', org: 'Văn phòng HĐND và UBND', score: 140, count: 14, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Trần Thị Mai', org: 'Phòng Văn hóa - Xã hội', score: 120, count: 12, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Lê Hoàng Long', org: 'Trạm Y tế', score: 100, count: 10, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Phạm Minh Đức', org: 'Hội đồng nhân dân phường', score: 80, count: 8, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Hoàng Lan Anh', org: 'Phòng Kinh tế, Hạ tầng và Đô thị', score: 60, count: 6, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Vũ Quốc Bảo', org: 'Ban Quản lý Dự án đầu tư - hạ tầng', score: 50, count: 5, status: 'IN_PROGRESS' },
    { name: 'Thí sinh Đỗ Thu Trang', org: 'Trung tâm Dịch vụ tổng hợp', score: 40, count: 4, status: 'IN_PROGRESS' }
  ];

  for (const r of racers) {
    await db.query(
      'INSERT INTO attempts (full_name, organization, current_score, answered_count, status, started_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [r.name, r.org, r.score, r.count, r.status]
    );
  }

  console.log('Seeded 7 demo racers successfully');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
