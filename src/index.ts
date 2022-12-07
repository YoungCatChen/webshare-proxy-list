/**
 * Proxy format from the source, i.e. webshare.io.
 * @see https://proxy.webshare.io/docs/api/#list-proxies
 */
interface WebshareProxy {
  id: string;                 // 'd-10513'
  username: string;           // 'user'
  password: string;           // 'pass'
  proxy_address: string;      // '1.2.3.4'
  port: number;               // 8168
  valid: boolean;             // true
  last_verification: string;  // '2019-06-09T23:34:00.095501-07:00'
  country_code: string;       // 'US'
  city_name: string;          // 'New York'
  created_at: string;         // '2022-06-14T11:58:10.246406-07:00'
}


/**
 * Fetches the proxy list from webshare.io and converts it to the ShadowRocket
 * format.
 *
 * To manually get the proxy list from source:
 *
 *   `curl -H 'Authorization: Token 123abc'
 *   'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct'`
 *
 * @param request The http request. The `url` param will be used as the url of
 *    the data source to be fetched. Any param starting with `p-` will be
 *    treated as passthrough headers; as an example, `?p-Authorization=abc123`
 *    will result in an http request header `Authorization: abc123`.
 *
 * @returns Destination format: a Base64 encoded string of:
 *    ```
 *    REMARKS=Name
 *    socks://BASE64?remarks=name1&obfs=none&tfo=1
 *    socks://BASE64?remarks=name2&obfs=none&tfo=1
 *    socks://BASE64?remarks=name3&obfs=none&tfo=1
 *    ```
 *
 * @see Source format: https://proxy.webshare.io/docs/api/#list-proxies
 */
async function convertList(request: Request): Promise<Response> {
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

  const destProxies = sourceProxies.filter(p => p.valid).map(convertProxy);
  destProxies.sort((a, b) => a.sortName.localeCompare(b.sortName));
  const destText =
      'REMARKS=Webshare Proxies\n' + destProxies.map(p => p.line).join('\n');
  const destB64 = Buffer.from(destText).toString('base64');

  return new Response(destB64);
};


/**
 * Converts a single proxy in Webshare format into the ShadowRocket format.
 *
 * @param webshareProxy See `WebshareProxy`.
 * @returns Format `socks://BASE64?remarks=name1&obfs=none&tfo=1`, where BASE64
 *     represents a base64 encoded string of format `user:pass@1.2.3.4:1234`.
 */
function convertProxy(webshareProxy: WebshareProxy):
    {line: string, sortName: string} {
  const p = webshareProxy;
  const sortName = `${p.country_code} ${p.city_name}: ${p.proxy_address}`;
  const displayName = `${p.city_name}: ${p.proxy_address}`;
  const encodedName = encodeURIComponent(displayName);
  const addr = `${p.username}:${p.password}@${p.proxy_address}:${p.port}`;
  const addrB64 = Buffer.from(addr).toString('base64');
  return {
    sortName: sortName,
    line: `socks://${addrB64}?remarks=${encodedName}&obfs=none&tfo=1`,
  };
}


/**
 * Dispatches the request to a handler.
 *
 * Entry point of the program. Usage:
 * `http://foo.bar/convert?p-Authorization=Token%20ABC123&url=https://proxy.webshare.io/api/v2/proxy/list/?mode=direct`
 */
async function dispatch(
    request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/convert')) {
      const resp = await convertList(request);
      return resp;
    }
    return new Response(
        `Not found. Cannot dispatch the request with pathname ${url.pathname}`,
        {status: 404});
  } catch (ex) {
    if (ex instanceof Error) {
      return new Response(ex.stack, {status: 403});
    } else {
      return new Response(
          'Unknown error: ' + JSON.stringify(ex), {status: 403});
    }
  }
}


export interface Env {}
export default {fetch: dispatch};
