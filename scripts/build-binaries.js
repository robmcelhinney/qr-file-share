#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const outDir = path.resolve(process.cwd(), "release")
const dryRun = process.argv.includes("--dry-run")
const pkgBin = path.resolve(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    process.platform === "win32" ? "pkg.cmd" : "pkg",
)

const targets = [
    { target: "node18-linux-x64", output: "qr-file-share-linux" },
    { target: "node18-macos-x64", output: "qr-file-share-macos" },
    { target: "node18-win-x64", output: "qr-file-share-win.exe" },
]

if (!fs.existsSync(pkgBin)) {
    console.error("pkg is not installed. Run `npm install` first.")
    process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

for (const build of targets) {
    const outputPath = path.join(outDir, build.output)
    const args = [".", "--targets", build.target, "--output", outputPath]

    if (dryRun) {
        console.log(`${pkgBin} ${args.join(" ")}`)
        continue
    }

    const result = spawnSync(pkgBin, args, {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
    })

    if (result.status !== 0) {
        process.exit(result.status || 1)
    }
}
