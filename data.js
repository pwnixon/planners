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
    commitmentVehicle: 'Guaranteed Compute Savings Plans (GSPs)',
    // How this service's usage is covered: a Compute Savings Plan is an
    // account-level commitment (one line item covering the whole block).
    coverage: { kind: 'sp', vehicle: 'Guaranteed Compute Savings Plan', account: '093856039998' },
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
    // Reserved Instances are scoped per instance-family · region · engine, so a
    // service yields one line item per distinct combination.
    coverage: { kind: 'ri', vehicle: 'RDS Guaranteed RI', account: '093856039998' },
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
    coverage: { kind: 'ri', vehicle: 'ElastiCache Guaranteed RI', account: '093856039998' },
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
    commitmentVehicle: 'Guaranteed Compute Savings Plans (GSPs)',
    coverage: { kind: 'sp', vehicle: 'Guaranteed Compute Savings Plan', account: '093856039998' },
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

// A commitment is treated as "stable" only when every resource it covers is
// stable — the term decision is made for the whole block, not per resource.
const commitmentStable = (c) => c.instances.every((i) => i.stable);

export const PRESETS = {
  recommended: {
    label: 'Recommended',
    term: '30 Days',
    desc: '30-day Guaranteed Commitments on every coverable commitment. Exit monthly, $0 at risk — built nightly from your last 7 days of usage.',
    pickC: () => 'archera_30d',
  },
  balanced: {
    label: 'Balanced',
    term: '1 Year',
    desc: '1-year Guaranteed Commitments on blocks with 90+ days of stable usage, 30-day Guaranteed everywhere else.',
    pickC: (c) => (commitmentStable(c) ? 'archera_1y' : 'archera_30d'),
  },
  high_savings: {
    label: 'High Savings',
    term: '3 Years',
    desc: 'Native 3-year commitments on stable blocks, 1-year Guaranteed elsewhere. Highest rate — longest lock-in.',
    pickC: (c) => (commitmentStable(c) ? 'aws_3y' : 'archera_1y'),
    needsNative: true,
  },
};

// Per-plan summary for the strategy cards: projected net monthly savings + term.
export function planSummary(presetId, selections) {
  if (presetId === 'custom') {
    const m = pageMetrics(selections);
    const hasAny = Object.values(selections).some(Boolean);
    return { savings: hasAny ? fmtMoney(m.savingsMo.projected) : '—', term: '—' };
  }
  const m = pageMetrics(applyPreset(presetId));
  return { savings: fmtMoney(m.savingsMo.projected), term: PRESETS[presetId].term };
}

// Sentinel passed to the term setters by the include checkbox: "re-include this
// block at whatever term it last had" (not a hardcoded 30-day), so toggling a
// commitment off and back on round-trips and keeps plan auto-detection honest.
export const RESTORE_TERM = '__restore__';

export function applyPreset(presetId) {
  const preset = PRESETS[presetId];
  const sel = {};
  allCommitments().forEach((c) => {
    const term = preset.pickC(c);
    c.instances.forEach((i) => { sel[i.id] = term; });
  });
  return sel;
}

// Which plan do the current selections correspond to? Derived, never stored —
// editing a predefined plan makes it custom; reverting the edit makes it
// predefined again (required for automation eligibility). Compared at the
// commitment level, matching how terms are assigned.
export function detectPlan(selections) {
  const match = Object.entries(PRESETS).find(([, preset]) =>
    allCommitments().every((c) => commitmentTerm(c, selections) === preset.pickC(c)));
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

// ─── Commitments (line items) ────────────────────────────────────────────────
// A commitment groups a block of resources within a service that are covered
// together under a single term — the unit the user makes term decisions on.
// Resources roll up via their `commitment` field; the instance list is the
// (read-only) drill-down beneath each commitment.

// Instance family from a type string: 'db.r6g.xlarge' → 'db.r6g',
// 'cache.t4g.small' → 'cache.t4g'. (RIs are size-flexible within a family.)
function familyOf(type) {
  const parts = type.split('.');
  return parts.length >= 3 ? parts.slice(0, -1).join('.') : type;
}

// Commitments are grouped by the cloud's own constructs, mirroring the live
// commitment grid:
//   • Savings Plans (kind 'sp') — one account-level line item covering the block.
//   • Reserved Instances (kind 'ri') — one line item per instance-family · region · engine.
export function serviceCommitments(service) {
  const cov = service.coverage;
  if (cov.kind === 'sp') {
    return [{
      key: `${service.id}:sp`,
      vehicle: cov.vehicle,
      kind: 'sp',
      scope: `Archera Managed Account: ${cov.account}`,
      account: cov.account,
      instances: service.instances,
    }];
  }
  const order = [];
  const byKey = {};
  service.instances.forEach((i) => {
    const fam = familyOf(i.type);
    const gk = `${fam}|${i.region}|${i.platform}`;
    if (!byKey[gk]) {
      byKey[gk] = {
        key: `${service.id}:${gk}`,
        vehicle: cov.vehicle,
        kind: 'ri',
        scope: `${fam} · ${i.region} · ${i.platform}`,
        account: cov.account,
        instances: [],
      };
      order.push(gk);
    }
    byKey[gk].instances.push(i);
  });
  return order.map((k) => byKey[k]);
}

// Every commitment across all services — the unit presets and plan detection
// operate on (term decisions live at the commitment level, not per resource).
export function allCommitments() {
  return SERVICES.flatMap((s) => serviceCommitments(s));
}

// Aggregate a single term option across a block of resources (commitment- or
// service-level). Mirrors optionFor but summed, with cost-weighted breakeven.
export function aggregateOption(instances, termId) {
  let savingsMo = 0;
  let costMo = 0;
  let commitCostMo = 0;
  let atRisk = 0;
  let beWeighted = 0;
  instances.forEach((i) => {
    const o = optionFor(i, termId);
    savingsMo += o.savingsMo;
    costMo += i.costMo;
    commitCostMo += o.commitCostMo;
    atRisk += o.atRisk;
    beWeighted += o.breakevenDays * i.costMo;
  });
  return {
    termId,
    savingsMo,
    costMo,
    commitCostMo,
    atRisk,
    rate: costMo ? savingsMo / costMo : 0,
    breakevenDays: costMo ? beWeighted / costMo : 0,
    guaranteed: TERMS[termId].guaranteed,
  };
}

// The single term applied across a commitment's resources:
//   null    → excluded (on-demand)
//   'mixed' → resources are on different terms (shouldn't happen via the UI)
//   termId  → the uniform term covering the block
export function commitmentTerm(commitment, selections) {
  const terms = commitment.instances.map((i) => selections[i.id]);
  const included = terms.filter(Boolean);
  if (included.length === 0) return null;
  if (included.length === terms.length && included.every((t) => t === included[0])) return included[0];
  return 'mixed';
}

// Does a resource match a free-text query (name / type / platform / region / id)?
export function resourceMatches(instance, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return [instance.name, instance.type, instance.platform, instance.region, instance.resourceId]
    .some((f) => String(f).toLowerCase().includes(q));
}

// Number of commitments (line items) actually in the plan — the user-facing count.
export function planCommitmentCount(selections) {
  return allCommitments().filter((c) => commitmentTerm(c, selections) !== null).length;
}

// Cloud API service names for the commitment detail popover.
const API_NAME = { ec2: 'AmazonEC2', rds: 'AmazonRDS', elasticache: 'AmazonElastiCache', lambda: 'AWSLambda' };

// Deterministic pseudo-UUID for a commitment's "Line Item API ID" (no Math.random
// so renders are stable / resumable).
function lineId(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  const a = hex(h);
  const b = hex(h * 2654435761);
  const c = hex(h ^ 0x9e3779b9);
  const d = hex(h + 0x7f4a7c15);
  return `${a}-${b.slice(0, 4)}-${b.slice(4, 8)}-${c.slice(0, 4)}-${c.slice(4, 8)}${d.slice(0, 4)}`;
}

// Detail rows for a commitment's hover popover — key/value pairs of everything
// relevant to the line item, mirroring the live commitment-grid detail card.
export function commitmentDetail(commitment, service) {
  const account = commitment.account;
  if (commitment.kind === 'sp') {
    return {
      account,
      subline: null,
      rows: [
        { label: 'Account ID', value: account, account: true },
        { label: 'Type', value: 'aws/savingsplan/Compute' },
        { label: 'Plan', value: 'Compute' },
        { label: 'Payment Option', value: 'No Upfront' },
        { label: 'Commitment Kind', value: commitment.vehicle },
        { label: 'Instance Size Flexible', value: 'No' },
        { label: 'Line Item API ID', value: lineId(commitment.key) },
      ],
    };
  }
  const i0 = commitment.instances[0];
  const fam = familyOf(i0.type);
  return {
    account,
    subline: `${i0.type} | ${i0.region} | ${i0.platform} | Single-AZ`,
    riFooter: true,
    rows: [
      { label: 'Account ID', value: account, account: true },
      { label: 'Region', value: i0.region },
      { label: 'Type', value: `aws/${API_NAME[service.id] || service.name}` },
      { label: 'Instance Type', value: i0.type },
      { label: 'Instance Family', value: fam },
      { label: 'Product Description', value: i0.platform },
      { label: 'AZ Type', value: 'Single-AZ' },
      { label: 'Payment Option', value: 'No Upfront' },
      { label: 'Commitment Kind', value: commitment.vehicle },
      { label: 'Instance Size Flexible', value: 'Yes' },
      { label: 'Line Item API ID', value: lineId(commitment.key) },
    ],
  };
}

// Detail rows for an individual resource's hover popover — same key/value shape
// as the commitment detail, scoped to one instance.
export function resourceDetail(instance, service) {
  const account = service && service.coverage ? service.coverage.account : null;
  return {
    account,
    subline: `${instance.type} | ${instance.region} | ${instance.platform}`,
    rows: [
      ...(account ? [{ label: 'Account ID', value: account, account: true }] : []),
      { label: 'Region', value: instance.region },
      { label: 'Type', value: `aws/${(service && API_NAME[service.id]) || (service && service.name) || ''}` },
      { label: 'Instance Type', value: instance.type },
      { label: 'Instance Family', value: familyOf(instance.type) },
      { label: 'Product Description', value: instance.platform },
      { label: 'On-Demand Cost', value: `${fmtMoney(instance.costMo)}/mo` },
      { label: 'Usage', value: instance.stable ? 'Stable (90+ days)' : 'Variable' },
      { label: 'Resource ID', value: instance.resourceId },
    ],
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
    label: 'Net Monthly Savings',
    noun: 'Net Monthly Savings',
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
    desc: 'The time after which savings surpass the remaining commitment.',
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
    label: 'Annualized Net Savings Run-Rate',
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

// ─── Plan-view KPIs ──────────────────────────────────────────────────────────
// The plan-forward Commitment Planner shows a fixed, non-configurable trio:
// coverage, breakeven, and upfront. Upfront is plan-view-only (not in the builder's
// KPI library) and is always $0 — Guaranteed Commitments carry no upfront payment.
export const UPFRONT_KPI = {
  id: 'upfront',
  label: 'Upfront Payment',
  noun: 'Upfront Payment',
  group: 'Finance',
  icon: 'payments',
  unit: '',
  desc: 'Guaranteed Commitments require no upfront — nothing is due today.',
  get: () => ({ current: '$0', projected: '$0', delta: 'none required', good: true }),
};

export const PLAN_KPIS = [
  KPI_CATALOG.find((k) => k.id === 'coverage'),
  KPI_CATALOG.find((k) => k.id === 'breakeven'),
  UPFRONT_KPI,
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
