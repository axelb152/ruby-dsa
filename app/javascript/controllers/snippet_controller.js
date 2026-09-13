import { Controller } from "@hotwired/stimulus"
import { runRuby, isBooted, timeoutSeconds } from "ruby_runtime"

// One editable, runnable, resettable example.
//
// The pristine source is server-rendered into a <script type="text/plain">, so
// Reset never needs a round-trip and works before the editor has even mounted.
export default class extends Controller {
  static targets = ["source", "preview", "host", "output", "state", "dirty"]
  static values = { storageKey: String, expected: String }

  editor = null

  connect() {
    const saved = this.#readSaved()
    if (saved !== null && saved !== this.defaultCode) {
      this.previewTarget.textContent = saved
      this.#markDirty(true)
    }
  }

  get defaultCode() { return this.sourceTarget.content.textContent }

  get code() { return this.editor ? this.editor.getValue() : this.previewTarget.textContent }

  // CodeMirror is mounted only once you interact with a snippet. Sixty live
  // editor instances on one page is what makes a long reference page crawl.
  mount() {
    if (this.editor) return

    // Reveal the host first: CodeMirror measures character and gutter widths at
    // construction, and measuring inside a hidden element yields zeros — which
    // renders the line numbers on top of the code.
    this.previewTarget.hidden = true
    this.hostTarget.hidden = false

    this.editor = window.CodeMirror(this.hostTarget, {
      value: this.code,
      mode: "ruby",
      lineNumbers: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      viewportMargin: Infinity,
      extraKeys: { Tab: (cm) => cm.execCommand("indentMore"), "Shift-Tab": (cm) => cm.execCommand("indentLess") }
    })

    this.editor.on("change", () => {
      this.#save(this.editor.getValue())
      this.#markDirty(this.editor.getValue() !== this.defaultCode)
    })

    this.editor.refresh()
    this.editor.focus()
  }

  async run() {
    this.#render("running", isBooted() ? "running…" : "downloading ruby (4.4 MB)…")

    const result = await runRuby(this.code, {
      onBoot: () => this.#render("running", "downloading ruby (4.4 MB)…")
    })

    if (result.status === "timeout") {
      return this.#render("bad", `timed out after ${timeoutSeconds} s — an infinite loop?`)
    }
    if (result.status === "crashed") {
      return this.#render("bad", result.output)
    }

    if (result.raised) return this.#render("bad", result.output, `${result.ms} ms · raised`)

    const matches = result.output === this.expectedValue
    this.#render(matches ? "good" : "warn", result.output, `${result.ms} ms${matches ? "" : " · differs from expected"}`)
  }

  reset() {
    if (this.editor) this.editor.setValue(this.defaultCode)
    this.previewTarget.textContent = this.defaultCode
    this.#clearSaved()
    this.#markDirty(false)
    this.#render("idle", "")
  }

  #render(state, body, label = null) {
    this.outputTarget.dataset.state = state
    this.outputTarget.hidden = state === "idle"
    this.outputTarget.querySelector("[data-body]").textContent = body
    this.outputTarget.querySelector("[data-label]").textContent =
      label ?? { running: "output", good: "output", warn: "output", bad: "output" }[state] ?? "output"
  }

  #markDirty(dirty) { this.dirtyTarget.hidden = !dirty }

  #readSaved() {
    try { return window.localStorage.getItem(this.storageKeyValue) } catch { return null }
  }

  #save(value) {
    try {
      value === this.defaultCode
        ? window.localStorage.removeItem(this.storageKeyValue)
        : window.localStorage.setItem(this.storageKeyValue, value)
    } catch { /* private mode, or site data blocked — editing still works */ }
  }

  #clearSaved() {
    try { window.localStorage.removeItem(this.storageKeyValue) } catch { /* as above */ }
  }
}
