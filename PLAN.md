# ruby-dsa — Ruby DS&A Interview Reference

**Status:** agreed design (v2), awaiting go-ahead to build.
A single-page, browser-runnable Ruby reference for the data structures and algorithms
asked in 2026 coding interviews. Authored in Rails, shipped as static files on GitHub Pages.

---

## 1. Verified facts (measured locally — not assumed)

| | |
|---|---|
| Ruby | **4.0.6** — already installed, now the global asdf default (moved from 3.3.5 on 2026-09-13) and shared with rollmonkey, so the least likely of the installed set to be cleaned up. **Verified to generate and boot Rails 8.1.3.1.** No new install. |
| Rails | **8.1.3.1** — verified to generate and boot on Ruby 4.0.6 (and 4.0.5). |
| Bundler | **2.7.2**, pinned. System bundler 4.0.9 is broken behind the proxy (`NameError: uninitialized class variable @@accept_charset in CGI`). |
| json | **Pinned to `~> 2.21`.** json 3.x made `JSON.parse` keyword-only; Active Support 8.1.3.1 still passes options as a positional Hash, so *every session read* raised `ArgumentError: wrong number of arguments (given 2, expected 1)`. Rails only requires `>= 2.3`, so bundler picks 3.x unencumbered. Symptom: first request 200, every subsequent request 500. Not Ruby-version specific. |
| Node | **22.22.3** — already installed (gomus). Needed only for the wasm test harness; global default is 17.1.0, so the project pins it. |
| Browser Ruby | `@ruby/4.0-wasm-wasi@2.10.1` → `ruby 4.0.0 (2025-12-25) +PRISM [wasm32-wasi]` |
| Version parity | **No installed Ruby matches the wasm's 4.0.0** (2.7.8 / 3.3.5 / 3.4.1 / 4.0.5 / 4.0.6). Parity is therefore unreachable by version choice — which is why snippet tests run *inside* the wasm (decision 9). The local Ruby never enters the assertion path; it only builds and serves the site. |
| wasm size | **`ruby.wasm` core = 4.4 MB brotli.** Verified to include `stringio` + `set`; **lacks `json`.** (`ruby+stdlib.wasm` = 9.0 MB — not needed.) |
| wasm boot | ~100 ms cold; **64–111 ms to re-instantiate** a cached module. |
| wasm memory | Compiled module ~19 MB. **One idle VM ≈ 360 MB** (WASI's default linear-memory reservation, not our code); a typical snippet adds ~0, a 50k-element sort ~40 MB. **Dropping the VM reference reclaims nothing** — only terminating the Worker frees it. |
| wasm patch tracking | ruby.wasm builds from each minor's `.0` release and **never bumps the patch**: the 3.4 line has shipped `3.4.1 (revision 48d4efcb85)` across every release from 2.7.1 to 2.10.1. No published wasm will ever be 4.0.6. Building one locally needs wasi-sdk (172 MB download, ~1 GB unpacked) plus a full CRuby cross-compile — rejected. |
| dev disk cost | The npm packages are **99 MB** on disk, dev-only (test harness), gitignored, never shipped. Visitors download **4.4 MB** brotli. |
| GitHub | `axelb152`, free plan, 22 public repos. User site `axelb152.github.io` already taken by the portfolio → this is a **project site**. |
| Pages limits | 1 GB site · 100 GB/mo bandwidth (soft) · 10 builds/hr (waived with a custom Actions workflow) · free plan requires a **public** repo. |

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Snippets are **editable, resettable and runnable** | ruby.wasm, real CRuby. A DS&A reference you can't perturb is half a product. |
| 2 | **Rails is a build-time tool**, not a server | GitHub Pages serves static files only. `bin/rails server` for authoring; `rake site:build` emits `_site/`. |
| 3 | Repo **`ruby-dsa`**, public, **MIT** | Free-plan Pages needs public. URL: `axelb152.github.io/ruby-dsa/`. |
| 4 | **ActiveRecord installed, unused** | Costs nothing, door open. Content stays in YAML because YAML is diffable and I'm hand-writing ~60 snippets you'll review. A DB buys nothing at runtime on Pages. |
| 5 | **jsDelivr** for the wasm, pinned to `@ruby/4.0-wasm-wasi@2.10.1` | Zero repo weight, zero Pages bandwidth. Pinning freezes the browser Ruby at 4.0.0 so stdout assertions can't drift. |
| 6 | **Core `ruby.wasm` (4.4 MB)**, not the 9 MB stdlib build | Verified to cover every snippet's needs. A `LoadError` on a stdlib file shows an explanatory message, not a broken-looking page. |
| 7 | **CodeMirror 5.65.21**, vendored | One UMD file + Ruby mode, no bundler, no Node build. "Legacy" here means finished. |
| 8 | **Fresh Worker per run · 5 s timeout** | `worker.terminate()` is both the only reliable escape from a runaway loop **and** the only way to reclaim the VM's ~360 MB — a new VM inside a living Worker leaks the old one. The compiled module stays cached on the main thread, so respawn is ~100 ms. Hermetic runs also mean what you see is caused by the code in front of you. **Exactly one VM alive at a time.** |
| 9 | **Tests execute inside the wasm** via Node | Tests the artifact that ships. Closes both the version gap (4.0.6 vs 4.0.0) and the platform gap (`arm64-darwin25` vs `wasm32-wasi`) — the latter is what would hide a missing-stdlib bug. Installs no extra Ruby. |
| 10 | **Breadth-first content**, ~25 of ~60 slots filled | An empty category is worse than a thin one. Every section teaches the *shape* of its pattern on day one; deepening is pure addition. |
| 11 | **Dense, study-grade UI** | `devdocs.io`, not a landing page. `prefers-color-scheme` + persisted manual toggle. |
| 12 | **Version pinning lives in committed files, never in asdf commands** | `.tool-versions` is committed and read by both asdf and `ruby/setup-ruby` in CI. README setup steps avoid `asdf global`/`asdf set` — asdf here is 0.13.1 and the syntax flips on the planned 0.20 upgrade. |

## 3. Architecture

```
ruby-dsa/
├─ .tool-versions            ruby 4.0.6 / nodejs 22.22.3
├─ content/*.yml             the catalogue — one file per category
├─ app/models/               Catalog · Category · Snippet (frozen POROs, YAML-loaded)
├─ app/views/site/index      the one page
├─ app/javascript/controllers/
│    editor_controller.js    CodeMirror mount-on-click · Reset · localStorage
│    runner_controller.js    Worker lifecycle · 5 s timeout · output pane
│    search_controller.js    filter + auto-expand
├─ app/javascript/ruby_worker.js   ruby.wasm VM, fresh per run
├─ vendor/javascript/        CodeMirror 5 + ruby mode
├─ lib/tasks/site.rake       site:build → _site/
├─ test/snippets.mjs         runs every snippet in the wasm, asserts exact stdout
└─ .github/workflows/deploy.yml
```

### Content model

```yaml
slug: sliding-window
title: Sliding Window
blurb: |
  Grow the window to satisfy, shrink to restore the invariant...
snippets:
  - slug: longest-substring-no-repeat
    title: "Longest substring without repeating characters"
    time:  "O(n)"
    space: "O(min(n, charset))"
    notes: "Variable-size window; Hash holds last-seen index so the left edge jumps."
    ref:   "CLRS-style two-pointer invariant; verified against multiple references"
    code: |
      def length_of_longest_substring(s) = ...
      p length_of_longest_substring("abcabcbb")
    expected: |
      3
```

`expected` does double duty: the CI assertion, **and** the "Expected output" shown under
each editor so you can diff by eye without running.

### Edit / Run / Reset

- **Default source** is server-rendered into `<script type="text/plain" data-default>`; Reset
  copies it back with no round-trip and clears the saved edit.
- **Edits** persist to `localStorage` under `dsa:<cat>:<snip>:v<content-hash>` — the hash
  invalidates saved edits when I change a snippet.
- **Run** → Worker → `$stdout = $stderr = StringIO.new` → `vm.eval(code)` → read `$stdout.string`.
  Main thread arms a 5 s timer; on expiry it terminates the Worker, reports
  *"timed out after 5 s"*, and boots a replacement in the background.
- **Every run gets a new Worker**, terminated when it returns. This is a memory requirement, not
  just a hygiene one: ~360 MB per VM, unreclaimable any other way.

## 4. Content

**Part I — Implement from scratch (13):** dynamic array · singly linked list · doubly linked
list · stack · queue (two-stack) · ring-buffer deque · hash map w/ chaining · BST ·
min-heap / priority queue · trie · union-find · graph representations · LRU cache

**Part II — Patterns (18, NeetCode roadmap):** Arrays & Hashing · Two Pointers · Sliding
Window · Stack · Binary Search · Linked List · Trees · Tries · Heap/PQ · Backtracking ·
Graphs · Advanced Graphs · 1-D DP · 2-D DP · Greedy · Intervals · Bit Manipulation ·
Math & Geometry

**Part III — Ruby idioms for interviews (~10):** `Hash.new(0)` · `each_cons`/`each_slice` ·
`Comparable`/`<=>` · `Set` · `Array#bsearch` · `Struct` · `sort_by` vs `sort` ·
why `Array#shift` is O(1) in CRuby · `freeze` · `tally`/`group_by`

Plus a Big-O cheat table for Ruby's *own* `Array`/`Hash` operations.

**First 25 = the 18 pattern anchors + 7 core data structures.** Remainder ship as
clearly-marked TODO cards.

### Sourcing

Algorithms are public knowledge; a given author's solution code is not, and LeetCode problem
statements aren't redistributable. Each implementation is written from the algorithm in
idiomatic Ruby, cross-checked against multiple references for correctness and edge cases,
never transliterated line-for-line, with problems described in my own words and a `ref:` note
where a source genuinely shaped the approach.

## 5. CI

One workflow, on push to `main` (and `pull_request` for tests only):

```
setup-ruby 4.0.6 → setup-node 22 → bundle install (cached)
  → npm test        # every snippet, in the wasm, exact stdout
  → rake site:build # → _site/
  → upload-pages-artifact → deploy-pages
```

**Tests gate the deploy.** A broken snippet fails the build and the live site keeps the last
good version. `_site/` is gitignored — nothing generated is ever committed.

## 6. Build order

1. Rails bootstrap · Ruby 4.0.6 · bundler 2.7.2 · `git init` · MIT · README
2. `Catalog`/`Category`/`Snippet` POROs + YAML loader
3. **Two Pointers end to end** — CodeMirror, Reset, localStorage, Worker, timeout, output
   → *pause here for your judgement on the edit/run/reset loop before writing 60 algorithms*
4. Layout, TOC, search, collapse, theme
5. `rake site:build` + the Actions workflow, deployed and verified live
6. Content: remaining 24 of the first 25
7. wasm test suite + `expected` blocks
8. TODO cards for the unfilled slots
