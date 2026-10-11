/**
 * Whether the app is open at an address only the home network reaches (share_link/IN_THE_APP.md):
 * a link made there would not work for someone elsewhere.
 */
export function isHomeNetworkOrigin(origin: string): boolean {
  const url = parseOrigin(origin);
  if (url.protocol === PLAIN_HTTP) return true;
  const host = url.hostname.toLowerCase();
  if (HOME_NAMES.some((name) => host === name || host.endsWith(`.${name}`))) return true;
  if (host.startsWith(IPV6_BRACKET)) return isHomeIpv6(host.slice(1, -1));
  const ipv4 = parseIpv4(host);
  return ipv4 !== null && HOME_IPV4_RANGES.some((range) => inIpv4Range(ipv4, range));
}

const PLAIN_HTTP = "http:";
/** `localhost`, the names home routers and mDNS hand out, and home.arpa (RFC 8375). */
const HOME_NAMES: readonly string[] = ["localhost", "local", "lan", "home.arpa"];
const IPV6_BRACKET = "[";

interface Ipv4Range {
  readonly first: readonly [number, number];
  /** How many leading bits of the address are fixed. */
  readonly prefixLength: number;
}

/** Private (RFC 1918), shared CGNAT (RFC 6598, e.g. Tailscale's), loopback and link-local. */
const HOME_IPV4_RANGES: readonly Ipv4Range[] = [
  { first: [10, 0], prefixLength: 8 },
  { first: [172, 16], prefixLength: 12 },
  { first: [192, 168], prefixLength: 16 },
  { first: [100, 64], prefixLength: 10 },
  { first: [127, 0], prefixLength: 8 },
  { first: [169, 254], prefixLength: 16 },
];

const BITS_PER_OCTET = 8;
const OCTET_COUNT = 4;
const MAX_OCTET = 255;

function parseOrigin(origin: string): URL {
  try {
    return new URL(origin);
  } catch (error) {
    throw new Error(`"${origin}" is not an origin; pass the app's location.origin`, {
      cause: error,
    });
  }
}

/** The address's first sixteen bits, or null for a name; the URL parser normalises IPv4. */
function parseIpv4(host: string): readonly [number, number] | null {
  const octets = host.split(".").map(Number);
  if (octets.length !== OCTET_COUNT) return null;
  if (!octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= MAX_OCTET)) {
    return null;
  }
  const [first = 0, second = 0] = octets;
  return [first, second];
}

function inIpv4Range([first, second]: readonly [number, number], range: Ipv4Range): boolean {
  const leading = (first << BITS_PER_OCTET) | second;
  const rangeLeading = (range.first[0] << BITS_PER_OCTET) | range.first[1];
  const shift = 2 * BITS_PER_OCTET - range.prefixLength;
  return leading >> shift === rangeLeading >> shift;
}

const IPV6_LOOPBACK = "::1";
/** fc00::/7: unique local addresses. */
const IPV6_UNIQUE_LOCAL = /^f[cd][0-9a-f]{0,2}:/;
/** fe80::/10: link-local. */
const IPV6_LINK_LOCAL = /^fe[89ab][0-9a-f]?:/;

function isHomeIpv6(address: string): boolean {
  return (
    address === IPV6_LOOPBACK || IPV6_UNIQUE_LOCAL.test(address) || IPV6_LINK_LOCAL.test(address)
  );
}
