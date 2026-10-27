/**
 * Serverseitiger ZEFIX-Proxy für den Vite Dev- und Preview-Server.
 *
 * Der Browser ruft /api/zefix/... auf, der Server stellt eine eigene Anfrage an zefix.ch.
 * Es werden bewusst keine Browser-Header (Cookies, Origin, Referer) weitergereicht und der
 * Client identifiziert sich offen als Prototyp. In der Zielumgebung ersetzt das Backend mit der
 * offiziellen ZEFIX Public REST API diesen Proxy.
 */
import type { Connect, Plugin } from 'vite';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const TARGET = 'https://www.zefix.ch/ZefixREST/api/v1';
const PREFIX = '/api/zefix';
const ALLOWED = [/^\/firm\/search\.json$/, /^\/firm\/\d+\.json$/];

const outbound = process.env.HTTPS_PROXY || process.env.https_proxy;
const dispatcher = outbound ? new ProxyAgent(outbound) : undefined;

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 10_000) reject(new Error('Body zu gross'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const middleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (!req.url?.startsWith(PREFIX)) return next();
  const path = req.url.slice(PREFIX.length).split('?')[0];
  if (!ALLOWED.some((r) => r.test(path)) || (req.method !== 'GET' && req.method !== 'POST')) {
    res.statusCode = 404;
    return res.end();
  }
  try {
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const upstream = await undiciFetch(`${TARGET}${path}`, {
      method: req.method,
      body,
      dispatcher,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        'User-Agent': 'NexusPortal-Prototype/1.0 (server-side ZEFIX client)',
      },
      signal: AbortSignal.timeout(10_000),
    });
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.end(await upstream.text());
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'ZEFIX nicht erreichbar' }));
  }
};

export function zefixProxy(): Plugin {
  return {
    name: 'zefix-proxy',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}
