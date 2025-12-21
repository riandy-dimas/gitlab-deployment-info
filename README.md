# gitlab-deployment-info 🧩

A simple Chrome extension to generate deployment documentation in markdown format — ready to copy-paste to **Gitlab Release Page**, **Confluence** or **Slack**.

Pick a deployment date and time, select the pipeline and tag range, and get a well-formatted summary including clickable links to GitLab pipelines, comparisons, and JIRA issues.

https://github.com/user-attachments/assets/659b1d51-dd6b-46fe-9345-7970e2873f1d

---

## ✨ Features

- 📝 Automatically generates Gitlab Release Page, Confluence and Slack-friendly deployment notes
- 🔗 Includes pipeline and tag comparison links from GitLab
- 🧠 Automatically appends links to JIRA issues mentioned in the changelog
- 🪄 **AI-powered summarization** of changelogs using Chrome's built-in Summarizer API
- ⚡ **Smart caching** - AI summaries are cached for 30 days for instant retrieval
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

https://github.com/user-attachments/assets/a2a7ef98-8770-490e-8553-be9578ea671e

After generating your deployment information, you can use the **AI Summary** button to get an intelligent summary of all the changes:

1. Click **Generate Info** to load the changelogs
2. **First-time setup** (one-time only):
   - On first use, the button will show **"Download AI Model"** instead of "AI Summary"
   - Click the **Download AI Model** button
   - A modal will appear explaining the AI model download requirements
   - Review the download details (~4GB, 10-30 minutes)
   - Click **Start Download** in the modal to begin
   - The download happens in the background - you can continue using Chrome
   - Monitor progress at `chrome://on-device-internals/`
3. **After setup is complete:**
   - The button changes to **"AI Summary"**
   - Click **AI Summary** to generate a summary
   - The AI will analyze your changelogs and create a concise summary
   - **First time**: Summary is generated and cached (takes a few seconds)
   - **Subsequent times**: Cached summary loads instantly ⚡
4. View the summary in a modal dialog
   - Green "(Cached)" badge indicates instant loading from cache
   - Cache is valid for 30 days per tag combination
5. Copy the AI-generated summary for quick insights

**Requirements:**
- Chrome/Chromium 127+ with Summarizer API support
- The AI model (Gemini Nano) will be downloaded automatically on first use (~4GB)
- Sufficient disk space for the AI model
- Internet connection for the initial download (model runs offline after download)
- Browser localStorage for caching summaries (minimal space usage)

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

**Performance Note:** 
- First generation: ~2-5 seconds (depends on commit count)
- Cached retrieval: **Instant** ⚡ (< 50ms)
- Cache expires after 30 days automatically

---

## 🧠 Notes

- This extension scans Git logs between selected tags and tries to match JIRA keys (e.g., `MIL-12345`) and automatically converts them into links using the provided `BASE_JIRA_URL`.
- Make sure your commit messages consistently include JIRA issue keys to take full advantage of this feature.
- **AI Summarization**: The AI feature uses Chrome's built-in Summarizer API (powered by Gemini Nano), which runs locally on your device for privacy. No data is sent to external servers.
- The AI model download is approximately 4GB and happens once. After download, summaries are generated instantly.
- **Smart Caching**: AI summaries are automatically cached for 30 days based on tag combinations. This means repeat queries load instantly without re-processing.
- The extension uses a clean modal interface to guide you through the AI model setup process on first use.
- **Button States**: The AI button dynamically changes based on model availability:
  - **"Download AI Model"** - Model needs to be downloaded (first-time setup)
  - **"Model downloading... Please wait"** - Download in progress
  - **"AI Summary"** - Ready to generate summaries (may load from cache if available)

---

## 🗄️ AI Cache Management

The extension automatically caches AI summaries to provide instant results for previously summarized tag ranges.

### How Caching Works:
- **Cache Key**: Summaries are cached based on `fromTag__toTag` combination
- **Cache Duration**: 30 days (automatically expires after)
- **Cache Indicator**: Green "(Cached)" badge appears in the summary modal
- **Storage**: Uses browser's localStorage (no external servers)

### Debugging Cache:

Open the browser console in your extension popup (F12 or Right-click → Inspect) and use these commands:

```javascript
// View all cached summaries with statistics
aiCacheDebug.stats()

// Clear all cached AI summaries
aiCacheDebug.clearAll()

// Clear specific cache entry
aiCacheDebug.clear('release-v1.0', 'release-v2.0')
```

**Example output from `aiCacheDebug.stats()`:**
```
📊 Cache Statistics: { totalCached: 3, cacheKeys: [...] }

┌─────────┬──────────────────┬──────────────────┬─────────────┬──────────────────────┐
│ (index) │    From Tag      │     To Tag       │ Age (hours) │     Cached Date      │
├─────────┼──────────────────┼──────────────────┼─────────────┼──────────────────────┤
│    0    │ 'release-v1.0'   │ 'release-v2.0'   │      12     │ '12/21/2024, 2:30 PM'│
│    1    │ 'release-v2.0'   │ 'release-v3.0'   │       5     │ '12/21/2024, 9:30 PM'│
└─────────┴──────────────────┴──────────────────┴─────────────┴──────────────────────┘
```

### When Cache is Useful:
- ✅ Reviewing the same deployment multiple times
- ✅ Comparing similar time periods
- ✅ Sharing summaries across team members (if tags match)
- ✅ Working offline (cached summaries don't need AI model)

---

## 🔍 Troubleshooting AI Feature

**Button shows "Download AI Model":**
- This is normal on first use - the Gemini Nano model needs to be downloaded
- Click the **Download AI Model** button and confirm in the modal to start the download
- The download is ~4GB and may take 10-30 minutes
- You can continue using Chrome while it downloads in the background
- After download completes, the button will change to **"AI Summary"**

**AI Summary button is disabled:**
- Make sure you're using Chrome/Chromium version 127 or higher
- Check if the Summarizer API is enabled at `chrome://flags/#optimization-guide-on-device-model`
- The API may not be supported in your Chrome version or region

**Button shows "Model downloading... Please wait":**
- The model is currently being downloaded in the background
- Check progress at `chrome://on-device-internals/` (Model Status tab)
- Wait for the "Foundational model state" to show "Ready"
- You can continue using other extension features while waiting
- The button will become **"AI Summary"** once download is complete

**Summary generation fails:**
- Ensure the model download is complete (`chrome://on-device-internals/`)
- Try closing and reopening the extension
- Check if you have sufficient disk space (~4GB required)
- Look for errors in the browser console (F12)

**Cache issues:**
- If summaries seem outdated, clear the cache with `aiCacheDebug.clearAll()`
- If you want fresh AI summaries, clear specific cache: `aiCacheDebug.clear('fromTag', 'toTag')`
- Cache automatically expires after 30 days
- Check cache statistics: `aiCacheDebug.stats()`
