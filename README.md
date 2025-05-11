# gitlab-deployment-info 🧩

A simple Chrome extension to generate deployment documentation in markdown format — ready to copy-paste to **Confluence** or **Slack**.

Pick a deployment date and time, select the pipeline and tag range, and get a well-formatted summary including clickable links to GitLab pipelines, comparisons, and JIRA issues.

![preview-gitlab-deployment-info](https://github.com/user-attachments/assets/1c8e030c-56f0-4f2a-b034-5f3b5df44ab2)

---

## ✨ Features

* 📝 Automatically generates Confluence and Slack-friendly deployment notes
* 🔗 Includes pipeline and tag comparison links from GitLab
* 🧠 Automatically appends links to JIRA issues mentioned in the changelog
* 🧩 Works as a Chrome extension on GitLab repository pages

---

## 🔧 Installation

1. **Clone or download** this repository
2. **Edit the `BASE_JIRA_URL`** in `popup.js` if needed (default: `https://wartek.atlassian.net`)
3. Open `chrome://extensions` in your browser
4. Enable **Developer mode** (top right corner)
5. Click **Load unpacked**
6. Select the folder where the extension was downloaded

---

## 🚀 Usage

1. Open any GitLab repository page
2. Click the extension icon
3. (Optional) Pin it to your toolbar for quick access
4. Fill in the required details (tags, pipeline, date)
5. Copy the generated markdown for Confluence or Slack

---

## 📄 Confluence Output Example

```
### **💡 Deployment Summary**
| Information      | Details |
|------------------|---------|
| 🏡 **Project**   | [canvas-lti](https://gitlab.com/wartek-id/guru/belajar/canvas-lti) |
| ⏰ **Deploy At** | 11 May 2025, 14:15 |
| 🔗 **Pipeline**  | [#1801689260 - release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/pipelines/1801689260) |
| 🔍 **Comparison**| [release-production-20250324-0935 ⮕ release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/compare/release-production-20250324-0935...release-production-20250506-0745) |

### **📝 Change Logs**:
- 🔧 chore: upgrade next
- ✨ feat: New landing page GNN
- ✨ feat: change base url LTI config generator
- ✨ [MIL-10096](https://wartek.atlassian.net/browse/MIL-10096) Redirect canvas-fe to lms-lti
- 🐞 fix: remove redirection that affects signature validation
- 🐞 fix: undefined config generator host
- ✨ [MIL-10067](https://wartek.atlassian.net/browse/MIL-10067) Diklat list landing page
- 🐞 fix: pageSize 10 on diklat list fetch
- 🐞 fix: diklat URL
```

---

## 💬 Slack Output Example

```
*🚀 Production Release〘[canvas-lti](https://gitlab.com/wartek-id/guru/belajar/canvas-lti)〙🚀*
Hi everyone! We're deploying to production with the following details:
―――
*⏰ Deployment Time*
       11 May 2025, 14:15
*🔗 Pipeline*
       [#1801689260 - release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/pipelines/1801689260)
*🔍 Comparison*
       [release-production-20250324-0935 ⮕ release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/compare/release-production-20250324-0935...release-production-20250506-0745)
*📝 Changes included:*
       ‣ 🔧 chore: upgrade next  
       ‣ ✨ feat: New landing page GNN  
       ‣ ✨ feat: change base url LTI config generator  
       ‣ ✨ [MIL-10096](https://wartek.atlassian.net/browse/MIL-10096) Redirect canvas-fe to lms-lti  
       ‣ 🐞 fix: remove redirection that affects signature validation  
       ‣ 🐞 fix: undefined config generator host  
       ‣ ✨ [MIL-10067](https://wartek.atlassian.net/browse/MIL-10067) Diklat list landing page  
       ‣ 🐞 fix: pageSize 10 on diklat list fetch  
       ‣ 🐞 fix: diklat URL  
―――
```

> 💡 **Tip for Slack:** After pasting the generated text into a Slack message box, select all the text and press `Cmd + Shift + F` (on Mac) to apply block formatting automatically.

---

## 🧠 Notes

* This extension scans Git logs between selected tags and tries to match JIRA keys (e.g., `MIL-12345`) and automatically converts them into links using the provided `BASE_JIRA_URL`.
* Make sure your commit messages consistently include JIRA issue keys to take full advantage of this feature.
