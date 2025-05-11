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
  return `
*🚀Production Release〘[${repo.project}](https://gitlab.com/${repo.namespace}/${
    repo.project
  })〙🚀*\nHi everyone! we are going to have a production deployment with these details:\n―――\n*⏰ Deployment Time*\n       ${new Date(
    dateTime.value
  ).toLocaleString("en-GB", DATE_OPTIONS)}\n*🔗 Pipeline*\n       [#${
    pipeline.value
  }](${pipeline.getAttribute(
    "data-value"
  )})\n*🔍 Comparison*\n       [${fromTag} ⮕ ${toTag}](${compareUrl})\n*📝 Changes included:*\n${commits
    .map((c) => `       ‣ ${getEmoji(c)} ${addJiraLinks(c)}`)
    .join("\n")}\n―――\n
`;
}

export function getConfluenceMarkdown({
  repo,
  pipeline,
  commits,
  compareUrl,
  dateTime,
}) {
  return `
### **💡 Deployment Summary**
| Information | Details |
|--------------------|---------|
| 🏡 **Project** | [${repo.project}](https://gitlab.com/${repo.namespace}/${
    repo.project
  }) |
| ⏰ **Deploy At** | ${new Date(dateTime.value).toLocaleString(
    "en-GB",
    DATE_OPTIONS
  )} |
| 🔗 **Pipeline** | [#${pipeline.value}](${pipeline.getAttribute(
    "data-value"
  )}) |
| 🔍 **Comparison** | [${fromTag} ⮕ ${toTag}](${compareUrl}) |

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
  return `
<ul style="margin: 0; padding: 0; padding-left: 10px; max-height: 80px; overflow: auto">
  <li>Project: <a href="${`https://gitlab.com/${repo.namespace}/${repo.project}`}" target="_blank"${
    repo.project
  }>${repo.project}</a></li>
  <li>Deploy At: ${new Date(dateTime.value).toLocaleString(
    "en-GB",
    DATE_OPTIONS
  )}</li>
  <li>Pipeline: <a href="${pipeline.getAttribute(
    "data-value"
  )}" target="_blank">#${pipeline}</a></li>
  <li>Comparison: <a href="${compareUrl}" target="_blank">View comparison</a></li>
  <li>Changes: <ul style="margin: 0; padding-left: 10px;">${commits
    .map((commit) => `<li>${addJiraLinks(commit, false)}</li>`)
    .join("\n")}</ul></li>
</ul>
`;
}
