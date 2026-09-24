// SPDX-License-Identifier: GPL-2.0-or-later
function csvRows(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Incomplete server directory. Please refresh.');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
function publicIPv4(ip) {
  const a = ip.split('.').map(Number);
  return /^\d+\.\d+\.\d+\.\d+$/.test(ip) && a.length === 4 && a.every(n => n >= 0 && n <= 255) &&
    ![0,10,127].includes(a[0]) && a[0] < 224 && !(a[0] === 169 && a[1] === 254) &&
    !(a[0] === 172 && a[1] >= 16 && a[1] <= 31) && !(a[0] === 192 && a[1] === 168) &&
    !(a[0] === 100 && a[1] >= 64 && a[1] <= 127);
}
function parseDirectory(text) {
  if (text.length > 12 * 1024 * 1024) throw new Error('Server directory is too large.');
  const rows = csvRows(text);
  const h = rows.findIndex(r => r[0] === '#HostName');
  if (h < 0) throw new Error('VPN Gate returned an invalid directory. Try again later.');
  const keys = rows[h]; const value = (r,k) => r[keys.indexOf(k)] || '';
  const seen = new Set(), servers = [];
  for (const r of rows.slice(h + 1)) {
    const ip = value(r,'IP'), config = value(r,'OpenVPN_ConfigData_Base64');
    if (!publicIPv4(ip) || seen.has(ip) || config.length < 100 || config.length > 100000 || !/^[A-Za-z0-9+/=]+$/.test(config)) continue;
    // Respect relays whose operators explicitly limit them to academic use.
    if (/academic use only/i.test(value(r,'Operator') + ' ' + value(r,'Message'))) continue;
    seen.add(ip);
    servers.push({id:value(r,'#HostName'),ip,country:value(r,'CountryLong') || 'Unknown',code:value(r,'CountryShort'),
      ping:Number(value(r,'Ping')) || 9999, speed:Math.max(0,Number(value(r,'Speed')) || 0),
      sessions:Math.max(0,Number(value(r,'NumVpnSessions')) || 0),score:Number(value(r,'Score')) || 0,config});
  }
  servers.sort((a,b)=>b.score-a.score);
  if (!servers.length) throw new Error('No suitable OpenVPN relays are available. Please refresh later.');
  return servers;
}
function makeConfig(raw, server) {
  if (!publicIPv4(server.ip)) throw new Error('Invalid relay address.');
  const blocks = {};
  for (const tag of ['ca','cert','key']) {
    const found = raw.match(new RegExp('<'+tag+'>[\\s\\S]*?</'+tag+'>','i'));
    if (found) blocks[tag] = found[0];
  }
  if (!blocks.ca || !blocks.ca.includes('BEGIN CERTIFICATE')) throw new Error('Relay has no CA certificate.');
  const remote = raw.match(/^remote\s+(\S+)\s+(\d+)\s*$/m);
  if (!remote || remote[1] !== server.ip || +remote[2] < 1 || +remote[2] > 65535) throw new Error('Relay address does not match its configuration.');
  const proto = raw.match(/^proto\s+(tcp|tcp-client|udp)\s*$/m)?.[1];
  if (!proto) throw new Error('Unsupported VPN protocol.');
  const cipher = raw.match(/^cipher\s+(AES-(?:128|192|256)-(?:CBC|GCM))\s*$/m)?.[1];
  if (!cipher) throw new Error('Relay uses an unsupported cipher. Choose another server.');
  const auth = raw.match(/^auth\s+(SHA1|SHA256|SHA384|SHA512)\s*$/m)?.[1] || 'SHA256';
  // Reconstruct a small, known configuration; never execute directives from a relay.
  return ['client','dev tun','proto '+proto,'remote '+server.ip+' '+remote[2], 'nobind','persist-key','persist-tun',
    'resolv-retry 15','connect-timeout 12','connect-retry-max 2','remote-cert-tls server','tls-version-min 1.2',
    'cipher '+cipher,'data-ciphers AES-256-GCM:AES-128-GCM:'+cipher,'data-ciphers-fallback '+cipher,'auth '+auth,
    'redirect-gateway def1','dhcp-option DNS 1.1.1.1','dhcp-option DNS 9.9.9.9','verb 3',
    blocks.ca, blocks.cert || '', blocks.key || ''].join('\n')+'\n';
}
function stateLabel(state) { return ['Disconnected','Connecting','Connected','Disconnecting'][state] || 'Connection interrupted'; }
module.exports = {csvRows, publicIPv4, parseDirectory, makeConfig, stateLabel};
