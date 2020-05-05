#!/usr/bin/env node

const server = require("./server.js") /* the current working directory so that means main.js because of package.json */
const meow = require("meow")
const myConstClass = require('./constants.js')

const cli = meow(`
    Usage
      $ qr-file-share
 
    Options
      --path, -p  Run in given directory
      --compression, -cl  Compression Level when zipping directory before download
 
`, {
    boolean: ["help", "version"],
    alias: { h: "help", v: "version" },
    flags: {
        path: {
            type: "string",
            default: "",
            alias: "p"
        },
        compression: {
            type: "number",
            default: myConstClass.COMPRESSION_LEVEL,
            alias: "cl"
        }
    }
})

const path = cli.flags.path != "" ? cli.flags.path : undefined
const compression = Number.isInteger(cli.flags.compression) ? 
        cli.flags.compression : undefined

if (compression == undefined || (compression > 9 || !(compression >= 0))) {
    console.log("Zip Compression Level must be a number between 0 - 9.")
    return
}

server({
    base_path: path,
    compression: compression
})
