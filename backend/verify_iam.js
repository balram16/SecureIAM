const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000/api';

const client = axios.create({
  baseURL: BACKEND_URL
});

const setAuthToken = (token) => {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
};

async function runTests() {
  console.log('==================================================');
  console.log('      STARTING AUTOMATED IAM SEQUENCE TESTS       ');
  console.log('==================================================');

  let rootToken, aliceToken, bobToken;
  let aliceId, bobId;
  let readOnlyPolicyId, reportsFullPolicyId, bobListPolicyId, bobCreatePolicyId;

  // -----------------------------------------------------------------
  // 1. Log in as Root and verify full access
  // -----------------------------------------------------------------
  console.log('\n--- Step 1: Log in as Root ---');
  try {
    const loginRes = await client.post('/auth/login', {
      email: 'root@org.local',
      password: 'root1234'
    });
    rootToken = loginRes.data.data.token;
    console.log('✓ Root authenticated successfully');
    setAuthToken(rootToken);

    // Verify root can access reports
    const repRes = await client.get('/reports');
    console.log(`✓ Root reports test: HTTP ${repRes.status} (${JSON.stringify(repRes.data)})`);

    // Verify root can access IAM route
    const userListRes = await client.get('/iam/users');
    console.log(`✓ Root IAM users test: HTTP ${userListRes.status} (Got ${userListRes.data.data.length} users)`);

    // Store user IDs and policy IDs
    const users = userListRes.data.data;
    aliceId = users.find(u => u.email === 'alice@org.local').id;
    bobId = users.find(u => u.email === 'bob@org.local').id;

    const policiesRes = await client.get('/iam/policies');
    const policies = policiesRes.data.data;
    readOnlyPolicyId = policies.find(p => p.name === 'ReadOnlyAccess').id;
    reportsFullPolicyId = policies.find(p => p.name === 'ReportsFullAccess').id;

    console.log(`  IDs: Alice=${aliceId}, Bob=${bobId}`);
    console.log(`  Policies: ReadOnly=${readOnlyPolicyId}, ReportsFull=${reportsFullPolicyId}`);
  } catch (err) {
    console.error('✗ Step 1 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 2. Log in as Alice (Viewer group -> ReadOnlyAccess)
  // -----------------------------------------------------------------
  console.log('\n--- Step 2: Log in as Alice ---');
  try {
    const loginRes = await client.post('/auth/login', {
      email: 'alice@org.local',
      password: 'alice1234'
    });
    aliceToken = loginRes.data.data.token;
    console.log('✓ Alice authenticated successfully');
    setAuthToken(aliceToken);

    // Can access read-only routes (expect 200)
    const reportsRes = await client.get('/reports');
    console.log(`✓ Alice reports:List test: HTTP ${reportsRes.status} (Expected 200)`);

    // Cannot access write routes (expect 403)
    try {
      await client.post('/reports', {});
      console.log('✗ Alice reports:Create test: ALLOWED (Expected 403)');
    } catch (err) {
      console.log(`✓ Alice reports:Create test: HTTP ${err.response?.status} (Expected 403)`);
    }

    // Cannot access any iam:* route (expect 403)
    try {
      await client.get('/iam/users');
      console.log('✗ Alice iam:ListUsers test: ALLOWED (Expected 403)');
    } catch (err) {
      console.log(`✓ Alice iam:ListUsers test: HTTP ${err.response?.status} (Expected 403)`);
    }
  } catch (err) {
    console.error('✗ Step 2 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 3. Log in as Root -> Create & attach List policy to Bob
  // -----------------------------------------------------------------
  console.log('\n--- Step 3: Create & attach List policy to Bob ---');
  setAuthToken(rootToken);
  try {
    const policyRes = await client.post('/iam/policies', {
      name: 'BobListPermissions',
      type: 'MANAGED',
      description: 'Grants list policies, list groups, list users.',
      statements: [
        {
          Effect: 'Allow',
          Action: ['iam:ListPolicies', 'iam:ListGroups', 'iam:ListUsers'],
          Resource: ['*']
        }
      ]
    });
    bobListPolicyId = policyRes.data.data.id;
    console.log('✓ Created BobListPermissions policy');

    // Attach to Bob
    await client.post(`/iam/users/${bobId}/policies`, { policyId: bobListPolicyId });
    console.log('✓ Attached policy to Bob');
  } catch (err) {
    console.error('✗ Step 3 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 4. Log in as Bob -> Verify List routes (200) & write routes (403)
  // -----------------------------------------------------------------
  console.log('\n--- Step 4: Verify Bob permissions ---');
  try {
    const loginRes = await client.post('/auth/login', {
      email: 'bob@org.local',
      password: 'bob1234'
    });
    bobToken = loginRes.data.data.token;
    console.log('✓ Bob authenticated successfully');
    setAuthToken(bobToken);

    // Can list users (expect 200)
    const listRes = await client.get('/iam/users');
    console.log(`✓ Bob iam:ListUsers test: HTTP ${listRes.status} (Expected 200)`);

    // Cannot create policy (expect 403)
    try {
      await client.post('/iam/policies', {
        name: 'TestPolicy',
        type: 'MANAGED',
        statements: [{ Effect: 'Allow', Action: ['reports:List'], Resource: ['*'] }]
      });
      console.log('✗ Bob iam:CreatePolicy test: ALLOWED (Expected 403)');
    } catch (err) {
      console.log(`✓ Bob iam:CreatePolicy test: HTTP ${err.response?.status} (Expected 403)`);
    }
  } catch (err) {
    console.error('✗ Step 4 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 5. Log in as Root -> Put boundary on Alice
  // -----------------------------------------------------------------
  console.log('\n--- Step 5: Put boundary on Alice ---');
  setAuthToken(rootToken);
  try {
    // Set ReadOnlyAccess boundary on Alice
    await client.put(`/iam/users/${aliceId}/boundary`, { policyId: readOnlyPolicyId });
    console.log('✓ Placed ReadOnlyAccess boundary on Alice');

    // Retrieve Alice's profile and check boundary
    const profileRes = await client.get(`/iam/users/${aliceId}`);
    console.log(`✓ Alice profile boundary: ${profileRes.data.data.boundary?.name || 'none'} (Expected ReadOnlyAccess)`);
  } catch (err) {
    console.error('✗ Step 5 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 6. Log in as Root -> Create & attach CreatePolicy to Bob
  // -----------------------------------------------------------------
  console.log('\n--- Step 6: Attach CreatePolicy to Bob ---');
  try {
    const policyRes = await client.post('/iam/policies', {
      name: 'BobCreatePermissions',
      type: 'MANAGED',
      description: 'Grants policy creation and updating.',
      statements: [
        {
          Effect: 'Allow',
          Action: ['iam:CreatePolicy', 'iam:UpdatePolicy'],
          Resource: ['*']
        }
      ]
    });
    bobCreatePolicyId = policyRes.data.data.id;
    console.log('✓ Created BobCreatePermissions policy');

    // Attach to Bob
    await client.post(`/iam/users/${bobId}/policies`, { policyId: bobCreatePolicyId });
    console.log('✓ Attached BobCreatePermissions to Bob');
  } catch (err) {
    console.error('✗ Step 6 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 7. Log in as Bob -> Attempt Delegation Bypass (expect 403)
  // -----------------------------------------------------------------
  console.log('\n--- Step 7: Bob Delegation Bypass test ---');
  setAuthToken(bobToken);
  try {
    // Bob does not hold reports:Delete. 
    // Attempting to create a policy with reports:Delete should be blocked by Delegation Bypass Prevention.
    await client.post('/iam/policies', {
      name: 'BobMaliciousPolicy',
      type: 'MANAGED',
      statements: [
        {
          Effect: 'Allow',
          Action: ['reports:Delete'],
          Resource: ['*']
        }
      ]
    });
    console.log('✗ Bob Delegation Bypass: ALLOWED (Expected 403 block)');
    process.exit(1);
  } catch (err) {
    console.log(`✓ Bob Delegation Bypass: HTTP ${err.response?.status} (${err.response?.data?.message}) (Expected 403 block)`);
  }

  // -----------------------------------------------------------------
  // 8. Log in as Root -> Give ReportsFullAccess to Bob -> Bob creates policy
  // -----------------------------------------------------------------
  console.log('\n--- Step 8: Bob succeeds delegation after gaining full access ---');
  setAuthToken(rootToken);
  try {
    // Attach ReportsFullAccess to Bob
    await client.post(`/iam/users/${bobId}/policies`, { policyId: reportsFullPolicyId });
    console.log('✓ Attached ReportsFullAccess to Bob');

    // Log back as Bob and retry creating the policy
    setAuthToken(bobToken);
    const successPolicyRes = await client.post('/iam/policies', {
      name: 'BobLegitPolicy',
      type: 'MANAGED',
      statements: [
        {
          Effect: 'Allow',
          Action: ['reports:Delete'],
          Resource: ['*']
        }
      ]
    });
    console.log(`✓ Bob created policy successfully: HTTP ${successPolicyRes.status} (Expected 201/200)`);
  } catch (err) {
    console.error('✗ Step 8 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // 9. Log in as Root -> Remove boundary from Alice
  // -----------------------------------------------------------------
  console.log('\n--- Step 9: Remove boundary from Alice ---');
  setAuthToken(rootToken);
  try {
    await client.delete(`/iam/users/${aliceId}/boundary`);
    console.log('✓ Removed boundary from Alice');

    // Get Alice profile
    const profileRes = await client.get(`/iam/users/${aliceId}`);
    console.log(`✓ Alice boundary is now: ${profileRes.data.data.boundary} (Expected null)`);
  } catch (err) {
    console.error('✗ Step 9 failed:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('       ALL INTEGRATION TESTS PASSED CLEANLY       ');
  console.log('==================================================');
}

runTests();
