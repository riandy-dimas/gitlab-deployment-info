import assert from "node:assert/strict";
import { test } from "node:test";
import { filterChangelogCommits, hasCompletePatch, isFileChangeAlreadyApplied, isRevertCommit, parsePatch } from "../utils/changelog.js";
import { fetchComparisons } from "../utils/gitlab.js";
import { getGitlabInfo, getHTMLOutput, getSlackChangelogs } from "../utils/output.js";

globalThis.document = {};

const file = (content, blob_id = content) => ({ content: Buffer.from(content).toString("base64"), encoding: "base64", blob_id, execute_filemode: false });
const patch = (overrides = {}) => ({
  old_path: "src/app.js", new_path: "src/app.js", new_file: false, deleted_file: false,
  diff: "@@ -2,3 +2,3 @@\n context before\n-old value\n+new value\n context after\n", ...overrides,
});
const before = "header\ncontext before\nold value\ncontext after\nfooter\n";
const after = before.replace("old value", "new value");

test("filters bookkeeping and conventional docs/test/style types, retaining deployment changes", () => {
  const excluded = [
    "docs: update release 5.5.0", "docs: establish semantic versioning baseline as 5.5.0 and release workflow",
    "MIL-123 Docs(release)!: migration guide", "[MIL-123] TEST: adjust flaky test", "style(ui): formatting",
    "chore(release): 5.5.0", "chore: bump version to v5.5.0", "ci: generate release notes for 5.5.0",
    "chore: update changelog", "Merge branch 'feature' into 'main'", "Merge remote-tracking branch 'origin/main'",
    "Merge pull request #1", "Merge tag 'v5.5.0'", "Merge abc123456 into main", "   ",
  ];
  const retained = [
    "fix: certificate preview style", "feat: release management UI", "chore: bump Node version and dependencies to fix CVEs",
    "chore: update CI node", "chore: update dependencies", "refactor: clean release tests",
    "Revert \"feat: release management UI\"", "[MIL-123] feat: first change", "[MIL-123] fix: a separate fix",
  ];
  const commits = [...excluded, ...retained, ` ${retained[0]} `].map((title) => ({ title }));
  assert.deepEqual(filterChangelogCommits(commits).map((c) => c.title), retained);
  assert.equal(filterChangelogCommits([{ title: "fix: same" }, { title: "fix: same" }], { deduplicate: false }).length, 2);
  for (const title of ["Revert old change", "MIL-123 revert: change", "[MIL-123] Revert old change"]) assert.ok(isRevertCommit({ title }));
});

test("recognizes cherry-picked changes in baseline contents even after unrelated edits", () => {
  assert.ok(isFileChangeAlreadyApplied(patch(), file(after), file(after)));
  assert.ok(isFileChangeAlreadyApplied(patch(), file(`extra header\n${after}extra footer\n`), file(after)));
  assert.ok(hasCompletePatch([patch()], { additions: 1, deletions: 1 }));
});

test("retains new patches, reapplications after revert, partial matches, and ambiguous text", () => {
  assert.equal(isFileChangeAlreadyApplied(patch(), file(before), file(after)), false);
  assert.equal(isFileChangeAlreadyApplied(patch(), file(after + after), file(after)), false);
  assert.equal(isFileChangeAlreadyApplied(patch(), file(after + before), file(after)), false);
  assert.equal(isFileChangeAlreadyApplied(patch(), file(after.replace("context after", "changed context")), file(after)), false);
  assert.equal(isFileChangeAlreadyApplied(patch(), { ...file(after), execute_filemode: true }, file(after)), false);
});

test("handles added/deleted files and requires the entire textual patch", () => {
  const added = patch({ new_file: true, diff: "@@ -0,0 +1 @@\n+new file\n" });
  assert.ok(isFileChangeAlreadyApplied(added, file("new file\n"), file("new file\n")));
  assert.equal(isFileChangeAlreadyApplied(added, null, file("new file\n")), false);
  assert.equal(isFileChangeAlreadyApplied(added, file("different\n"), file("new file\n")), false);
  const deleted = patch({ deleted_file: true, diff: "@@ -1 +0,0 @@\n-old file\n" });
  assert.ok(isFileChangeAlreadyApplied(deleted, null, null));
  assert.equal(isFileChangeAlreadyApplied(deleted, file("old file\n"), null), false);
  for (const incomplete of [patch({ too_large: true }), patch({ collapsed: true }), patch({ renamed_file: true }), patch({ diff: "" }), patch({ diff: undefined }), patch({ diff: "@@ -1,2 +1,2 @@\n-old\n+new\n" })]) {
    assert.equal(parsePatch(incomplete), null);
    assert.equal(hasCompletePatch([incomplete], { additions: 1, deletions: 1 }), false);
  }
  assert.equal(hasCompletePatch([patch()], { additions: 2, deletions: 1 }), false);
  assert.equal(hasCompletePatch([], { additions: 0, deletions: 0 }), false);
});

test("multiple hunks must all be present, in order; boundary and newline changes remain conservative", () => {
  const multiple = patch({ diff: "@@ -2 +2 @@\n-old value\n+new value\n@@ -6 +6 @@\n-old second\n+new second\n" });
  const target = "header\nnew value\nspace\nspace\nspace\nnew second\nfooter\n";
  assert.ok(isFileChangeAlreadyApplied(multiple, file(target + "other change\n"), file(target)));
  assert.equal(isFileChangeAlreadyApplied(multiple, file(target.replace("new second", "old second")), file(target)), false);
  assert.equal(isFileChangeAlreadyApplied(multiple, file("new second\nnew value\n"), file(target)), false);
  assert.equal(isFileChangeAlreadyApplied(patch(), file(after.slice(0, -1)), file(after)), false);
});

test("GitLab integration suppresses deployed patches, not Jira keys/titles; checks every diff page", async (t) => {
  const commits = [
    { id: "docs", title: "docs: release 5.5.0" },
    { id: "deployed", title: "MIL-123 fix: shared title" },
    { id: "new", title: "MIL-123 fix: shared title" },
    { id: "partial", title: "fix: multiple files" },
    { id: "unknown", title: "fix: large diff" },
    { id: "revert", title: "MIL-123 revert: old feature" },
  ];
  const requests = [];
  const previousTag = "release/previous+1&safe";
  const currentTag = "release/current+2&safe";
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    requests.push(url);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    let body;
    let next = "";
    if (url.pathname.endsWith("/compare")) {
      assert.equal(url.searchParams.get("from"), previousTag);
      assert.equal(url.searchParams.get("to"), currentTag);
      assert.equal(url.searchParams.get("straight"), "true");
      body = { commits };
    } else if (/\/commits\/(deployed|new|partial|unknown)$/.test(url.pathname)) {
      const multi = url.pathname.endsWith("/partial");
      body = { parent_ids: ["parent"], stats: { additions: multi ? 2 : 1, deletions: multi ? 2 : 1 } };
    } else if (url.pathname.endsWith("/diff")) {
      const id = url.pathname.split("/").at(-2);
      if (id === "partial" && url.searchParams.get("page") === "1") {
        body = [patch()]; next = "2";
      } else if (id === "partial") {
        body = [patch({ old_path: "src/new.js", new_path: "src/new.js" })];
      } else if (id === "unknown") body = [patch({ too_large: true })];
      else body = [patch({ old_path: id === "new" ? "src/new.js" : "src/app.js", new_path: id === "new" ? "src/new.js" : "src/app.js" })];
    } else if (url.pathname.includes("/files/")) {
      const path = decodeURIComponent(url.pathname.split("/files/")[1]);
      const ref = url.searchParams.get("ref");
      body = file(ref === previousTag && path === "src/new.js" ? before : after);
    } else throw new Error(`Unexpected request: ${url.pathname}`);
    return new Response(JSON.stringify(body), { headers: { "x-next-page": next } });
  });
  t.mock.property(globalThis, "document", { getElementById: (id) => ({ value: id === "fromTag" ? previousTag : currentTag }) });
  const titles = await fetchComparisons("group/subgroup", "project", "test-token");
  assert.deepEqual(titles, [commits[2].title, commits[3].title, commits[4].title, commits[5].title]);
  assert.equal(requests.filter((url) => url.pathname.endsWith("/files/src%2Fapp.js") && url.searchParams.get("ref") === previousTag).length, 1, "baseline reads are cached");
  assert.equal(requests.filter((url) => url.pathname.includes("/revert") || url.pathname.includes("/docs")).length, 0);
});

test("comparison failures are surfaced instead of generating misleading notes", async (t) => {
  t.mock.property(globalThis, "document", { getElementById: (id) => ({ value: id }) });
  t.mock.method(globalThis, "fetch", async () => new Response("Unauthorized", { status: 401 }));
  await assert.rejects(fetchComparisons("group", "project", "bad-token"), /401/);
});

test("all output formats share filtered titles; pipeline numbers have a single hash", (t) => {
  t.mock.property(globalThis, "document", { getElementById: (id) => ({ value: id === "fromTag" ? "previous" : "current" }) });
  const commits = filterChangelogCommits([{ title: "docs: release notes" }, { title: "MIL-123 fix: certificate" }]).map((c) => c.title);
  const data = {
    commits, repo: { name: "Example", namespace: "group", project: "project" }, compareUrl: "https://gitlab.com/compare",
    pipeline: { value: "#123 (current)", getAttribute: (name) => name === "data-value" ? "https://gitlab.com/pipelines/123" : "" },
    dateTime: { value: "2026-11-05T09:15" },
  };
  const markdown = getGitlabInfo(data);
  for (const output of [markdown, getSlackChangelogs(data), getHTMLOutput(data)]) {
    assert.match(output, /fix: certificate/);
    assert.doesNotMatch(output, /docs: release notes/);
  }
  assert.match(markdown, /\[#123\]/);
  assert.doesNotMatch(markdown, /##123/);
  assert.doesNotThrow(() => getGitlabInfo({ ...data, commits: [] }));
});
