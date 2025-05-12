const BASE_JIRA_URL = "https://wartek.atlassian.net";

export function setRoundedDatetimeLocal(
  inputElement,
  intervalMinutes = 15,
  minOffsetMinutes = 10
) {
  const now = new Date();
  const future = new Date(now);

  // Round up to the next interval
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes;

  if (roundedMinutes === 60) {
    future.setHours(now.getHours() + 1);
    future.setMinutes(0);
  } else {
    future.setMinutes(roundedMinutes);
  }

  future.setSeconds(0);
  future.setMilliseconds(0);

  // Check if rounded time is less than minOffsetMinutes ahead of now
  const diffMinutes = (future - now) / (1000 * 60);
  if (diffMinutes < minOffsetMinutes) {
    future.setMinutes(future.getMinutes() + intervalMinutes);
  }

  const pad = (n) => n.toString().padStart(2, "0");
  const formatted = `${future.getFullYear()}-${pad(
    future.getMonth() + 1
  )}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(
    future.getMinutes()
  )}`;

  inputElement.value = formatted;
}

export function getEmoji(commit) {
  if (/feat|add/i.test(commit)) return "✨";
  if (/fix/i.test(commit)) return "🐞";
  if (/refactor|clean/i.test(commit)) return "🧹";
  if (/docs/i.test(commit)) return "🗒️";
  if (/test/i.test(commit)) return "🧪";
  if (/chore/i.test(commit)) return "🔧";
  return "🎯";
}

// Function to find and link JIRA card IDs
export function addJiraLinks(commit, markdown = true) {
  // Matches plain or bracketed JIRA IDs, e.g., MIL-12345 or [MIL-12345]
  const jiraRegex = /(\[)?([A-Z]+-\d+)(\])?/g;

  // Replace any JIRA ticket ID with a clickable link
  return commit.replace(jiraRegex, (_, __, id) => {
    const url = `${BASE_JIRA_URL}/browse/${id}`;
    if (!markdown) {
      return `<a data-new-tab href="${url}">${id}</a>`;
    }
    return `[${id}](${url})`;
  });
}
