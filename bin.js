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
      --port, -o  Port to listen on
 
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
        },
        port: {
            type: "number",
            default: myConstClass.PORT,
            alias: "o"
        },
    }
})

const path = cli.flags.path != "" ? cli.flags.path : undefined
const port = Number.isInteger(cli.flags.port) ? 
        cli.flags.port : undefined
const compression = Number.isInteger(cli.flags.compression) ? 
        cli.flags.compression : undefined

if (compression == undefined || (compression > 9 || !(compression >= 0))) {
    console.log("Zip Compression Level must be a number between 0 - 9.")
    quit()
}

if (port == undefined || (port > 65535  || (port <= 1023))) {
    console.log("Port must be a number between 1024 - 65535.")
    quit()
}

server({
    base_path: path,
    compression: compression,
    port: port
})
