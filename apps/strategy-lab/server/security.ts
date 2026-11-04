// Request admission: client-address allowlist (loopback + Tailscale by default), Host-header allowlist (against DNS
// rebinding), and the bearer token. No cookies are used, so cross-site requests cannot ride on a session (no CSRF), and
// no CORS headers are sent, so other origins cannot read responses.

import { timingSafeEqual } from 'node:crypto';
import { BlockList, isIP } from 'node:net';

export function makeClientAllowlist(cidrs: readonly string[]): BlockList {
  const bl = new BlockList();
  for (const c of cidrs) {
    const [addr, bits] = c.split('/');
    const type = isIP(addr ?? '') === 6 ? 'ipv6' : 'ipv4';
    if (!addr || !isIP(addr)) throw new Error(`invalid CIDR ${c}`);
    bl.addSubnet(addr, Number(bits ?? (type === 'ipv6' ? 128 : 32)), type);
  }
  return bl;
}

export function clientAllowed(list: BlockList, remote: string | undefined): boolean {
  if (!remote) return false;
  const addr = remote.startsWith('::ffff:') ? remote.slice(7) : remote;
  const type = isIP(addr) === 6 ? 'ipv6' : 'ipv4';
  return isIP(addr) !== 0 && list.check(addr, type);
}

/** Host header without the port; also accepts any `*.ts.net` MagicDNS name. */
export function hostAllowed(allowed: readonly string[], host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.replace(/:\d+$/, '');
  const lower = name.toLowerCase();
  return allowed.includes(lower) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.ts\.net$/.test(lower);
}

export function tokenMatches(expected: string | null, header: string | undefined): boolean {
  if (expected === null) return true; // loopback-only server without a token
  const m = /^Bearer (.+)$/.exec(header ?? '');
  if (!m) return false;
  const a = Buffer.from(m[1]!);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
