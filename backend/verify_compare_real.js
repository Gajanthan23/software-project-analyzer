require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testCompareRealProjects() {
  try {
    const baseURL = 'http://localhost:4000/api';
    
    // User ID for gajanthanbu@gmail.com
    const userId = '96da11a1-97bc-497a-938a-01fc36b7574c';
    const email = 'gajanthanbu@gmail.com';
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_phase_3_2026';

    const token = jwt.sign({ id: userId, email }, secret, { expiresIn: '1h' });
    console.log('✅ Generated JWT Token for user:', email);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Project IDs for Filmism and fuelpass-management-system
    const projectIds = [
      '4eb1345a-6e12-4ff6-8ff7-ae1606a7d6cd', // Filmism
      'f01d796d-40df-4c3b-a8d8-3fbb871aac6f', // fuelpass-management-system
    ];

    console.log(`Sending POST /api/projects/compare with projectIds:`, projectIds);

    const compareRes = await fetch(`${baseURL}/projects/compare`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectIds })
    });

    const compareData = await compareRes.json();
    console.log('\n======================================================');
    console.log('✅ POST /api/projects/compare Response Status:', compareRes.status);
    console.log('Results Count:', compareData.results);
    console.log('======================================================\n');
    console.log(JSON.stringify(compareData.data.projects, null, 2));

  } catch (err) {
    console.error('❌ Error testing compare API:', err);
  }
}

testCompareRealProjects();
