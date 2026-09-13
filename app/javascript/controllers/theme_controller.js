import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  toggle() {
    const dark = document.documentElement.classList.toggle("dark")
    try { window.localStorage.setItem("dsa:theme", dark ? "dark" : "light") } catch { /* site data blocked */ }
  }
}
