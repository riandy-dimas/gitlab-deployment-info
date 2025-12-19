import { addJiraLinks, getEmoji } from "./format.js";

const DATE_OPTIONS = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function getSlackChangelogs({ commits }) {
  return `${commits.map((c) => `${getEmoji(c)} ${c}`).join("\n")}
`;
}

export function getGitlabInfo({
  repo,
  pipeline,
  commits,
  compareUrl,
  dateTime,
}) {
  const [pipelineNumber, pipelineRef] = pipeline.value.split(" - ");
  const refURL = `https://gitlab.com/${repo.namespace}/${repo.project}/-/tags/${pipelineRef}`;
  return `
### **💡 Deployment Summary**
| Information | Details |
|--------------------|---------|
| 🏡 **Project** | [${repo.name}](https://gitlab.com/${repo.namespace}/${
    repo.project
  }) |
| ⏰ **Deployment Time** | ${new Date(dateTime.value).toLocaleString(
    "en-GB",
    DATE_OPTIONS
  )} |
| 🏷️ **Tag** | [${pipelineRef}](${refURL}) |
| 🔗 **Pipeline** | [#${pipelineNumber}](${pipeline.getAttribute(
    "data-value"
  )}) |
| 🔍 **Comparison** | [${fromTag.value} ⮕ ${toTag.value}](${compareUrl}) |

### **📝 Change Logs**:
${commits.map((c) => `- ${getEmoji(c)} ${addJiraLinks(c)}`).join("\n")}
`;
}

export function getHTMLOutput({
  repo,
  pipeline,
  commits,
  compareUrl,
  dateTime,
}) {
  const [pipelineNumber, pipelineRef] = pipeline.value.split(" - ");
  const refURL = `https://gitlab.com/${repo.namespace}/${repo.project}/-/tags/${pipelineRef}`;
  return `
<ul style="margin: 0; padding: 0; padding-left: 10px; max-height: 80px; overflow: auto">
  <li>Project: <a data-new-tab href="${`https://gitlab.com/${repo.namespace}/${repo.project}`}">${
    repo.name
  }</a></li>
  <li>Deploy At: ${new Date(dateTime.value).toLocaleString(
    "en-GB",
    DATE_OPTIONS
  )}</li>
  <li>Pipeline: <a data-new-tab href="${pipeline.getAttribute(
    "data-value"
  )}" >#${pipelineNumber}</a></li>
  <li>Tag: <a data-new-tab href="${refURL}" >${pipelineRef}</a></li>
  <li>Comparison: <a data-new-tab href="${compareUrl}" >View comparison</a></li>
  <li>Changes: <ul style="margin: 0; padding-left: 10px;">${commits
    .map((commit) => `<li>${addJiraLinks(commit, false)}</li>`)
    .join("\n")}</ul></li>
</ul>
`;
}
