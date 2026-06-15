// Mock data + metrics engine for the Custom Plan Builder prototype.
// Shapes mirror the Archera API: commitment_plans_default (nightly system-generated drafts),
// overview (has_actioned_plan, purchase_missed_savings), commitment_plan_line_items.

// ─── Commitment terms ────────────────────────────────────────────────────────
// Guaranteed terms are shown by default; native terms appear behind the
// "Show native" toggle. Savings on guaranteed terms are net of Archera's premium.

export const TERMS = {
  archera_30d: {
    id: 'archera_30d',
    label: 'Archera 30 Day',
    short: '30 Day',
    guaranteed: true,
    lockDays: 30,
    lockLabel: 'Exit monthly',
    lockDetail: 'Free to exit after Jul 12, 2026 — Archera buys back unused commitments',
  },
  archera_1y: {
    id: 'archera_1y',
    label: 'Archera 1 Year',
    short: '1 Year',
    guaranteed: true,
    lockDays: 365,
    lockLabel: 'Guaranteed exit',
    lockDetail: 'If usage drops, Archera pays the shortfall — $0 at risk',
  },
  aws_1y: {
    id: 'aws_1y',
    label: 'AWS 1 Year',
    short: 'Native 1Y',
    guaranteed: false,
    lockDays: 365,
    lockLabel: 'Locked until Jun 2027',
    lockDetail: 'If usage drops, you pay for unused capacity until Jun 2027',
  },
  aws_3y: {
    id: 'aws_3y',
    label: 'AWS 3 Year',
    short: 'Native 3Y',
    guaranteed: false,
    lockDays: 1095,
    lockLabel: 'Locked until Jun 2029',
    lockDetail: 'If usage drops, you pay for unused capacity until Jun 2029',
  },
};

export const TERM_ORDER = ['archera_30d', 'archera_1y', 'aws_1y', 'aws_3y'];
export const GUARANTEED_TERMS = ['archera_30d', 'archera_1y'];

// Term-length groups — each length may include both a guaranteed and a native term.
// Toggling a length shows/hides all terms at that horizon together.
export const TERM_LENGTHS = [
  { id: '30d', label: '30-day', termIds: ['archera_30d'] },
  { id: '1y',  label: '1-year', termIds: ['archera_1y', 'aws_1y'] },
  { id: '3y',  label: '3-year', termIds: ['aws_3y'] },
];

// ─── Instances ───────────────────────────────────────────────────────────────
// rates: savings rate vs on-demand per term (guaranteed = net of premium).
// stable: ≥90 days of flat utilization → safe for longer terms (drives presets + sparkline).

let seq = 0;
function inst(name, type, platform, region, costMo, stable, rates, breakevens) {
  seq += 1;
  return {
    id: `i-${String(seq).padStart(3, '0')}`,
    name,
    type,
    platform,
    region,
    resourceId: `i-0c1c0515fb1c283c${seq}`,
    costMo,
    stable,
    rates,      // { archera_30d, archera_1y, aws_1y, aws_3y } as fractions
    breakevens, // days, same keys
  };
}

const R_STEADY = { archera_30d: 0.20, archera_1y: 0.28, aws_1y: 0.24, aws_3y: 0.32 };
const R_MIXED = { archera_30d: 0.18, archera_1y: 0.26, aws_1y: 0.22, aws_3y: 0.30 };
const R_SPIKY = { archera_30d: 0.17, archera_1y: 0.25, aws_1y: 0.21, aws_3y: 0.29 };
const BE_FAST = { archera_30d: 18, archera_1y: 74, aws_1y: 228, aws_3y: 196 };
const BE_MED = { archera_30d: 24, archera_1y: 92, aws_1y: 244, aws_3y: 208 };

export const SERVICES = [
  {
    id: 'ec2',
    name: 'Amazon EC2',
    category: 'Compute',
    icon: 'memory',
    commitmentVehicle: 'Guaranteed Reserved Instances (GRIs)',
    alreadyCoveredMo: 2440, // covered by existing commitments before this plan
    uncoverableMo: 520, // short-lived / spot-like usage not safe to commit
    instances: [
      inst('ppb-phi-v11-postgres', 't4g.nano', 'Linux/UNIX', 'us-west-2', 968.89, true, R_STEADY, BE_FAST),
      inst('ppb-api-prod-01', 'm6i.xlarge', 'Linux/UNIX', 'us-west-2', 1432.4, true, R_STEADY, BE_FAST),
      inst('ppb-api-prod-02', 'm6i.xlarge', 'Linux/UNIX', 'us-west-2', 1432.4, true, R_STEADY, BE_FAST),
      inst('etl-batch-runner', 'c6g.2xlarge', 'Linux/UNIX', 'us-east-1', 1875.1, false, R_SPIKY, BE_MED),
      inst('analytics-worker-a', 'r6g.large', 'Linux/UNIX', 'us-east-1', 1102.7, false, R_MIXED, BE_MED),
      inst('analytics-worker-b', 'r6g.large', 'Linux/UNIX', 'us-east-1', 1102.7, false, R_MIXED, BE_MED),
      inst('staging-app-server', 't3.large', 'Linux/UNIX', 'us-west-2', 684.2, false, R_SPIKY, BE_MED),
      inst('win-licensing-host', 'm5.xlarge', 'Windows', 'us-east-1', 1299.5, true, R_MIXED, BE_FAST),
    ],
  },
  {
    id: 'rds',
    name: 'Amazon RDS',
    category: 'Database',
    icon: 'storage',
    commitmentVehicle: 'Guaranteed Reserved Instances (GRIs)',
    alreadyCoveredMo: 1860,
    uncoverableMo: 230,
    instances: [
      inst('prod-orders-primary', 'db.r6g.xlarge', 'PostgreSQL', 'us-west-2', 1844.3, true, R_STEADY, BE_FAST),
      inst('prod-orders-replica', 'db.r6g.xlarge', 'PostgreSQL', 'us-west-2', 1844.3, true, R_STEADY, BE_FAST),
      inst('billing-mysql', 'db.m6g.large', 'MySQL', 'us-east-1', 912.6, true, R_MIXED, BE_FAST),
      inst('reporting-warehouse', 'db.r5.2xlarge', 'PostgreSQL', 'us-east-1', 1240.8, false, R_MIXED, BE_MED),
      inst('dev-shared-db', 'db.t4g.medium', 'PostgreSQL', 'us-west-2', 421.9, false, R_SPIKY, BE_MED),
    ],
  },
  {
    id: 'elasticache',
    name: 'Amazon ElastiCache',
    category: 'Cache',
    icon: 'bolt',
    commitmentVehicle: 'Guaranteed Reserved Instances (GRIs)',
    alreadyCoveredMo: 905,
    uncoverableMo: 95,
    instances: [
      inst('session-cache-prod', 'cache.r6g.large', 'Redis', 'us-west-2', 689.4, true, R_STEADY, BE_FAST),
      inst('queue-cache-prod', 'cache.r6g.large', 'Redis', 'us-west-2', 689.4, true, R_STEADY, BE_FAST),
      inst('feed-cache', 'cache.m6g.large', 'Redis', 'us-east-1', 512.2, false, R_MIXED, BE_MED),
      inst('staging-cache', 'cache.t4g.small', 'Redis', 'us-west-2', 198.7, false, R_SPIKY, BE_MED),
    ],
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'Compute',
    icon: 'functions',
    commitmentVehicle: 'Guaranteed Savings Plans (GSPs)',
    alreadyCoveredMo: 0,
    uncoverableMo: 140,
    serverless: true, // no per-instance view — coverage applies to aggregate usage
    instances: [
      inst('Aggregate Lambda usage', 'Compute SP', 'All functions', 'All regions', 1450.0, true, R_STEADY, BE_FAST),
    ],
  },
];

export const ALL_INSTANCES = SERVICES.flatMap((s) =>
  s.instances.map((i) => ({ ...i, serviceId: s.id }))
);

// Spend already covered + savings from commitments that existed before this plan
export const EXISTING = {
  savingsMo: 1120,
  committedMo: 4085, // monthly cost of pre-existing commitments
};

export const COVERAGE_TARGET = 0.85; // AWS target coverage % — goal-seek input

// First-run analysis (mirrors `overview` + plan fields)
export const ANALYSIS = {
  dataAvailableSince: 'January 2022',
  lookbackDays: 7,
  planBuiltAt: 'today at 6:51 AM',
  stableUncoveredCount: ALL_INSTANCES.filter((i) => i.stable).length,
  onDemandSwingPct: 23,
};

// ─── Selection model ─────────────────────────────────────────────────────────
// selections: { [instanceId]: termId | null }   null = excluded from plan

export function defaultSelections() {
  const sel = {};
  ALL_INSTANCES.forEach((i) => { sel[i.id] = 'archera_30d'; });
  return sel;
}

export const PRESETS = {
  recommended: {
    label: 'Recommended',
    desc: '30-day Guaranteed Commitments on every coverable resource. Exit monthly, $0 at risk — built nightly from your last 7 days of usage.',
    pick: () => 'archera_30d',
  },
  balanced: {
    label: 'Balanced',
    desc: '1-year Guaranteed Commitments on workloads with 90+ days of stable usage, 30-day Guaranteed everywhere else.',
    pick: (i) => (i.stable ? 'archera_1y' : 'archera_30d'),
  },
  high_savings: {
    label: 'High Savings',
    desc: 'Native 3-year commitments on stable workloads, 1-year Guaranteed elsewhere. Highest rate — longest lock-in.',
    pick: (i) => (i.stable ? 'aws_3y' : 'archera_1y'),
    needsNative: true,
  },
};

export function applyPreset(presetId) {
  const preset = PRESETS[presetId];
  const sel = {};
  ALL_INSTANCES.forEach((i) => { sel[i.id] = preset.pick(i); });
  return sel;
}

// Which plan do the current selections correspond to? Derived, never stored —
// editing a predefined plan makes it custom; reverting the edit makes it
// predefined again (required for automation eligibility).
export function detectPlan(selections) {
  const match = Object.entries(PRESETS).find(([, preset]) =>
    ALL_INSTANCES.every((i) => selections[i.id] === preset.pick(i)));
  return match ? match[0] : 'custom';
}

// ─── Per-option math ─────────────────────────────────────────────────────────

export function optionFor(instance, termId) {
  const term = TERMS[termId];
  const savingsMo = instance.costMo * instance.rates[termId];
  const commitCostMo = instance.costMo - savingsMo;
  // Native worst case: remaining commitment obligation if usage drops to zero.
  // Guaranteed: $0 — Archera buys back / pays the shortfall.
  const atRisk = term.guaranteed ? 0 : commitCostMo * (term.lockDays / 30.4);
  return {
    termId,
    savingsMo,
    rate: instance.rates[termId],
    commitCostMo,
    breakevenDays: instance.breakevens[termId],
    atRisk,
    guaranteed: term.guaranteed,
  };
}

// ─── Aggregate metrics ───────────────────────────────────────────────────────

export function serviceMetrics(service, selections) {
  const reservable = service.alreadyCoveredMo + service.uncoverableMo
    + service.instances.reduce((a, i) => a + i.costMo, 0);
  let newlyCovered = 0;
  let savingsMo = 0;
  let count = 0;
  service.instances.forEach((i) => {
    const termId = selections[i.id];
    if (!termId) return;
    const opt = optionFor(i, termId);
    newlyCovered += i.costMo;
    savingsMo += opt.savingsMo;
    count += 1;
  });
  return {
    reservable,
    currentCoverage: service.alreadyCoveredMo / reservable,
    projectedCoverage: (service.alreadyCoveredMo + newlyCovered) / reservable,
    savingsMo,
    currentCostMo: reservable,
    projectedCostMo: reservable - savingsMo,
    count,
  };
}

export function pageMetrics(selections) {
  let reservable = 0;
  let covered = 0;
  let newlyCovered = 0;
  let newSavings = 0;
  let newCommitted = 0;
  let atRisk = 0;
  let weightedBreakeven = 0;
  let minBreakeven = Infinity;
  let maxBreakeven = 0;
  let exitable30dCost = 0;
  let guaranteedCost = 0;
  let count = 0;

  SERVICES.forEach((s) => {
    reservable += s.alreadyCoveredMo + s.uncoverableMo
      + s.instances.reduce((a, i) => a + i.costMo, 0);
    covered += s.alreadyCoveredMo;
    s.instances.forEach((i) => {
      const termId = selections[i.id];
      if (!termId) return;
      const opt = optionFor(i, termId);
      newlyCovered += i.costMo;
      newSavings += opt.savingsMo;
      newCommitted += opt.commitCostMo;
      atRisk += opt.atRisk;
      weightedBreakeven += opt.breakevenDays * i.costMo;
      minBreakeven = Math.min(minBreakeven, opt.breakevenDays);
      maxBreakeven = Math.max(maxBreakeven, opt.breakevenDays);
      if (TERMS[termId].lockDays <= 30) exitable30dCost += opt.commitCostMo;
      if (opt.guaranteed) guaranteedCost += opt.commitCostMo;
      count += 1;
    });
  });

  const currentSavings = EXISTING.savingsMo;
  const projectedSavings = currentSavings + newSavings;
  const currentSpend = reservable - currentSavings;
  const projectedSpend = reservable - projectedSavings;

  return {
    count,
    reservable,
    coverage: { current: covered / reservable, projected: (covered + newlyCovered) / reservable },
    savingsMo: { current: currentSavings, projected: projectedSavings },
    uncovered: { current: reservable - covered, projected: reservable - covered - newlyCovered },
    spendMo: { current: currentSpend, projected: projectedSpend },
    breakevenDays: newlyCovered ? weightedBreakeven / newlyCovered : null,
    breakevenRange: count ? { min: minBreakeven, max: maxBreakeven } : { min: null, max: null },
    committedMo: { current: EXISTING.committedMo, projected: EXISTING.committedMo + newCommitted },
    atRisk,
    exitablePct: newCommitted ? exitable30dCost / newCommitted : 0,
    guaranteedPct: newCommitted ? guaranteedCost / newCommitted : 0,
    hourlyRate: { current: currentSpend / 730, projected: projectedSpend / 730 },
    esr: {
      current: covered ? currentSavings / covered : 0,
      projected: (covered + newlyCovered) ? projectedSavings / (covered + newlyCovered) : 0,
    },
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmtMoney = (v) => {
  const abs = Math.abs(v);
  if (abs >= 100000) return `$${(v / 1000).toFixed(0)}K`;
  if (abs >= 10000) return `$${(v / 1000).toFixed(1)}K`;
  if (abs >= 1000) return `$${(v / 1000).toFixed(2)}K`;
  return `$${v.toFixed(0)}`;
};
export const fmtPct = (v) => `${(v * 100).toFixed(v >= 0.1 ? 1 : 2)}%`;
export const fmtDays = (v) => (v == null ? '—' : `${Math.round(v)} days`);

// ─── KPI catalog ─────────────────────────────────────────────────────────────
// Each KPI renders current → projected from pageMetrics. `good` is the direction
// that should read as positive (up = green when value increases, etc.).

export const KPI_GROUPS = ['Essentials', 'FinOps', 'Finance', 'Executive'];

export const KPI_CATALOG = [
  {
    id: 'coverage',
    label: 'Coverage vs Target',
    noun: 'Coverage',
    group: 'Essentials',
    icon: 'verified_user',
    unit: '',
    desc: `Share of reservable spend covered by commitments. Target: ${COVERAGE_TARGET * 100}%.`,
    raw: (m) => ({ current: m.coverage.current, projected: m.coverage.projected }),
    target: COVERAGE_TARGET,
    targetLabel: `${COVERAGE_TARGET * 100}%`,
    get: (m) => ({
      current: fmtPct(m.coverage.current),
      projected: fmtPct(m.coverage.projected),
      delta: `+${((m.coverage.projected - m.coverage.current) * 100).toFixed(0)} pts`,
      good: m.coverage.projected >= m.coverage.current,
      meetsTarget: m.coverage.projected >= COVERAGE_TARGET,
      progress: m.coverage.projected / COVERAGE_TARGET,
    }),
  },
  {
    id: 'monthlySavings',
    label: 'Monthly Savings',
    noun: 'Monthly Savings',
    group: 'Essentials',
    icon: 'savings',
    unit: '/mo',
    desc: 'Savings vs on-demand from all commitments, net of Archera premiums.',
    raw: (m) => ({ current: m.savingsMo.current, projected: m.savingsMo.projected }),
    get: (m) => ({
      current: fmtMoney(m.savingsMo.current),
      projected: fmtMoney(m.savingsMo.projected),
      delta: `+${fmtMoney(m.savingsMo.projected - m.savingsMo.current)}`,
      good: true,
    }),
  },
  {
    id: 'uncoveredSpend',
    label: 'Uncovered On-Demand Spend',
    noun: 'Uncovered Spend',
    group: 'Essentials',
    icon: 'local_fire_department',
    unit: '/mo',
    desc: 'Spend paying full list price — every uncovered dollar is missed savings.',
    raw: (m) => ({ current: m.uncovered.current, projected: m.uncovered.projected }),
    get: (m) => ({
      current: fmtMoney(m.uncovered.current),
      projected: fmtMoney(m.uncovered.projected),
      delta: `−${fmtMoney(m.uncovered.current - m.uncovered.projected)}`,
      good: m.uncovered.projected <= m.uncovered.current,
      invert: true,
    }),
  },
  {
    id: 'breakeven',
    label: 'Breakeven',
    noun: 'Breakeven',
    group: 'Essentials',
    icon: 'event_available',
    unit: '',
    desc: 'Weighted average time until commitment savings exceed cost.',
    get: (m) => ({
      current: '—',
      projected: fmtDays(m.breakevenDays),
      delta: 'until net positive',
      good: true,
    }),
    footer: (m) => {
      if (m.breakevenDays == null) return { caption: 'Select commitments to project payback timing.' };
      const max = m.breakevenRange.max || 1;
      return {
        bars: [
          { label: 'Fastest', value: fmtDays(m.breakevenRange.min), frac: m.breakevenRange.min / max, tone: 'fill' },
          { label: 'Slowest', value: fmtDays(m.breakevenRange.max), frac: 1, tone: 'muted' },
        ],
        caption: 'After payback, commitments are pure savings for the rest of the term.',
      };
    },
  },
  {
    id: 'esr',
    label: 'Effective Savings Rate',
    noun: 'Savings Rate',
    group: 'FinOps',
    icon: 'percent',
    unit: '',
    desc: 'FinOps Foundation metric — blended discount across all covered spend.',
    raw: (m) => ({ current: m.esr.current, projected: m.esr.projected }),
    get: (m) => ({
      current: fmtPct(m.esr.current),
      projected: fmtPct(m.esr.projected),
      delta: `+${((m.esr.projected - m.esr.current) * 100).toFixed(1)} pts`,
      good: true,
    }),
  },
  {
    id: 'utilization',
    label: 'Commitment Utilization',
    noun: 'Utilization',
    group: 'FinOps',
    icon: 'speed',
    unit: '',
    desc: 'How fully existing commitments are used. Guaranteed commitments are buy-back protected.',
    get: () => ({ current: '94.2%', projected: '94.2%', delta: 'unchanged', good: true }),
    footer: () => ({
      bars: [
        { label: 'Utilized', value: '94.2%', frac: 0.942, tone: 'fill' },
        { label: 'Idle', value: '5.8%', frac: 0.058, tone: 'muted' },
      ],
      caption: 'Idle capacity is buyback-eligible — no penalty to recover.',
    }),
  },
  {
    id: 'expiring',
    label: 'Expiring in 30 Days',
    noun: 'Expiring Savings',
    group: 'FinOps',
    icon: 'hourglass_bottom',
    unit: '/mo',
    desc: 'Monthly savings at risk from commitments expiring within 30 days.',
    get: () => ({ current: '$310', projected: '$310', delta: '2 commitments', good: false, invert: true }),
    footer: () => ({
      bars: [
        { label: 'EC2 Reserved (1Y)', value: '8 days', frac: 8 / 30, tone: 'fill' },
        { label: 'RDS Reserved (1Y)', value: '23 days', frac: 23 / 30, tone: 'fill' },
      ],
      caption: 'Renew before they lapse to avoid reverting to on-demand.',
    }),
  },
  {
    id: 'waste',
    label: 'Commitment Waste',
    noun: 'Waste',
    group: 'FinOps',
    icon: 'delete_sweep',
    unit: '/mo',
    desc: 'Cost of unused committed capacity. Buyback opportunities can recover this.',
    get: () => ({ current: '$124', projected: '$124', delta: 'buyback available', good: false, invert: true }),
    footer: () => ({
      bars: [
        { label: 'Recoverable via buyback', value: '$124/mo', frac: 1, tone: 'fill' },
      ],
      caption: 'Low waste — existing commitments are well-matched to usage.',
    }),
  },
  {
    id: 'committed',
    label: 'Committed Monthly Obligation',
    noun: 'Monthly Obligation',
    group: 'Finance',
    icon: 'receipt_long',
    unit: '/mo',
    desc: 'Contractual monthly commitment cost across all active commitments.',
    raw: (m) => ({ current: m.committedMo.current, projected: m.committedMo.projected }),
    get: (m) => ({
      current: fmtMoney(m.committedMo.current),
      projected: fmtMoney(m.committedMo.projected),
      delta: `+${fmtMoney(m.committedMo.projected - m.committedMo.current)}`,
      good: true,
      neutral: true,
    }),
  },
  {
    id: 'atRisk',
    label: 'Worst-Case Exposure',
    noun: 'Exposure',
    group: 'Finance',
    icon: 'gpp_maybe',
    unit: '',
    desc: 'Obligation remaining if usage drops to zero. Guaranteed commitments contribute $0.',
    raw: (m) => ({ current: 0, projected: m.atRisk }),
    get: (m) => ({
      current: '$0',
      projected: fmtMoney(m.atRisk),
      delta: m.atRisk === 0 ? 'fully guaranteed' : 'from native terms',
      good: m.atRisk === 0,
      invert: true,
    }),
  },
  {
    id: 'netSavings',
    label: 'Net Savings After Premiums',
    noun: 'Net Savings',
    group: 'Finance',
    icon: 'account_balance',
    unit: '/mo',
    desc: 'All savings figures shown are already net of Archera premiums — you keep 100%.',
    raw: (m) => ({ current: m.savingsMo.current, projected: m.savingsMo.projected }),
    get: (m) => ({
      current: fmtMoney(m.savingsMo.current),
      projected: fmtMoney(m.savingsMo.projected),
      delta: 'net of premiums',
      good: true,
    }),
  },
  {
    id: 'annualized',
    label: 'Annualized Savings Run-Rate',
    noun: 'Annual Run-Rate',
    group: 'Executive',
    icon: 'trending_up',
    unit: '/yr',
    desc: 'Projected monthly savings × 12.',
    raw: (m) => ({ current: m.savingsMo.current * 12, projected: m.savingsMo.projected * 12 }),
    get: (m) => ({
      current: fmtMoney(m.savingsMo.current * 12),
      projected: fmtMoney(m.savingsMo.projected * 12),
      delta: `+${fmtMoney((m.savingsMo.projected - m.savingsMo.current) * 12)}`,
      good: true,
    }),
  },
  {
    id: 'exitable',
    label: 'Exit-able Within 30 Days',
    noun: 'Exit-able Spend',
    group: 'Executive',
    icon: 'lock_open',
    unit: '',
    desc: 'Share of new committed spend you can walk away from within a month.',
    get: (m) => ({
      current: '—',
      projected: fmtPct(m.exitablePct),
      delta: 'of new commitments',
      good: m.exitablePct > 0.5,
    }),
    footer: (m) => ({
      bars: [
        { label: 'Exit-able ≤30 days', value: fmtPct(m.exitablePct), frac: m.exitablePct, tone: 'fill' },
        { label: 'Locked for term', value: fmtPct(1 - m.exitablePct), frac: 1 - m.exitablePct, tone: 'muted' },
      ],
    }),
  },
  {
    id: 'hourlyRate',
    label: 'Effective Hourly Rate',
    noun: 'Hourly Rate',
    group: 'Executive',
    icon: 'schedule',
    unit: '/hr',
    desc: 'Blended hourly cost of reservable spend. Power-user metric.',
    raw: (m) => ({ current: m.hourlyRate.current, projected: m.hourlyRate.projected }),
    get: (m) => ({
      current: `$${m.hourlyRate.current.toFixed(2)}`,
      projected: `$${m.hourlyRate.projected.toFixed(2)}`,
      delta: `−$${(m.hourlyRate.current - m.hourlyRate.projected).toFixed(2)}/hr`,
      good: true,
    }),
  },
];

export const DEFAULT_FEATURED = ['coverage', 'monthlySavings', 'uncoveredSpend', 'breakeven'];

export const KPI_PRESETS = {
  Default: DEFAULT_FEATURED,
  FinOps: ['coverage', 'esr', 'utilization', 'expiring'],
  Finance: ['committed', 'atRisk', 'netSavings', 'breakeven'],
  Executive: ['annualized', 'monthlySavings', 'coverage', 'exitable'],
};

export const MAX_FEATURED = 5;

// ─── Sparkline data ──────────────────────────────────────────────────────────
// Deterministic per-instance utilization shape (no Math.random — repeatable renders).

export function sparkPoints(instance) {
  const n = 24;
  const base = instance.stable ? 0.86 : 0.55;
  const pts = [];
  for (let k = 0; k < n; k += 1) {
    const wobble = Math.sin(k * 1.7 + instance.costMo) * (instance.stable ? 0.03 : 0.22);
    const trend = instance.stable ? 0 : Math.sin(k * 0.45 + instance.costMo * 2) * 0.12;
    pts.push(Math.max(0.05, Math.min(1, base + wobble + trend)));
  }
  return pts;
}
