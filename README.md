# ruby-dsa

A single-page, browser-runnable Ruby reference for the data structures and algorithms
asked in coding interviews. Every code example is editable in place, runnable against
real CRuby compiled to WebAssembly, and resettable to its original form.

Live: <https://axelb152.github.io/ruby-dsa/>

## How it works

Rails is the **authoring** environment, not the server — GitHub Pages only serves static
files. `bin/dev` gives you the normal Rails loop while writing content; `rake site:build`
renders the page and its assets into `_site/`, which CI deploys to Pages.

Ruby runs **in your browser**, not on a server: [ruby.wasm](https://github.com/ruby/ruby.wasm)
(`ruby 4.0.0`, 4.4 MB brotli) is fetched lazily on your first Run click and executed in a
Web Worker. Each run gets a fresh Worker, which both reclaims the VM's memory and gives
the 5-second timeout something to terminate when you write an infinite loop.

## Setup

Requires **Ruby 4.0.6** and **Node 22.22.3** — both pinned in `.tool-versions`, which asdf,
mise and `ruby/setup-ruby` all read. Don't set versions with `asdf global`/`asdf set`; the
committed file is the source of truth and its syntax doesn't change between asdf releases.

```bash
bundle _2.7.2_ install   # bundler 2.7.2 is pinned; newer bundlers break behind a proxy
npm install              # wasm test harness only, never shipped
bin/dev                  # http://localhost:3000
```

## Content

Snippets live in `content/*.yml`, one file per category — not in a database, so they stay
diffable in review. Each carries its own `expected:` output, which does double duty: CI
asserts against it, and the page renders it beside the editor so you can spot a regression
without running anything.

```bash
npm test          # runs every snippet inside the wasm, asserts exact stdout
rake site:build   # renders _site/
```

Tests run inside the same WebAssembly binary the browser downloads, so what CI asserts is
exactly what you see on the page — no local-Ruby-versus-browser-Ruby drift.

## Deploying

Pages must be created before the first deploy can land:

```bash
gh repo create ruby-dsa --public --source=. --remote=origin --push
gh api -X POST repos/axelb152/ruby-dsa/pages -f build_type=workflow
```

The second call sets the Pages source to GitHub Actions, which is what lets
`.github/workflows/deploy.yml` publish. After that, every push to `main` runs the
snippet suite, builds `_site/`, and deploys only if the tests pass. Pull requests
run the tests and the build but never touch the live site.

The build emits document-relative URLs, so it works unchanged at
`axelb152.github.io/ruby-dsa/`, at a domain root, or opened from disk.

## Licence

MIT — see [LICENSE](LICENSE). The algorithms are public knowledge; the implementations are
written from the algorithm in idiomatic Ruby rather than transliterated from any particular
author's solution.
