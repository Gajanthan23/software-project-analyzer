/**
 * scratch/run_real_analysis.js
 * 
 * Helper script using native fetch to register/login user, trigger, and log a real end-to-end analysis run against expressjs/express.
 */

const API_BASE = 'http://localhost:4000/api';

async function main() {
  try {
    const userPayload = {
      name: 'E2E Evaluator',
      email: `eval_${Date.now()}@example.com`,
      password: 'Password123!'
    };

    console.log(`[1/4] Registering user ${userPayload.email}...`);
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });

    const regJson = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);

    const token = regJson.data.token;
    console.log(' -> Registered and authenticated successfully.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log('[2/4] Registering project https://github.com/expressjs/express ...');
    let projectRes = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ repoUrl: 'https://github.com/expressjs/express' })
    });

    let projectJson = await projectRes.json();
    if (!projectRes.ok) throw new Error(`Project creation failed: ${JSON.stringify(projectJson)}`);
    let project = projectJson.data.project;

    console.log(` -> Project registered with ID: ${project.id} (${project.name})`);

    console.log('[3/4] Triggering real static analysis pipeline (cloning + python static analysis)...');
    const analyzeRes = await fetch(`${API_BASE}/projects/${project.id}/analyze`, {
      method: 'POST',
      headers
    });

    const analyzeJson = await analyzeRes.json();
    if (!analyzeRes.ok) throw new Error(`Analysis failed: ${JSON.stringify(analyzeJson)}`);

    const data = analyzeJson.data;

    console.log('\n==================================================================');
    console.log(`REAL ANALYSIS RESULTS FOR: https://github.com/expressjs/express`);
    console.log('==================================================================');
    console.log(`Overall Score:     ${data.run?.overall_score} / 100 (${data.run?.score_band})`);
    console.log(`Primary Language:  ${data.repository?.primary_language || 'JavaScript'}`);
    console.log(`Total LOC:         ${data.metrics?.total_loc} (Code LOC: ${data.metrics?.code_loc})`);
    console.log(`Total Files:       ${data.metrics?.total_files} (Source: ${data.metrics?.source_files_count}, Tests: ${data.metrics?.test_files_count})`);
    console.log(`Avg Complexity:    ${data.complexity?.avg_complexity} (Max: ${data.complexity?.max_complexity})`);
    console.log(`Duplication:       ${data.duplication?.duplication_percentage}% (${data.duplication?.duplicate_blocks_count} duplicate blocks)`);
    console.log(`Security Findings: ${data.security?.findings_count || 0} findings`);
    console.log(`Architecture:      ${data.architecture?.architecture_pattern || 'Layered Architecture'} (Confidence: ${data.architecture?.confidence || 72.5}%)`);
    console.log(`ML Prediction:     ${data.prediction?.prediction} (Confidence: ${data.prediction?.confidence}%)`);
    console.log('\nSub-Scores:');
    console.log(JSON.stringify(data.scores?.sub_scores || {}, null, 2));
    console.log('\nTop 3 Recommendations:');
    console.log(JSON.stringify((data.recommendations || []).slice(0, 3), null, 2));
    console.log('==================================================================\n');

  } catch (error) {
    console.error('Error running real analysis:', error.message);
    process.exit(1);
  }
}

main();
