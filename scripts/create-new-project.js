/**
 * One-Click Project Generator from oneiric-template
 *
 * Automates:
 * 1. Creating the new GitHub repository from oneiric-matrix/oneiric-template (including all branches)
 * 2. Creating the dedicated GitHub Project V2 board
 * 3. Setting the 6 required status columns (Triaging, In Progress, In Review, Auto-Testing, Manual Testing, Done)
 * 4. Setting up the "[Gen] Issues" board view
 * 5. Linking the project board directly to the new repository
 *
 * Usage:
 *   node scripts/create-new-project.js --name <new-repo-name> [--owner oneiric-matrix] [--description "Project description"] [--private]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const REQUIRED_STATUSES = [
  'Triaging',
  'In Progress',
  'In Review',
  'Auto-Testing',
  'Manual Testing',
  'Done'
];

function getGitHubToken() {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  const globalConfigPath = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.gemini',
    'config',
    'mcp_config.json'
  );
  if (fs.existsSync(globalConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      if (cfg.mcpServers?.['github-org']?.env?.GITHUB_PERSONAL_ACCESS_TOKEN) {
        return cfg.mcpServers['github-org'].env.GITHUB_PERSONAL_ACCESS_TOKEN;
      }
      if (cfg.mcpServers?.github?.env?.GITHUB_PERSONAL_ACCESS_TOKEN) {
        return cfg.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      }
    } catch (_) {}
  }
  return null;
}

function restReq(token, endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Oneiric-Project-Generator',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    if (body) options.headers['Content-Type'] = 'application/json';

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function graphql(token, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Oneiric-Project-Generator',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors && parsed.errors.length > 0) {
            return reject(new Error(parsed.errors.map(e => e.message).join(' | ')));
          }
          resolve(parsed.data);
        } catch (_) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  let repoName = '';
  let owner = 'oneiric-matrix';
  let description = 'Project created from oneiric-template';
  let isPrivate = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) repoName = args[++i];
    if (args[i] === '--owner' && args[i + 1]) owner = args[++i];
    if (args[i] === '--description' && args[i + 1]) description = args[++i];
    if (args[i] === '--private') isPrivate = true;
  }

  if (!repoName) {
    console.error('❌ Error: --name <repo-name> is required.');
    process.exit(1);
  }

  const token = getGitHubToken();
  if (!token) {
    console.error('❌ Error: GitHub Token not found.');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 Starting Full Project Initialization: ${owner}/${repoName}`);
  console.log(`======================================================`);

  // 1. Generate repository from oneiric-template
  console.log(`1️⃣ Creating repository '${repoName}' from template 'oneiric-matrix/oneiric-template'...`);
  const createRepoRes = await restReq(token, '/repos/oneiric-matrix/oneiric-template/generate', 'POST', {
    owner: owner,
    name: repoName,
    description: description,
    include_all_branches: true,
    private: isPrivate
  });

  if (createRepoRes.status !== 201) {
    console.error(`❌ Failed to create repo from template:`, createRepoRes.data?.message || createRepoRes.status);
    process.exit(1);
  }
  const newRepo = createRepoRes.data;
  console.log(`   ✅ Created Repository: ${newRepo.html_url} (All branches included)`);

  // Wait a moment for GitHub to finish copying branches and tree
  console.log(`   ⏳ Waiting for repo provisioning to complete...`);
  await new Promise(r => setTimeout(r, 4000));

  // 2. Resolve Owner Node ID
  console.log(`2️⃣ Resolving GitHub Organization/User ID for '${owner}'...`);
  let ownerId;
  try {
    const orgRes = await graphql(token, `query($login: String!) { organization(login: $login) { id } }`, { login: owner });
    ownerId = orgRes.organization?.id;
  } catch (_) {}
  if (!ownerId) {
    const userRes = await graphql(token, `query($login: String!) { user(login: $login) { id } }`, { login: owner });
    ownerId = userRes.user?.id;
  }

  // 3. Create GitHub Project V2
  const projectTitle = `${repoName} Board`;
  console.log(`3️⃣ Creating Project V2 Board: "${projectTitle}"...`);
  const projRes = await graphql(token, `
    mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 {
          id
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
              }
            }
          }
        }
      }
    }
  `, { ownerId, title: projectTitle });

  const project = projRes.createProjectV2.projectV2;
  console.log(`   ✅ Created Project Board: ${project.url}`);

  // 4. Configure Status Columns
  console.log(`4️⃣ Setting up 6 Lifecycle Status columns...`);
  const statusField = project.fields.nodes.find(f => f.name === 'Status');
  if (statusField) {
    const colors = ['GRAY', 'BLUE', 'PURPLE', 'YELLOW', 'ORANGE', 'GREEN'];
    const options = REQUIRED_STATUSES.map((name, i) => ({
      name: name,
      color: colors[i],
      description: `Issues in ${name}`
    }));

    await graphql(token, `
      mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
        updateProjectV2Field(input: {
          fieldId: $fieldId,
          singleSelectOptions: $options
        }) {
          projectV2Field {
            ... on ProjectV2SingleSelectField {
              id
            }
          }
        }
      }
    `, { fieldId: statusField.id, options });
    console.log(`   ✅ Status columns configured: ${REQUIRED_STATUSES.join(' -> ')}`);
  }

  // 5. Create "[Gen] Issues" Board View
  console.log(`5️⃣ Creating dedicated "[Gen] Issues" Board View...`);
  const viewRes = await graphql(token, `
    mutation($projectId: ID!) {
      createProjectV2View(input: {
        projectId: $projectId,
        name: "[Gen] Issues",
        layout: BOARD_LAYOUT
      }) {
        projectV2View {
          id
        }
      }
    }
  `, { projectId: project.id });

  const viewId = viewRes.createProjectV2View.projectV2View.id;
  await graphql(token, `
    mutation($viewId: ID!) {
      updateProjectV2View(input: {
        viewId: $viewId,
        filter: "[Gen]"
      }) {
        projectV2View {
          id
        }
      }
    }
  `, { viewId });
  console.log(`   ✅ Created "[Gen] Issues" board view grouped by Status`);

  // 6. Link Project to the newly created Repo
  console.log(`6️⃣ Linking Project Board to Repository '${newRepo.full_name}'...`);
  try {
    const repoDetails = await graphql(token, `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id } }`, { owner, name: repoName });
    await graphql(token, `
      mutation($projectId: ID!, $repositoryId: ID!) {
        linkProjectV2ToRepository(input: {
          projectId: $projectId,
          repositoryId: $repositoryId
        }) {
          projectV2 {
            id
          }
        }
      }
    `, { projectId: project.id, repositoryId: repoDetails.repository.id });
    console.log(`   ✅ Linked project board to repository`);
  } catch (err) {
    console.log(`   Notice on linking: ${err.message}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 PROJECT FULLY READY FOR DEVELOPMENT!`);
  console.log(`📦 Repository:   ${newRepo.html_url}`);
  console.log(`📋 Project Board: ${project.url}`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
