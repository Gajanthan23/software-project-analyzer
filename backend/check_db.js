require('dotenv').config();
const db = require('./src/utils/db');

async function checkProjectsInDB() {
  try {
    const res = await db.query(`
      SELECT p.id, p.name, p.owner, p.user_id, u.email,
        (SELECT COUNT(*) FROM analysis_runs ar WHERE ar.project_id = p.id AND ar.status = 'completed') as completed_runs
      FROM projects p
      LEFT JOIN users u ON u.id = p.user_id
    `);
    console.log('Projects in DB:');
    console.log(JSON.stringify(res.rows, null, 2));

    const usersRes = await db.query(`SELECT id, email, name FROM users`);
    console.log('\nUsers in DB:');
    console.log(JSON.stringify(usersRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('DB query error:', err);
    process.exit(1);
  }
}

checkProjectsInDB();
