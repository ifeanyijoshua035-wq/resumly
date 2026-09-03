// Maps a detected country to a Flutterwave pricing tier. Nigeria gets its own
// tier; every other African country shares the AFRICA tier; everywhere else
// is INTL. Matches the tiers in pricing.js - keep both files in sync if you
// ever change which countries count as "Africa" for pricing purposes.
const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD',
  'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE',
  'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'RW',
  'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
]); // deliberately excludes NG, which has its own tier

function regionForCountry(countryCode) {
  if (!countryCode) return 'INTL';
  const cc = countryCode.toUpperCase();
  if (cc === 'NG') return 'NG';
  if (AFRICAN_COUNTRIES.has(cc)) return 'AFRICA';
  return 'INTL';
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const v = ip.replace('::ffff:', '');
  return v === '127.0.0.1' || v === '::1' || v.startsWith('10.') || v.startsWith('192.168.') || v.startsWith('172.16.');
}

// Looks up which country an IP belongs to via ipinfo.io, and maps it to a
// pricing region. Fails safe: any lookup problem (no internet, ipinfo.io
// down, a local/private dev IP where geolocation is meaningless) falls back
// to the full INTL price rather than accidentally granting a discount that
// couldn't actually be verified.
async function detectRegion(ip) {
  if (isPrivateIp(ip)) {
    return { region: 'INTL', country: null, note: 'local/private IP - real geolocation only works once deployed publicly' };
  }
  try {
    const token = process.env.IPINFO_TOKEN;
    const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json${token ? `?token=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ipinfo.io responded ${res.status}`);
    const data = await res.json();
    return { region: regionForCountry(data.country), country: data.country || null };
  } catch (err) {
    console.error('Geolocation lookup failed, defaulting to INTL pricing:', err.message);
    return { region: 'INTL', country: null, note: 'lookup failed' };
  }
}

module.exports = { detectRegion, regionForCountry, AFRICAN_COUNTRIES };