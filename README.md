# gitlab-deployment-info 🧩

A simple Chrome extension to generate deployment documentation in markdown format — ready to copy-paste to **Gitlab Release Page**, **Confluence** or **Slack**.

Pick a deployment date and time, select the pipeline and tag range, and get a well-formatted summary including clickable links to GitLab pipelines, comparisons, and JIRA issues.

https://github.com/user-attachments/assets/13439d51-86cb-4a7e-b208-45fcf42d3dc2

---

## ✨ Features

- 📝 Automatically generates Gitlab Release Page, Confluence and Slack-friendly deployment notes
- 🔗 Includes pipeline and tag comparison links from GitLab
- 🧠 Automatically appends links to JIRA issues mentioned in the changelog
- 🧩 Works as a Chrome extension on GitLab repository pages
- 💡 Autofill release notes in Gitlab New Release page
- 🧹 Filters release bookkeeping and changes already present in the previous deployment

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
4. Select the **Previous deployment tag** (the last tag actually deployed to production, including hotfixes), **Current deployment tag** (the deployment being documented), its **Deployment pipeline**, and deployment time. The preselected tags are suggestions; confirm the previous one is actually live.
5. Copy the generated markdown for Gitlab Release Page, Confluence or Slack
6. You can also click the fill release notes automatically when you are in **Gitlab New Release Page**

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

## 🧠 Notes

- This extension scans Git logs between selected tags and tries to match JIRA keys (e.g., `MIL-12345`) and automatically converts them into links using the provided `BASE_JIRA_URL`.
- Make sure your commit messages consistently include JIRA issue keys to take full advantage of this feature.
- All output formats exclude conventional `docs:`, `test:`, and `style:` commits (including scopes and Jira prefixes), release/version/changelog bookkeeping, generated merge messages, and exact duplicate titles. Dependency/security fixes, runtime upgrades, deployment changes, refactors, and reverts remain eligible.
- Comparisons use the previous deployment tag directly. To recognize cherry-picks with different commit SHAs, the extension checks whether every file change is already present in that tag's contents. A matching Jira key or title alone never proves a change was deployed; title duplicates are removed only after checking the changes.
- Cherry-pick detection is conservative: changed/conflicting context, ambiguous repeated text, renames, binary changes, merge commits, and incomplete diffs remain listed when the extension cannot confirm the entire change is already present. Reverted changes being reapplied remain eligible. GitLab request failures stop generation so incomplete notes cannot be copied.

## Verification

Run the regression checks with Node.js 24 or later (no dependencies required):

```sh
node --test tests/changelog.test.mjs
```
