import { useState, useEffect } from 'react';
import {
  Box, Stack, Typography, Tooltip, Chip, Radio, Checkbox, IconButton, Collapse,
  ToggleButton, ToggleButtonGroup, LinearProgress, Divider, Icon as MuiIcon,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';
import InfoPopover from './InfoPopover';
import HoverPopover from './HoverPopover';

// Selection highlight — branded alert bg: brand-primary light at 20% opacity
const selectedBg = alpha(palette.brandPrimary[50], 0.2);
// Native (non-guaranteed) selection — same treatment in the warning hue
const selectedBgNative = alpha(palette.warning[50], 0.2);
// On-demand baseline — borderless error tint: the costly state, not an option
const onDemandBg = alpha(semantic.error.light, 0.2);

// By Instance column widths — header row mirrors InstanceRow exactly
// Term columns flex to fill the space freed by the removed usage column, but cap
// at optionMax so they don't sprawl when only one or two term types are selected.
const COL = { checkbox: 42, info: 220, option: 184, optionMax: 264 };

// CSP brand colors — cloud-brand, not in Archera palette (mirrors AppShell PROVIDER constants)
// text: brand orange darkened for readability on light backgrounds
const CSP = { icon: '#FF9900', bg: '#fff3e0', text: '#C77700' }; // AWS
import {
  TERMS, TERM_ORDER, optionFor, serviceMetrics, sparkPoints,
  fmtMoney, fmtPct,
} from './data';

// ─── Usage: inline read-out under the resource info + detailed hover chart ───

// Detailed usage-over-period chart shown on hover (richer than the old inline
// sparkline): filled area, gridlines, period axis, and the stable/variable read.
function UsageChart({ instance }) {
  const pts = sparkPoints(instance);
  const w = 256;
  const h = 88;
  const pad = 4;
  const x = (i) => ((i / (pts.length - 1)) * w).toFixed(1);
  const y = (p) => (h - pad - p * (h - pad * 2)).toFixed(1);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const stroke = instance.stable ? semantic.success.main : semantic.warning.main;
  return (
    <Box sx={{ p: 2, width: 288 }}>
      <Typography variant="micro" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Usage · last 90 days</Typography>
      <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
        {instance.stable ? 'Stable usage' : 'Variable usage'}
      </Typography>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={y(g)} y2={y(g)} stroke={color.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={alpha(stroke, 0.15)} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">90d ago</Typography>
        <Typography variant="caption" color="text.secondary">today</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {instance.stable
          ? 'Ran continuously for 90+ days — longer commitment terms are safe here.'
          : 'Demand fluctuates — shorter Guaranteed terms protect you if it drops.'}
      </Typography>
    </Box>
  );
}

// Inline read-out placed under the resource info; hover for the full chart.
function UsageIndicator({ instance }) {
  const tone = instance.stable ? semantic.success.main : semantic.warning.main;
  return (
    <HoverPopover content={<UsageChart instance={instance} />}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, width: 'fit-content', cursor: 'default' }}>
        <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 14, color: tone }}>show_chart</MuiIcon>
        <Typography variant="caption" color="text.secondary">Usage</Typography>
        <Typography variant="caption" sx={{ color: tone, fontWeight: 500 }}>
          · {instance.stable ? 'Stable' : 'Variable'}
        </Typography>
      </Stack>
    </HoverPopover>
  );
}

// ─── Risk line: the counterweight to the savings number ─────────────────────

function riskParts(opt) {
  const term = TERMS[opt.termId];
  if (term.guaranteed) {
    return { left: term.lockDays <= 30 ? 'Exit monthly' : 'Guaranteed', right: '$0 at risk' };
  }
  return { left: term.lockLabel, right: `${fmtMoney(opt.atRisk)} at risk` };
}

function riskLine(opt) {
  const p = riskParts(opt);
  return `${p.left} · ${p.right}`;
}

function optionTooltip(instance, opt) {
  const term = TERMS[opt.termId];
  const risk = riskParts(opt);
  return (
    <InfoPopover
      eyebrow={term.guaranteed ? 'Guaranteed' : 'Standard'}
      title={`${term.label} Commitment`}
      description={term.lockDetail}
      rows={[
        { k: 'Savings', val: `+${fmtMoney(opt.savingsMo)}/mo` },
        { k: `Savings rate${term.guaranteed ? ' (net)' : ''}`, val: fmtPct(opt.rate) },
        { k: 'Cost', val: `${fmtMoney(opt.commitCostMo)}/mo` },
        { k: 'Breakeven', val: `${Math.round(opt.breakevenDays)} days` },
        { k: 'Exit', val: risk.left },
        { k: 'At risk', val: term.guaranteed ? '$0' : fmtMoney(opt.atRisk) },
      ]}
    />
  );
}

// ─── Compact option card (By Instance table) ─────────────────────────────────

// Key/value row for the compact cells — mirrors the service-card CardRow
function CellRow({ label, value, valueColor = palette.text.primary }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ alignSelf: 'stretch' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ color: valueColor }}>{value}</Typography>
    </Stack>
  );
}

// Figma: commitment_radio (node 102:10494) — right-aligned text stack,
// minimal 14px radio pinned top-left. Hero number is effective monthly cost
// so every column (including Stay On-Demand) compares the same metric.
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
          flex: 1,
          minWidth: COL.option,
          maxWidth: COL.optionMax,
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

function OptionCell({ instance, termId, selected, onSelect }) {
  const opt = optionFor(instance, termId);
  const term = TERMS[termId];
  const risk = riskParts(opt);
  const riskColor = term.guaranteed ? semantic.success.dark : semantic.warning.dark;
  return (
    <RadioCellFrame
      selected={selected}
      borderColor={selected
        ? (term.guaranteed ? palette.brandPrimary[300] : palette.warning[300])
        : color.outlineBorder}
      bg={selected ? (term.guaranteed ? selectedBg : selectedBgNative) : palette.surface}
      onClick={onSelect} // re-clicking the selected option deselects — resource stays on-demand
      tooltip={optionTooltip(instance, opt)}
    >
      <Typography variant="h5" sx={{ color: semantic.success.dark }}>
        +{fmtMoney(opt.savingsMo)}/mo
      </Typography>
      <CellRow label="Savings Rate" value={fmtPct(opt.rate)} />
      <CellRow label="Cost/mo" value={fmtMoney(opt.commitCostMo)} />
      <Divider sx={{ alignSelf: 'stretch' }} />
      <Box sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>
        <Typography variant="caption" sx={{ color: riskColor, display: 'block' }}>• {risk.left}</Typography>
        <Typography variant="caption" sx={{ color: riskColor, display: 'block' }}>• {risk.right}</Typography>
      </Box>
    </RadioCellFrame>
  );
}

// Baseline reference — not selectable; unchecking the row is how a resource
// stays on-demand. Framed as the inefficient state, never the flexible one.
function OnDemandCell({ instance, visibleTermIds }) {
  const missedMo = Math.max(...visibleTermIds.map((t) => optionFor(instance, t).savingsMo));
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
            { k: 'Cost', val: `${fmtMoney(instance.costMo)}/mo` },
            { k: 'Savings', val: '$0' },
            { k: 'Missed savings', val: `${fmtMoney(missedMo)}/mo` },
          ]}
        />
      )}
    >
      <Typography variant="h5" color="text.secondary">$0/mo</Typography>
      <CellRow label="Savings Rate" value="0%" valueColor={palette.text.secondary} />
      <CellRow label="Cost/mo" value={fmtMoney(instance.costMo)} valueColor={palette.text.secondary} />
      <Divider sx={{ alignSelf: 'stretch' }} />
      <Box sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>
        <Typography variant="caption" sx={{ color: semantic.error.dark, display: 'block' }}>• Premium pricing</Typography>
        <Typography variant="caption" sx={{ color: semantic.error.dark, display: 'block' }}>• missing {fmtMoney(missedMo)}/mo</Typography>
      </Box>
    </RadioCellFrame>
  );
}

// ─── Large option card (By Service view) ─────────────────────────────────────

// Figma: Container (Custom Plan Builder) node 104:10773 — h4 title row over a
// divider, metric rows (Savings h5/h6 + rate sub-row, then body1 rows), elevation.
function LargeCardFrame({ selected, borderColor, bg, onSelect, title, titleColor, chip, radio = true, children }) {
  return (
    <Box
      onClick={onSelect}
      sx={{
        flex: 1,
        minWidth: 200,
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        p: 1.625,
        cursor: onSelect ? 'pointer' : 'default',
        bgcolor: bg,
        transition: 'box-shadow 0.15s ease',
        ...(onSelect && { '&:hover': { boxShadow: elevation[2] } }),
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, minHeight: 38 }}>
        {radio && <Radio checked={selected} size="small" />}
        <Typography variant="h4" sx={{ color: titleColor, ...(!radio && { pl: 1 }) }}>{title}</Typography>
        <Box sx={{ flex: 1 }} />
        {chip}
      </Stack>
      <Divider />
      <Stack spacing={0.5} sx={{ px: 0.5, pt: 1 }}>{children}</Stack>
    </Box>
  );
}

function CardRow({ label, value, labelVariant = 'body1', valueVariant = 'body1', labelColor = 'text.primary', valueSx, sx }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={sx}>
      <Typography variant={labelVariant} color={labelColor}>{label}</Typography>
      {typeof value === 'string'
        ? <Typography variant={valueVariant} sx={{ color: palette.text.secondary, ...valueSx }}>{value}</Typography>
        : value}
    </Stack>
  );
}

function OptionCardLarge({ service, termId, selected, onSelect, nativeComparisonRate }) {
  const term = TERMS[termId];
  // Aggregate the option across all of the service's instances
  let savings = 0;
  let cost = 0;
  let atRisk = 0;
  let breakevenWeighted = 0;
  service.instances.forEach((i) => {
    const opt = optionFor(i, termId);
    savings += opt.savingsMo;
    cost += i.costMo;
    atRisk += opt.atRisk;
    breakevenWeighted += opt.breakevenDays * i.costMo;
  });
  const rate = savings / cost;
  const breakeven = breakevenWeighted / cost;

  return (
    <LargeCardFrame
      selected={selected}
      onSelect={onSelect}
      borderColor={selected
        ? (term.guaranteed ? palette.brandPrimary[300] : palette.warning[300])
        : color.outlineBorder}
      bg={selected ? (term.guaranteed ? selectedBg : selectedBgNative) : palette.surface}
      title={term.label}
      titleColor={term.guaranteed ? palette.brandPrimary[500] : CSP.text}
      chip={term.guaranteed && (
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label={<Typography variant="micro">Guaranteed</Typography>}
        />
      )}
    >
      <CardRow
        label="Savings"
        labelVariant="h5"
        value={(
          <Typography variant="h6" sx={{ color: semantic.success.dark }}>
            +{fmtMoney(savings)}/mo
          </Typography>
        )}
      />
      <CardRow
        label="Savings Rate"
        labelVariant="body2"
        labelColor="text.secondary"
        valueVariant="body2"
        value={`${fmtPct(rate)}${nativeComparisonRate ? ` · native 1Y: ${fmtPct(nativeComparisonRate)}` : ''}`}
        sx={{ mt: -0.25 }}
      />
      <CardRow label="Effective cost" value={`${fmtMoney(cost - savings)}/mo`} />
      <CardRow label="Breakeven" value={`${Math.round(breakeven)} days`} />
      <Divider />
      <Typography
        variant="caption"
        sx={{ color: term.guaranteed ? semantic.success.dark : semantic.warning.dark }}
      >
        {term.guaranteed
          ? (term.lockDays <= 30 ? 'Exit monthly — $0 at risk, Archera buys back unused' : 'Guaranteed — if usage drops, Archera pays the shortfall')
          : `${term.lockLabel} — ${fmtMoney(atRisk)} at risk if usage drops`}
      </Typography>
    </LargeCardFrame>
  );
}

// Service-level baseline reference — not selectable; framed as the
// inefficient state (premium pricing, missed savings), never as flexibility.
function OnDemandCardLarge({ service, visibleTermIds }) {
  const cost = service.instances.reduce((a, i) => a + i.costMo, 0);
  const missedMo = Math.max(...visibleTermIds.map((t) =>
    service.instances.reduce((a, i) => a + optionFor(i, t).savingsMo, 0)));
  return (
    <LargeCardFrame
      radio={false}
      borderColor="transparent"
      bg={onDemandBg}
      title="Currently Uncovered"
      titleColor={semantic.error.dark}
    >
      <CardRow
        label="Savings"
        labelVariant="h5"
        value={<Typography variant="h6" color="text.secondary">$0/mo</Typography>}
      />
      <CardRow
        label="Savings Rate"
        labelVariant="body2"
        labelColor="text.secondary"
        valueVariant="body2"
        value="0%"
        sx={{ mt: -0.25 }}
      />
      <CardRow label="List price" value={`${fmtMoney(cost)}/mo`} />
      <CardRow label="Breakeven" value="—" />
      <Divider />
      <Typography variant="caption" sx={{ color: semantic.error.dark }}>
        Premium pricing — missing {fmtMoney(missedMo)}/mo in available savings
      </Typography>
    </LargeCardFrame>
  );
}

// ─── By Instance table header ────────────────────────────────────────────────

function InstanceTableHeader({ visibleTermIds }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-end"
      sx={{ px: 2, pt: 1, borderTop: `1px solid ${color.divider}`, bgcolor: palette.surface }}
    >
      <Box sx={{ width: COL.checkbox, flexShrink: 0 }} />
      <Typography variant="h6" color="text.secondary" sx={{ width: COL.info, flexShrink: 0, pb: 1 }}>
        Resource
      </Typography>
      <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ flex: 1 }}>
        <Box sx={{ flex: 1, minWidth: COL.option, maxWidth: COL.optionMax, px: 1.5, pb: 1 }}>
          <Typography variant="h6" sx={{ color: semantic.error.dark }}>Currently Uncovered</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>missed savings /mo</Typography>
        </Box>
        {visibleTermIds.map((t) => {
          const term = TERMS[t];
          return (
            <Box key={t} sx={{ flex: 1, minWidth: COL.option, maxWidth: COL.optionMax, px: 1.5, pb: 1 }}>
              <Typography
                variant="h6"
                sx={{ color: term.guaranteed ? palette.brandPrimary[500] : CSP.text }}
              >
                {term.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                est. savings /mo
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── By Instance table footer — service-wide totals per column ──────────────
// Each total = est. savings if every resource took that term; click to apply to all.

function InstanceTableFooter({ service, visibleTermIds, uniformTerm, setServiceTerm }) {
  const listTotal = service.instances.reduce((a, i) => a + i.costMo, 0);
  const termTotal = (t) => service.instances.reduce((a, i) => a + optionFor(i, t).savingsMo, 0);
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{ px: 2, py: 1, borderTop: `1px solid ${color.divider}`, bgcolor: palette.neutral[50] }}
    >
      <Box sx={{ width: COL.checkbox, flexShrink: 0 }} />
      <Box sx={{ width: COL.info, flexShrink: 0 }}>
        <Typography variant="h6" color="text.secondary">Service total</Typography>
        <Typography variant="caption" color="text.secondary">
          {service.instances.length} resources
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ flex: 1, minWidth: COL.option, maxWidth: COL.optionMax, px: 1.5, py: 0.5, textAlign: 'right' }}>
          <Typography variant="h6" color="text.secondary">$0/mo</Typography>
          <Typography variant="caption" color="text.secondary">list {fmtMoney(listTotal)}/mo</Typography>
        </Box>
        {visibleTermIds.map((t) => {
          const term = TERMS[t];
          const isUniform = uniformTerm === t;
          return (
            <Tooltip key={t} title={`Apply ${term.label} to all ${service.instances.length} resources`}>
              <Box
                onClick={() => setServiceTerm(service.id, isUniform ? null : t)}
                sx={{
                  flex: 1,
                  minWidth: COL.option,
                  maxWidth: COL.optionMax,
                  px: 1.5,
                  py: 0.5,
                  textAlign: 'right',
                  cursor: 'pointer',
                  borderRadius: 1,
                  border: `1px solid ${isUniform
                    ? (term.guaranteed ? palette.brandPrimary[300] : palette.warning[300])
                    : 'transparent'}`,
                  bgcolor: isUniform ? (term.guaranteed ? selectedBg : selectedBgNative) : 'transparent',
                  transition: 'box-shadow 0.15s ease',
                  '&:hover': { boxShadow: elevation[2] },
                }}
              >
                <Typography variant="h6" sx={{ color: semantic.success.dark }}>
                  +{fmtMoney(termTotal(t))}/mo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isUniform ? 'applied to all' : 'apply to all'}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── Instance row ────────────────────────────────────────────────────────────

function InstanceRow({ instance, selections, setSelection, visibleTermIds }) {
  const termId = selections[instance.id];
  const excluded = termId === null; // excluded = staying on-demand

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        py: 1,
        px: 2,
        borderTop: `1px solid ${color.divider}`,
      }}
    >
      <Tooltip title={excluded ? 'Include in plan' : 'Exclude from plan — stays on-demand'}>
        <Checkbox
          checked={!excluded}
          onChange={() => setSelection(instance.id, excluded ? 'archera_30d' : null)}
        />
      </Tooltip>
      <Box sx={{ width: COL.info, flexShrink: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>{instance.name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {instance.type} | {instance.platform} | {instance.region}
        </Typography>
        <Typography variant="caption" color="text.secondary">{instance.resourceId}</Typography>
        <UsageIndicator instance={instance} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
        <OnDemandCell instance={instance} visibleTermIds={visibleTermIds} />
        {visibleTermIds.map((t) => (
          <OptionCell
            key={t}
            instance={instance}
            termId={t}
            selected={termId === t}
            onSelect={() => setSelection(instance.id, termId === t ? null : t)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// ─── Header metric card — mirrors the KPI card treatment, compact ───────────

function HeaderMetricCard({ icon, label, value, grad, valueColor }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        border: `1px solid ${color.outlineBorder}`,
        borderRadius: 1,
        px: 2,
        py: 1.25,
        bgcolor: palette.surface,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 18, color: palette.neutral.white }}>
          {icon}
        </MuiIcon>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'none' }} noWrap>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ color: valueColor }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

// ─── Service card ────────────────────────────────────────────────────────────

export default function ServiceCard({ service, selections, setSelection, setServiceTerm, visibleTermIds }) {
  const [view, setView] = useState(service.serverless ? 'service' : 'instance');
  const m = serviceMetrics(service, selections);

  // The term that is selected on every included instance (for By Service radio state)
  const includedTerms = service.instances.map((i) => selections[i.id]).filter(Boolean);
  const uniformTerm = includedTerms.length === service.instances.length
    && includedTerms.every((t) => t === includedTerms[0])
    ? includedTerms[0]
    : null;
  const allIncluded = includedTerms.length === service.instances.length;
  const noneIncluded = includedTerms.length === 0;

  // Collapse the commitment section when the service drops out of the plan;
  // reopen when it comes back. The chevron reopens it manually at any time.
  const [expanded, setExpanded] = useState(!noneIncluded);
  useEffect(() => { setExpanded(!noneIncluded); }, [noneIncluded]);

  const nativeAws1yRate = (() => {
    let s = 0;
    let c = 0;
    service.instances.forEach((i) => {
      s += i.costMo * i.rates.aws_1y;
      c += i.costMo;
    });
    return s / c;
  })();

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
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: CSP.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 22, color: CSP.icon }}>
            {service.icon}
          </MuiIcon>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5">{service.name}</Typography>
            <Chip label={service.category} size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Covered with {service.commitmentVehicle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <HeaderMetricCard
            icon="pie_chart"
            label="Current coverage"
            value={fmtPct(m.currentCoverage)}
            grad={m.currentCoverage < 0.5
              ? [palette.error[400], palette.error[700]]
              : [palette.uiPrimary[400], palette.uiPrimary[700]]}
            valueColor={m.currentCoverage < 0.5 ? semantic.error.dark : palette.text.primary}
          />
          <HeaderMetricCard
            icon="verified_user"
            label="Updated coverage"
            value={fmtPct(m.projectedCoverage)}
            grad={[palette.success[400], palette.success[700]]}
            valueColor={semantic.success.dark}
          />
          <HeaderMetricCard
            icon="savings"
            label="Savings"
            value={`${fmtMoney(m.savingsMo)}/mo`}
            grad={[palette.success[400], palette.success[700]]}
            valueColor={semantic.success.dark}
          />
        </Stack>
        <Tooltip title={expanded ? 'Collapse commitment options' : 'Expand commitment options'}>
          <IconButton size="small" onClick={() => setExpanded((e) => !e)}>
            <MuiIcon sx={{ fontSize: 22 }}>{expanded ? 'expand_less' : 'expand_more'}</MuiIcon>
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={expanded}>
      <Box sx={{ px: 2, pb: 1.5 }}>
        <LinearProgress
          variant="buffer"
          color="success"
          value={m.projectedCoverage * 100}
          valueBuffer={m.projectedCoverage * 100}
        />
      </Box>

      {/* View toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pb: 1 }}>
        {!service.serverless ? (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(e, v) => v && setView(v)}
          >
            <ToggleButton value="service">By Service</ToggleButton>
            <ToggleButton value="instance">By Instance</ToggleButton>
          </ToggleButtonGroup>
        ) : <Box />}
        <Typography variant="caption" color="text.secondary">
          {service.serverless
            ? 'Serverless — commitments apply to aggregate usage'
            : `${includedTerms.length} of ${service.instances.length} resources in plan · ${fmtMoney(m.currentCostMo)}/mo on-demand`}
        </Typography>
      </Stack>

      {/* Body */}
      {view === 'service' ? (
        <Stack direction="row" spacing={1.5} sx={{ p: 2, pt: 0.5 }} useFlexGap flexWrap="wrap">
          <OnDemandCardLarge service={service} visibleTermIds={visibleTermIds} />
          {visibleTermIds.map((t) => (
            <OptionCardLarge
              key={t}
              service={service}
              termId={t}
              selected={uniformTerm === t}
              onSelect={() => setServiceTerm(service.id, uniformTerm === t ? null : t)}
              nativeComparisonRate={t === 'archera_1y' && !visibleTermIds.includes('aws_1y') ? nativeAws1yRate : null}
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ pb: 1 }}>
          <InstanceTableHeader visibleTermIds={visibleTermIds} />
          {service.instances.map((i) => (
            <InstanceRow
              key={i.id}
              instance={i}
              selections={selections}
              setSelection={setSelection}
              visibleTermIds={visibleTermIds}
            />
          ))}
          <InstanceTableFooter
            service={service}
            visibleTermIds={visibleTermIds}
            uniformTerm={uniformTerm}
            setServiceTerm={setServiceTerm}
          />
        </Box>
      )}
      </Collapse>
    </Box>
  );
}
