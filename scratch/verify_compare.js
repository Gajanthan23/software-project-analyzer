async function testCompareAPI() {
  try {
    const baseURL = 'http://localhost:4000/api';
    
    // 1. Login to get token
    console.log('1. Logging in user...');
    let token = '';
    let loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!'
      })
    });

    let loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.log('Login failed, trying registration...');
      let regRes = await fetch(`${baseURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!'
        })
      });
      loginData = await regRes.json();
    }

    token = loginData.data.token;
    console.log('✅ Authenticated successfully.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Fetch projects
    console.log('2. Fetching user projects...');
    const projRes = await fetch(`${baseURL}/projects`, { headers });
    const projData = await projRes.json();
    const projects = projData.data.projects;
    console.log(`Found ${projects.length} project(s):`, projects.map(p => ({ id: p.id, name: `${p.owner}/${p.name}` })));

    if (projects.length === 0) {
      console.log('❌ No projects found.');
      return;
    }

    // Pick project IDs
    const projectIds = projects.slice(0, 2).map(p => p.id);
    console.log(`\n3. Sending POST /api/projects/compare with projectIds:`, projectIds);

    // 3. Call /api/projects/compare
    const compareRes = await fetch(`${baseURL}/projects/compare`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectIds })
    });

    const compareData = await compareRes.json();
    console.log('\n✅ Compare API Response Status:', compareRes.status);
    console.log('Results Count:', compareData.results);
    console.log('Compared Projects Data:');
    console.log(JSON.stringify(compareData.data.projects, null, 2));

  } catch (err) {
    console.error('❌ Error testing compare API:', err);
  }
}

testCompareAPI();
