import { addJiraLinks, getEmoji } from "./format.js";

const DATE_OPTIONS = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function getSlackMarkdown({
  repo,
  pipeline,
  commits,
  compareUrl,
  dateTime,
}) {
  const [pipelineNumber, pipelineRef] = pipeline.value.split(" - ");
  const refURL = `https://gitlab.com/${repo.namespace}/${repo.project}/-/tags/${pipelineRef}`;
  return `*🚀Production Release〘[${repo.name}](https://gitlab.com/${
    repo.namespace
  }/${repo.project})〙🚀*
Hi everyone! We’ll be deploying to production with the following details:
---
*⏰ Deployment Time*\n       ${new Date(dateTime.value).toLocaleString(
    "en-GB",
    DATE_OPTIONS
  )}
*🏷️ Tag*\n       [${pipelineRef}](${refURL})
*🔗 Pipeline*\n       [#${pipelineNumber}](${pipeline.getAttribute(
    "data-value"
  )})
*🔍 Comparison*\n       [${fromTag.value} ⮕ ${
    toTag.value
  }](${compareUrl})\n*📝 Changes included:*\n${commits
    .map((c) => `       ‣ ${getEmoji(c)} ${addJiraLinks(c)}`)
    .join("\n")}
---
Please reach out if you have any questions or concerns.  
Thank you! 🚢💨
`;
}

export function getConfluenceMarkdown({
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
