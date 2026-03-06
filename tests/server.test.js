const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const request = require("supertest")

const { createApp } = require("../server")

async function makeTestContext(overrides = {}) {
    const baseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "qr-file-share-"))
    const defaultTempUploadDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "qr-file-share-temp-"))
    const tempUploadDir = overrides.tempUploadDir || defaultTempUploadDir
    await fs.promises.mkdir(path.join(baseDir, "docs"))
    await fs.promises.writeFile(path.join(baseDir, "hello.txt"), "hello world")
    await fs.promises.writeFile(path.join(baseDir, "movie.mp4"), "fake video")
    await fs.promises.writeFile(path.join(baseDir, "photo.png"), "fake image")
    await fs.promises.writeFile(path.join(baseDir, "docs", "readme.txt"), "nested file")

    const app = createApp({
        base_path: baseDir,
        compression: 0,
        maxFileSizeBytes: 1024 * 1024,
        maxFilesPerUpload: 2,
        tempUploadDir,
        ...overrides,
    })

    return {
        app,
        baseDir,
        tempUploadDir,
        async cleanup() {
            await fs.promises.rm(baseDir, { recursive: true, force: true })
            await fs.promises.rm(tempUploadDir, { recursive: true, force: true })
        },
    }
}

test("lists visible files and directories with metadata", async () => {
    const context = await makeTestContext()

    try {
        const response = await request(context.app)
            .get("/api/files")
            .expect(200)

        assert.equal(response.body.rootLabel, path.basename(context.baseDir))
        assert.equal(response.body.currentPath, "")
        assert.equal(response.body.parentPath, null)
        assert.deepEqual(response.body.capabilities, {
            readOnly: false,
            deleteEnabled: false,
            uploadTokenRequired: false,
            uploadTokenMode: "none",
            shareMode: "open-upload",
        })
        assert.deepEqual(response.body.entries.map((entry) => ({
            name: entry.name,
            isDirectory: entry.isDirectory,
            kind: entry.kind,
        })), [
            { name: "docs", isDirectory: true, kind: "folder" },
            { name: "hello.txt", isDirectory: false, kind: "document" },
            { name: "movie.mp4", isDirectory: false, kind: "video" },
            { name: "photo.png", isDirectory: false, kind: "picture" },
        ])
        assert.equal(typeof response.body.entries[1].size, "number")
        assert.match(response.body.entries[1].modifiedAt, /^\d{4}-\d{2}-\d{2}T/)
    } finally {
        await context.cleanup()
    }
})

test("does not expose the absolute base directory path", async () => {
    const context = await makeTestContext()

    try {
        const response = await request(context.app)
            .get("/api/baseDir")
            .expect(200)

        assert.deepEqual(response.body, {
            rootLabel: path.basename(context.baseDir),
            capabilities: {
                readOnly: false,
                deleteEnabled: false,
                uploadTokenRequired: false,
                uploadTokenMode: "none",
                shareMode: "open-upload",
            },
        })
    } finally {
        await context.cleanup()
    }
})

test("rejects path traversal when downloading files", async () => {
    const context = await makeTestContext()

    try {
        await request(context.app)
            .get("/api/download")
            .query({ file: "../../etc/passwd" })
            .expect(403)
    } finally {
        await context.cleanup()
    }
})

test("downloads a shared file from inside the base directory", async () => {
    const context = await makeTestContext()

    try {
        const response = await request(context.app)
            .get("/api/download")
            .query({ file: "hello.txt" })
            .expect(200)

        assert.equal(response.text, "hello world")
    } finally {
        await context.cleanup()
    }
})

test("uploads files into the requested directory and sanitizes filenames", async () => {
    const context = await makeTestContext()

    try {
        const response = await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "docs")
            .attach("file", Buffer.from("uploaded text"), "../unsafe.txt")
            .expect(200)

        assert.equal(response.body.status, true)
        assert.equal(response.body.data[0].name, "unsafe.txt")

        const uploadedFile = await fs.promises.readFile(path.join(context.baseDir, "docs", "unsafe.txt"), "utf8")
        assert.equal(uploadedFile, "uploaded text")
    } finally {
        await context.cleanup()
    }
})

test("uploads can use a custom temp upload directory", async () => {
    const context = await makeTestContext({
        tempUploadDir: path.join(os.tmpdir(), "qr-file-share-custom-temp", `run-${Date.now()}`),
    })

    try {
        const response = await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "")
            .attach("file", Buffer.from("custom temp"), "custom-temp.txt")
            .expect(200)

        assert.equal(response.body.status, true)

        const uploadedFile = await fs.promises.readFile(path.join(context.baseDir, "custom-temp.txt"), "utf8")
        assert.equal(uploadedFile, "custom temp")

        const tempDirStats = await fs.promises.stat(context.tempUploadDir)
        assert.equal(tempDirStats.isDirectory(), true)
    } finally {
        await context.cleanup()
    }
})

test("rejects path traversal when uploading files", async () => {
    const context = await makeTestContext()
    const escapedTarget = path.join(path.dirname(context.baseDir), "escaped.txt")

    try {
        await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "../../")
            .attach("file", Buffer.from("blocked"), "escaped.txt")
            .expect(403)

        await assert.rejects(fs.promises.access(escapedTarget), /ENOENT/)
    } finally {
        await context.cleanup()
    }
})

test("enforces upload size limits", async () => {
    const context = await makeTestContext({
        maxFileSizeBytes: 4,
    })

    try {
        await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "")
            .attach("file", Buffer.from("toolarge"), "too-large.txt")
            .expect(413)
    } finally {
        await context.cleanup()
    }
})

test("rejects uploads in read-only mode", async () => {
    const context = await makeTestContext({
        readOnly: true,
    })

    try {
        const response = await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "")
            .attach("file", Buffer.from("blocked"), "blocked.txt")
            .expect(403)

        assert.equal(response.body.status, false)
        assert.match(response.body.message, /read-only/i)
    } finally {
        await context.cleanup()
    }
})

test("requires an upload token when configured", async () => {
    const context = await makeTestContext({
        uploadToken: "secret-token",
    })

    try {
        await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "")
            .attach("file", Buffer.from("blocked"), "blocked.txt")
            .expect(403)

        const response = await request(context.app)
            .post("/api/upload")
            .field("rel_dir", "")
            .field("upload_token", "secret-token")
            .attach("file", Buffer.from("allowed"), "allowed.txt")
            .expect(200)

        assert.equal(response.body.status, true)
        const uploadedFile = await fs.promises.readFile(path.join(context.baseDir, "allowed.txt"), "utf8")
        assert.equal(uploadedFile, "allowed")
    } finally {
        await context.cleanup()
    }
})

test("generates a session upload token when configured", async () => {
    const context = await makeTestContext({
        uploadTokenMode: "session",
    })

    try {
        const response = await request(context.app)
            .get("/api/files")
            .expect(200)

        assert.equal(response.body.capabilities.uploadTokenRequired, true)
        assert.equal(response.body.capabilities.uploadTokenMode, "session")
        assert.equal(response.body.capabilities.shareMode, "session-token")
    } finally {
        await context.cleanup()
    }
})

test("deletes files when mutations are allowed", async () => {
    const context = await makeTestContext({
        deleteEnabled: true,
    })

    try {
        const response = await request(context.app)
            .delete("/api/files")
            .send({ path: "hello.txt" })
            .expect(200)

        assert.equal(response.body.status, true)
        await assert.rejects(
            fs.promises.access(path.join(context.baseDir, "hello.txt")),
            /ENOENT/
        )
    } finally {
        await context.cleanup()
    }
})

test("rejects deletes in read-only mode", async () => {
    const context = await makeTestContext({
        readOnly: true,
        deleteEnabled: true,
    })

    try {
        await request(context.app)
            .delete("/api/files")
            .send({ path: "hello.txt" })
            .expect(403)
    } finally {
        await context.cleanup()
    }
})

test("rejects deletes when delete support is disabled", async () => {
    const context = await makeTestContext()

    try {
        const response = await request(context.app)
            .delete("/api/files")
            .send({ path: "hello.txt" })
            .expect(403)

        assert.equal(response.body.status, false)
        assert.match(response.body.message, /disabled/i)
    } finally {
        await context.cleanup()
    }
})

test("requires token for deletes when uploads are protected", async () => {
    const context = await makeTestContext({
        deleteEnabled: true,
        uploadToken: "secret-token",
    })

    try {
        await request(context.app)
            .delete("/api/files")
            .send({ path: "hello.txt" })
            .expect(403)

        await request(context.app)
            .delete("/api/files")
            .send({ path: "hello.txt", upload_token: "secret-token" })
            .expect(200)
    } finally {
        await context.cleanup()
    }
})
