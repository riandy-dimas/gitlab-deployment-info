export async function getRepoSlug() {
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
    `https://gitlab.com/api/v4/projects/${encodedPath}/repository/tags`,
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
    `https://gitlab.com/api/v4/projects/${encodedPath}/pipelines?scope=tags`,
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

  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedPath}/repository/compare?from=${fromTag}&to=${toTag}`,
    {
      headers,
    }
  );

  if (!response.ok) throw new Error("Failed to fetch comparisons");
  const comparisons = await response.json();
  return comparisons.commits
    .filter((commit) => !commit.title.startsWith("Merge branch"))
    .map((commit) => commit.title);
}
