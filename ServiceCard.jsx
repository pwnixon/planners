import { useState, useEffect } from 'react';
import {
  Box, Stack, Typography, Tooltip, Checkbox, IconButton, Collapse,
  Divider, Link, ToggleButton, ToggleButtonGroup,
  TextField, InputAdornment, Pagination, Icon as MuiIcon,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';
import InfoPopover from './InfoPopover';
import HoverPopover from './HoverPopover';
import CommitmentIcon, { iconStyleFor } from './CommitmentIcon';
import { SERVICE_ICON } from './serviceIcons';
import {
  TERMS, optionFor, serviceMetrics, sparkPoints, fmtMoney, fmtPct,
  serviceCommitments, aggregateOption, commitmentTerm, commitmentDetail, resourceDetail,
  resourceMatches, COVERAGE_TARGET,
} from './data';

// Selection highlight — branded alert bg: brand-primary light at 20% opacity
const selectedBg = alpha(palette.brandPrimary[50], 0.2);
// Native (non-guaranteed) selection — same treatment in the warning hue
const selectedBgNative = alpha(palette.warning[50], 0.2);
// On-demand baseline — borderless error tint: the costly state, not an option
const onDemandBg = alpha(semantic.error.light, 0.2);

// Column geometry — shared by the header, commitment rows, and footer so the
// term-comparison cells line up. `lead` holds the checkbox + drill chevron.
const COL = { lead: 76, info: 300, option: 168, optionMax: 230 };

// CSP brand colors — cloud-brand, not in Archera palette (mirrors AppShell PROVIDER constants)
// text: brand orange darkened for readability on light backgrounds
const CSP = { icon: '#FF9900', bg: '#fff3e0', text: '#C77700' }; // AWS

// ─── Usage read-out (read-only, neutral context) ─────────────────────────────
// Stability is informational only — it describes the usage shape, it does NOT
// recommend a term. The term decision stays the user's call. (Per-resource usage
// renders as the Historical Usage sparkline in the drill-down table below.)

// Commitment-level usage summary — neutral roll-up of the block's resources.
function commitmentUsage(instances) {
  const stable = instances.filter((i) => i.stable).length;
  if (stable === instances.length) return { label: 'Stable usage', tone: semantic.success.main };
  if (stable === 0) return { label: 'Variable usage', tone: semantic.warning.main };
  return { label: `Mixed usage · ${stable}/${instances.length} stable`, tone: palette.text.secondary };
}

// Commitment title text + color by guarantee style (from the selected term):
//   release  → brand-primary 700, keeps "Guaranteed"
//   rebate   → success 700, keeps "Guaranteed"
//   standard → text.primary, swaps "Guaranteed" → "Standard"
//   excluded → text.primary, unchanged
function commitmentTitle(vehicle, style) {
  if (style === 'release') return { text: vehicle, color: palette.brandPrimary[700] };
  if (style === 'rebate') return { text: vehicle, color: semantic.success.dark };
  if (style === 'standard') return { text: vehicle.replace(/Guaranteed/g, 'Standard'), color: palette.text.primary };
  return { text: vehicle, color: palette.text.primary };
}

// ─── Risk line: the counterweight to the savings number ─────────────────────

function riskParts(opt) {
  const term = TERMS[opt.termId];
  if (term.guaranteed) {
    return { left: term.lockDays <= 30 ? 'Exit monthly' : 'Guaranteed', right: '$0 at risk' };
  }
  return { left: term.lockLabel, right: `${fmtMoney(opt.atRisk)} at risk` };
}

function optionTooltip(commitment, opt) {
  const term = TERMS[opt.termId];
  const risk = riskParts(opt);
  return (
    <InfoPopover
      eyebrow={term.guaranteed ? 'Guaranteed' : 'Standard'}
      title={`${term.label} · ${commitment.vehicle || commitment.name}`}
      description={term.lockDetail}
      rows={[
        { k: 'Net Savings', val: `+${fmtMoney(opt.savingsMo)}/mo` },
        { k: `Savings rate${term.guaranteed ? ' (net)' : ''}`, val: fmtPct(opt.rate) },
        { k: 'Cost', val: `${fmtMoney(opt.commitCostMo)}/mo` },
        { k: 'Breakeven', val: `${Math.round(opt.breakevenDays)} days` },
        { k: 'Resources covered', val: `${commitment.instances.length}` },
        { k: 'Exit', val: risk.left },
        { k: 'At risk', val: opt.guaranteed ? '$0' : fmtMoney(opt.atRisk) },
      ]}
    />
  );
}

// ─── Compact option cell (term-comparison columns) ───────────────────────────

function CellRow({ label, value, valueColor = palette.text.primary }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ alignSelf: 'stretch' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ color: valueColor }}>{value}</Typography>
    </Stack>
  );
}

// Figma: commitment_radio (node 102:10494) — right-aligned text stack, minimal
// 14px radio pinned top-left. Hero number is monthly savings for this term.
function RadioCellFrame({ selected, borderColor, bg, onClick, tooltip, radio = true, children }) {
  return (
    <HoverPopover content={tooltip}>
      <Box
        onClick={onClick}
        sx={{
          position: 'relative',
          border: `1px solid ${borderColor}`,
          borderRadius: 1,
          px: 1.5,
          py: 1,
          cursor: onClick ? 'pointer' : 'default',
          width: COL.optionMax,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          alignItems: 'flex-end',
          bgcolor: bg,
          transition: 'box-shadow 0.15s ease',
          ...(onClick && { '&:hover': { boxShadow: elevation[2] } }),
        }}
      >
        {radio && (
          <MuiIcon
            {...(!selected && { baseClassName: 'material-icons-outlined' })}
            sx={{
              position: 'absolute',
              left: 5,
              top: 5,
              fontSize: 14,
              color: selected ? palette.uiPrimary[500] : palette.text.secondary,
            }}
          >
            {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
          </MuiIcon>
        )}
        {children}
      </Box>
    </HoverPopover>
  );
}

// One term option for a commitment — aggregated across its resources.
function OptionCell({ commitment, termId, selected, onSelect, showRisk, planView = false }) {
  const opt = aggregateOption(commitment.instances, termId);
  const term = TERMS[termId];
  const risk = riskParts(opt);
  const riskColor = term.guaranteed ? semantic.success.dark : semantic.warning.dark;
  // Plan view de-emphasizes unselected options: no border, light-grey fill, neutral savings.
  return (
    <RadioCellFrame
      selected={selected}
      borderColor={selected
        ? (term.guaranteed ? palette.brandPrimary[300] : palette.warning[300])
        : (planView ? 'transparent' : color.outlineBorder)}
      bg={selected
        ? (term.guaranteed ? selectedBg : selectedBgNative)
        : (planView ? alpha(palette.neutral[50], 0.7) : palette.surface)}
      onClick={onSelect} // selecting a term always sets it — exclude via the row checkbox, not the radio
      tooltip={optionTooltip(commitment, opt)}
    >
      <Typography variant="h6" sx={{ color: (planView && !selected) ? palette.text.primary : semantic.success.dark }}>
        +{fmtMoney(opt.savingsMo)}/mo
      </Typography>
      <CellRow label="Savings Rate" value={fmtPct(opt.rate)} />
      <CellRow label="Cost/mo" value={fmtMoney(opt.commitCostMo)} />
      {showRisk && (
        <>
          <Divider sx={{ alignSelf: 'stretch' }} />
          <Box sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>
            <Typography variant="caption" sx={{ color: riskColor, display: 'block' }}>• {risk.left}</Typography>
            <Typography variant="caption" sx={{ color: riskColor, display: 'block' }}>• {risk.right}</Typography>
          </Box>
        </>
      )}
    </RadioCellFrame>
  );
}

// Baseline reference — not selectable; deselecting the row's term is how a block
// stays on-demand. Framed as the inefficient state, never the flexible one.
function OnDemandCell({ commitment, visibleTermIds, showRisk }) {
  const costMo = commitment.instances.reduce((a, i) => a + i.costMo, 0);
  const missedMo = Math.max(...visibleTermIds.map((t) => aggregateOption(commitment.instances, t).savingsMo));
  return (
    <RadioCellFrame
      radio={false}
      borderColor="transparent"
      bg={onDemandBg}
      tooltip={(
        <InfoPopover
          eyebrow="Pricing"
          title="On-Demand"
          description="Paying full list price with no commitment. The most expensive option — every uncovered dollar is missed savings."
          rows={[
            { k: 'Cost', val: `${fmtMoney(costMo)}/mo` },
            { k: 'Net Savings', val: '$0' },
            { k: 'Missed net savings', val: `${fmtMoney(missedMo)}/mo` },
          ]}
        />
      )}
    >
      <Typography variant="h6" color="text.secondary">$0/mo</Typography>
      <CellRow label="Savings Rate" value="0%" valueColor={palette.text.secondary} />
      <CellRow label="Cost/mo" value={fmtMoney(costMo)} valueColor={palette.text.secondary} />
      {showRisk && (
        <>
          <Divider sx={{ alignSelf: 'stretch' }} />
          <Box sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>
            <Typography variant="caption" sx={{ color: semantic.error.dark, display: 'block' }}>• Premium pricing</Typography>
            <Typography variant="caption" sx={{ color: semantic.error.dark, display: 'block' }}>• missing {fmtMoney(missedMo)}/mo</Typography>
          </Box>
        </>
      )}
    </RadioCellFrame>
  );
}

// ─── Commitment table header ─────────────────────────────────────────────────

// Select-all radio in a column header — sets/clears that term across every
// commitment in the service (replaces the old per-column "apply to all" footer).
function SelectAllRadio({ selected, onClick, title, tone = palette.uiPrimary[500] }) {
  return (
    <Tooltip title={title}>
      <MuiIcon
        onClick={onClick}
        {...(!selected && { baseClassName: 'material-icons-outlined' })}
        sx={{ fontSize: 16, cursor: 'pointer', flexShrink: 0, color: selected ? tone : palette.text.secondary }}
      >
        {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
      </MuiIcon>
    </Tooltip>
  );
}

function CommitmentTableHeader({
  visibleTermIds, view, setView, hideOnDemand = false,
  showSelectAll = false, serviceId, serviceTerm, setServiceTerm, noneIncluded, commitmentCount = 0,
  planView = false,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-end"
      sx={{ px: 2, pt: 1, borderTop: `1px solid ${color.divider}`, bgcolor: palette.surface }}
    >
      <Box sx={{ flex: 1, minWidth: COL.lead + COL.info, pb: 1 }}>
        {planView ? (
          // Align the label over the commitment-name column, past the checkbox/chevron.
          <Stack direction="row" spacing={1.5}>
            <Box sx={{ width: COL.lead, flexShrink: 0 }} />
            <Typography variant="h6" color="text.secondary">Commitment</Typography>
          </Stack>
        ) : (
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)}>
            <ToggleButton value="commitment">By Commitment</ToggleButton>
            <ToggleButton value="service">By Service</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      <Stack direction="row" spacing={1} alignItems="flex-end">
        {!hideOnDemand && (
        <Box sx={{ width: COL.optionMax, flexShrink: 0, px: 1.5, pb: 1 }}>
          <Typography variant="micro" color="text.secondary" sx={{ display: 'block' }}>NO COMMITMENT</Typography>
          <Typography variant="h6" sx={{ color: semantic.error.dark }}>On-Demand</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>net savings /mo</Typography>
        </Box>
        )}
        {visibleTermIds.map((t) => {
          const term = TERMS[t];
          const lockDate = term.lockLabel.replace(/^Locked until /, '');
          return (
            <Box key={t} sx={{ width: COL.optionMax, flexShrink: 0, px: 1.5, pb: 1 }}>
              <Typography variant="micro" color="text.secondary" sx={{ display: 'block' }}>
                {term.guaranteed ? 'GUARANTEED' : 'NON-GUARANTEED'}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {showSelectAll && (
                  <SelectAllRadio
                    selected={serviceTerm === t}
                    onClick={() => setServiceTerm(serviceId, t)}
                    title={serviceTerm === t
                      ? `All ${commitmentCount} commitments on ${term.label}`
                      : `Apply ${term.label} to all ${commitmentCount} commitments`}
                  />
                )}
                <Typography variant="h6" sx={{ color: term.guaranteed ? palette.brandPrimary[500] : CSP.text }}>
                  {term.label}
                </Typography>
                {!term.guaranteed && (
                  <Tooltip
                    title={`Native ${term.short} locks you in until ${lockDate}. If your usage drops, you keep paying for the unused commitment until then — that remaining obligation is your amount at risk. Guaranteed terms carry $0 at risk: Archera buys back unused commitments.`}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ cursor: 'default' }}>
                      <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 14, color: semantic.warning.dark }}>lock</MuiIcon>
                      <Typography variant="caption" sx={{ color: semantic.warning.dark }}>{lockDate}</Typography>
                    </Stack>
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                est. net savings /mo
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── Read-only resource drill-down ───────────────────────────────────────────

// Resource table column widths + helpers
const RCOL = { rate: 100, savings: 156, cost: 112, covered: 156, usage: 150 };
const fmtRate = (v) => `$${v.toFixed(2)}`;
// Lookback window shown under each sparkline (mock — matches the 30-day usage panel).
const LOOKBACK = { start: 'May 17', end: 'Jun 15' };

function MiniSparkline({ instance }) {
  const pts = sparkPoints(instance);
  const w = 144;
  const h = 28;
  const x = (i) => ((i / (pts.length - 1)) * w).toFixed(1);
  const y = (p) => (h - 2 - p * (h - 4)).toFixed(1);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ');
  const stroke = instance.stable ? semantic.success.main : semantic.warning.main;
  return (
    <Box>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="micro" color="text.secondary">{LOOKBACK.start}</Typography>
        <Typography variant="micro" color="text.secondary">{LOOKBACK.end}</Typography>
      </Stack>
    </Box>
  );
}

// Per-resource derived values for the selected term (on-demand when uncovered).
function resourceRow(instance, selections) {
  const termId = selections[instance.id];
  const beforeHr = instance.costMo / 730;
  const opt = termId ? optionFor(instance, termId) : null;
  return {
    i: instance,
    beforeHr,
    afterHr: opt ? opt.commitCostMo / 730 : beforeHr,
    savings: opt ? opt.savingsMo : 0,
    cost: opt ? opt.commitCostMo : instance.costMo,
    onDemand: opt ? 0 : instance.costMo,
    covered: opt ? 1 : 0,
  };
}

function SortHeader({ label, sortKey, sort, setSort, width }) {
  const active = sort.key === sortKey;
  const icon = !active ? 'swap_vert' : (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward');
  const toggle = () => setSort((s) => (s.key === sortKey
    ? { key: sortKey, dir: s.dir === 'asc' ? 'desc' : 'asc' }
    : { key: sortKey, dir: sortKey === 'name' ? 'asc' : 'desc' }));
  return (
    <Box
      onClick={toggle}
      sx={{
        ...(width ? { width, flexShrink: 0, justifyContent: 'flex-end' } : { flex: 1, justifyContent: 'flex-start' }),
        display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', userSelect: 'none',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{label}</Typography>
      <MuiIcon sx={{ fontSize: 15, color: active ? palette.text.primary : palette.text.disabled }}>{icon}</MuiIcon>
    </Box>
  );
}

// Reusable read-only resource table — sortable, searchable + paginated. Used by
// both the commitment drill-down (a line item can cover thousands of resources)
// and the service drill-down (all of the service's resources).
function ResourceTable({ instances, infraSrc, service, selections, title = 'Covered resources · read-only', pageSize = 5 }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });

  const rows = instances.map((i) => resourceRow(i, selections));
  const q = query.trim().toLowerCase();
  const showSearch = instances.length > pageSize;
  let view = q
    ? rows.filter(({ i }) => [i.name, i.type, i.platform, i.region, i.resourceId].some((f) => f.toLowerCase().includes(q)))
    : rows;
  if (sort.key) {
    const acc = {
      name: (r) => r.i.name, before: (r) => r.beforeHr, after: (r) => r.afterHr,
      savings: (r) => r.savings, cost: (r) => r.cost, covered: (r) => r.covered,
    }[sort.key];
    view = [...view].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      const c = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sort.dir === 'asc' ? c : -c;
    });
  }
  const pages = Math.max(1, Math.ceil(view.length / pageSize));
  const current = Math.min(page, pages);
  const pageItems = view.slice((current - 1) * pageSize, current * pageSize);

  return (
    <Box sx={{ bgcolor: palette.neutral[50], borderTop: `1px solid ${color.divider}`, p: '2px 4px 4px' }}>
      <Box
        sx={{
          bgcolor: palette.surface,
          border: `1px solid ${color.outlineBorder}`,
          borderRadius: 1,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          overflow: 'hidden',
        }}
      >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1, pb: 0.5, gap: 1 }}>
        <Typography variant="overline" color="text.secondary">{title}</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {showSearch && (
            <Box sx={{ width: 220 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search resources"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 18 }}>search</MuiIcon>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            {q ? `${view.length} of ${instances.length}` : instances.length} resource{instances.length === 1 ? '' : 's'}
          </Typography>
        </Stack>
      </Stack>

      {/* Column headers */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 0.5, borderBottom: `1px solid ${color.divider}` }}>
        <SortHeader label="Resource" sortKey="name" sort={sort} setSort={setSort} />
        <SortHeader label="Before Rate" sortKey="before" sort={sort} setSort={setSort} width={RCOL.rate} />
        <SortHeader label="After Rate" sortKey="after" sort={sort} setSort={setSort} width={RCOL.rate} />
        <SortHeader label="Net Monthly Savings" sortKey="savings" sort={sort} setSort={setSort} width={RCOL.savings} />
        <SortHeader label="Monthly Cost" sortKey="cost" sort={sort} setSort={setSort} width={RCOL.cost} />
        <SortHeader label="% Instance Covered" sortKey="covered" sort={sort} setSort={setSort} width={RCOL.covered} />
        <Typography variant="body2" color="text.secondary" sx={{ width: RCOL.usage, flexShrink: 0, whiteSpace: 'nowrap' }}>Historical Usage</Typography>
      </Stack>

      {pageItems.map((r, idx) => (
        <Stack
          key={r.i.id}
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ px: 2, py: 1, borderTop: idx ? `1px solid ${color.divider}` : 'none' }}
        >
          <HoverPopover placement="left-start" interactive content={<ResourceDetailPopover instance={r.i} service={service} infraSrc={infraSrc} />}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0, cursor: 'default' }}>
            <Box component="img" src={infraSrc} alt="" sx={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.i.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {r.i.type} | {r.i.platform} | {r.i.region}
              </Typography>
              <Typography variant="caption" color="text.secondary">{r.i.resourceId}</Typography>
            </Box>
          </Stack>
          </HoverPopover>
          <Typography variant="body2" sx={{ width: RCOL.rate, flexShrink: 0, textAlign: 'right' }}>{fmtRate(r.beforeHr)}</Typography>
          <Typography variant="body2" sx={{ width: RCOL.rate, flexShrink: 0, textAlign: 'right' }}>{fmtRate(r.afterHr)}</Typography>
          <Typography
            variant="body2"
            sx={{ width: RCOL.savings, flexShrink: 0, textAlign: 'right', fontWeight: r.savings > 0 ? 600 : 400, color: r.savings > 0 ? semantic.success.dark : palette.text.secondary }}
          >
            {r.savings > 0 ? `+${fmtMoney(r.savings)}` : fmtMoney(0)}
          </Typography>
          <Box sx={{ width: RCOL.cost, flexShrink: 0, textAlign: 'right' }}>
            <Typography variant="body2">{fmtMoney(r.cost)}</Typography>
            <Typography variant="caption" color="text.secondary">{fmtMoney(r.onDemand)} on-demand</Typography>
          </Box>
          <Typography variant="body2" sx={{ width: RCOL.covered, flexShrink: 0, textAlign: 'right' }}>{fmtPct(r.covered)}</Typography>
          <Box sx={{ width: RCOL.usage, flexShrink: 0 }}><MiniSparkline instance={r.i} /></Box>
        </Stack>
      ))}
      {view.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
          No resources match “{query}”.
        </Typography>
      )}

      {pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Pagination size="small" count={pages} page={current} onChange={(e, v) => setPage(v)} />
        </Box>
      )}
      </Box>
    </Box>
  );
}

// ─── Commitment detail popover ───────────────────────────────────────────────
// Hover detail mirroring the term popovers: the commitment icon + identity, then
// key/value pairs for everything on the line item, each with a copy affordance.

function AccountBadge() {
  return (
    <Box
      sx={{
        width: 18, height: 18, borderRadius: 0.5, flexShrink: 0,
        bgcolor: palette.brandPrimary[500],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Typography variant="micro" sx={{ color: palette.neutral.white, fontWeight: 700, lineHeight: 1 }}>A</Typography>
    </Box>
  );
}

function AccountValue({ id }) {
  return (
    <Typography variant="body2" component="span">
      <Box component="span" sx={{ fontWeight: 600 }}>Archera Managed Account:</Box>{' '}
      <Box component="span" sx={{ color: 'text.secondary' }}>{id}</Box>
    </Typography>
  );
}

function CommitmentDetailPopover({ commitment, service, termId, infraSrc }) {
  const detail = commitmentDetail(commitment, service);
  const title = commitmentTitle(commitment.vehicle, iconStyleFor(termId));
  return (
    <Box sx={{ p: 2, width: 460 }}>
      {/* Header — icon + identity */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
        <Box sx={{ mt: 0.25 }}>
          <CommitmentIcon kind={commitment.kind} infraSrc={infraSrc} termId={termId} size={26} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'none', color: title.color }}>{title.text}</Typography>
          {detail.subline && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{detail.subline}</Typography>
          )}
        </Box>
      </Stack>

      {/* Key / value rows */}
      <Stack>
        {detail.rows.map((r) => (
          <Stack key={r.label} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25, borderTop: `1px solid ${color.divider}` }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>{r.label}:</Typography>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {r.account && <AccountBadge />}
              {r.account
                ? <AccountValue id={r.value} />
                : <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{r.value}</Typography>}
            </Box>
            <Tooltip title="Copy">
              <IconButton size="small" onClick={() => navigator.clipboard?.writeText(String(r.value))} sx={{ flexShrink: 0, p: 0.25 }}>
                <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 15, color: palette.text.secondary }}>content_copy</MuiIcon>
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
      </Stack>

      {/* Footer — RI size-flexibility helper */}
      {detail.riFooter && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.5 }}>
          <MuiIcon sx={{ fontSize: 16, color: palette.uiPrimary[500] }}>info</MuiIcon>
          <Link component="button" variant="body2" underline="hover">Why this Size?</Link>
          <Typography variant="body2" color="text.secondary">Learn about</Typography>
          <Link component="button" variant="body2" underline="hover">Instance Size Flexibility</Link>
          <MuiIcon sx={{ fontSize: 14, color: palette.uiPrimary[500] }}>open_in_new</MuiIcon>
        </Stack>
      )}
    </Box>
  );
}

// Per-resource hover detail — same key/value treatment as the commitment popover.
function ResourceDetailPopover({ instance, service, infraSrc }) {
  const detail = resourceDetail(instance, service);
  return (
    <Box sx={{ p: 2, width: 420 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
        <Box component="img" src={infraSrc} alt="" sx={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0, mt: 0.25 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'none' }}>{instance.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{detail.subline}</Typography>
        </Box>
      </Stack>
      <Stack>
        {detail.rows.map((r) => (
          <Stack key={r.label} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25, borderTop: `1px solid ${color.divider}` }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>{r.label}:</Typography>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {r.account && <AccountBadge />}
              {r.account
                ? <AccountValue id={r.value} />
                : <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{r.value}</Typography>}
            </Box>
            <Tooltip title="Copy">
              <IconButton size="small" onClick={() => navigator.clipboard?.writeText(String(r.value))} sx={{ flexShrink: 0, p: 0.25 }}>
                <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 15, color: palette.text.secondary }}>content_copy</MuiIcon>
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Commitment row ──────────────────────────────────────────────────────────

function CommitmentRow({ commitment, service, infraSrc, selections, setCommitmentTerm, visibleTermIds, resourceQuery, hideOnDemand, planView }) {
  const [open, setOpen] = useState(false);
  const ct = commitmentTerm(commitment, selections);
  const included = ct !== null;
  const ids = commitment.instances.map((i) => i.id);
  // Current monthly cost of the block: committed cost where a term is selected,
  // on-demand where the resource is excluded (so it tracks the selection).
  const costMo = commitment.instances.reduce((a, i) => {
    const t = selections[i.id];
    return a + (t ? optionFor(i, t).commitCostMo : i.costMo);
  }, 0);
  const usage = commitmentUsage(commitment.instances);
  const title = commitmentTitle(commitment.vehicle, iconStyleFor(ct));
  const hasMatch = Boolean(resourceQuery) && commitment.instances.some((i) => resourceMatches(i, resourceQuery));
  const dOpen = open || hasMatch;

  return (
    <Box sx={{ borderTop: `1px solid ${color.divider}` }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, px: 2 }}>
        {/* Lead: include/exclude + drill chevron */}
        <Stack direction="row" alignItems="center" sx={{ width: COL.lead, flexShrink: 0 }}>
          <Tooltip title={included ? 'Exclude this commitment — its resources stay on-demand' : 'Include this commitment (30-day Guaranteed)'}>
            <Checkbox
              checked={included}
              indeterminate={ct === 'mixed'}
              onChange={() => setCommitmentTerm(ids, included ? null : 'archera_30d')}
            />
          </Tooltip>
          <Tooltip title={dOpen ? 'Hide covered resources' : 'Show covered resources'}>
            <IconButton size="small" onClick={() => setOpen((o) => !o)}>
              <MuiIcon sx={{ fontSize: 20 }}>{dOpen ? 'expand_less' : 'expand_more'}</MuiIcon>
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Commitment identity — vehicle, then the scope it covers. Hover for the
            full commitment detail (key/value pairs). */}
        <HoverPopover
          placement="left-start"
          interactive
          content={<CommitmentDetailPopover commitment={commitment} service={service} termId={ct} infraSrc={infraSrc} />}
        >
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ flex: 1, minWidth: COL.info, cursor: 'default' }}>
          <Box sx={{ mt: 0.25 }}>
            <CommitmentIcon kind={commitment.kind} infraSrc={infraSrc} termId={ct} size={32} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: title.color }}>{title.text}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{commitment.scope}</Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary">
                {commitment.instances.length} resource{commitment.instances.length === 1 ? '' : 's'} · {fmtMoney(costMo)}/mo
              </Typography>
              <Typography variant="caption" sx={{ color: usage.tone, fontWeight: 500 }}>· {usage.label}</Typography>
            </Stack>
          </Box>
        </Stack>
        </HoverPopover>

        {/* Term comparison */}
        <Stack direction="row" spacing={1}>
          {!hideOnDemand && <OnDemandCell commitment={commitment} visibleTermIds={visibleTermIds} showRisk={false} />}
          {visibleTermIds.map((t) => (
            <OptionCell
              key={t}
              commitment={commitment}
              termId={t}
              selected={ct === t}
              onSelect={() => setCommitmentTerm(ids, t)}
              showRisk={false}
              planView={planView}
            />
          ))}
        </Stack>
      </Stack>

      {/* Drill-down: the resources this commitment covers (read-only, searchable/paginated) */}
      <Collapse in={dOpen}>
        <ResourceTable instances={commitment.instances} infraSrc={infraSrc} service={service} selections={selections} query={resourceQuery} />
      </Collapse>
    </Box>
  );
}

// ─── Coverage bar (Figma node 151:15296) ────────────────────────────────────
// Stacked coverage: current (error) → projected (success) on a neutral track,
// with white % labels and a gold target tick, plus a legend below.
// ds-audit-ignore-start — brand-accent-1/500 (#ffd080) not yet in the palette
const TARGET_TICK = '#ffd080';
// ds-audit-ignore-end
function CoverageBar({ current, projected, target }) {
  const pct = (v) => `${Math.round(v * 100)}%`;
  const greenW = Math.max(0, projected - current);
  return (
    <Stack spacing={1} sx={{ borderTop: `1px solid ${color.outlineBorder}`, pt: 1.5 }}>
      <Box sx={{ position: 'relative', height: 24, borderRadius: '4px', bgcolor: palette.neutral[300], overflow: 'hidden', display: 'flex' }}>
        <Box sx={{ width: `${current * 100}%`, bgcolor: semantic.error.main, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ color: palette.neutral.white, pl: 1, whiteSpace: 'nowrap' }}>{pct(current)}</Typography>
        </Box>
        <Box sx={{ width: `${greenW * 100}%`, bgcolor: semantic.success.main, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ color: palette.neutral.white, pl: 1, whiteSpace: 'nowrap' }}>{pct(projected)}</Typography>
        </Box>
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: `${target * 100}%`, width: '2px', bgcolor: TARGET_TICK }} />
      </Box>
      <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="caption" sx={{ fontWeight: 700 }}>Coverage:</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 10, borderRadius: '2px', bgcolor: semantic.error.main, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">Now ({pct(current)})</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 10, borderRadius: '2px', bgcolor: semantic.success.main, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">With this plan: ({pct(projected)} | target: {pct(target)})</Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

// ─── Service-level aggregate row (By Service view) ──────────────────────────
// One term decision for the whole service, applied across all its commitments.
// Drill-down shows every resource in the service (searchable / paginated).

function ServiceAggregateRow({ service, infraSrc, serviceTerm, allIncluded, noneIncluded, setServiceTerm, visibleTermIds, selections, resourceQuery, hideOnDemand }) {
  const [open, setOpen] = useState(false);
  const allInst = service.instances;
  const pseudo = { instances: allInst, name: service.name };
  const costMo = allInst.reduce((a, i) => {
    const t = selections[i.id];
    return a + (t ? optionFor(i, t).commitCostMo : i.costMo);
  }, 0);
  const commitmentCount = serviceCommitments(service).length;
  const usage = commitmentUsage(allInst);
  const hasMatch = Boolean(resourceQuery) && allInst.some((i) => resourceMatches(i, resourceQuery));
  const dOpen = open || hasMatch;

  return (
    <Box sx={{ borderTop: `1px solid ${color.divider}` }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, px: 2 }}>
        <Stack direction="row" alignItems="center" sx={{ width: COL.lead, flexShrink: 0 }}>
          <Tooltip title={allIncluded ? `Exclude all ${service.name} — stays on-demand` : `Include all ${service.name} (30-day Guaranteed)`}>
            <Checkbox
              checked={allIncluded}
              indeterminate={!allIncluded && !noneIncluded}
              onChange={() => setServiceTerm(service.id, allIncluded ? null : 'archera_30d')}
            />
          </Tooltip>
          <Tooltip title={dOpen ? 'Hide resources' : 'Show all resources'}>
            <IconButton size="small" onClick={() => setOpen((o) => !o)}>
              <MuiIcon sx={{ fontSize: 20 }}>{dOpen ? 'expand_less' : 'expand_more'}</MuiIcon>
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: COL.info }}>
          <CommitmentIcon kind="ri" infraSrc={infraSrc} termId={serviceTerm} size={44} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ color: commitmentTitle(service.name, iconStyleFor(serviceTerm)).color }}>All {service.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {commitmentCount} commitment{commitmentCount === 1 ? '' : 's'} · {allInst.length} resources
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary">{fmtMoney(costMo)}/mo</Typography>
              <Typography variant="caption" sx={{ color: usage.tone, fontWeight: 500 }}>· {usage.label}</Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          {!hideOnDemand && <OnDemandCell commitment={pseudo} visibleTermIds={visibleTermIds} showRisk />}
          {visibleTermIds.map((t) => (
            <OptionCell
              key={t}
              commitment={pseudo}
              termId={t}
              selected={serviceTerm === t}
              onSelect={() => setServiceTerm(service.id, t)}
              showRisk
            />
          ))}
        </Stack>
      </Stack>

      <Collapse in={dOpen}>
        <ResourceTable instances={allInst} infraSrc={infraSrc} service={service} selections={selections} query={resourceQuery} title="All resources · read-only" />
      </Collapse>
    </Box>
  );
}

// ─── Service card ────────────────────────────────────────────────────────────

export default function ServiceCard({ service, selections, setCommitmentTerm, setServiceTerm, visibleTermIds, resourceQuery, planView = false, compareMode = false }) {
  const m = serviceMetrics(service, selections);
  const commitments = serviceCommitments(service);

  // Service-wide include state (drives the header checkbox + footer "apply to all")
  const includedTerms = service.instances.map((i) => selections[i.id]).filter(Boolean);
  const allIncluded = includedTerms.length === service.instances.length;
  const noneIncluded = includedTerms.length === 0;
  const serviceTerm = allIncluded && includedTerms.every((t) => t === includedTerms[0])
    ? includedTerms[0]
    : null;

  // Plan-view header KPIs are color-coded independently. Coverage by health:
  // excluded → error, under-covered → warning, otherwise success. Savings is green
  // when there's any, neutral grey at $0 (no savings is a neutral fact, not an alarm).
  const COVERAGE_WARN = 0.6;
  const coverageColor = noneIncluded
    ? semantic.error.main
    : m.projectedCoverage < COVERAGE_WARN
      ? semantic.warning.main
      : semantic.success.main;
  const savingsColor = m.savingsMo > 0 ? semantic.success.main : palette.text.secondary;

  // Plan view: the page-level "Compare terms" switch (compareMode) bulk-expands every
  // card; default off → all closed, so the comparison grid is opt-in and never
  // overwhelms. The chevron still toggles an individual card between switch changes.
  // The builder collapses a card only when its service drops out of the plan.
  const [expanded, setExpanded] = useState(planView ? compareMode : !noneIncluded);
  useEffect(() => { if (planView) setExpanded(compareMode); }, [planView, compareMode]);
  useEffect(() => { if (!planView) setExpanded(!noneIncluded); }, [noneIncluded, planView]);

  // Granularity: per line item (default) or one term for the whole service.
  const [view, setView] = useState('commitment');

  return (
    <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, opacity: noneIncluded ? 0.6 : 1 }}>
        <Tooltip
          title={allIncluded
            ? `Exclude all ${service.instances.length} ${service.name} resources — they stay on-demand`
            : `Include all ${service.instances.length} ${service.name} resources (30-day Guaranteed)`}
        >
          <Checkbox
            checked={allIncluded}
            indeterminate={!allIncluded && !noneIncluded}
            onChange={() => setServiceTerm(service.id, allIncluded ? null : 'archera_30d')}
          />
        </Tooltip>
        <Box component="img" src={SERVICE_ICON[service.id]} alt="" sx={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }} />
        {/* ds-audit-ignore-start — literal header type sizes per Figma node 151:15296 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4">
            <Box component="span" sx={{ fontWeight: 500, color: palette.text.primary }}>{service.name}</Box>
            <Box component="span" sx={{ fontWeight: 400, color: palette.text.secondary }}>{`  |  ${service.category}`}</Box>
          </Typography>
          <Typography sx={{ fontSize: 16, lineHeight: 1.5, color: palette.text.secondary, mt: 0.25 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>{service.instances.length}</Box>
            {` resource${service.instances.length === 1 ? '' : 's'} covered by `}
            <Box component="span" sx={{ fontWeight: 700 }}>{commitments.length}</Box>
            {` commitment${commitments.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        {planView ? (
          // Plan view: two KPIs (Coverage, Net Monthly Savings) styled like the
          // plan-section KPI cards (plan-colored icon tile + h5 label + h2 value),
          // without the card border/padding, separated by a divider.
          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: 2, flexShrink: 0, bgcolor: alpha(coverageColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 28, color: coverageColor }}>verified_user</MuiIcon>
              </Box>
              <Box>
                <Typography variant="h6">Coverage</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: coverageColor }}>{fmtPct(m.projectedCoverage)}</Typography>
              </Box>
            </Stack>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: 2, flexShrink: 0, bgcolor: alpha(savingsColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 28, color: savingsColor }}>savings</MuiIcon>
              </Box>
              <Box>
                <Typography variant="h6">Net Monthly Savings</Typography>
                <Stack direction="row" spacing={0.5} alignItems="baseline">
                  <Typography variant="h3" sx={{ fontWeight: 700, color: savingsColor }}>{fmtMoney(m.savingsMo)}</Typography>
                  <Typography variant="body3" color="text.secondary">/mo</Typography>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.15px', color: palette.text.secondary }}>Net Monthly Savings</Typography>
              <Stack direction="row" spacing={0.5} alignItems="baseline" justifyContent="flex-end">
                <Typography sx={{ fontSize: 24, fontWeight: 700, color: palette.text.primary }}>{fmtMoney(m.savingsMo)}</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 500, color: palette.text.secondary }}>/mo</Typography>
              </Stack>
            </Box>
            <Box sx={{ width: 48, height: 48, borderRadius: '8px', flexShrink: 0, bgcolor: alpha(semantic.success.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 28, color: semantic.success.main }}>savings</MuiIcon>
            </Box>
          </Stack>
        )}
        {/* ds-audit-ignore-end */}
        {/* Plan view: the chevron only appears once "Compare terms" is on — until
            then the card is a summary and the page-level switch is the sole way in.
            Builder always shows it. */}
        {(!planView || compareMode) && (
          <Tooltip title={expanded ? 'Collapse commitments' : 'Expand commitments'}>
            <IconButton size="small" onClick={() => setExpanded((e) => !e)}>
              <MuiIcon sx={{ fontSize: 22 }}>{expanded ? 'expand_less' : 'expand_more'}</MuiIcon>
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Coverage bar stays visible even when the card is minimized (builder only —
          plan view surfaces coverage as a header KPI instead) */}
      {!planView && (
        <Box sx={{ px: 2, pb: 1 }}>
          <CoverageBar current={m.currentCoverage} projected={m.projectedCoverage} target={COVERAGE_TARGET} />
        </Box>
      )}

      <Collapse in={expanded || Boolean(resourceQuery)}>
        {/* Comparison table */}
        <Box sx={{ pb: 1 }}>
          <CommitmentTableHeader
            visibleTermIds={visibleTermIds}
            view={view}
            setView={setView}
            hideOnDemand={planView}
            planView={planView}
            showSelectAll={view === 'commitment'}
            serviceId={service.id}
            serviceTerm={serviceTerm}
            setServiceTerm={setServiceTerm}
            noneIncluded={noneIncluded}
            commitmentCount={commitments.length}
          />
          {view === 'commitment' ? (
            commitments.map((c) => (
              <CommitmentRow
                key={c.key}
                commitment={c}
                service={service}
                infraSrc={SERVICE_ICON[service.id]}
                selections={selections}
                setCommitmentTerm={setCommitmentTerm}
                visibleTermIds={visibleTermIds}
                resourceQuery={resourceQuery}
                hideOnDemand={planView}
                planView={planView}
              />
            ))
          ) : (
            <ServiceAggregateRow
              service={service}
              infraSrc={SERVICE_ICON[service.id]}
              serviceTerm={serviceTerm}
              allIncluded={allIncluded}
              noneIncluded={noneIncluded}
              setServiceTerm={setServiceTerm}
              visibleTermIds={visibleTermIds}
              selections={selections}
              resourceQuery={resourceQuery}
              hideOnDemand={planView}
            />
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
