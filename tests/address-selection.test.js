const test = require("node:test")
const assert = require("node:assert/strict")

const { selectListenAddresses } = require("../server")

test("prefers a typical private LAN address over virtual adapters by default", () => {
    const addresses = selectListenAddresses({
        "vEthernet (WSL)": [{ family: "IPv4", internal: false, address: "172.21.80.1" }],
        Ethernet: [{ family: "IPv4", internal: false, address: "192.168.1.16" }],
        tailscale0: [{ family: "IPv4", internal: false, address: "100.75.241.120" }],
    })

    assert.deepEqual(addresses.map((details) => details.address), ["192.168.1.16"])
})

test("can return all addresses when explicitly enabled", () => {
    const addresses = selectListenAddresses({
        Ethernet: [{ family: "IPv4", internal: false, address: "192.168.1.16" }],
        "vEthernet (WSL)": [{ family: "IPv4", internal: false, address: "172.21.80.1" }],
        tailscale0: [{ family: "IPv4", internal: false, address: "100.75.241.120" }],
    }, { showAllAddresses: true })

    assert.deepEqual(addresses.map((details) => details.address), [
        "192.168.1.16",
        "172.21.80.1",
        "100.75.241.120",
    ])
})
