// proxy.js - Netlify Function to GET an external page and return HTML text.
// Only allow hosts in ALLOWED_HOSTS to avoid becoming开放代理.
// This implementation uses global fetch (Netlify Node runtime v18+). If not available, add node-fetch.

const ALLOWED_HOSTS = [
  // 把你要允许中转的域名放在这里（不要放泛域名，除非你知道后果）
  '721av.com',
  'google.com.hk',
  // 例如 a 网站：
  'a.example.com'
];

exports.handler = async function(event, context) {
  try {
    // 仅支持 GET（简单示例）
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Only GET supported' };
    }

    const q = event.queryStringParameters || {};
    const target = q.target;
    if (!target) return { statusCode: 400, body: 'Missing target query parameter' };

    let url;
    try {
      url = new URL(target);
    } catch (e) {
      return { statusCode: 400, body: 'Invalid target URL' };
    }

    // 验证允许的 host
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return { statusCode: 403, body: 'Target host not allowed' };
    }

    // 发起请求到目标
    const fetchFn = (typeof fetch !== 'undefined') ? fetch : (await import('node-fetch')).default;
    // 你可以在 headers 中设置一个自定义 User-Agent 或 Referer（谨慎）
    const res = await fetchFn(url.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Proxy/1.0 (+https://your-site.netlify.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';
    // 如果目标不是 HTML，可以拒绝或直接返回文本
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      // 返回原始内容的文本（注意：二进制文件会损坏）
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: {
          'Content-Type': contentType || 'text/plain',
          'Access-Control-Allow-Origin': '*'
        },
        body: text
      };
    }

    // 对 HTML 我们直接以文本返回
    const html = await res.text();

    // 可选：你可以在这里对 HTML 做替换（例如把目标站的相对链接改为绝对链接），但示例不做修改
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: html
    };

  } catch (err) {
    console.error('Proxy error', err);
    return { statusCode: 500, body: 'Proxy error: ' + String(err) };
  }
};
