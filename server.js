#!/usr/bin/env node

const myConstClass = require("./constants.js")
const fs = require("fs")
const util = require("util")
const path = require("path")
const qrcode = require("qrcode-terminal")
const archiver = require("archiver")
const fileUpload = require("express-fileupload")
const express = require("express"),
    app = express(),
    port = "8765"

module.exports = ({ base_path, compression }) => {
    app.use(fileUpload())
    // If want to limit file size add this:
    // app.use(fileUpload({
    //     createParentPath: true,
    //     limits: {
    //         fileSize: 2 * 1024 * 1024 * 1024 //2MB max file(s) size
    //     },
    // }))

    app.listen(port, () => {
        // get local ip address from https://gist.github.com/sviatco/9054346#gistcomment-1810845
        let addresses = new Set()
        let ifaces = require("os").networkInterfaces()

        for (let dev in ifaces) {
            ifaces[dev].filter((details) => {
                if (details.family === 'IPv4' && !details.internal) {
                    addresses.add(details.address)
                }
            })
        }

        addresses = Array.from(addresses)
        if (addresses.length == 0) {
            return
        }
        for (address of addresses) {
            const full_address = "http://" + address + ":" + port
            console.log("Server listening on port: ", port)
            console.log("Scan QR code or go to " + full_address)

            qrcode.generate(full_address)
            console.log("\n")
        }
    })

    const readdir = util.promisify(fs.readdir)

    // console.log("base_path: " + base_path)
    const base_dir = base_path || process.cwd()

    app.get("/api/files", async (req, res) => {
        let dir
        // console.log("/api/files req.query: ", req.query)
        if (req.query.path && req.query.path !== "undefined") {
            dir = path.join(base_dir, req.query.path)
        } else {
            // console.log("base_dir: ", base_dir)
            dir = base_dir
        }
        if (!checkPathOK(dir)) {
            console.error("path attempting to go back. dir: ", dir)
            res.status(403).send("Can't go back up path")
        }
        // console.log("dir: ", dir)
        listDir(dir)
            .then((results) => {
                res.send(results)
                // console.log("success")
            })
            .catch((err) => {
                console.error("error browsing files", err)
                res.sendStatus(501)
            })
    })

    async function listDir(dir) {
        let jsonResult = {}
        // console.log("listDir")
        let rel_dir = ""
        let files

        try {
            files = await readdir(dir)
        } catch (err) {
            console.error(err)
        }
        files = files.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
        files.forEach((file) => {
            jsonResult[file] = path.join(rel_dir, file)
            let is_dir = false

            // Is directory?
            let file_path = path.join(dir, file)
            // console.log("isDirectory file_path: ", file_path)
            if (
                fs.existsSync(file_path) &&
                fs.lstatSync(file_path).isDirectory()
            ) {
                is_dir = true
                // console.log("isDirectory file: ", file)
            }

            jsonResult[file] = is_dir
        })
        // console.log("jsonResult: ", jsonResult)
        return jsonResult
    }

    app.get("/api/download", async (req, res) => {
        // console.log("/api/download")
        const file = req.query.file
        downloadFile(file, res)
            .then(() => {
                // res.send(results)
                // console.log("success")
            })
            .catch((err) => {
                console.error("error", err)
                res.sendStatus(501)
            })
    })

    async function downloadFile(file, res) {
        let file_path = path.join(base_dir, file)
        if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()) {
            is_dir = true
            // console.log("isDirectory file: ", file)
        }

        res.download(file_path)
    }

    app.get("/api/downloadDir", async (req, res) => {
        const dir = req.query.dir
        if (!checkPathOK(dir)) {
            console.error("path attempting to go back. dir: ", dir)
            res.status(403).send("Can't go back up path")
        }
        // console.log("downloadDir. dir: ", dir)
        await zipDir(base_dir, dir, res)
            .then((output_path) => {
                // res.send(results)
                // console.log("success downloadDir")
            })
            .catch(err => {
                console.error("error", err)
                res.sendStatus(501)
            })
    })

    async function zipDir(rel_directory, dir, res) {
        // console.log("rel_directory:  ", rel_directory)
        // console.log("dir:  ", dir)

        let archive = archiver("zip", {
            zlib: { level: compression }, // Sets the compression level.
        })

        archive.on("warning", function (err) {
            if (err.code === "ENOENT") {
                console.error("Zipping error. ENOENT.")
            } else {
                // throw error
                throw err
            }
        })
        archive.on("error", function (err) {
            throw err
        })

        res.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment filename=" + dir + ".zip",
        })

        // pipe archive data to the result
        archive.pipe(res)
        archive.directory(path.join(rel_directory, dir), dir)

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize()
        // console.log("finalized archive")
    }

    app.post("/api/upload", async (req, res) => {
        // console.log("/api/upload.")

        uploadFile(req, res)
            .then(() => {
                // res.send(results)
                // console.log("upload success")
            })
            .catch((err) => {
                console.error("upload error", err)
                res.sendStatus(501)
            })
    })

    async function moveFile(file, rel_dir) {
        //move photo to uploads directory
        let new_name = file.name
        let dir = path.join(base_dir, rel_dir)
        // console.log("dir: ", dir)
        try {
            fs.accessSync(path.join(dir, new_name))
            let name = new_name.substring(0, new_name.lastIndexOf("."))
            let file_extension = new_name.substring(new_name.lastIndexOf("."))
            new_name = await nonExistingName(name, file_extension, 0, dir)
        } catch (err) {
            // console.log("moveFile. fs.accessSync(new_name)")
        }
        let full_path = path.join(dir, new_name)
        file.mv(full_path)

        //push file details
        return {
            name: file.name,
            mimetype: file.mimetype,
            size: file.size,
        }
    }

    function checkPathOK(path_check) {
        return !path_check.includes("..")
    }

    async function nonExistingName(name, file_extension, count, dir) {
        // console.log("nonExistingName: name, file_extension: ", name, file_extension)
        try {
            fs.accessSync(path.join(dir, name) + "_" + count + file_extension)
            return await nonExistingName(name, file_extension, count + 1, dir)
        } catch (err) {
            // file does not exist.//
        }
        return name + "_" + count + file_extension
    }

    async function uploadFile(req, res) {
        // console.log("uploadFile req.files: ", req.files)

        try {
            if (!req.files) {
                // console.log("!req.files")
                res.send({
                    status: false,
                    message: "No file uploaded",
                })
            } else {
                let data = new Array()
                let message
                const rel_dir = req.body.rel_dir
                // console.log("rel_dir: ", rel_dir)
                // Check if single file or group of files
                if (req.files.file && !Array.isArray(req.files.file)) {
                    let file = req.files.file
                    // console.log("single file")
                    data = moveFile(file, rel_dir)
                    message = "File is uploaded"
                } else {
                    for (let i = 0; i < req.files.file.length; i++) {
                        let file = req.files.file[i]
                        // console.log("inside before for each. : ")
                        data.push(moveFile(file, rel_dir))
                        message = "Files are uploaded"
                    }
                }

                //send response
                res.send({
                    status: true,
                    message: message,
                    data: data,
                })
            }
        } catch (err) {
            res.status(500).send(err)
        }
    }

    app.get("/api/baseDir", async (req, res) => {
        // console.log("/api/baseDir: ", base_dir)
        res.send(base_dir)
    })

    app.use(express.static(path.join(__dirname, "client/build")))
}
