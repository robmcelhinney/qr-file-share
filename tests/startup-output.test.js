const test = require("node:test")
const assert = require("node:assert/strict")

const { getStartupMutationSummary } = require("../server")

test("startup summary reflects open uploads with deletes disabled", () => {
    assert.equal(
        getStartupMutationSummary({
            readOnly: false,
            uploadTokenRequired: false,
            deleteEnabled: false,
        }),
        "uploads enabled, deletes disabled",
    )
})

test("startup summary reflects token-protected mutations", () => {
    assert.equal(
        getStartupMutationSummary({
            readOnly: false,
            uploadTokenRequired: true,
            deleteEnabled: true,
        }),
        "token required for uploads and deletes",
    )
})
