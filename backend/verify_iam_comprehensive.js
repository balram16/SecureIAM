const { execSync } = require('child_process');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000/api';
const client = axios.create({
  baseURL: BACKEND_URL,
  validateStatus: () => true // Prevent axios from throwing on non-2xx status codes
});

function runSeed() {
  console.log('Re-seeding database for clean test baseline...');
  try {
    execSync('node prisma/seed.js', { stdio: 'pipe' });
    console.log('✓ Database seeded successfully.\n');
  } catch (err) {
    console.error('✗ Seeding failed:', err.message);
    process.exit(1);
  }
}

function setAuth(token) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('     STARTING COMPREHENSIVE IAM SECURITY TESTS    ');
  console.log('==================================================\n');

  runSeed();

  let rootToken, bobToken, aliceToken, superAdminToken;
  let rootId, bobId, aliceId, superAdminId;
  let readOnlyPolicyId, reportsFullPolicyId;

  // -----------------------------------------------------------------
  // 1. Get Core Data from seeded DB
  // -----------------------------------------------------------------
  console.log('--- Step 1: Authentication & Identity Discovery ---');
  
  // Test invalid login
  const badLogin = await client.post('/auth/login', { email: 'root@org.local', password: 'wrongpassword' });
  if (badLogin.status !== 401) {
    console.error(`  ✗ Expected invalid login to return 401, but got ${badLogin.status}`);
    process.exit(1);
  }
  console.log('  ✓ Invalid login rejected with 401');

  // Login as Root
  const rootLogin = await client.post('/auth/login', { email: 'root@org.local', password: 'root1234' });
  if (rootLogin.status !== 200) {
    console.error(`  ✗ Root login failed: HTTP ${rootLogin.status}`);
    process.exit(1);
  }
  rootToken = rootLogin.data.data.token;
  console.log('  ✓ Root authenticated successfully');

  // Discover Users & Seeded Policies
  setAuth(rootToken);
  const usersRes = await client.get('/iam/users');
  const policiesRes = await client.get('/iam/policies');

  const users = usersRes.data.data;
  const policies = policiesRes.data.data;

  rootId = users.find(u => u.email === 'root@org.local').id;
  aliceId = users.find(u => u.email === 'alice@org.local').id;
  bobId = users.find(u => u.email === 'bob@org.local').id;
  
  readOnlyPolicyId = policies.find(p => p.name === 'ReadOnlyAccess').id;
  reportsFullPolicyId = policies.find(p => p.name === 'ReportsFullAccess').id;

  console.log(`  ✓ Discovered Users (Root: ${rootId}, Alice: ${aliceId}, Bob: ${bobId})`);
  console.log(`  ✓ Discovered Policies (ReadOnly: ${readOnlyPolicyId}, ReportsFull: ${reportsFullPolicyId})`);

  // Login as Alice
  const aliceLogin = await client.post('/auth/login', { email: 'alice@org.local', password: 'alice1234' });
  aliceToken = aliceLogin.data.data.token;
  console.log('  ✓ Alice authenticated successfully');

  // Login as Bob
  const bobLogin = await client.post('/auth/login', { email: 'bob@org.local', password: 'bob1234' });
  bobToken = bobLogin.data.data.token;
  console.log('  ✓ Bob authenticated successfully');


  // -----------------------------------------------------------------
  // 2. Test Implicit Deny
  // -----------------------------------------------------------------
  console.log('\n--- Step 2: Implicit Deny Checks ---');
  setAuth(bobToken); // Bob has no policies attached initially

  const bobReports = await client.get('/reports');
  if (bobReports.status !== 403) {
    console.error(`  ✗ Bob reports list should be denied (403), but got ${bobReports.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob access to reports denied implicitly (403)');

  const bobUsers = await client.get('/iam/users');
  if (bobUsers.status !== 403) {
    console.error(`  ✗ Bob access to users list should be denied (403), but got ${bobUsers.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob access to IAM users denied implicitly (403)');


  // -----------------------------------------------------------------
  // 3. Test Explicit Deny Overrides Allow
  // -----------------------------------------------------------------
  console.log('\n--- Step 3: Explicit Deny Precedence ---');
  
  // Attach ReadOnlyAccess policy to Bob to give him Allow permission for reports:List
  setAuth(rootToken);
  await client.post(`/iam/users/${bobId}/policies`, { policyId: readOnlyPolicyId });
  console.log('  ✓ Attached ReadOnlyAccess to Bob');

  // Verify Bob now has access
  setAuth(bobToken);
  let checkBobReports = await client.get('/reports');
  if (checkBobReports.status !== 200) {
    console.error(`  ✗ Bob reports list should be allowed (200), but got ${checkBobReports.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob now has access to reports (200) via ReadOnlyAccess Allow');

  // Root creates an Explicit Deny inline policy for Bob
  setAuth(rootToken);
  const denyPolicy = await client.post('/iam/policies', {
    name: 'DenyReportsInline',
    description: 'Explicitly deny reports access',
    type: 'INLINE',
    userId: bobId,
    statements: [
      {
        Effect: 'Deny',
        Action: ['reports:List'],
        Resource: ['*']
      }
    ]
  });
  const denyPolicyId = denyPolicy.data.data.id;
  console.log(`  ✓ Created Explicit Deny inline policy (ID: ${denyPolicyId}) for Bob`);

  // Verify Bob is now blocked despite the Allow policy
  setAuth(bobToken);
  checkBobReports = await client.get('/reports');
  if (checkBobReports.status !== 403) {
    console.error(`  ✗ Bob reports list should be denied by Explicit Deny (403), but got ${checkBobReports.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob blocked from reports (403) due to explicit Deny override');

  // Detach/Delete the Deny policy
  setAuth(rootToken);
  await client.delete(`/iam/policies/${denyPolicyId}`);
  console.log('  ✓ Deleted Deny inline policy');

  // Verify Bob reports access is restored
  setAuth(bobToken);
  checkBobReports = await client.get('/reports');
  if (checkBobReports.status !== 200) {
    console.error(`  ✗ Bob reports access should be restored to 200, but got ${checkBobReports.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob access restored successfully (200)');


  // -----------------------------------------------------------------
  // 4. Test Permission Boundary (Intersection)
  // -----------------------------------------------------------------
  console.log('\n--- Step 4: Permission Boundary Enforcement ---');

  // Create a managed boundary policy that ONLY allows reports:Create (not reports:List)
  setAuth(rootToken);
  const boundaryPolicy = await client.post('/iam/policies', {
    name: 'ListBoundaryTest',
    description: 'Only allows reports creation',
    type: 'MANAGED',
    statements: [
      {
        Effect: 'Allow',
        Action: ['reports:Create'],
        Resource: ['*']
      }
    ]
  });
  const boundaryPolicyId = boundaryPolicy.data.data.id;
  console.log(`  ✓ Created Managed Boundary Policy (ID: ${boundaryPolicyId})`);

  // Apply boundary to Bob
  await client.put(`/iam/users/${bobId}/boundary`, { policyId: boundaryPolicyId });
  console.log('  ✓ Set Permission Boundary on Bob');

  // Verify Bob is blocked from list reports because list is not allowed by boundary
  setAuth(bobToken);
  let bobListRes = await client.get('/reports');
  if (bobListRes.status !== 403) {
    console.error(`  ✗ Bob reports list should be blocked by boundary (403), but got ${bobListRes.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob reports list blocked by boundary intersection (403)');

  // Update boundary to include reports:List
  setAuth(rootToken);
  await client.put(`/iam/policies/${boundaryPolicyId}`, {
    statements: [
      {
        Effect: 'Allow',
        Action: ['reports:Create', 'reports:List'],
        Resource: ['*']
      }
    ]
  });
  console.log('  ✓ Expanded Permission Boundary to allow reports:List');

  // Verify Bob can now list reports again
  setAuth(bobToken);
  bobListRes = await client.get('/reports');
  if (bobListRes.status !== 200) {
    console.error(`  ✗ Bob reports list should succeed after updating boundary (200), but got ${bobListRes.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob reports list allowed after boundary update (200)');

  // Remove boundary
  setAuth(rootToken);
  await client.delete(`/iam/users/${bobId}/boundary`);
  console.log('  ✓ Removed Permission Boundary from Bob');


  // -----------------------------------------------------------------
  // 5. Test Delegation Bypass Prevention
  // -----------------------------------------------------------------
  console.log('\n--- Step 5: Delegation Bypass Prevention ---');
  setAuth(aliceToken); // Alice only has reports:List (inherited from group)

  // Alice tries to create a policy with reports:Delete (which she does not hold)
  const badPolicyCreate = await client.post('/iam/policies', {
    name: 'AliceHackedDelete',
    description: 'Grant reports deletion',
    type: 'MANAGED',
    statements: [
      {
        Effect: 'Allow',
        Action: ['reports:Delete'],
        Resource: ['*']
      }
    ]
  });
  if (badPolicyCreate.status !== 403) {
    console.error(`  ✗ Alice should be blocked from delegating reports:Delete (403), but got ${badPolicyCreate.status}`);
    process.exit(1);
  }
  console.log('  ✓ Alice blocked from creating a policy with higher privileges (403)');

  // Alice tries to attach ReportsFullAccess to herself
  const badPolicyAttach = await client.post(`/iam/users/${aliceId}/policies`, { policyId: reportsFullPolicyId });
  if (badPolicyAttach.status !== 403) {
    console.error(`  ✗ Alice should be blocked from attaching ReportsFullAccess (403), but got ${badPolicyAttach.status}`);
    process.exit(1);
  }
  console.log('  ✓ Alice blocked from attaching a policy with higher privileges (403)');


  // -----------------------------------------------------------------
  // 6. Test Managed Policy Deletion Rules
  // -----------------------------------------------------------------
  console.log('\n--- Step 6: Managed Policy Deletion Rules ---');

  // Create a SuperAdmin user that has all iam actions (iam:*)
  setAuth(rootToken);
  const adminRegister = await client.post('/auth/register', {
    name: 'Super Admin',
    email: 'superadmin@org.local',
    password: 'superadmin1234'
  });
  superAdminId = adminRegister.data.data.id;
  
  const adminPolicy = await client.post('/iam/policies', {
    name: 'SuperAdminPolicy',
    description: 'Full IAM admin access',
    type: 'MANAGED',
    statements: [
      {
        Effect: 'Allow',
        Action: ['iam:ListPolicies', 'iam:GetPolicy', 'iam:CreatePolicy', 'iam:UpdatePolicy', 'iam:DeletePolicy', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy'],
        Resource: ['*']
      }
    ]
  });
  const adminPolicyId = adminPolicy.data.data.id;
  
  // Attach admin privileges to SuperAdmin
  await client.post(`/iam/users/${superAdminId}/policies`, { policyId: adminPolicyId });
  
  // Login as SuperAdmin
  const saLogin = await client.post('/auth/login', { email: 'superadmin@org.local', password: 'superadmin1234' });
  superAdminToken = saLogin.data.data.token;
  console.log('  ✓ SuperAdmin identity configured successfully');

  // Root creates a managed policy to test deletion
  setAuth(rootToken);
  const tempPolicy = await client.post('/iam/policies', {
    name: 'TempDeleteTest',
    description: 'Temporary delete test policy',
    type: 'MANAGED',
    statements: [
      {
        Effect: 'Allow',
        Action: ['reports:List'],
        Resource: ['*']
      }
    ]
  });
  const tempPolicyId = tempPolicy.data.data.id;
  console.log(`  ✓ Root created 'TempDeleteTest' policy (ID: ${tempPolicyId})`);

  // Root attaches policy to Bob
  await client.post(`/iam/users/${bobId}/policies`, { policyId: tempPolicyId });
  console.log('  ✓ Root attached TempDeleteTest to Bob');

  // SuperAdmin tries to delete the policy while it is attached
  setAuth(superAdminToken);
  const deleteFail = await client.delete(`/iam/policies/${tempPolicyId}`);
  if (deleteFail.status !== 400) {
    console.error(`  ✗ SuperAdmin deleting attached policy should fail with 400, but got ${deleteFail.status}`);
    process.exit(1);
  }
  console.log('  ✓ SuperAdmin deletion blocked successfully (400) because policy is attached');

  // SuperAdmin detaches the policy from Bob
  const detachRes = await client.delete(`/iam/users/${bobId}/policies/${tempPolicyId}`);
  if (detachRes.status !== 200) {
    console.error(`  ✗ SuperAdmin detaching policy failed: HTTP ${detachRes.status}`);
    process.exit(1);
  }
  console.log('  ✓ SuperAdmin successfully detached policy from Bob');

  // SuperAdmin deletes the policy now that it is detached
  const deleteSuccess = await client.delete(`/iam/policies/${tempPolicyId}`);
  if (deleteSuccess.status !== 200) {
    console.error(`  ✗ SuperAdmin deleting detached policy failed: HTTP ${deleteSuccess.status}`);
    process.exit(1);
  }
  console.log('  ✓ SuperAdmin deleted detached policy successfully (200)');

  // ROOT DELETION BYPASS TEST:
  // Root creates another policy, attaches it, and deletes it directly
  setAuth(rootToken);
  const tempPolicy2 = await client.post('/iam/policies', {
    name: 'TempDeleteTest2',
    description: 'Temporary delete test policy 2',
    type: 'MANAGED',
    statements: [{ Effect: 'Allow', Action: ['reports:List'], Resource: ['*'] }]
  });
  const tempPolicy2Id = tempPolicy2.data.data.id;
  await client.post(`/iam/users/${bobId}/policies`, { policyId: tempPolicy2Id });
  
  // Root deletes it directly while attached
  const rootDeleteSuccess = await client.delete(`/iam/policies/${tempPolicy2Id}`);
  if (rootDeleteSuccess.status !== 200) {
    console.error(`  ✗ Root deleting attached policy 2 should succeed (200), but got ${rootDeleteSuccess.status}`);
    process.exit(1);
  }
  console.log('  ✓ Root deleted attached policy 2 successfully (200) - Deletion Bypass verified');


  // -----------------------------------------------------------------
  // 7. Test Token Rotation & Logout
  // -----------------------------------------------------------------
  console.log('\n--- Step 7: Token Rotation & Session Revocation ---');

  // Login as Bob to get fresh tokens
  const bobRotLogin = await client.post('/auth/login', { email: 'bob@org.local', password: 'bob1234' });
  const bobAccess = bobRotLogin.data.data.token;
  const bobRefresh = bobRotLogin.data.data.refreshToken;
  console.log('  ✓ Obtained access token and refresh token for Bob');

  // Perform refresh
  const rotateRes = await client.post('/auth/refresh', { refreshToken: bobRefresh });
  if (rotateRes.status !== 200) {
    console.error(`  ✗ Refresh token rotation failed (200), but got ${rotateRes.status}`);
    process.exit(1);
  }
  const bobNewAccess = rotateRes.data.data.token;
  console.log('  ✓ Token rotation succeeded, returned new access token');

  // Logout Bob
  setAuth(bobNewAccess);
  const logoutRes = await client.post('/auth/logout');
  if (logoutRes.status !== 200) {
    console.error(`  ✗ Logout request failed (200), but got ${logoutRes.status}`);
    process.exit(1);
  }
  console.log('  ✓ Bob logged out successfully, refresh token nullified in database');

  // Attempt refresh again with same token -> should fail
  const failedRefresh = await client.post('/auth/refresh', { refreshToken: bobRefresh });
  if (failedRefresh.status !== 401) {
    console.error(`  ✗ Expired/logged out refresh token should return 401, but got ${failedRefresh.status}`);
    process.exit(1);
  }
  console.log('  ✓ Logged out refresh token rejected successfully (401)');

  console.log('\n==================================================');
  console.log('       ALL COMPREHENSIVE SECURITY TESTS PASSED    ');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
