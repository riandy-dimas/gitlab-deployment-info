import { filterChangelogCommits, hasCompletePatch, isFileChangeAlreadyApplied, isRevertCommit } from "./changelog.js";

const PER_PAGE_SIZE = 50;

async function fetchJson(url, headers, allowMissing = false) {
  const response = await fetch(url, { headers });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitLab request failed (${response.status}). Check your access and try again.`);
  return response.json();
}

async function fetchPages(url, headers) {
  const results = [];
  let page = 1;
  while (page) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("per_page", "100");
    pageUrl.searchParams.set("page", String(page));
    const response = await fetch(pageUrl.toString(), { headers });
    if (!response.ok) throw new Error(`GitLab request failed (${response.status}). Check your access and try again.`);
    const items = await response.json();
    results.push(...items);
    const next = response.headers.get("x-next-page");
    page = next === null ? (items.length === 100 ? page + 1 : 0) : Number(next);
  }
  return results;
}

async function mapConcurrent(items, callback) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await callback(items[index]);
    }
  }));
  return results;
}

export async function getRepoSlug() {
  let tabUrl;

  try {
    // First, try to get from storage (for standalone window)
    const { currentTabUrl } = await chrome.storage.local.get("currentTabUrl");

    if (currentTabUrl) {
      tabUrl = currentTabUrl;
    } else {
      // Fallback: try to get the active tab (for popup mode)
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.url) {
        tabUrl = tab.url;
      } else {
        return null;
      }
    }
  } catch (error) {
    console.error("Error getting tab URL:", error);
    return null;
  }

  const url = new URL(tabUrl);

  if (url.hostname !== "gitlab.com") return null;

  // Remove leading/trailing slashes, split into parts
  const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");

  // GitLab structure: /group1/group2/.../project/...
  // We need to find where the `-` segment starts (e.g., -/merge_requests)
  const dashIndex = parts.findIndex((p) => p === "-");

  // If there's no dash segment, everything is namespace + project
  const projectParts = dashIndex === -1 ? parts : parts.slice(0, dashIndex);

  if (projectParts.length < 2) return null;

  const project = projectParts[projectParts.length - 1];
  const namespace = projectParts.slice(0, -1).join("/");
  return { project, namespace };
}

export async function fetchCurrentRepoInfo(token) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);

  if (url.hostname !== "gitlab.com") return null;

  // Remove leading/trailing slashes, split into parts
  const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");

  // GitLab structure: /group1/group2/.../project/...
  // We need to find where the `-` segment starts (e.g., -/merge_requests)
  const dashIndex = parts.findIndex((p) => p === "-");

  // If there's no dash segment, everything is namespace + project
  const projectParts = dashIndex === -1 ? parts : parts.slice(0, dashIndex);

  if (projectParts.length < 2) return null;

  const project = projectParts[projectParts.length - 1];
  const namespace = projectParts.slice(0, -1).join("/");

  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedPath}`,
    {
      headers,
    }
  );
  if (!response.ok) throw new Error("Failed to fetch project info");

  const { name, web_url } = await response.json();

  return { name, namespace, project, web_url };
}

export async function fetchTags(namespace, project, token) {
  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedPath}/repository/tags?per_page=${PER_PAGE_SIZE}`,
    {
      headers,
    }
  );

  if (!response.ok) throw new Error("Failed to fetch tags");
  const tags = await response.json();
  tags.sort(
    (a, b) =>
      new Date(b.commit.created_at).valueOf() -
      new Date(a.commit.created_at).valueOf()
  );
  return tags.map((tag) => tag.name);
}

export async function fetchPipelines(namespace, project, token) {
  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedPath}/pipelines?scope=tags&per_page=${PER_PAGE_SIZE}`,
    {
      headers,
    }
  );

  if (!response.ok) throw new Error("Failed to fetch pipelines");
  const pipelines = await response.json();
  return pipelines.map((pipeline) => ({
    label: `#${pipeline.id} (${pipeline.ref})`,
    value: pipeline.web_url,
    ref: pipeline.ref,
  }));
}

export async function fetchComparisons(namespace, project, token) {
  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fromTag = document.getElementById("fromTag").value;
  const toTag = document.getElementById("toTag").value;

  if (!fromTag || !toTag) {
    throw new Error("From and to tag is not defined");
  }

  const repositoryUrl = `https://gitlab.com/api/v4/projects/${encodedPath}/repository`;
  const params = new URLSearchParams({ from: fromTag, to: toTag, straight: "true" });
  const comparisons = await fetchJson(`${repositoryUrl}/compare?${params}`, headers);
  const candidates = filterChangelogCommits(comparisons.commits, { deduplicate: false });
  const files = new Map();
  function getFile(path, ref) {
    const key = JSON.stringify([path, ref]);
    if (!files.has(key)) {
      const query = new URLSearchParams({ ref });
      files.set(key, fetchJson(`${repositoryUrl}/files/${encodeURIComponent(path)}?${query}`, headers, true));
    }
    return files.get(key);
  }

  const alreadyApplied = await mapConcurrent(candidates, async (commit) => {
    // Reverts are operationally significant, even when they restore old content.
    if (isRevertCommit(commit)) return false;
    const commitUrl = `${repositoryUrl}/commits/${encodeURIComponent(commit.id)}`;
    const details = await fetchJson(commitUrl, headers);
    if (details.parent_ids?.length > 1) return false;
    const diffs = await fetchPages(`${commitUrl}/diff`, headers);
    if (!hasCompletePatch(diffs, details.stats)) return false;
    for (const diff of diffs) {
      const baseline = await getFile(diff.new_path, fromTag);
      const target = diff.deleted_file ? null : await getFile(diff.new_path, commit.id);
      if (!isFileChangeAlreadyApplied(diff, baseline, target)) return false;
    }
    return true;
  });
  const newCommits = candidates.filter((_, index) => !alreadyApplied[index]);
  return filterChangelogCommits(newCommits).map((commit) => commit.title);
}

export async function fetchRepoDetails(namespace, project, token) {
  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const url = `https://gitlab.com/api/v4/projects/${encodedPath}`;

  const headers = {};
  if (token) {
    headers["PRIVATE-TOKEN"] = token;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch repo details: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    namespace: data.namespace.full_path,
    project: data.path,
    name: data.name,
  };
}
