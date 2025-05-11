# gitlab-deployment-info

Download and load this folder to your chrome browser via `chrome://extensions`. Don't forget to modify the `BASE_JIRA_URL` in `popup.js` (if necessary default to `wartek.atlassian.net`).

## Installation

- Download this repository
- Go to `chrome://extensions`
- Click `Load unpacked`
- Select the downloaded repository folder

## How to Use

- Go to one of your repositories
- Click the extensions
- Pin it to the toolbar if necessary

## Preview

![preview-gitlab-deployment-info](https://github.com/user-attachments/assets/30a92a68-ba39-4e9e-acab-e611b67358e3)

## Generated Confluence Example

```

### **💡 Deployment Summary**
| Information | Details |
|--------------------|---------|
| 🏡 **Project** | [canvas-lti](https://gitlab.com/wartek-id/guru/belajar/canvas-lti) |
| ⏰ **Deploy At** | 11 May 2025, 14:15 |
| 🔗 **Pipeline** | [#1801689260 - release-production-20250506-0745](https://gitlab.com/wartek-id/guru/belajar/canvas-lti/-/pipelines/1801689260) |
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

## Generated Slack Example

```
*🚀Production Release〘[canvas-lti](https://gitlab.com/wartek-id/guru/belajar/canvas-lti)〙🚀*
Hi everyone! we are going to have a production deployment with these details:
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
       ‣ ✨ [MIL-10096](https://wartek.atlassian.net/browse/MIL-10096) Feat: redirect canvas-fe.guru-lms.belajar.id host to lms-lti.kemdikbud.go.id
       ‣ 🐞 fix: remove redirection since it will affect signature validation
       ‣ 🐞 fix: undefined config generator host
       ‣ ✨ [MIL-10067](https://wartek.atlassian.net/browse/MIL-10067) Feat: diklat list landing page
       ‣ 🐞 fix: pageSize 10 fetch diklat list
       ‣ 🐞 Fix/diklat url
―――
```
