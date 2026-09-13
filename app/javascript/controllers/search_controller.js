import { Controller } from "@hotwired/stimulus"

// Collapsed sections are unreachable by the browser's own find-in-page, so the
// page has to provide its own: filter, and expand whatever matched.
export default class extends Controller {
  static targets = ["input", "category", "snippet"]

  filter() {
    const query = this.inputTarget.value.trim().toLowerCase()

    if (!query) {
      this.snippetTargets.forEach((s) => { s.hidden = false })
      this.categoryTargets.forEach((c) => { c.hidden = false; c.open = false })
      return
    }

    this.categoryTargets.forEach((category) => {
      const inTitle = category.querySelector("summary").textContent.toLowerCase().includes(query)
      const snippets = this.snippetTargets.filter((s) => category.contains(s))

      let anyShown = inTitle
      snippets.forEach((snippet) => {
        const hit = inTitle || snippet.dataset.title.includes(query) || snippet.textContent.toLowerCase().includes(query)
        snippet.hidden = !hit
        anyShown ||= hit
      })

      category.hidden = !anyShown
      category.open = anyShown
    })
  }

  toggleAll({ currentTarget }) {
    const opening = this.categoryTargets.some((c) => !c.open)
    this.categoryTargets.forEach((c) => { c.open = opening })
    currentTarget.textContent = opening ? "collapse all" : "expand all"
  }
}
