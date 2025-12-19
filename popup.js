import {
  fetchComparisons,
  fetchPipelines,
  fetchTags,
  fetchCurrentRepoInfo,
  getRepoSlug,
} from "./utils/gitlab.js";
import { setRoundedDatetimeLocal } from "./utils/format.js";
import {
  getGitlabInfo,
  getHTMLOutput,
  getSlackChangelogs,
} from "./utils/output.js";
import { showToast } from "./utils/toast.js";
import { makeLinksOpenInTab } from "./utils/open-link.js";

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
      const repoSlug = await getRepoSlug();
      if (!repoSlug) {
        document.getElementById("output").innerHTML =
          '<p style="color: red; padding: 0; margin: 0;" >Not a valid GitLab website.</p>';
        document.getElementById("gitlabToken").remove();
        document.getElementById("formData").remove();
        document.getElementById("loader").style = "display: none";
        return;
      }

      const [repo, tags, pipelines] = await Promise.all([
        fetchCurrentRepoInfo(gitlabToken),
        fetchTags(repoSlug.namespace, repoSlug.project, gitlabToken),
        fetchPipelines(repoSlug.namespace, repoSlug.project, gitlabToken),
      ]);

      setLoading(false);

      const releaseProductionTags = tags;

      // Filter pipelines containing "release-production"
      const releaseProductionPipelines = pipelines.filter((pipeline) => {
        const label = typeof pipeline === "string" ? pipeline : pipeline.label;
        return label.toLowerCase().includes("release-production");
      });

      // Initialize Awesomplete instances and store references
      const fromTagInput = document.getElementById("fromTag");
      const fromTagAwesomplete = new Awesomplete(fromTagInput, {
        list: tags,
        sort: false,
        minChars: 0,
        maxItems: 10,
        autoFirst: true,
        filter: function (text, input) {
          return true; // Show all items
        },
      });

      const toTagInput = document.getElementById("toTag");
      const toTagAwesomplete = new Awesomplete(toTagInput, {
        list: tags,
        sort: false,
        minChars: 0,
        maxItems: 10,
        autoFirst: true,
        filter: function (text, input) {
          return true; // Show all items
        },
      });

      const pipelineInput = document.getElementById("pipeline");
      const pipelineAwesomplete = new Awesomplete(pipelineInput, {
        list: pipelines,
        sort: false,
        minChars: 0,
        maxItems: 10,
        autoFirst: true,
        filter: function (text, input) {
          return true; // Show all items
        },
        replace: function (suggestion) {
          this.input.value = suggestion.label;
          this.input.setAttribute("data-value", suggestion.value);
        },
      });

      // Set initial values
      if (releaseProductionTags.length > 0) {
        // toTag: first latest (index 0)
        toTagInput.value = releaseProductionTags[0];
      }

      if (releaseProductionTags.length > 1) {
        // fromTag: second latest (index 1)
        fromTagInput.value = releaseProductionTags[1];
      }

      if (releaseProductionPipelines.length > 0) {
        // pipeline: latest
        const latestPipeline = releaseProductionPipelines[0];
        if (typeof latestPipeline === "string") {
          pipelineInput.value = latestPipeline;
        } else {
          pipelineInput.value = latestPipeline.label;
          pipelineInput.setAttribute("data-value", latestPipeline.value);
        }
      }

      // Add click/focus event listeners to open dropdown immediately
      fromTagInput.addEventListener("click", () => {
        fromTagAwesomplete.evaluate();
      });

      fromTagInput.addEventListener("focus", () => {
        fromTagAwesomplete.evaluate();
      });

      toTagInput.addEventListener("click", () => {
        toTagAwesomplete.evaluate();
      });

      toTagInput.addEventListener("focus", () => {
        toTagAwesomplete.evaluate();
      });

      pipelineInput.addEventListener("click", () => {
        pipelineAwesomplete.evaluate();
      });

      pipelineInput.addEventListener("focus", () => {
        pipelineAwesomplete.evaluate();
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

          const slackOutput = getSlackChangelogs(data);
          const confluenceOutput = getGitlabInfo(data);
          const htmlOuput = getHTMLOutput(data);

          document.getElementById("copyButton").style = "display: flex;";

          document.getElementById("output").innerHTML = htmlOuput;

          document
            .getElementById("copyGitlab")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(confluenceOutput);
              showToast(
                `<strong>Gitlab info copied!</strong><br/>Paste in a new Gitlab release page or update existing one.`
              );
            });

          document
            .getElementById("copySlack")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(slackOutput);
              showToast(
                `<strong>Slack info copied!</strong><br />Paste in Slack message to format it.`
              );
            });

          makeLinksOpenInTab();
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
