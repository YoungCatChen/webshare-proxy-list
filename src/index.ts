export interface Env {
  // Example binding to KV. Learn more at
  // https://developers.cloudflare.com/workers/runtime-apis/kv/ MY_KV_NAMESPACE:
  // KVNamespace;
  //
  // Example binding to Durable Object. Learn more at
  // https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at
  // https://developers.cloudflare.com/workers/runtime-apis/r2/ MY_BUCKET:
  // R2Bucket;
}


/**
 * Proxy format from source.
 * @see https://proxy.webshare.io/docs/api/#list-proxies
 */
interface WebshareProxy {
  id: string, username: string, password: string, proxy_address: string,
      port: number, valid: boolean, last_verification: string,
      country_code: string, city_name: string, created_at: string,
}


/**
 * To manually get the proxy list from source:
 *
 *   `curl -H 'Authorization: Token 123abc'
 *   'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct'`
 *
 * @returns Destination format:
 *    ```
 *    REMARKS=Name
 *    socks://user:pass@1.2.3.4:1234?remarks=name1&obfs=none&tfo=1
 *    socks://user:pass@1.2.3.4:1234?remarks=name2&obfs=none&tfo=1
 *    socks://user:pass@1.2.3.4:1234?remarks=name3&obfs=none&tfo=1
 *    ```
 *
 * @see Source format: https://proxy.webshare.io/docs/api/#list-proxies
 */
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sourceUrl = url.searchParams.get('url');
  if (!sourceUrl) {
    throw new Error('Expected "url" param does not exist or is empty.');
  }
  const sourceHeaders: {[key: string]: string} = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k.startsWith('p-')) {
      sourceHeaders[k.substring(2)] = v;
    }
  }

  const resp = await fetch(sourceUrl, {headers: sourceHeaders});
  if (!resp.ok) {
    throw new Error(
        `Error in fetching ${sourceUrl} : ${resp.status} ${resp.statusText}`);
  }
  const sourceText = await resp.text();
  const sourceJson = JSON.parse(sourceText);
  const sourceProxies: WebshareProxy[] = sourceJson['results'];
  sourceProxies.sort((a, b) => a.proxy_address.localeCompare(b.proxy_address));

  const destProxies = sourceProxies.map(convert);
  const destText = 'REMARKS=Webshare Proxies\n' + destProxies.join('\n');

  return new Response(destText);
};


/**
 *
 * @param webshareProxy See `WebshareProxy`.
 * @returns `socks://user:pass@1.2.3.4:1234?remarks=name1&obfs=none&tfo=1`
 */
function convert(webshareProxy: WebshareProxy): string {
  const p = webshareProxy;
  if (!p['valid']) return '';
  return `socks://${p.username}:${p.password}@${p.proxy_address}:` +
      `${p.port}?remarks=${p.proxy_address}&obfs=none&tfo=1`;
}


async function wrappedHandler(
    request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/convert')) {
    return new Response(
        `Not found. The pathname was ${url.pathname}`, {status: 404});
  }
  try {
    const resp = await handler(request);
    return resp;
  } catch (ex) {
    if (ex instanceof Error) {
      return new Response(ex.stack, {status: 403});
    } else {
      return new Response(
          'Unknown error: ' + JSON.stringify(ex), {status: 403});
    }
  }
}

export default {fetch: wrappedHandler};
