// Runs every snippet in content/*.yml and asserts its stdout matches `expected`.
//
// Execution happens inside the same WebAssembly binary the browser downloads —
// same Ruby build, same platform, same stdlib set. Testing against the local
// native Ruby would pass on code that fails in the browser, most obviously for
// anything requiring a stdlib this core-only build omits.
//
// The UI's error-formatting wrapper is deliberately not reused here: a snippet
// that raises simply fails to produce its expected output, which is the result
// we want either way.

import fs from "node:fs/promises"
import path from "node:path"
import yaml from "js-yaml"
import { DefaultRubyVM } from "@ruby/wasm-wasi/dist/node"

const ROOT = path.join(import.meta.dirname, "..")
const WASM = path.join(ROOT, "node_modules/@ruby/4.0-wasm-wasi/dist/ruby.wasm")

const run = async (rubyModule, code) => {
  const { vm } = await DefaultRubyVM(rubyModule, { consolePrint: false })
  const base64 = Buffer.from(code, "utf8").toString("base64")
  vm.eval(`
    require "stringio"
    $stdout = $stderr = StringIO.new(+"", "w")
    eval(${JSON.stringify(base64)}.unpack1("m0").force_encoding("UTF-8"), TOPLEVEL_BINDING, "snippet.rb")
  `)
  return vm.eval("$stdout.string").toString()
}

const rubyModule = await WebAssembly.compile(await fs.readFile(WASM))
console.log(`ruby ${(await run(rubyModule, "print RUBY_DESCRIPTION")).trim()}\n`)

const files = (await fs.readdir(path.join(ROOT, "content"))).filter((f) => f.endsWith(".yml")).sort()
let passed = 0
const failures = []

for (const file of files) {
  const category = yaml.load(await fs.readFile(path.join(ROOT, "content", file), "utf8"))
  for (const snippet of category.snippets ?? []) {
    const id = `${category.slug}/${snippet.slug}`
    let actual
    try {
      actual = await run(rubyModule, snippet.code)
    } catch (error) {
      failures.push({ id, actual: `threw: ${error.message}`, expected: snippet.expected })
      console.log(`FAIL  ${id}`)
      continue
    }
    if (actual === snippet.expected) {
      passed++
      console.log(`ok    ${id}`)
    } else {
      failures.push({ id, actual, expected: snippet.expected })
      console.log(`FAIL  ${id}`)
    }
  }
}

for (const { id, actual, expected } of failures) {
  console.log(`\n--- ${id}\nexpected:\n${expected}\nactual:\n${actual}`)
}

console.log(`\n${passed} passed, ${failures.length} failed`)
process.exit(failures.length ? 1 : 0)
