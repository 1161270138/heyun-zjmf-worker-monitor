const token = process.env.CLOUDFLARE_API_TOKEN || '';
const zoneName = process.env.HEYUN_OVERRIDE_ZONE || 'webf.top';
const recordName = process.env.HEYUN_ORIGIN_HOST || 'heyun-origin.jk.webf.top';
const recordIp = process.env.HEYUN_ORIGIN_IP || '110.42.66.33';

function headers() {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
}

async function api(path, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const message = (data.errors || []).map((item) => item.message).filter(Boolean).join('; ') || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data.result;
}

async function main() {
  if (!token) {
    console.log('Skip Heyun DNS override: CLOUDFLARE_API_TOKEN is not set.');
    return;
  }

  const zones = await api(`/zones?name=${encodeURIComponent(zoneName)}&per_page=1`);
  const zone = zones?.[0];
  if (!zone?.id) throw new Error(`Cloudflare zone not found: ${zoneName}`);

  const records = await api(`/zones/${zone.id}/dns_records?type=A&name=${encodeURIComponent(recordName)}&per_page=1`);
  const existing = records?.[0];
  const body = JSON.stringify({
    type: 'A',
    name: recordName,
    content: recordIp,
    ttl: 600,
    proxied: false,
    comment: 'Origin override for Heyun IDC API from Cloudflare Worker',
  });

  if (existing?.id) {
    await api(`/zones/${zone.id}/dns_records/${existing.id}`, { method: 'PUT', body });
    console.log(`Updated ${recordName} -> ${recordIp}`);
  } else {
    await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body });
    console.log(`Created ${recordName} -> ${recordIp}`);
  }
}

main().catch((error) => {
  console.warn(`Heyun DNS override was not configured automatically: ${error.message}`);
  console.warn(`Create this DNS record manually if API checks still show HTTP 522: ${recordName} A ${recordIp} (DNS only).`);
});
