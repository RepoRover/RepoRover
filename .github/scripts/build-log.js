// Updates the "Build log" section of README.md with aggregate activity from
// Bfloo repos (which may be private). Only totals are published, never
// commit messages, branch names or file paths, since the README is public.
const fs = require('fs');

const REPOS = ['Bfloo-App/bfloo', 'Bfloo-App/web-client-dashboard'];
const DAYS = 7;
const START = '<!-- BFLOO-LOG:START -->';
const END = '<!-- BFLOO-LOG:END -->';

module.exports = async ({ github }) => {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  let commits = 0;
  let mergedPRs = 0;
  let lastPush = null;

  for (const full of REPOS) {
    const [owner, repo] = full.split('/');

    const repoCommits = await github.paginate(github.rest.repos.listCommits, {
      owner, repo, since: since.toISOString(), per_page: 100,
    });
    commits += repoCommits.length;

    const prs = await github.paginate(github.rest.pulls.list, {
      owner, repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 100,
    });
    mergedPRs += prs.filter((pr) => pr.merged_at && new Date(pr.merged_at) >= since).length;

    const { data } = await github.rest.repos.get({ owner, repo });
    const pushed = new Date(data.pushed_at);
    if (!lastPush || pushed > lastPush) lastPush = pushed;
  }

  const fmt = (d) => d.toISOString().slice(0, 10);
  const block = [
    START,
    `| Last ${DAYS} days | |`,
    '|---|---|',
    `| 🧱 Commits to Bfloo | **${commits}** |`,
    `| 🔀 Pull requests merged | **${mergedPRs}** |`,
    `| 🕒 Last push | ${lastPush ? fmt(lastPush) : 'n/a'} |`,
    '',
    `<sub>Auto-updated ${fmt(new Date())} from private repos. Code stays private until launch.</sub>`,
    END,
  ].join('\n');

  const readme = fs.readFileSync('README.md', 'utf8');
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  fs.writeFileSync('README.md', readme.replace(pattern, block));
};
