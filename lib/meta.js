/**
 * Meta Ads API Integration
 * Documentación: https://developers.facebook.com/docs/marketing-api/insights
 */

const BASE_URL = 'https://graph.facebook.com/v20.0';

// Mapeo conjuntos de anuncios → Sucursal + Supervisor
export const SUCURSAL_MAP = [
  { key: 'dana 2',    sucursal: 'Stand',         supervisor: 'Dana 2'   }, // antes de 'dana'
  { key: 'juan bruno',sucursal: 'Stand',         supervisor: 'Dana 2'   }, // ex supervisor Stand
  { key: 'fede',     sucursal: 'San Martin',     supervisor: 'Federico' },
  { key: 'antonio',  sucursal: 'Laferrere',      supervisor: 'Antonio'  },
  { key: 'silvana',  sucursal: 'San Justo Web',  supervisor: 'Silvana'  },
  { key: 'dana',     sucursal: 'Mosconi',         supervisor: 'Dana'     }, // después de 'dana 2'
];

const LEAD_TYPES = {
  form:     'lead',
  whatsapp: 'onsite_conversion.messaging_conversation_started_7d',
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getMonthRange(monthOffset = 0) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const first = new Date(year, month, 1);
  const last  = monthOffset === 0 ? now : new Date(year, month + 1, 0);
  return {
    since: formatDate(first),
    until: formatDate(last),
    label: first.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  };
}

function getActionValue(actions, type) {
  const a = (actions || []).find(a => a.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

async function fetchInsights(accountId, token, timeRange, level = 'account', timeIncrement = 'all_days') {
  const baseFields = 'spend,impressions,clicks,ctr,cpc,actions,cost_per_action_type,date_start,date_stop';
  const fields = level === 'adset' ? `${baseFields},adset_name,campaign_name` : baseFields;

  const params = new URLSearchParams({
    access_token:   token,
    time_range:     JSON.stringify({ since: timeRange.since, until: timeRange.until }),
    fields,
    level,
    time_increment: timeIncrement,
    limit:          '200',
  });

  const res = await fetch(`${BASE_URL}/${accountId}/insights?${params}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meta API ${res.status}: ${err?.error?.message || 'unknown'}`);
  }
  const json = await res.json();
  return json.data || [];
}

function processRow(d) {
  const spend     = parseFloat(d.spend || 0);
  const formLeads = getActionValue(d.actions, LEAD_TYPES.form);
  const waLeads   = getActionValue(d.actions, LEAD_TYPES.whatsapp);
  const total     = formLeads + waLeads;
  return {
    date:        d.date_start,
    adsetName:   d.adset_name || null,
    spend:       Math.round(spend),
    formLeads,
    waLeads,
    totalLeads:  total,
    cpl:         total > 0 ? Math.round(spend / total) : 0,
    impressions: parseInt(d.impressions || 0),
    clicks:      parseInt(d.clicks || 0),
  };
}

function aggregatePeriod(rows, range) {
  const t = rows.reduce((acc, d) => {
    acc.spend       += d.spend;
    acc.formLeads   += d.formLeads;
    acc.waLeads     += d.waLeads;
    acc.totalLeads  += d.totalLeads;
    acc.impressions += d.impressions;
    acc.clicks      += d.clicks;
    return acc;
  }, { spend: 0, formLeads: 0, waLeads: 0, totalLeads: 0, impressions: 0, clicks: 0 });

  return {
    ...t,
    cpl:   t.totalLeads > 0 ? Math.round(t.spend / t.totalLeads) : 0,
    ctr:   t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    cpc:   t.clicks > 0 ? t.spend / t.clicks : 0,
    range,
  };
}

function processSucursales(adsetRows) {
  const buckets = {};
  for (const row of adsetRows) {
    const name  = (row.adsetName || '').toLowerCase();
    const match = SUCURSAL_MAP.find(s => name.includes(s.key));
    if (!match) continue;
    const key = match.sucursal;
    if (!buckets[key]) buckets[key] = { ...match, leads: 0, spend: 0 };
    buckets[key].leads += row.waLeads;
    buckets[key].spend += row.spend;
  }
  return Object.values(buckets)
    .map(b => ({ ...b, spend: Math.round(b.spend), cpl: b.leads > 0 ? Math.round(b.spend / b.leads) : 0 }))
    .sort((a, b) => b.leads - a.leads);
}

export function calcVariation(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function fetchMetaData() {
  const token     = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) return getDemoData();

  try {
    const curRange  = getMonthRange(0);
    const prevRange = getMonthRange(-1);

    const [curDailyRaw, prevDailyRaw, adsetRaw] = await Promise.all([
      fetchInsights(accountId, token, curRange,  'account', '1'),
      fetchInsights(accountId, token, prevRange, 'account', '1'),
      fetchInsights(accountId, token, curRange,  'adset',   'all_days'),
    ]);

    const curDaily  = curDailyRaw.map(processRow);
    const prevDaily = prevDailyRaw.map(processRow);
    const adsetRows = adsetRaw.map(processRow);

    return {
      current:    aggregatePeriod(curDaily,  curRange),
      prev:       aggregatePeriod(prevDaily, prevRange),
      daily:      curDaily,
      prevDaily,
      sucursales: processSucursales(adsetRows),
      isDemo:     false,
    };
  } catch (err) {
    console.error('fetchMetaData error:', err.message);
    return { ...getDemoData(), error: err.message };
  }
}

function getDemoData() {
  const curRange  = getMonthRange(0);
  const prevRange = getMonthRange(-1);

  const daily = [
    { date:'2026-06-01', spend:183000, formLeads:16, waLeads:38, totalLeads:54, cpl:3390, impressions:12000, clicks:420 },
    { date:'2026-06-02', spend:215000, formLeads:12, waLeads:28, totalLeads:40, cpl:5378, impressions:14000, clicks:380 },
    { date:'2026-06-03', spend:167000, formLeads:12, waLeads:28, totalLeads:40, cpl:4169, impressions:11000, clicks:360 },
    { date:'2026-06-04', spend:225000, formLeads:12, waLeads:28, totalLeads:40, cpl:5622, impressions:15000, clicks:400 },
    { date:'2026-06-05', spend:134000, formLeads:12, waLeads:28, totalLeads:40, cpl:3347, impressions:10000, clicks:340 },
    { date:'2026-06-06', spend:32000,  formLeads:2,  waLeads:11, totalLeads:13, cpl:1452, impressions:3000,  clicks:90  },
  ];

  const prevDaily = Array.from({ length: 31 }, (_, i) => {
    const waLeads   = Math.round(15 + Math.random() * 40);
    const formLeads = Math.round(5  + Math.random() * 15);
    const total     = waLeads + formLeads;
    const spend     = Math.round(150000 + Math.random() * 250000);
    return {
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      spend, formLeads, waLeads, totalLeads: total,
      cpl: total > 0 ? Math.round(spend / total) : 0,
      impressions: Math.round(8000 + Math.random() * 10000),
      clicks: Math.round(250 + Math.random() * 300),
    };
  });

  return {
    current:  aggregatePeriod(daily, curRange),
    prev:     aggregatePeriod(prevDaily, prevRange),
    daily,
    prevDaily,
    sucursales: [
      { sucursal: 'San Martin',    supervisor: 'Federico', leads: 82, spend: 346000, cpl: 4220 },
      { sucursal: 'Stand',         supervisor: 'Dana 2',   leads: 31, spend: 187000, cpl: 6032 },
      { sucursal: 'Laferrere',     supervisor: 'Antonio',  leads: 24, spend: 168000, cpl: 7000 },
      { sucursal: 'San Justo Web', supervisor: 'Silvana',  leads: 15, spend: 134000, cpl: 8933 },
      { sucursal: 'Mosconi',       supervisor: 'Dana',     leads:  9, spend:  95000, cpl:10556 },
    ],
    isDemo: true,
  };
}
