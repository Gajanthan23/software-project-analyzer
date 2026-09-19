require('dotenv').config();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function testPdfReportEndpoint() {
  try {
    const baseURL = 'http://localhost:4000/api';
    
    // User ID for gajanthanbu@gmail.com
    const userId = '96da11a1-97bc-497a-938a-01fc36b7574c';
    const email = 'gajanthanbu@gmail.com';
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_phase_3_2026';

    const token = jwt.sign({ id: userId, email }, secret, { expiresIn: '1h' });
    console.log('✅ Generated JWT Token for:', email);

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // Project ID for Filmism
    const projectId = '4eb1345a-6e12-4ff6-8ff7-ae1606a7d6cd';

    console.log(`\nTesting GET /api/projects/${projectId}/analyses/latest/report...`);
    const reportRes = await fetch(`${baseURL}/projects/${projectId}/analyses/latest/report`, {
      method: 'GET',
      headers
    });

    console.log('Response Status:', reportRes.status);
    console.log('Content-Type:', reportRes.headers.get('content-type'));
    console.log('Content-Disposition:', reportRes.headers.get('content-disposition'));

    if (reportRes.status !== 200) {
      const text = await reportRes.text();
      console.error('❌ Error response body:', text);
      return;
    }

    const arrayBuffer = await reportRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outputDir = path.join(__dirname, '../scratch');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'test_analysis_report.pdf');
    fs.writeFileSync(outputPath, buffer);

    console.log(`\n======================================================`);
    console.log(`✅ PDF Report successfully generated and saved to:`);
    console.log(`   ${outputPath}`);
    console.log(`   File Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('❌ PDF verification error:', err);
  }
}

testPdfReportEndpoint();
