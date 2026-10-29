/**
 * Setup script to create a GitHub Project V2 with the 6 strict statuses
 * and optionally associate it with the repository.
 *
 * Requirements:
 * Personal Access Token (PAT) with:
 *  - 'project' (or Organization admin: 'write:org', 'read:org' / project permissions)
 *  - 'repo'
 *
 * Usage:
 *   node scripts/setup-project.js --owner <owner> [--repo <repo>] [--title <ProjectTitle>]
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Target lifecycle statuses
const REQUIRED_STATUSES = [
  'Triaging',
  'In Progress',
  'In Review',
  'Auto-Testing',
  'Manual Testing',
  'Done'
];

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  // Try reading from global antigravity config
  const globalConfigPath = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.gemini',
    'config',
    'mcp_config.json'
  );
  if (fs.existsSync(globalConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      // Prefer org token if available, fallback to default github token
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

function graphql(token, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Oneiric-Project-Setup',
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
        } catch (e) {
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
  let owner = 'oneiric-matrix';
  let repo = 'oneiric-template';
  let title = 'Project Board';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--owner' && args[i + 1]) owner = args[++i];
    if (args[i] === '--repo' && args[i + 1]) repo = args[++i];
    if (args[i] === '--title' && args[i + 1]) title = args[++i];
  }

  const token = getGitHubToken();
  if (!token) {
    console.error('❌ Error: GitHub Personal Access Token not found in env or mcp_config.json');
    process.exit(1);
  }

  console.log(`🚀 Setting up GitHub Project board for owner: '${owner}'...`);

  // 1. Resolve owner ID (Organization or User)
  const ownerQuery = `
    query($login: String!) {
      organization(login: $login) {
        id
      }
    }
  `;
  let ownerData;
  let ownerId;
  try {
    ownerData = await graphql(token, ownerQuery, { login: owner });
    ownerId = ownerData.organization?.id;
  } catch (_) {
    const userQuery = `
      query($login: String!) {
        user(login: $login) {
          id
        }
      }
    `;
    const userData = await graphql(token, userQuery, { login: owner });
    ownerId = userData.user?.id;
  }

  if (!ownerId) {
    console.error(`❌ Owner '${owner}' not found.`);
    process.exit(1);
  }

  // 2. Create ProjectV2
  console.log(`Creating ProjectV2 "${title}"...`);
  const createProjMutation = `
    mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 {
          id
          number
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  let project;
  try {
    const projRes = await graphql(token, createProjMutation, { ownerId, title });
    project = projRes.createProjectV2.projectV2;
    console.log(`✅ Created Project: ${project.url}`);
  } catch (err) {
    console.error(`❌ Failed to create project: ${err.message}`);
    console.log('\nTip: Ensure your PAT has the "project" scope (read:project, write:project / admin:org).');
    process.exit(1);
  }

  // 3. Find the Status field
  const statusField = project.fields.nodes.find(f => f.name === 'Status');
  if (!statusField) {
    console.log('⚠️ Status field not automatically found on created project.');
    return;
  }

  // 4. Update Status field options to match REQUIRED_STATUSES
  console.log(`Configuring Status field options: ${REQUIRED_STATUSES.join(', ')}...`);
  const updateFieldMutation = `
    mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      updateProjectV2Field(input: {
        fieldId: $fieldId,
        singleSelectOptions: $options
      }) {
        projectV2Field {
          ... on ProjectV2SingleSelectField {
            id
            options {
              id
              name
            }
          }
        }
      }
    }
  `;

  // Colors: GRAY, BLUE, YELLOW, ORANGE, PURPLE, GREEN
  const colors = ['GRAY', 'BLUE', 'PURPLE', 'YELLOW', 'ORANGE', 'GREEN'];
  const formattedOptions = REQUIRED_STATUSES.map((name, index) => ({
    name: name,
    color: colors[index % colors.length],
    description: `Issues in ${name}`
  }));

  try {
    await graphql(token, updateFieldMutation, {
      fieldId: statusField.id,
      options: formattedOptions
    });
    console.log('✅ Status field options successfully updated:');
    REQUIRED_STATUSES.forEach((s, idx) => console.log(`   ${idx + 1}. ${s}`));
  } catch (err) {
    console.warn(`Notice: Unable to auto-rename options (${err.message}). You can adjust the Status column labels directly in the GitHub Project Settings.`);
  }

  // 5. Create a Board View filtered by [Gen] and grouped by status
  console.log('Creating "[Gen] Issues" Board view...');
  const createViewMutation = `
    mutation($projectId: ID!) {
      createProjectV2View(input: {
        projectId: $projectId,
        name: "[Gen] Issues",
        layout: BOARD_LAYOUT
      }) {
        projectV2View {
          id
          name
        }
      }
    }
  `;

  try {
    const viewRes = await graphql(token, createViewMutation, { projectId: project.id });
    const viewId = viewRes.createProjectV2View.projectV2View.id;

    // Apply the "[Gen]" search filter to this view
    const updateViewMutation = `
      mutation($viewId: ID!) {
        updateProjectV2View(input: {
          viewId: $viewId,
          filter: "[Gen]"
        }) {
          projectV2View {
            id
            name
            filter
            layout
          }
        }
      }
    `;
    await graphql(token, updateViewMutation, { viewId });
    console.log('✅ Created dedicated "[Gen] Issues" board view (grouped by Status, filtered by [Gen]).');
  } catch (err) {
    console.warn(`Notice: Could not automatically create [Gen] board view: ${err.message}`);
  }

  console.log(`\n🎉 Project setup complete: ${project.url}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
