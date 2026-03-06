const { defineConfig } = require("@playwright/test")

module.exports = defineConfig({
    testDir: "./tests/browser",
    timeout: 30_000,
    fullyParallel: false,
    reporter: "list",
    use: {
        headless: true,
    },
})
