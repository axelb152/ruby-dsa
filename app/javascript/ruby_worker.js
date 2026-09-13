import { RubyVM } from "https://cdn.jsdelivr.net/npm/@ruby/wasm-wasi@2.10.1/+esm"
import { File, OpenFile, PreopenDirectory, WASI } from "https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/+esm"

// Base64 keeps the snippet out of Ruby's string syntax entirely. The source is
// user-authored code full of quotes, backslashes and interpolation, and
// embedding it in an eval string would be a quoting bug waiting to happen.
const encode = (text) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Wraps the snippet so a raised exception is reported as output rather than
// tearing down the VM.
const harness = (code) => `
  require "stringio"
  $stdout = $stderr = StringIO.new(+"", "w")
  $dsa_raised = false
  begin
    eval(${JSON.stringify(encode(code))}.unpack1("m0").force_encoding("UTF-8"), TOPLEVEL_BINDING, "snippet.rb")
  rescue LoadError => e
    $dsa_raised = true
    $stdout.print "\#{e.class}: \#{e.message}\\n"
    $stdout.print "This build of Ruby is core-only, so most of the standard library is unavailable.\\n"
  rescue SystemExit
  rescue Exception => e
    $dsa_raised = true
    $stdout.print "\#{e.class}: \#{e.message}\\n"
    Array(e.backtrace).select { |l| l.start_with?("snippet.rb") }.first(4).each { |l| $stdout.print "  from \#{l}\\n" }
  end
  $stdout.string
`

self.onmessage = async ({ data: { module: rubyModule, code } }) => {
  try {
    const wasi = new WASI([], [], [
      new OpenFile(new File([])),
      new OpenFile(new File([])),
      new OpenFile(new File([])),
      new PreopenDirectory("/", new Map())
    ], { debug: false })

    const { vm } = await RubyVM.instantiateModule({ module: rubyModule, wasip1: wasi })

    const started = performance.now()
    const output = vm.eval(harness(code)).toString()
    const raised = vm.eval("$dsa_raised").toString() === "true"
    self.postMessage({ status: "ok", output, raised, ms: Math.round(performance.now() - started) })
  } catch (error) {
    self.postMessage({ status: "crashed", output: String(error?.message ?? error) })
  }
}
