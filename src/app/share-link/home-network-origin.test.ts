import { describe, expect, it } from "vitest";
import { isHomeNetworkOrigin } from "./home-network-origin";

describe("isHomeNetworkOrigin (SHARE_LINK.md, In the app: Home network note)", () => {
  it.each([
    { origin: "http://photos.example.org", why: "plain http" },
    { origin: "https://localhost:5173", why: "localhost" },
    { origin: "https://glissando.localhost", why: "a name under localhost" },
    { origin: "https://nas.local", why: "a .local name" },
    { origin: "https://glissando.home.lan", why: "a .lan name" },
    { origin: "https://GLISSANDO.LAN", why: "a .lan name in capitals" },
    { origin: "https://10.0.0.5", why: "a private 10.x address" },
    { origin: "https://172.16.0.1", why: "the first private 172.16–31 address" },
    { origin: "https://172.31.255.254", why: "the last private 172.16–31 address" },
    { origin: "https://192.168.1.20:8443", why: "a private 192.168 address" },
    { origin: "https://127.0.0.1", why: "an IPv4 loopback" },
    { origin: "https://169.254.10.1", why: "an IPv4 link-local" },
    { origin: "https://[::1]", why: "the IPv6 loopback" },
    { origin: "https://[fd12:3456::1]", why: "an IPv6 unique local address" },
    { origin: "https://[fc00::1]", why: "an IPv6 unique local address under fc" },
    { origin: "https://[fe80::1]", why: "an IPv6 link-local" },
  ])("counts $origin as a home network address: $why", ({ origin }) => {
    expect(isHomeNetworkOrigin(origin)).toBe(true);
  });

  it.each([
    { origin: "https://photos.example.org", why: "a public name over https" },
    { origin: "https://photos.example.org:8443", why: "a public name on another port" },
    { origin: "https://local.example.org", why: "a name that only starts with local" },
    { origin: "https://example.lan.org", why: "lan inside, not at the end" },
    { origin: "https://172.15.0.1", why: "just below 172.16" },
    { origin: "https://172.32.0.1", why: "just above 172.31" },
    { origin: "https://8.8.8.8", why: "a public IPv4 address" },
    { origin: "https://11.0.0.1", why: "just past 10.x" },
    { origin: "https://[2001:db8::1]", why: "a global IPv6 address" },
  ])("counts $origin as public: $why", ({ origin }) => {
    expect(isHomeNetworkOrigin(origin)).toBe(false);
  });

  it("refuses something that is not an origin, naming it", () => {
    expect(() => isHomeNetworkOrigin("not an origin")).toThrow(/not an origin/);
  });
});
