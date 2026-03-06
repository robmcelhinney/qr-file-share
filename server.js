#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const os = require("os")
const qrcode = require("qrcode-terminal")
const yazl = require("yazl")
const fileUpload = require("express-fileupload")
const express = require("express")

const CLIENT_DIST_DIR = path.join(__dirname, "client", "dist")
const DEFAULT_MAX_FILE_SIZE_BYTES = Number(
    process.env.QR_FILE_SHARE_MAX_FILE_SIZE_BYTES || 1024 * 1024 * 1024,
)
const DEFAULT_MAX_FILES_PER_UPLOAD = Number(
    process.env.QR_FILE_SHARE_MAX_FILES_PER_UPLOAD || 32,
)
const DEFAULT_REQUEST_TIMEOUT_MS = Number(
    process.env.QR_FILE_SHARE_REQUEST_TIMEOUT_MS || 5 * 60 * 1000,
)
const DEFAULT_TEMP_UPLOAD_DIR =
    process.env.QR_FILE_SHARE_TEMP_UPLOAD_DIR || "/tmp/qr-file-share-upload"
const DEFAULT_READ_ONLY = process.env.QR_FILE_SHARE_READ_ONLY === "true"
const DEFAULT_DELETE_ENABLED =
    process.env.QR_FILE_SHARE_ENABLE_DELETE === "true"
const DEFAULT_SHOW_ALL_ADDRESSES =
    process.env.QR_FILE_SHARE_SHOW_ALL_ADDRESSES === "true"
const DEFAULT_UPLOAD_TOKEN = process.env.QR_FILE_SHARE_UPLOAD_TOKEN || ""
const DEFAULT_UPLOAD_TOKEN_MODE =
    process.env.QR_FILE_SHARE_UPLOAD_TOKEN_MODE || "static"

const FILE_KIND_MAP = {
    archive: new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]),
    pdf: new Set(["pdf"]),
    audio: new Set(["mp3", "wav", "ogg", "flac", "m4a", "aac"]),
    picture: new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]),
    video: new Set(["mp4", "mov", "avi", "mkv", "webm"]),
    code: new Set([
        "js",
        "jsx",
        "ts",
        "tsx",
        "json",
        "html",
        "css",
        "py",
        "go",
        "rs",
        "java",
        "c",
        "cpp",
        "h",
        "sh",
        "yml",
        "yaml",
    ]),
    document: new Set(["txt", "md", "rtf", "doc", "docx", "odt"]),
}

function toSafeRelativePath(requestedPath = "") {
    return String(requestedPath)
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "")
}

function sanitizeFilename(filename = "") {
    return String(filename)
        .split(/[\\/]/)
        .pop()
        .replace(/^\.+$/, "file")
        .replace(/[<>:"|?*\u0000-\u001f]/g, "_")
}

function ensureInsideBaseDir(baseDir, requestedPath = "") {
    const resolvedBaseDir = path.resolve(baseDir)
    const safeRelativePath = toSafeRelativePath(requestedPath)
    const resolvedPath = path.resolve(resolvedBaseDir, safeRelativePath)
    const relativeToBase = path.relative(resolvedBaseDir, resolvedPath)

    if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
        const error = new Error("Requested path escapes the shared directory")
        error.code = "INVALID_PATH"
        throw error
    }

    return {
        relativePath: safeRelativePath,
        resolvedPath,
    }
}

function getRootLabel(baseDir) {
    return path.basename(baseDir) || "Shared files"
}

function createResolvedUploadToken({ uploadToken, uploadTokenMode }) {
    if (uploadToken) {
        return {
            value: uploadToken,
            mode: uploadTokenMode === "session" ? "session" : "static",
        }
    }

    if (uploadTokenMode === "session") {
        return {
            value: crypto.randomBytes(4).toString("hex"),
            mode: "session",
        }
    }

    return {
        value: "",
        mode: "none",
    }
}

function buildCapabilities({ readOnly, deleteEnabled, resolvedUploadToken }) {
    const uploadTokenRequired = Boolean(resolvedUploadToken.value)

    return {
        readOnly,
        deleteEnabled,
        uploadTokenRequired,
        uploadTokenMode: resolvedUploadToken.mode,
        shareMode: readOnly
            ? "read-only"
            : uploadTokenRequired
              ? resolvedUploadToken.mode === "session"
                  ? "session-token"
                  : "protected-upload"
              : "open-upload",
    }
}

function getSuppliedUploadToken(req) {
    const headerToken = req.get("x-upload-token")
    if (headerToken) {
        return headerToken
    }

    if (typeof req.body?.upload_token === "string") {
        return req.body.upload_token
    }

    return ""
}

function getParentPath(relativePath) {
    if (!relativePath) {
        return null
    }

    const parentPath = path.posix.dirname(relativePath.replace(/\\/g, "/"))
    return parentPath === "." ? "" : parentPath
}

function flattenUploadedFiles(fileMap) {
    if (!fileMap) {
        return []
    }

    return Object.values(fileMap).flatMap((value) =>
        Array.isArray(value) ? value : [value],
    )
}

function inferFileKind(name, isDirectory) {
    if (isDirectory) {
        return "folder"
    }

    const extension = name.includes(".")
        ? name.split(".").pop().toLowerCase()
        : ""
    for (const [kind, extensions] of Object.entries(FILE_KIND_MAP)) {
        if (extensions.has(extension)) {
            return kind
        }
    }

    return "file"
}

function logMutation(event, details = {}) {
    const suffix = Object.entries(details)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(" ")

    console.log(`[qr-file-share] ${event}${suffix ? " " + suffix : ""}`)
}

function isPrivateLanAddress(address) {
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(address)) {
        return true
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address)) {
        return true
    }

    const match = address.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
    return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

function getAddressPriority(details) {
    if (!details || details.family !== "IPv4" || details.internal) {
        return Number.POSITIVE_INFINITY
    }

    const interfaceName = String(details.name || "").toLowerCase()
    const address = details.address

    if (!isPrivateLanAddress(address)) {
        return 100
    }

    if (interfaceName.includes("tailscale")) {
        return 90
    }

    if (
        interfaceName.includes("docker") ||
        interfaceName.includes("wsl") ||
        interfaceName.includes("hyper-v") ||
        interfaceName.includes("vethernet") ||
        interfaceName.includes("virtual") ||
        interfaceName.includes("vmware")
    ) {
        return 80
    }

    if (/^192\.168\./.test(address)) {
        return 1
    }

    if (/^10\./.test(address)) {
        return 2
    }

    if (/^172\./.test(address)) {
        return 3
    }

    return 50
}

function selectListenAddresses(
    interfaces,
    { showAllAddresses = DEFAULT_SHOW_ALL_ADDRESSES } = {},
) {
    const addresses = []

    for (const [deviceName, entries] of Object.entries(interfaces)) {
        for (const details of entries || []) {
            if (details.family === "IPv4" && !details.internal) {
                addresses.push({
                    name: deviceName,
                    address: details.address,
                    family: details.family,
                    internal: details.internal,
                })
            }
        }
    }

    const uniqueAddresses = Array.from(
        new Map(
            addresses.map((details) => [details.address, details]),
        ).values(),
    )
    uniqueAddresses.sort(
        (left, right) => getAddressPriority(left) - getAddressPriority(right),
    )

    if (showAllAddresses) {
        return uniqueAddresses
    }

    const preferredAddress =
        uniqueAddresses.find((details) => getAddressPriority(details) < 80) ||
        uniqueAddresses[0]

    return preferredAddress ? [preferredAddress] : []
}

async function uniqueDestinationPath(directory, filename) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext) || "file"

    let attempt = 0
    while (true) {
        const candidateName =
            attempt === 0 ? `${baseName}${ext}` : `${baseName}_${attempt}${ext}`
        const candidatePath = path.join(directory, candidateName)

        try {
            await fs.promises.access(candidatePath)
            attempt += 1
        } catch {
            return {
                filename: candidateName,
                fullPath: candidatePath,
            }
        }
    }
}

async function addDirectoryToZip(
    zipFile,
    sourceDir,
    archiveRoot,
    compressionEnabled,
) {
    const entries = await fs.promises.readdir(sourceDir, {
        withFileTypes: true,
    })

    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name)
        const archivePath = path.posix.join(archiveRoot, entry.name)

        if (entry.isDirectory()) {
            zipFile.addEmptyDirectory(archivePath)
            await addDirectoryToZip(
                zipFile,
                sourcePath,
                archivePath,
                compressionEnabled,
            )
        } else if (entry.isFile()) {
            zipFile.addFile(sourcePath, archivePath, {
                compress: compressionEnabled,
            })
        }
    }
}

function logServerAddresses(port, capabilities, resolvedUploadToken) {
    const interfaces = os.networkInterfaces()
    const addresses = selectListenAddresses(interfaces)

    if (addresses.length === 0) {
        console.log("Server listening on port:", port)
    }

    for (const details of addresses) {
        const fullAddress = `http://${details.address}:${port}`
        // console.log("Server listening on port:", port)
        console.log("Scan QR code or go to " + fullAddress)
        qrcode.generate(fullAddress)
        console.log("\n")
    }

    if (!DEFAULT_SHOW_ALL_ADDRESSES && addresses.length === 1) {
        console.log(
            "[qr-file-share] set QR_FILE_SHARE_SHOW_ALL_ADDRESSES=true to list every interface",
        )
    }

    console.log(`[qr-file-share] share_mode=${capabilities.shareMode}`)
    if (resolvedUploadToken.mode === "session") {
        console.log(
            `[qr-file-share] session_upload_token=${resolvedUploadToken.value}`,
        )
    }
}

function createEntry(relativePath, entry, stats) {
    const entryRelativePath = relativePath
        ? path.posix.join(relativePath, entry.name)
        : entry.name

    return {
        name: entry.name,
        path: entryRelativePath,
        isDirectory: entry.isDirectory(),
        kind: inferFileKind(entry.name, entry.isDirectory()),
        size: entry.isDirectory() ? null : stats.size,
        modifiedAt: stats.mtime.toISOString(),
    }
}

function createApp({
    base_path,
    compression,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
    maxFilesPerUpload = DEFAULT_MAX_FILES_PER_UPLOAD,
    tempUploadDir = DEFAULT_TEMP_UPLOAD_DIR,
    readOnly = DEFAULT_READ_ONLY,
    deleteEnabled = DEFAULT_DELETE_ENABLED,
    uploadToken = DEFAULT_UPLOAD_TOKEN,
    uploadTokenMode = DEFAULT_UPLOAD_TOKEN_MODE,
}) {
    const app = express()
    const baseDir = path.resolve(base_path || process.cwd())
    const resolvedTempUploadDir = path.resolve(tempUploadDir)
    const resolvedUploadToken = createResolvedUploadToken({
        uploadToken,
        uploadTokenMode,
    })
    const capabilities = buildCapabilities({
        readOnly,
        deleteEnabled,
        resolvedUploadToken,
    })

    fs.mkdirSync(resolvedTempUploadDir, { recursive: true })

    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    app.use(
        fileUpload({
            useTempFiles: true,
            tempFileDir: resolvedTempUploadDir,
            abortOnLimit: true,
            limits: {
                fileSize: maxFileSizeBytes,
                files: maxFilesPerUpload,
            },
        }),
    )

    app.get("/api/files", async (req, res) => {
        try {
            const { relativePath, resolvedPath } = ensureInsideBaseDir(
                baseDir,
                req.query.path,
            )
            const entries = await fs.promises.readdir(resolvedPath, {
                withFileTypes: true,
            })
            const detailedEntries = await Promise.all(
                entries
                    .filter((entry) => !entry.name.startsWith("."))
                    .map(async (entry) => {
                        const entryPath = path.join(resolvedPath, entry.name)
                        const stats = await fs.promises.stat(entryPath)
                        return createEntry(relativePath, entry, stats)
                    }),
            )

            detailedEntries.sort((left, right) => {
                if (left.isDirectory !== right.isDirectory) {
                    return left.isDirectory ? -1 : 1
                }
                return left.name.localeCompare(right.name)
            })

            return res.send({
                rootLabel: getRootLabel(baseDir),
                currentPath: relativePath,
                parentPath: getParentPath(relativePath),
                entries: detailedEntries,
                capabilities,
            })
        } catch (error) {
            if (error.code === "INVALID_PATH") {
                return res.status(403).send("Can't go back up path")
            }
            if (error.code === "ENOENT" || error.code === "ENOTDIR") {
                return res.sendStatus(404)
            }
            console.error("error browsing files", error)
            return res.sendStatus(500)
        }
    })

    app.get("/api/download", async (req, res) => {
        try {
            const { resolvedPath } = ensureInsideBaseDir(
                baseDir,
                req.query.file,
            )
            const stats = await fs.promises.stat(resolvedPath)

            if (stats.isDirectory()) {
                return res
                    .status(400)
                    .send("Use /api/downloadDir for directories")
            }

            return res.download(resolvedPath)
        } catch (error) {
            if (error.code === "INVALID_PATH") {
                return res.status(403).send("Can't go back up path")
            }
            if (error.code === "ENOENT") {
                return res.sendStatus(404)
            }
            console.error("error downloading file", error)
            return res.sendStatus(500)
        }
    })

    app.get("/api/downloadDir", async (req, res) => {
        try {
            const { relativePath, resolvedPath } = ensureInsideBaseDir(
                baseDir,
                req.query.dir,
            )
            const stats = await fs.promises.stat(resolvedPath)

            if (!stats.isDirectory()) {
                return res.status(400).send("Requested path is not a directory")
            }

            const archiveRoot = path.basename(
                relativePath || getRootLabel(baseDir),
            )
            const downloadName = `${archiveRoot}.zip`
            const zipFile = new yazl.ZipFile()

            res.attachment(downloadName)
            zipFile.outputStream.on("error", (error) => {
                console.error("zip stream error", error)
                if (!res.headersSent) {
                    res.sendStatus(500)
                } else {
                    res.destroy(error)
                }
            })
            zipFile.outputStream.pipe(res)
            zipFile.addEmptyDirectory(archiveRoot)
            await addDirectoryToZip(
                zipFile,
                resolvedPath,
                archiveRoot,
                compression !== 0,
            )
            zipFile.end()
        } catch (error) {
            if (error.code === "INVALID_PATH") {
                return res.status(403).send("Can't go back up path")
            }
            if (error.code === "ENOENT") {
                return res.sendStatus(404)
            }
            console.error("error downloading directory", error)
            return res.sendStatus(500)
        }
    })

    app.post("/api/upload", async (req, res) => {
        try {
            if (readOnly) {
                logMutation("upload_rejected", { reason: "read_only" })
                return res.status(403).send({
                    status: false,
                    message: "This share is read-only. Uploads are disabled.",
                })
            }

            if (
                resolvedUploadToken.value &&
                getSuppliedUploadToken(req) !== resolvedUploadToken.value
            ) {
                logMutation("upload_rejected", { reason: "invalid_token" })
                return res.status(403).send({
                    status: false,
                    message: "Upload token required.",
                })
            }

            if (!req.files || !req.files.file) {
                return res.status(400).send({
                    status: false,
                    message: "No file uploaded",
                })
            }

            const { resolvedPath: destinationDir } = ensureInsideBaseDir(
                baseDir,
                req.body.rel_dir,
            )
            const destinationStats = await fs.promises.stat(destinationDir)

            if (!destinationStats.isDirectory()) {
                return res.status(400).send({
                    status: false,
                    message: "Upload target must be a directory",
                })
            }

            const files = flattenUploadedFiles(req.files)

            if (files.length > maxFilesPerUpload) {
                return res.status(413).send({
                    status: false,
                    message: `Too many files in one upload. Limit is ${maxFilesPerUpload}.`,
                })
            }

            const uploadedFiles = await Promise.all(
                files.map(async (file) => {
                    const safeFilename = sanitizeFilename(file.name)
                    const { filename, fullPath } = await uniqueDestinationPath(
                        destinationDir,
                        safeFilename,
                    )
                    await file.mv(fullPath)
                    const stats = await fs.promises.stat(fullPath)

                    return {
                        name: filename,
                        originalName: file.name,
                        path: req.body.rel_dir
                            ? path.posix.join(
                                  toSafeRelativePath(req.body.rel_dir),
                                  filename,
                              )
                            : filename,
                        isDirectory: false,
                        kind: inferFileKind(filename, false),
                        size: stats.size,
                        modifiedAt: stats.mtime.toISOString(),
                    }
                }),
            )

            logMutation("upload", {
                files: uploadedFiles.map((file) => file.path),
            })

            return res.send({
                status: true,
                message:
                    uploadedFiles.length > 1
                        ? "Files uploaded successfully."
                        : "File uploaded successfully.",
                data: uploadedFiles,
            })
        } catch (error) {
            if (error.code === "INVALID_PATH") {
                return res.status(403).send("Can't go back up path")
            }
            if (error.code === "ENOENT") {
                return res.sendStatus(404)
            }
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).send({
                    status: false,
                    message: `File exceeds the size limit of ${Math.round(maxFileSizeBytes / (1024 * 1024))} MB.`,
                })
            }
            console.error("upload error", error)
            return res.status(500).send({
                status: false,
                message: "Upload failed.",
            })
        }
    })

    app.delete("/api/files", async (req, res) => {
        try {
            if (readOnly) {
                logMutation("delete_rejected", { reason: "read_only" })
                return res.status(403).send({
                    status: false,
                    message: "This share is read-only. Deletions are disabled.",
                })
            }

            if (!deleteEnabled) {
                logMutation("delete_rejected", { reason: "disabled" })
                return res.status(403).send({
                    status: false,
                    message: "Deletion is disabled for this share.",
                })
            }

            if (
                resolvedUploadToken.value &&
                getSuppliedUploadToken(req) !== resolvedUploadToken.value
            ) {
                logMutation("delete_rejected", { reason: "invalid_token" })
                return res.status(403).send({
                    status: false,
                    message: "Upload token required.",
                })
            }

            const requestedPath = req.body?.path || req.query?.path
            const { relativePath, resolvedPath } = ensureInsideBaseDir(
                baseDir,
                requestedPath,
            )
            const stats = await fs.promises.stat(resolvedPath)

            if (stats.isDirectory()) {
                await fs.promises.rm(resolvedPath, {
                    recursive: true,
                    force: true,
                })
            } else {
                await fs.promises.unlink(resolvedPath)
            }

            logMutation("delete", { path: relativePath })

            return res.send({
                status: true,
                message: `${stats.isDirectory() ? "Folder" : "File"} deleted successfully.`,
            })
        } catch (error) {
            if (error.code === "INVALID_PATH") {
                return res.status(403).send("Can't go back up path")
            }
            if (error.code === "ENOENT") {
                return res.sendStatus(404)
            }
            console.error("delete error", error)
            return res.status(500).send({
                status: false,
                message: "Delete failed.",
            })
        }
    })

    app.get("/api/baseDir", (req, res) => {
        res.send({
            rootLabel: getRootLabel(baseDir),
            capabilities,
        })
    })

    app.use(express.static(CLIENT_DIST_DIR))

    app.use((req, res, next) => {
        if (req.path.startsWith("/api/")) {
            return next()
        }

        if (!fs.existsSync(CLIENT_DIST_DIR)) {
            return res.status(404).send("Client build not found")
        }

        return res.sendFile(path.join(CLIENT_DIST_DIR, "index.html"))
    })

    return app
}

function startServer({ base_path, compression, port }) {
    const resolvedUploadToken = createResolvedUploadToken({
        uploadToken: DEFAULT_UPLOAD_TOKEN,
        uploadTokenMode: DEFAULT_UPLOAD_TOKEN_MODE,
    })
    const capabilities = buildCapabilities({
        readOnly: DEFAULT_READ_ONLY,
        deleteEnabled: DEFAULT_DELETE_ENABLED,
        resolvedUploadToken,
    })

    const app = createApp({
        base_path,
        compression,
        readOnly: DEFAULT_READ_ONLY,
        deleteEnabled: DEFAULT_DELETE_ENABLED,
        uploadToken: resolvedUploadToken.value,
        uploadTokenMode: resolvedUploadToken.mode,
    })

    const server = app.listen(port, () => {
        logServerAddresses(port, capabilities, resolvedUploadToken)
    })

    server.requestTimeout = DEFAULT_REQUEST_TIMEOUT_MS
    server.headersTimeout = DEFAULT_REQUEST_TIMEOUT_MS + 1000

    return server
}

module.exports = startServer
module.exports.createApp = createApp
module.exports.startServer = startServer
module.exports.selectListenAddresses = selectListenAddresses
