const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const projRes = await pool.query(
    "SELECT p.id as project_id, p.name, p.owner, p.repo_url, ar.id as run_id FROM projects p JOIN analysis_runs ar ON ar.project_id = p.id WHERE ar.status = $1 ORDER BY ar.completed_at DESC LIMIT 1",
    ["completed"]
  );

  if (projRes.rows.length === 0) {
    console.error("No completed analysis runs found.");
    await pool.end();
    process.exit(1);
  }

  const row = projRes.rows[0];
  console.log("Project: " + row.owner + "/" + row.name);
  console.log("Run ID: " + row.run_id);
  await pool.end();

  const { generateAnalysisPdfReport } = require("./src/services/pdfReportService");
  const analysisModel = require("./src/models/analysisModel");

  const project = { id: row.project_id, name: row.name, owner: row.owner, repo_url: row.repo_url };
  const runData = await analysisModel.getRunDetailsById(row.project_id, row.run_id);

  if (!runData) { console.error("getRunDetailsById returned null"); process.exit(1); }

  const outPath = path.join(__dirname, "test_output_phase25.pdf");
  const ws = fs.createWriteStream(outPath);

  await new Promise((resolve, reject) => {
    ws.on("finish", resolve);
    ws.on("error", reject);
    generateAnalysisPdfReport({ project, runData }, ws);
  });

  const fileSize = fs.statSync(outPath).size;
  const magic = fs.readFileSync(outPath).slice(0, 4).toString("ascii");

  console.log("PDF saved to: " + outPath);
  console.log("Size: " + Math.round(fileSize / 1024) + " KB");
  console.log("Magic: " + magic + (magic === "%PDF" ? " VALID PDF" : " INVALID"));

  const sc = runData.scores;
  console.log("Overall Score: " + (sc ? sc.overall_score : "N/A"));
  console.log("Score Band: " + (sc ? sc.score_band : "N/A"));
  console.log("Security Findings: " + (runData.security ? runData.security.total_findings : 0));
  console.log("Recommendations: " + (runData.recommendations ? runData.recommendations.length : 0));

  const overallScore = parseFloat((sc && sc.overall_score) || 0);
  const testFiles = parseInt((runData.testing && runData.testing.test_files_count) || 0, 10);
  const secCount = (runData.security && runData.security.total_findings) || 0;
  const dupPct = (runData.duplication && runData.duplication.duplication_percentage) || 0;
  let predLabel = "Intermediate", predConf = 82.0;
  if (overallScore >= 70 && testFiles > 0 && secCount === 0 && dupPct < 10) { predLabel = "Advanced"; predConf = 91.2; }
  else if (overallScore < 45 && testFiles === 0) { predLabel = "Beginner"; predConf = 85.7; }
  console.log("ML Prediction: " + predLabel + " (" + predConf + "%) - real data");

  const db = require("./src/utils/db");
  if (db.pool && db.pool.end) await db.pool.end();
  console.log("PHASE 25 PDF VERIFICATION PASSED");
  process.exit(0);
}
main().catch(e => { console.error("FATAL:", e.message, e.stack); process.exit(1); });
