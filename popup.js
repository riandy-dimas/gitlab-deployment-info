const BASE_JIRA_URL = "https://wartek.atlassian.net";

const dateOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function getEmoji(commit) {
  if (/feat|add/i.test(commit)) return "✨";
  if (/fix/i.test(commit)) return "🐞";
  if (/refactor|clean/i.test(commit)) return "♻️";
  if (/docs/i.test(commit)) return "📝";
  if (/test/i.test(commit)) return "🧩";
  if (/chore/i.test(commit)) return "🔧";
  return "❓";
}

// Function to find and link JIRA card IDs
function addJiraLinks(commit, markdown = true) {
  // Regular expression to match JIRA card ID (e.g., MIL-10067)
  const jiraRegex = /([A-Z]+-\d+)/g;

  // Replace any JIRA ticket ID with a clickable link
  return commit.replace(jiraRegex, (match) => {
    if (!markdown)
      return `<a href="${BASE_JIRA_URL}/browse/${match}" target="_blank">${match}</a>`;
    return `[${match}](${BASE_JIRA_URL}/browse/${match})`;
  });
}

async function getCurrentRepoInfo() {
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

  return { namespace, project };
}

async function fetchTags(namespace, project, token) {
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

async function fetchPipelines(namespace, project, token) {
  const encodedPath = encodeURIComponent(`${namespace}/${project}`);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${encodedPath}/pipelines`,
    {
      headers,
    }
  );

  if (!response.ok) throw new Error("Failed to fetch pipelines");
  const pipelines = await response.json();
  return pipelines.map((pipeline) => ({
    label: `${pipeline.id} - ${pipeline.ref}`,
    value: pipeline.web_url,
  }));
}
async function fetchComparisons(namespace, project, token) {
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

function setLoading(loading = true) {
  if (loading) {
    document.getElementById("generateBtn").setAttribute("disabled", "true");
    document.getElementById("fromTag").setAttribute("disabled", "true");
    document.getElementById("toTag").setAttribute("disabled", "true");
    document.getElementById("pipeline").setAttribute("disabled", "true");
    document.getElementById("dateTime").setAttribute("disabled", "true");
    document.getElementById("loader").style = "display: block";
  } else {
    document.getElementById("generateBtn").removeAttribute("disabled");
    document.getElementById("fromTag").removeAttribute("disabled");
    document.getElementById("toTag").removeAttribute("disabled");
    document.getElementById("pipeline").removeAttribute("disabled");
    document.getElementById("dateTime").removeAttribute("disabled");
    document.getElementById("loader").style = "display: none";
  }
}

// Save token on button click
document.getElementById("saveTokenBtn").addEventListener("click", () => {
  const token = document.getElementById("tokenInput").value;
  chrome.storage.local.set({ gitlabToken: token }, () => {
    alert("Token saved!");
  });
});

document.getElementById("revealPassword").addEventListener("click", () => {
  const token = document.getElementById("tokenInput");
  if (token.type === "password") {
    token.type = "text";
  } else {
    token.type = "password";
  }
});

// Load token when popup opens
document.addEventListener("DOMContentLoaded", async () => {
  const tokenInput = document.getElementById("tokenInput");
  chrome.storage.local.get("gitlabToken", async ({ gitlabToken }) => {
    if (gitlabToken) tokenInput.value = gitlabToken;

    try {
      setLoading(true);

      const repo = await getCurrentRepoInfo();
      if (!repo) {
        document.getElementById("output").innerHTML =
          '<p style="color: red; padding: 0; margin: 0;" >Not a valid GitLab repo.</p>';
        document.getElementById("gitlabToken").remove();
        document.getElementById("formData").remove();
        setLoading(false);
        return;
      }

      const [tags, pipelines] = await Promise.all([
        fetchTags(repo.namespace, repo.project, gitlabToken),
        fetchPipelines(repo.namespace, repo.project, gitlabToken),
      ]);

      setLoading(false);

      new Awesomplete(document.getElementById("fromTag"), {
        list: tags,
        sort: false,
        minChars: 0,
        maxItems: 10,
      });
      new Awesomplete(document.getElementById("toTag"), {
        list: tags,
        sort: false,
        minChars: 0,
        maxItems: 10,
      });
      new Awesomplete(document.getElementById("pipeline"), {
        list: pipelines,
        sort: false,
        minChars: 0,
        maxItems: 10,
        autoFirst: true,
        replace: function (suggestion) {
          this.input.value = suggestion.label;
          this.input.setAttribute("data-value", suggestion.value);
        },
      });

      document
        .getElementById("formData")
        .addEventListener("submit", async function (event) {
          if (!this.checkValidity()) {
            event.preventDefault(); // Cancel form submission
            // Optionally, show native error messages
            this.reportValidity();
          }
          event.preventDefault();

          setLoading(true);
          const dateTime = document.getElementById("dateTime");
          const pipeline = document.getElementById("pipeline");
          const fromTag = document.getElementById("fromTag").value;
          const toTag = document.getElementById("toTag").value;
          const compareUrl = `https://gitlab.com/${repo.namespace}/${repo.project}/-/compare/${fromTag}...${toTag}`;
          const commits = await fetchComparisons(
            repo.namespace,
            repo.project,
            gitlabToken
          );

          const slackMessageOutput = `*🚀Production Release〘[${
            repo.project
          }](https://gitlab.com/${repo.namespace}/${
            repo.project
          })〙🚀*\nHi everyone! we are going to have a production deployment with these details:\n―――\n*⏰ Deployment Time:*\n       ${new Date(
            dateTime.value
          ).toLocaleString("en-GB", dateOptions)}\n*🔗 Pipeline*\n       [#${
            pipeline.value
          }](${pipeline.getAttribute(
            "data-value"
          )})\n*🔍 Comparison*\n       [${fromTag} ⮕ ${toTag}](${compareUrl})\n*📝 Changes included:*\n${commits
            .map((c) => `       ‣ ${getEmoji(c)} ${addJiraLinks(c)}`)
            .join("\n")}\n―――\n`;

          const markdownTableOutput = `
### **💡 Deployment Summary**
| Information | Details |
|--------------------|---------|
| 🏡 **Project** | [${repo.project}](https://gitlab.com/${repo.namespace}/${
            repo.project
          }) |
| ⏰ **Deploy At** | ${new Date(dateTime.value).toLocaleString(
            "en-GB",
            dateOptions
          )} |
| 🔗 **Pipeline** | [#${pipeline.value}](${pipeline.getAttribute(
            "data-value"
          )}) |
| 🔍 **Comparison** | [${fromTag} ⮕ ${toTag}](${compareUrl}) |

### **📝 Change Logs**:
${commits.map((c) => `- ${getEmoji(c)} ${addJiraLinks(c)}`).join("\n")}
`;

          const outputText = `<ul style="margin: 0; padding: 0; padding-left: 10px; max-height: 80px; overflow: auto">
            <li>Project: <a href="${`https://gitlab.com/${repo.namespace}/${repo.project}`}" target="_blank"${
            repo.project
          }>${repo.project}</a></li>
            <li>Deploy At: ${new Date(dateTime.value).toLocaleString(
              "en-GB",
              dateOptions
            )}</li>
            <li>Pipeline: <a href="${pipeline.getAttribute(
              "data-value"
            )}" target="_blank">#${pipeline.value}</a></li>
            <li>Comparison: <a href="${compareUrl}" target="_blank">View comparison</a></li>
            <li>Changes: <ul style="margin: 0; padding-left: 10px;">${commits
              .map((commit) => `<li>${addJiraLinks(commit, false)}</li>`)
              .join("\n")}</ul></li>
          </ul>`;

          document.getElementById("copyButton").style = "display: flex;";

          document.getElementById("output").innerHTML = outputText;

          document
            .getElementById("copyConfluence")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(markdownTableOutput);
            });

          document
            .getElementById("copySlack")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(slackMessageOutput);
            });
          setLoading(false);
        });
    } catch (err) {
      console.error(err);
      document.getElementById("output").innerHTML =
        '<p style="color: red; padding: 0; margin: 0;" >Not a valid GitLab repo.</p>';
      document.getElementById("loader").style = "display: none";
    }
  });
});
