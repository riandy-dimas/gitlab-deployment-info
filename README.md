# gitlab-deployment-info 🧩

A simple Chrome extension to generate deployment documentation in markdown format — ready to copy-paste to **Gitlab Release Page**, **Confluence** or **Slack**.

Pick a deployment date and time, select the pipeline and tag range, and get a well-formatted summary including clickable links to GitLab pipelines, comparisons, and JIRA issues.

https://github.com/user-attachments/assets/13439d51-86cb-4a7e-b208-45fcf42d3dc2

---

## ✨ Features

- 📝 Automatically generates Gitlab Release Page, Confluence and Slack-friendly deployment notes
- 🔗 Includes pipeline and tag comparison links from GitLab
- 🧠 Automatically appends links to JIRA issues mentioned in the changelog
- 🪄 **AI-powered summarization** of changelogs using Chrome's built-in Summarizer API
- 🧩 Works as a Chrome extension on GitLab repository pages
- 💡 Autofill release notes in Gitlab New Release page

---

## 🔧 Installation

https://github.com/user-attachments/assets/b71665e7-aae3-4768-b110-576cbb021530

1. **Clone or download** this repository
2. **Edit the `BASE_JIRA_URL`** in `format.js` if needed (default: `https://wartek.atlassian.net`)
3. Open `chrome://extensions` in your browser
4. Enable **Developer mode** (top right corner)
5. Click **Load unpacked**
6. Select the folder where this extension was downloaded

---

## 🚀 Usage

1. Open any GitLab repository page / Gitlab New Release page
2. Click the extension icon
3. (Optional) Pin it to your toolbar for quick access
4. Fill in the required details (tags, pipeline, date)
5. Copy the generated markdown for Gitlab Release Page, Confluence or Slack
6. You can also click the fill release notes automatically when you are in **Gitlab New Release Page**

### 🪄 Using AI Summary

After generating your deployment information, you can use the **AI Summary** button to get an intelligent summary of all the changes:

1. Click **Generate Info** to load the changelogs
2. Click **AI Summary** button
3. On first use, you'll be prompted to download the AI model (one-time, ~4GB)
4. Wait for the summary to be generated
5. Copy the AI-generated summary for quick insights

**Requirements:**
- Chrome/Chromium 127+ with Summarizer API support
- You can monitor download progress at `chrome://on-device-internals/` or `chrome://components/` (look for "Optimization Guide On Device Model")

---

## 📄 Markdown Output Example

```

### **💡 Deployment Summary**
| Information | Details |
|--------------------|---------|
| 🏡 **Project** | [Canvas LTI](https://gitlab.com/wartek-id/guru/belajar/canvas-lti) |
| ⏰ **Deployment Time** | 11 May 2025, 19:15 |
| 🏷️ **Tag** | [release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/tags/release-production-20250506-0745) |
| 🔗 **Pipeline** | [#1801689260](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/pipelines/1801689260) |
| 🔍 **Comparison** | [release-production-20250324-0935 ⮕ release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/compare/release-production-20250324-0935...release-production-20250506-0745) |

### **📝 Change Logs**:
- 🔧 chore: upgrade next
- ✨ feat: New landing page GNN
- ✨ feat: change base url LTI config generator
- ✨ [MIL-10096](https://wartek.atlassian.net/browse/MIL-10096) Feat: redirect canvas-fe.guru-lms.belajar.id host to lms-lti.kemdikbud.go.id
- 🐞 fix: remove redirection since it will affect signature validation
- 🐞 fix: undefined config generator host
- ✨ [MIL-10067](https://wartek.atlassian.net/browse/MIL-10067) Feat: diklat list landing page
- 🐞 fix: pageSize 10 fetch diklat list
- 🐞 Fix/diklat url
```

---

## 💬 Changes Output Example

```
🔧 chore: upgrade next
✨ feat: New landing page GNN
✨ feat: change base url LTI config generator
✨ [MIL-10096](https://wartek.atlassian.net/browse/MIL-10096) Feat: redirect canvas-fe.guru-lms.belajar.id host to lms-lti.kemdikbud.go.id
🐞 fix: remove redirection since it will affect signature validation
🐞 fix: undefined config generator host
✨ [MIL-10067](https://wartek.atlassian.net/browse/MIL-10067) Feat: diklat list landing page
🐞 fix: pageSize 10 fetch diklat list
🐞 Fix/diklat url
```

---

## 🪄 AI Summary Example

```
This deployment introduces several key updates focused on the LTI integration system. The main changes include upgrading the Next.js framework, implementing a new landing page for GNN, and modifying the LTI config generator's base URL. Significant features include a redirect mechanism for the canvas-fe.guru-lms.belajar.id host to lms-lti.kemdikbud.go.id (MIL-10096), though this was later adjusted to prevent signature validation issues. The deployment also adds a diklat list landing page (MIL-10067) with pagination support set to 10 items per page, along with URL handling improvements for the diklat functionality.
```

---

## 🧠 Notes

- This extension scans Git logs between selected tags and tries to match JIRA keys (e.g., `MIL-12345`) and automatically converts them into links using the provided `BASE_JIRA_URL`.
- Make sure your commit messages consistently include JIRA issue keys to take full advantage of this feature.
- **AI Summarization**: The AI feature uses Chrome's built-in Summarizer API (powered by Gemini Nano), which runs locally on your device for privacy. No data is sent to external servers.
- The AI model download is approximately 4GB and happens once. After download, summaries are generated instantly.
- If you don't see the AI Summary button or it shows as unavailable, ensure you're using Chrome 127+ and the model is downloaded at `chrome://on-device-internals/`.

---

## 🔍 Troubleshooting AI Feature

**AI Summary button doesn't work:**
- Make sure you're using Chrome/Chromium version 127 or higher
- Check if the Summarizer API is enabled at `chrome://flags/#optimization-guide-on-device-model`
- Visit `chrome://on-device-internals/` to check if the Gemini Nano model (v3Nano) is installed and ready
- The model download is ~4GB and may take 10-30 minutes depending on your connection

**Model is downloading:**
- Wait for the download to complete at `chrome://on-device-internals/` (Model Status tab)
- You can continue using other extension features while waiting
- Try the AI Summary button again after the model status shows "Ready"