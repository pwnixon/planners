import { useState, useRef } from 'react';
import {
  Box, Stack, Typography, IconButton, Tooltip, Popover, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Chip, Checkbox, FormControlLabel, Link, Icon as MuiIcon,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic } from '@archera/design-system/tokens';

// Selection highlight — ui-primary light at 20% opacity
const selectedBg = alpha(palette.uiPrimary[50], 0.2);
import {
  KPI_CATALOG, KPI_GROUPS, KPI_PRESETS, MAX_FEATURED,
} from './data';

const kpiById = Object.fromEntries(KPI_CATALOG.map((k) => [k.id, k]));

// ─── Single KPI card ─────────────────────────────────────────────────────────
// Gradient icon tile + hero value in the header; a divider-topped footer carries
// the breakdown. The delta lives in the footer (folded into the "With this plan"
// line for raw cards, or as a lead line for footer-only cards) — no separate
// trend block, which only duplicated what the footer already shows.

const barGradient = (accent) => `linear-gradient(90deg, ${accent.grad[0]}, ${accent.grad[1]})`;

// Unified card footer. Two sources, one consistent treatment:
//   • raw (a now→plan pair) → "Now / With this plan" comparison bars, plus an
//     optional target marker (coverage).
//   • kpi.footer(metrics) → a card-specific set of labeled bars + caption, for
//     metrics with no before/after but a genuinely useful breakdown.
// Labels and values are always inline, so a bar never needs a hover to read.
function KpiFooter({ kpi, v, raw, metrics, accent }) {
  let bars = null;
  let marker = null;

  if (raw) {
    const target = kpi.target ?? null;
    const max = Math.max(raw.current, raw.projected, target ?? 0) || 1;
    const fmt = (display) => (display === '—' ? '—' : `${display}${kpi.unit}`);
    bars = [
      { label: 'Now', value: fmt(v.current), frac: raw.current / max, tone: 'muted' },
      {
        label: 'With this plan',
        value: fmt(v.projected),
        delta: v.delta,
        note: target != null ? `target ${kpi.targetLabel}` : null,
        frac: raw.projected / max,
        tone: 'fill',
      },
    ];
    if (target != null) marker = { frac: target / max };
  } else if (kpi.footer) {
    bars = kpi.footer(metrics).bars ?? null;
  }

  if (!bars) return null;
  const fillFor = (tone) => (tone === 'fill' ? barGradient(accent) : palette.neutral[300]);

  return (
    <Stack spacing={1.25} sx={{ mt: 'auto', pt: 2, borderTop: `1px solid ${color.divider}` }}>
      {bars && bars.map((b) => (
        <Box key={b.label}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" noWrap>{b.label}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ flexShrink: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: palette.text.primary }}>{b.value}</Typography>
              {b.delta && (
                <Typography variant="caption" sx={{ fontWeight: 700, color: accent.main }}>({b.delta})</Typography>
              )}
              {b.note && (
                <Typography variant="caption" color="text.secondary">· {b.note}</Typography>
              )}
            </Stack>
          </Stack>
          <Box sx={{ position: 'relative', height: 6, borderRadius: 3, bgcolor: palette.neutral[100], overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${Math.min(100, b.frac * 100)}%`,
                height: 1,
                borderRadius: 3,
                background: fillFor(b.tone),
                transition: 'width 0.4s ease',
              }}
            />
            {marker && (
              <Box sx={{ position: 'absolute', left: `${Math.min(100, marker.frac * 100)}%`, top: 0, bottom: 0, width: 2, bgcolor: palette.text.primary }} />
            )}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// Relevant submetrics for the hover-over — derived from what the card computes,
// so the popover never carries values the card can't back up.
function popoverRows(kpi, v, metrics) {
  const rows = [];
  const noun = kpi.noun || kpi.label;
  const unit = kpi.unit || '';
  // When the value already carries "/mo", "Monthly" in the key is redundant —
  // dropping it keeps these rows from overflowing a narrow card's popover.
  const keyNoun = unit.includes('/mo') ? noun.replace(/\bMonthly\b\s*/i, '').trim() : noun;
  // Skip the "current" row when it's identical to projected (static footer cards).
  if (v.current !== '—' && v.current !== v.projected) {
    rows.push({ k: `Current ${keyNoun}`, val: `${v.current}${unit}` });
  }
  rows.push({ k: `Projected ${keyNoun}`, val: `${v.projected}${unit}` });
  // Raw cards show the delta vs current; footer cards' descriptive delta is
  // already on the card (subtext) and in the caption, so no row for them.
  if (v.delta && kpi.raw) rows.push({ k: 'vs current', val: v.delta });
  if (kpi.targetLabel) rows.push({ k: 'Target', val: kpi.targetLabel });
  if (!kpi.raw && kpi.footer) {
    (kpi.footer(metrics).bars || []).forEach((b) => rows.push({ k: b.label, val: b.value }));
  }
  return rows;
}

// Hover-over content — Figma node 114:14219. Title + description over key/value
// rows. Replaces the plain info-icon tooltip.
function KpiPopover({ kpi, v, metrics }) {
  const rows = popoverRows(kpi, v, metrics);
  // Footer cards' caption sits below the rows, tied back to the card's info icon.
  const caption = kpi.footer ? kpi.footer(metrics).caption : null;
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="micro" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{kpi.group}</Typography>
          <Typography variant="h6" color="text.primary">{kpi.label}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">{kpi.desc}</Typography>
      </Stack>
      <Box>
        {rows.map((r) => (
          <Stack
            key={r.k}
            direction="row"
            alignItems="center"
            spacing={3}
            sx={{ py: 0.5, borderBottom: `1px solid ${color.outlineBorder}` }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{r.k}</Typography>
            <Typography variant="body2" color="text.primary" sx={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{r.val}</Typography>
          </Stack>
        ))}
      </Box>
      {caption && (
        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 1.5 }}>
          <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 14, color: palette.text.disabled, mt: '2px', flexShrink: 0 }}>info</MuiIcon>
          <Typography variant="caption" color="text.secondary">{caption}</Typography>
        </Stack>
      )}
    </Box>
  );
}

function KpiCard({ kpi, metrics, compact = false, dense = false }) {
  const [hover, setHover] = useState(false);
  const [size, setSize] = useState({ width: undefined, minHeight: undefined });
  const cardRef = useRef(null);
  // Measure the card so the hover popover can exactly match its footprint.
  const openHover = () => {
    if (cardRef.current) {
      setSize({ width: cardRef.current.offsetWidth, minHeight: cardRef.current.offsetHeight });
    }
    setHover(true);
  };
  const v = kpi.get(metrics);
  const accent = v.neutral
    ? { main: palette.uiPrimary[500], grad: [palette.uiPrimary[400], palette.uiPrimary[700]] }
    : v.good
      ? { main: semantic.success.main, grad: [palette.success[400], palette.success[700]] }
      : { main: semantic.warning.main, grad: [palette.warning[400], palette.warning[700]] };
  const raw = kpi.raw ? kpi.raw(metrics) : null;

  const iconTile = (
    <Box
      sx={{
        width: compact ? 36 : 44,
        height: compact ? 36 : 44,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${accent.grad[0]}, ${accent.grad[1]})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: compact ? 18 : 22, color: palette.neutral.white }}>
        {kpi.icon}
      </MuiIcon>
    </Box>
  );

  // The KPI type (kpi.group) is intentionally omitted from the card face — it's
  // surfaced in the hover popover instead (see KpiPopover).
  const label = (
    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'none', lineHeight: 1.2 }}>
      {kpi.label}
    </Typography>
  );

  // Footer-only cards carry a descriptive delta as subtext under the value (e.g.
  // "until net positive"), tagged with an info icon that points to the fuller
  // explanation in the hover popover.
  const hasNote = !raw && v.delta;

  const value = (
    <>
      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography variant={compact ? 'h3' : 'h2'} sx={{ fontWeight: 700, letterSpacing: 0, color: palette.text.primary }}>
          {v.projected}
        </Typography>
        {kpi.unit && (
          <Typography variant="body3" color="text.secondary" sx={{ fontWeight: 500 }}>{kpi.unit}</Typography>
        )}
      </Stack>
      {hasNote && (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{v.delta}</Typography>
          <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 14, color: palette.text.disabled }}>info</MuiIcon>
        </Stack>
      )}
    </>
  );

  return (
    <Box
      ref={cardRef}
      onMouseEnter={openHover}
      onMouseLeave={() => setHover(false)}
      sx={{
        position: 'relative',
        flex: 1,
        minWidth: compact ? 0 : 210,
        bgcolor: palette.surface,
        border: `1px solid ${color.outlineBorder}`,
        borderRadius: 4,
        p: compact ? 2 : 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header: name + metric beside the icon normally; when the strip is full
          (5 cards) each card is too narrow, so the metric stacks below the icon. */}
      <Stack
        direction={dense ? 'column' : 'row'}
        spacing={dense ? 1 : 1.5}
        alignItems={dense ? 'stretch' : 'flex-start'}
        sx={{ mb: compact ? 1.5 : 2 }}
      >
        {iconTile}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {label}
          {value}
        </Box>
      </Stack>

      <KpiFooter kpi={kpi} v={v} raw={raw} metrics={metrics} accent={accent} />

      {/* Detail popover centers over the card on hover, matching its footprint.
          pointerEvents:none keeps the mouse on the card so it won't flicker. */}
      {!compact && (
        <Popover
          open={hover}
          anchorEl={cardRef.current}
          onClose={() => setHover(false)}
          anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
          transformOrigin={{ vertical: 'center', horizontal: 'center' }}
          disableRestoreFocus
          disableScrollLock
          sx={{ pointerEvents: 'none' }}
          slotProps={{ paper: { sx: { width: Math.max(size.width || 0, 300), minHeight: size.minHeight, borderRadius: 4 } } }}
        >
          <KpiPopover kpi={kpi} v={v} metrics={metrics} />
        </Popover>
      )}
    </Box>
  );
}

// ─── KPI library dialog ──────────────────────────────────────────────────────

function KpiLibraryDialog({ open, onClose, featured, setFeatured, metrics }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const toggle = (id) => {
    if (featured.includes(id)) {
      setFeatured(featured.filter((f) => f !== id));
    } else if (featured.length < MAX_FEATURED) {
      setFeatured([...featured, id]);
    }
  };

  const reorder = (to) => {
    if (dragIndex == null || dragIndex === to) return;
    const next = [...featured];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(to, 0, moved);
    setFeatured(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>KPI Library</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Every metric below is live against your current plan selections. Feature up to {MAX_FEATURED} on
          the page — or start from a role preset.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 2 }} useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Presets:</Typography>
          {Object.entries(KPI_PRESETS).map(([name, ids]) => (
            <Chip
              key={name}
              label={name}
              variant={JSON.stringify(ids) === JSON.stringify(featured) ? 'filled' : 'outlined'}
              color={JSON.stringify(ids) === JSON.stringify(featured) ? 'primary' : 'default'}
              onClick={() => setFeatured([...ids])}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>
            Featured ({featured.length}/{MAX_FEATURED}):
          </Typography>
          {featured.map((id, idx) => (
            <Box
              key={id}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragEnter={() => setOverIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorder(idx)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              sx={{
                display: 'flex',
                borderRadius: 100,
                opacity: dragIndex === idx ? 0.4 : 1,
                boxShadow: overIndex === idx && dragIndex !== idx ? `0 0 0 2px ${palette.uiPrimary[300]}` : 'none',
                transition: 'box-shadow 0.1s ease',
              }}
            >
              <Chip
                icon={<MuiIcon sx={{ fontSize: 16, cursor: 'grab' }}>drag_indicator</MuiIcon>}
                label={kpiById[id].label}
                onDelete={() => toggle(id)}
              />
            </Box>
          ))}
          {featured.length === 0 ? (
            <Typography variant="caption" color="text.secondary">none — pick from the library below</Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">drag to reorder</Typography>
          )}
        </Stack>

        {KPI_GROUPS.map((group) => (
          <Box key={group} sx={{ mb: 2.5 }}>
            <Typography variant="overline" color="text.secondary">{group}</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 1.5,
                mt: 0.5,
              }}
            >
              {KPI_CATALOG.filter((k) => k.group === group).map((kpi) => {
                const isFeatured = featured.includes(kpi.id);
                const atCap = !isFeatured && featured.length >= MAX_FEATURED;
                return (
                  <Box
                    key={kpi.id}
                    sx={{
                      border: `1px solid ${isFeatured ? palette.uiPrimary[500] : color.outlineBorder}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: isFeatured ? selectedBg : palette.surface,
                    }}
                  >
                    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={isFeatured}
                            disabled={atCap}
                            onChange={() => toggle(kpi.id)}
                          />
                        }
                        label={<Typography variant="caption">Feature</Typography>}
                        sx={{ mr: 0, flexShrink: 0 }}
                      />
                    </Stack>
                    <KpiCard kpi={kpi} metrics={metrics} compact />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {kpi.desc}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── KPI strip ───────────────────────────────────────────────────────────────

export default function KpiSection({ planName, metrics, featured, setFeatured, libOpen: libOpenProp, setLibOpen: setLibOpenProp }) {
  const [libOpenInternal, setLibOpenInternal] = useState(false);
  const libOpen = libOpenProp !== undefined ? libOpenProp : libOpenInternal;
  const setLibOpen = setLibOpenProp ?? setLibOpenInternal;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h3" sx={{ mb: 0.5 }}>{planName ? `${planName} KPIs` : 'KPIs'}</Typography>
        <Typography variant="body1" color="text.secondary">
          The metrics tracked for this plan —{' '}
          <Link component="button" type="button" variant="body1" underline="hover" onClick={() => setLibOpen(true)}>
            view all and configure
          </Link>
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.5} alignItems="stretch">
        {featured.map((id) => (
          <KpiCard key={id} kpi={kpiById[id]} metrics={metrics} dense={featured.length >= 5} />
        ))}
      </Stack>
      <KpiLibraryDialog
        open={libOpen}
        onClose={() => setLibOpen(false)}
        featured={featured}
        setFeatured={setFeatured}
        metrics={metrics}
      />
    </Stack>
  );
}
