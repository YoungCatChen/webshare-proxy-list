# WebShare Proxy List

It fetches the proxy list from [webshare.io](https://www.webshare.io) via its
API and converts the list into formats understandable by VPN softwares.
The only supported VPN software is
[ShadowRocket](https://apps.apple.com/us/app/shadowrocket/id932747118) only.

This project is intended to be published as a personal
[Cloudflare](https://www.cloudflare.com)
[worker](https://workers.cloudflare.com).

## Usage: Use my Instance

Log in to your [webshare dashboard](https://proxy2.webshare.io/dashboard),
find _API_ then _Keys_ from the left-hand side column.
Click it to open the _Keys_ page,
then create a key by clicking on the _Create API Key_ button.
Copy this key, and replace `[YOUR KEY]` (including the brackets)
in the following URL:

`https://youngcat.net/w2sr/convert?p-Authorization=Token%20[YOUR KEY]&url=https://proxy.webshare.io/api/v2/proxy/list/?mode=direct`

Use your browser to open this replaced URL.
If it shows a long base64 encoded string (that looks like `UkVNQVJLUz1XZWJ...`),
it’s successful.
Paste this URL to your ShadowRocket app as a _Subscribe_. Done!

### Explanation

This source code is published as one of my personal Cloudflare workers,
reachable at `https://youngcat.net/w2sr/*`.
The program accepts a `/convert` path,
which accept a `url=` param indicating what URL it should fetch,
and a `p-Authorization=` param that specifies an HTTP header
required by the Webshare API.

To be more precise, every param starting with `p-` will be treated
as an HTTP header (without the `p-`).
The Webshare API requires an HTTP header `Authorization: Token your_token`,
which can be converted by this program from param
`p-Authorization=Token%20your_token`.

## Usage: Publish your own Instance

Create a Cloudflare worker, by following
[the Guide](https://developers.cloudflare.com/workers/get-started/guide/)'s
Step 1 and 2.

Download or clone this repository to a directory.
`cd` into it, then run:

```
npm install
wrangler publish
```

Then you should get a _Route_ from the Cloudflare dashboard.
Your access point should be:

`https://webproxy-to-shadowrocket.[YOUR PREFIX].workers.dev?p-Authorization=Token%20[YOUR KEY]&url=https://proxy.webshare.io/api/v2/proxy/list/?mode=direct`

Follow _Usage: Use my Instance_ above to assemble your URL
and paste it to your ShadowRocket app. Done!
