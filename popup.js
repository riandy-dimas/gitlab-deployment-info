import {
  fetchComparisons,
  fetchPipelines,
  fetchTags,
  getCurrentRepoInfo,
} from "./utils/gitlab.js";
import { setRoundedDatetimeLocal } from "./utils/format.js";
import {
  getConfluenceMarkdown,
  getHTMLOutput,
  getSlackMarkdown,
} from "./utils/output.js";
import { showToast } from "./utils/toast.js";

const dateOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

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
          '<p style="color: red; padding: 0; margin: 0;" >Not a valid GitLab website.</p>';
        document.getElementById("gitlabToken").remove();
        document.getElementById("formData").remove();
        document.getElementById("loader").style = "display: none";
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
        autoFirst: true,
      });
      new Awesomplete(document.getElementById("toTag"), {
        list: tags,
        sort: false,
        minChars: 0,
        maxItems: 10,
        autoFirst: true,
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

      setRoundedDatetimeLocal(document.getElementById("dateTime"));

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

          const data = {
            repo,
            commits,
            compareUrl,
            dateTime,
            pipeline,
          };

          const slackOutput = getSlackMarkdown(data);
          const confluenceOutput = getConfluenceMarkdown(data);
          const htmlOuput = getHTMLOutput(data);

          document.getElementById("copyButton").style = "display: flex;";

          document.getElementById("output").innerHTML = htmlOuput;

          document
            .getElementById("copyConfluence")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(confluenceOutput);
              showToast(
                `<strong>Confluence Markdown copied!</strong><br/>Paste in a new Confluence page or update existing one.`
              );
            });

          document
            .getElementById("copySlack")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(slackOutput);
              showToast(
                `<strong>Slack Markdown copied!</strong><br />Paste in Slack message and use <code>cmd + shift + f</code> to format it.`
              );
            });
          setLoading(false);
        });
    } catch (err) {
      console.error(err);
      document.getElementById("gitlabToken").style = "pointer-events: none";
      document.getElementById("output").innerHTML =
        '<p style="color: red; padding: 0; margin: 0;" >Make sure you are inside a valid repository.</p>';
      document.getElementById("loader").style = "display: none";
    }
  });
});
