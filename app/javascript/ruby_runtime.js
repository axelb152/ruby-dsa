// Shared ruby.wasm runtime for the whole page.
//
// The compiled WebAssembly.Module is cached here, on the main thread, and
// structured-cloned into each worker. Workers are deliberately short-lived: a
// VM reserves ~360 MB that nothing but terminating the worker reclaims, and
// terminate is also the only way to stop a runaway loop. So every run gets a
// fresh worker and the expensive part — fetch and compile — happens once.

const WASM_URL = "https://cdn.jsdelivr.net/npm/@ruby/4.0-wasm-wasi@2.10.1/dist/ruby.wasm"
const TIMEOUT_MS = 5000

let compiled = null

const workerUrl = () => document.querySelector('meta[name="ruby-worker-url"]').content

export const isBooted = () => compiled !== null

export async function runRuby(code, { onBoot } = {}) {
  if (!compiled) {
    onBoot?.()
    compiled = WebAssembly.compileStreaming(fetch(WASM_URL)).catch((error) => {
      compiled = null // let the next Run retry rather than failing forever
      throw error
    })
  }

  let rubyModule
  try {
    rubyModule = await compiled
  } catch (error) {
    return { status: "crashed", output: `Could not load Ruby: ${error.message}` }
  }

  const worker = new Worker(workerUrl(), { type: "module" })

  return new Promise((resolve) => {
    const settle = (result) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(result)
    }
    const timer = setTimeout(() => settle({ status: "timeout" }), TIMEOUT_MS)

    worker.onmessage = ({ data }) => settle(data)
    worker.onerror = (event) => settle({ status: "crashed", output: event.message || "worker failed" })
    worker.postMessage({ module: rubyModule, code })
  })
}

export const timeoutSeconds = TIMEOUT_MS / 1000
