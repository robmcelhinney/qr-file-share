const { test, expect } = require("@playwright/test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const { createApp } = require("../../server")

let server
let baseDir
let fixtureDir
let uploadFixturePath
let baseUrl

test.beforeAll(async () => {
    baseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "qr-file-share-browser-"))
    fixtureDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "qr-file-share-browser-fixture-"))
    await fs.promises.mkdir(path.join(baseDir, "docs"))
    await fs.promises.writeFile(path.join(baseDir, "hello.txt"), "hello world")
    await fs.promises.writeFile(path.join(baseDir, "docs", "readme.txt"), "nested file")

    uploadFixturePath = path.join(fixtureDir, "upload-from-browser.txt")
    await fs.promises.writeFile(uploadFixturePath, "uploaded via browser smoke test")

    const app = createApp({
        base_path: baseDir,
        compression: 0,
        deleteEnabled: true,
    })

    server = await new Promise((resolve) => {
        const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer))
    })

    const address = server.address()
    baseUrl = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error)
                    return
                }
                resolve()
            })
        })
    }

    if (baseDir) {
        await fs.promises.rm(baseDir, { recursive: true, force: true })
    }

    if (fixtureDir) {
        await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    }
})

test("browse, upload, sort, copy current link, and delete", async ({ browser }) => {
    const context = await browser.newContext()
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    const page = await context.newPage()

    page.on("dialog", (dialog) => dialog.accept())

    await page.goto(baseUrl)

    await expect(page.getByRole("heading", { name: path.basename(baseDir) })).toBeVisible()
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(uploadFixturePath)
    await expect(page.getByText("File uploaded successfully.")).toBeVisible()
    await expect(page.getByRole("link", { name: "upload-from-browser.txt", exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Modified" }).click()
    await expect(page.getByRole("button", { name: "Modified" })).toContainText("↓")

    await page.getByRole("button", { name: "Copy link" }).click()
    await expect(page.getByText("Current folder link copied.")).toBeVisible()

    const uploadedRow = page.locator(".file-row").filter({
        has: page.getByRole("link", { name: "upload-from-browser.txt", exact: true }),
    })
    await uploadedRow.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByText("File deleted successfully.")).toBeVisible()
    await expect(page.getByRole("link", { name: "upload-from-browser.txt", exact: true })).toHaveCount(0)

    assert.ok(await fs.promises.stat(path.join(baseDir, "hello.txt")))
    await context.close()
})
