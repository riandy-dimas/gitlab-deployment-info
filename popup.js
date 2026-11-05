import {
  fetchComparisons,
  fetchPipelines,
  fetchTags,
  fetchRepoDetails,
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

// Global variable to store repo info
let currentRepo = null;
let confluenceOutputGlobal = null;
let generatedData = null;

function clearOutput() {
  generatedData = null;
  confluenceOutputGlobal = null;
  document.getElementById("copyButton").style.display = "none";
  document.getElementById("output").textContent = "";
}

async function copyMarkdown(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message, "success");
  } catch {
    showToast("Could not copy to the clipboard. Try again.", "error");
  }
}

async function fillReleaseNotes() {
  if (!confluenceOutputGlobal) return;
  try {
    const tabs = await chrome.tabs.query({});
    const releaseUrl = `https://gitlab.com/${currentRepo.namespace}/${currentRepo.project}/-/releases/new`;
    const releaseTab = tabs.find((tab) => tab.url?.split(/[?#]/)[0] === releaseUrl);
    if (!releaseTab) {
      showToast("Open the New release page for this repository first.", "error");
      return;
    }
    await chrome.scripting.executeScript({ target: { tabId: releaseTab.id }, files: ["content.js"] });
    const response = await chrome.tabs.sendMessage(releaseTab.id, {
      action: "fillReleaseNotes", content: confluenceOutputGlobal,
    });
    if (!response?.success) throw new Error("Release notes could not be filled");
    showToast("Release notes filled successfully.", "success");
  } catch (error) {
    console.error("Error filling release notes:", error);
    showToast("Could not fill release notes. Refresh the release page and try again.", "error");
  }
}

document.getElementById("copyMD").addEventListener("click", () => {
  if (confluenceOutputGlobal) copyMarkdown(confluenceOutputGlobal, "Markdown copied!");
});

document.getElementById("copyChanges").addEventListener("click", () => {
  if (generatedData) copyMarkdown(getSlackChangelogs(generatedData), "Changelogs copied!");
});

document.getElementById("fillReleaseBtn").addEventListener("click", fillReleaseNotes);

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

      // Fetch full repo details including name, tags, and pipelines
      const [repoDetails, tags, pipelines] = await Promise.all([
        fetchRepoDetails(repoSlug.namespace, repoSlug.project, gitlabToken),
        fetchTags(repoSlug.namespace, repoSlug.project, gitlabToken),
        fetchPipelines(repoSlug.namespace, repoSlug.project, gitlabToken),
      ]);

      // Store full repo info globally
      currentRepo = repoDetails;

      setLoading(false);

      const releaseProductionTags = tags.filter((tag) => {
        return tag.includes("release-production");
      });

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
        maxItems: 50,
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
        maxItems: 50,
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
        maxItems: 50,
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

      for (const input of [fromTagInput, toTagInput, pipelineInput, document.getElementById("dateTime")]) {
        input.addEventListener("input", clearOutput);
        input.addEventListener("awesomplete-selectcomplete", clearOutput);
      }

      document.getElementById("formData").addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!this.checkValidity()) {
          this.reportValidity();
          return;
        }
        clearOutput();
        setLoading(true);
        try {
          const dateTime = document.getElementById("dateTime");
          const fromTag = fromTagInput.value;
          const toTag = toTagInput.value;
          const selectedPipeline = pipelines.find((item) => item.label === pipelineInput.value);
          if (!selectedPipeline) throw new Error("Choose a deployment pipeline from the list.");
          if (selectedPipeline.ref !== toTag) throw new Error("The deployment pipeline must match the current deployment tag.");
          pipelineInput.setAttribute("data-value", selectedPipeline.value);
          if (fromTag === toTag) throw new Error("Choose different previous and current deployment tags.");
          const compareUrl = `https://gitlab.com/${currentRepo.namespace}/${currentRepo.project}/-/compare/${encodeURIComponent(fromTag)}...${encodeURIComponent(toTag)}?straight=true`;
          const commits = await fetchComparisons(currentRepo.namespace, currentRepo.project, gitlabToken);
          const data = {
            repo: currentRepo, commits, compareUrl, dateTime, pipeline: pipelineInput,
            previousTag: fromTag, currentTag: toTag,
          };
          confluenceOutputGlobal = getGitlabInfo(data);
          generatedData = data;
          document.getElementById("output").innerHTML = getHTMLOutput(data);
          document.getElementById("copyButton").style.display = "grid";
          makeLinksOpenInTab();
        } catch (error) {
          console.error("Error generating deployment notes:", error);
          clearOutput();
          document.getElementById("output").textContent = error.message || "Could not generate deployment notes. Try again.";
        } finally {
          setLoading(false);
        }
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
