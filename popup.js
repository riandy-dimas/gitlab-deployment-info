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
import {
  summarizeCommits,
  checkAIAvailability,
  cleanupSummarizer,
  getDownloadConfirmationContent
} from "./utils/ai.js";
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

// Global variable to store repo info
let currentRepo = null;
let confluenceOutputGlobal = null;
let commits = [];

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

window.addEventListener('unload', () => {
  cleanupSummarizer();
});

// Get modal elements
const aiDownloadModal = document.getElementById('aiDownloadModal');
const downloadModalTitle = document.getElementById('downloadModalTitle');
const downloadModalContent = document.getElementById('downloadModalContent');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');
const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
const confirmDownloadText = document.getElementById('confirmDownloadText');

// Function to show download confirmation modal
function showDownloadConfirmation(status) {
  return new Promise((resolve) => {
    const content = getDownloadConfirmationContent(status);
    
    if (!content) {
      resolve(false);
      return;
    }
    
    // Update modal content
    downloadModalTitle.textContent = content.title;
    downloadModalContent.innerHTML = content.content;
    confirmDownloadText.textContent = content.confirmText;
    
    // Show modal
    aiDownloadModal.showModal();
    
    // Handle confirm
    const handleConfirm = () => {
      aiDownloadModal.close();
      cleanup();
      resolve(true);
    };
    
    // Handle cancel
    const handleCancel = () => {
      aiDownloadModal.close();
      cleanup();
      resolve(false);
    };
    
    // Cleanup listeners
    const cleanup = () => {
      confirmDownloadBtn.removeEventListener('click', handleConfirm);
      cancelDownloadBtn.removeEventListener('click', handleCancel);
    };
    
    // Add event listeners
    confirmDownloadBtn.addEventListener('click', handleConfirm);
    cancelDownloadBtn.addEventListener('click', handleCancel);
  });
}

// AI Summary button click handler
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  try {
    
    if (!commits || commits.length === 0) {
      throw new Error('No commits to summarize. Please generate deployment info first.');
    }
    
    // Get the fromTag and toTag values from your form
    const fromTag = document.getElementById('fromTag').value.trim();
    const toTag = document.getElementById('toTag').value.trim();
    
    if (!fromTag || !toTag) {
      throw new Error('Please select both source and target tags');
    }
    
    // Show loading state
    const summarizeBtn = document.getElementById('summarizeBtn');
    const originalBtnContent = summarizeBtn.innerHTML;
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<i class="fa-solid fa-spinner rotating"></i> Summarizing..';
    
    // Try to summarize with cache support (first attempt without confirmation)
    let result = await summarizeCommits(commits, currentRepo.project, fromTag, toTag, false);
    
    // Check if confirmation is needed
    if (result.needsConfirmation) {
      // Reset button state
      summarizeBtn.disabled = false;
      summarizeBtn.innerHTML = originalBtnContent;
      
      // Show confirmation modal
      const userConfirmed = await showDownloadConfirmation(result.confirmationStatus);
      
      if (!userConfirmed) {
        console.log('User cancelled AI model download');
        return;
      }
      
      // User confirmed, try again with confirmation flag
      summarizeBtn.disabled = true;
      summarizeBtn.innerHTML = '<i class="fa-solid fa-spinner rotating"></i> Summarizing..';

      result = await summarizeCommits(commits, currentRepo.project, fromTag, toTag, true);
    }
    
    // Reset button state
    summarizeBtn.disabled = false;
    summarizeBtn.innerHTML = originalBtnContent;
    
    // Show the summary in the result modal
    if (result.result) {
      showAISummaryModal(result.result, result.fromCache, fromTag, toTag);
    }
    
  } catch (error) {
    // Reset button state
    const summarizeBtn = document.getElementById('summarizeBtn');
    summarizeBtn.disabled = false;
    summarizeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Summary';
    
    // Show error
    console.error('AI Summary error:', error);
    showToast(`<strong>Error:</strong> ${error.message}`, 'error');
  }
});

// Function to show AI summary result modal
function showAISummaryModal(summary, fromCache = false, fromTag = '', toTag = '') {
  const aiSummaryModal = document.getElementById('aiSummaryModal');
  const summaryText = document.getElementById('summaryText');
  const aiMethod = document.getElementById('aiMethod');
  
  summaryText.textContent = summary;
  
  if (fromCache) {
    aiMethod.innerHTML = `<i class="fa-solid fa-bolt"></i> Generated by Gemini Nano <span style="color: #10b981;">(Cached)</span>`;
    console.log(`✨ Loaded from cache: ${fromTag} → ${toTag}`);
  } else {
    aiMethod.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generated by Gemini Nano`;
    console.log(`🤖 Freshly generated and cached: ${fromTag} → ${toTag}`);
  }
  
  aiSummaryModal.showModal();
}

// Close summary modal
document.getElementById('closeSummaryModal').addEventListener('click', () => {
  document.getElementById('aiSummaryModal').close();
});

// Copy summary button
document.getElementById('copySummaryBtn').addEventListener('click', () => {
  const summaryText = document.getElementById('summaryText').textContent;
  navigator.clipboard.writeText(summaryText);
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const initialHTML = copySummaryBtn.innerHTML;
  setTimeout(() => {
    copySummaryBtn.innerHTML = initialHTML;
  }, 2000);
  copySummaryBtn.textContent = 'Copied!';
});

// Check AI availability on load and update button state
async function updateAIButtonState() {
  const aiStatus = await checkAIAvailability();
  const summarizeBtn = document.getElementById('summarizeBtn');
  
  // Enable/disable button based on availability
  summarizeBtn.disabled = !aiStatus.buttonEnabled;
  
  // Update button title/tooltip
  summarizeBtn.title = aiStatus.status;
  
  // Optionally update button text if not ready
  if (!aiStatus.available && aiStatus.buttonEnabled) {
    const icon = '<i class="fa-solid fa-download"></i>';
    summarizeBtn.innerHTML = `${icon} Download AI Model`;
  }
}

// Call on page load
updateAIButtonState();

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
          
          // Use currentRepo instead of repo
          const compareUrl = `https://gitlab.com/${currentRepo.namespace}/${currentRepo.project}/-/compare/${fromTag}...${toTag}`;
          commits = await fetchComparisons(
            currentRepo.namespace,
            currentRepo.project,
            gitlabToken
          );

          const data = {
            repo: currentRepo,
            commits,
            compareUrl,
            dateTime,
            pipeline,
          };

          const slackOutput = getSlackChangelogs(data);
          const confluenceOutput = getGitlabInfo(data);
          const htmlOuput = getHTMLOutput(data);
          
          // Store confluenceOutput globally
          confluenceOutputGlobal = confluenceOutput;

          document.getElementById("copyButton").style = "display: grid; grid-template-columns: 1fr 1fr; gap: 8px;";

          document.getElementById("output").innerHTML = htmlOuput;

          document
            .getElementById("copyMD")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(confluenceOutput);
              showToast(
                `<strong>Markdown copied!</strong><br/>You can paste it in the release page.`, "success"
              );
            });

          document
            .getElementById("copyChanges")
            .addEventListener("click", async () => {
              await navigator.clipboard.writeText(slackOutput);
              showToast(
                `<strong>Changelogs copied!</strong><br />You can paste the changes elsewhere now.`, 'success'
              );
            });
          
          // Add fill release button handler
          const fillReleaseBtn = document.getElementById("fillReleaseBtn");
          if (fillReleaseBtn) {
            fillReleaseBtn.addEventListener("click", async () => {
              try {
                // Always get the current active tab instead of using stored URL
                const tabs = await chrome.tabs.query({});
                const releaseTab = tabs.find(tab => tab.url && tab.url.includes('/releases/new'));
                
                if (!releaseTab) {
                  showToast('<strong>Error:</strong> Release page not found. Please open the <strong>New release</strong> page first.', 'error');
                  return;
                }
                
                // Inject content script if not already injected
                try {
                  await chrome.scripting.executeScript({
                    target: { tabId: releaseTab.id },
                    files: ['content.js']
                  });
                } catch (e) {
                  // Script might already be injected, continue
                  console.log('Content script already injected or error:', e);
                }
                
                // Wait a bit for script to be ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Send message to content script
                try {
                  const response = await chrome.tabs.sendMessage(releaseTab.id, {
                    action: "fillReleaseNotes",
                    content: confluenceOutputGlobal
                  });
                  
                  if (response && response.success) {
                    showToast('<strong>Success!</strong> Release notes filled successfully.', 'success');
                  } else {
                    showToast(`<strong>Error:</strong> ${response?.error || 'Unknown error'}`, 'error');
                  }
                } catch (msgError) {
                  console.error('Message error:', msgError);
                  showToast('<strong>Error:</strong> Could not communicate with the page. Try refreshing the release page.', 'error');
                }
              } catch (error) {
                console.error('Error filling release notes:', error);
                showToast('<strong>Error:</strong> Could not fill release notes. Make sure the release page is open.', 'error');
              }
            });
          }

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