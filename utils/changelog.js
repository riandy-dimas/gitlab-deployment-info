const JIRA_PREFIX = /^(?:(?:\[[A-Z][A-Z0-9]*-\d+\]|[A-Z][A-Z0-9]*-\d+)\s*)+/i;

export function filterChangelogCommits(commits, { deduplicate = true } = {}) {
  const seen = new Set();
  return commits.filter((commit) => {
    const title = commit.title.trim();
    const subject = title.replace(JIRA_PREFIX, "");
    if (!title || (deduplicate && seen.has(title))) return false;
    if (/^merge (?:branch\b|remote-tracking branch\b|tag\b|pull request\b|[a-f0-9]{7,40}\b)/i.test(subject)) return false;
    const conventional = subject.match(/^([a-z]+)(?:\([^)]*\))?!?:\s*(.*)$/i);
    if (conventional) {
      const [, type, body] = conventional;
      if (/^(docs|test|style)$/i.test(type)) return false;
      if (/^(chore|build|ci)$/i.test(type) && (
        /^(?:release\s+|(?:bump|update|set)\s+(?:(?:package|release)\s+)?version\s+(?:to\s+)?|v)(?:v)?\d+\.\d+\.\d+(?:[-+][\w.-]+)?\s*$/i.test(body) ||
        /^(?:update|generate|regenerate)\s+(?:the\s+)?(?:changelog|release notes)(?:\s+(?:for\s+)?v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?)?\s*$/i.test(body) ||
        /^v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?\s*$/.test(body)
      )) return false;
    }
    seen.add(title);
    return true;
  });
}

export function isRevertCommit(commit) {
  return /^revert\b/i.test(commit.title.trim().replace(JIRA_PREFIX, ""));
}

// Parse only complete textual unified diffs. Unknown/binary/truncated patches
// remain in the changelog rather than risking hiding a real deployment change.
export function parsePatch(diff) {
  if (!diff || typeof diff.diff !== "string" || diff.collapsed || diff.too_large || diff.renamed_file || diff.old_path !== diff.new_path) return null;
  const hunks = [];
  let hunk;
  for (const line of diff.diff.split("\n")) {
    const header = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (header) {
      hunk = {
        oldStart: Number(header[1]), oldCount: Number(header[2] ?? 1),
        newStart: Number(header[3]), newCount: Number(header[4] ?? 1),
        before: [], after: [], additions: 0, deletions: 0,
      };
      hunks.push(hunk);
    } else if (hunk && /^[ +\-]/.test(line)) {
      if (line[0] !== "+") hunk.before.push(line.slice(1));
      if (line[0] !== "-") hunk.after.push(line.slice(1));
      if (line[0] === "+") hunk.additions++;
      if (line[0] === "-") hunk.deletions++;
    } else if (line && !line.startsWith("\\ No newline at end of file")) {
      return null;
    }
  }
  if (!hunks.length || hunks.some((h) => h.before.length !== h.oldCount || h.after.length !== h.newCount)) return null;
  return hunks;
}

export function hasCompletePatch(diffs, stats) {
  if (!diffs.length || !stats) return false;
  let additions = 0;
  let deletions = 0;
  for (const diff of diffs) {
    const hunks = parsePatch(diff);
    if (!hunks) return false;
    for (const hunk of hunks) {
      additions += hunk.additions;
      deletions += hunk.deletions;
    }
  }
  return additions === stats.additions && deletions === stats.deletions;
}

function decodeFile(file) {
  if (file.encoding !== "base64") return null;
  try {
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (c) => c.charCodeAt(0));
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return content.includes("\0") ? null : content;
  } catch {
    return null;
  }
}

function occurrences(lines, sequence) {
  if (!sequence.length) return [];
  const matches = [];
  for (let i = 0; i <= lines.length - sequence.length; i++) {
    if (sequence.every((line, j) => line === lines[i + j])) {
      matches.push(i);
      if (matches.length > 1) break;
    }
  }
  return matches;
}

export function isFileChangeAlreadyApplied(diff, baseline, target) {
  if (diff.deleted_file) return baseline === null;
  if (!baseline || !target || baseline.execute_filemode !== target.execute_filemode) return false;
  if (baseline.blob_id && baseline.blob_id === target.blob_id) return true;
  if (diff.new_file) return false;
  const hunks = parsePatch(diff);
  const baselineContent = decodeFile(baseline);
  const targetContent = decodeFile(target);
  if (!hunks || baselineContent === null || targetContent === null) return false;
  if (baselineContent.endsWith("\n") !== targetContent.endsWith("\n")) return false;
  const baselineLines = baselineContent.split("\n");
  const targetLines = targetContent.split("\n");
  if (baselineContent.endsWith("\n")) baselineLines.pop();
  if (targetContent.endsWith("\n")) targetLines.pop();
  let previousEnd = 0;
  for (const hunk of hunks) {
    // Require a unique post-image, no remaining pre-image, and ordered hunks.
    // This also keeps reapplications after a production revert visible.
    const matches = occurrences(baselineLines, hunk.after);
    if (matches.length !== 1 || occurrences(baselineLines, hunk.before).length) return false;
    const start = matches[0];
    if (start < previousEnd || (hunk.newStart === 1 && start !== 0)) return false;
    if (hunk.newStart - 1 + hunk.newCount === targetLines.length && start + hunk.newCount !== baselineLines.length) return false;
    previousEnd = start + hunk.newCount;
  }
  return true;
}
