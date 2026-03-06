#!/usr/bin/env node

const pkg = require("./package.json")
const server = require("./server.js")
const myConstClass = require("./constants.js")

const HELP_TEXT = `
  Usage
    $ qr-file-share

  Options
    --path, -p         Run in given directory
    --compression, -cl Compression level when zipping a directory before download
    --port, -o         Port to listen on
    --help, -h         Show help
    --version, -v      Show version
`

function printHelp() {
    console.log(HELP_TEXT.trimEnd())
}

function parseArgs(argv) {
    const parsed = {
        help: false,
        version: false,
        path: "",
        compression: myConstClass.COMPRESSION_LEVEL,
        port: myConstClass.PORT,
    }

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        const nextArg = argv[index + 1]

        switch (arg) {
            case "--help":
            case "-h":
                parsed.help = true
                break
            case "--version":
            case "-v":
                parsed.version = true
                break
            case "--path":
            case "-p":
                parsed.path = nextArg || ""
                index += 1
                break
            case "--compression":
            case "-cl":
                parsed.compression = Number(nextArg)
                index += 1
                break
            case "--port":
            case "-o":
                parsed.port = Number(nextArg)
                index += 1
                break
            default:
                if (arg.startsWith("--path=")) {
                    parsed.path = arg.substring("--path=".length)
                } else if (arg.startsWith("--compression=")) {
                    parsed.compression = Number(arg.substring("--compression=".length))
                } else if (arg.startsWith("--port=")) {
                    parsed.port = Number(arg.substring("--port=".length))
                } else {
                    console.error(`Unknown argument: ${arg}`)
                    printHelp()
                    process.exit(1)
                }
        }
    }

    return parsed
}

const cli = parseArgs(process.argv.slice(2))

if (cli.help) {
    printHelp()
    process.exit(0)
}

if (cli.version) {
    console.log(pkg.version)
    process.exit(0)
}

if (!Number.isInteger(cli.compression) || cli.compression < 0 || cli.compression > 9) {
    console.log("Zip compression level must be an integer between 0 and 9.")
    process.exit(1)
}

if (!Number.isInteger(cli.port) || cli.port <= 1023 || cli.port > 65535) {
    console.log("Port must be an integer between 1024 and 65535.")
    process.exit(1)
}

server({
    base_path: cli.path || undefined,
    compression: cli.compression,
    port: cli.port,
})
