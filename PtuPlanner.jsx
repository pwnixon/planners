import { useState } from 'react';
import {
  Box, Stack, Typography, Chip, Button, Checkbox, Divider, IconButton,
  Dialog, DialogContent, ToggleButton, ToggleButtonGroup, Icon as MuiIcon,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppShell from '@archera/design-system/AppShell';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// PTU / GSU Planner — see Confluence "PTU Design Brief" (ARS 1202421769).
// Capacity / reliability product — NOT savings-vs-on-demand. One workflow, swapped
// per the app-level CSP (GCP→GSU, Azure→PTU). All data is mock.
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);
const N = 120;

const CSP_KEYS = ['GCP', 'Azure']; // AWS Bedrock deferred (opaque pricing)
const CSP = {
  GCP: {
    title: 'Gemini Provisioned Throughput',
    unit: 'GSU', unitLong: 'Generative AI Scale Unit',
    reliabilitySKU: 'Priority PayGo', savingsPct: '42%',
    tokensPerUnit: 500, recommendedUnits: 8, term: '1-month', protectedValue: '$3.2K',
    seed: 0.6,
    note: <>Google's provisioned throughput unit is a <strong>GSU</strong> (Generative AI Scale Unit).</>,
    workloads: [
      { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'us-central1', sustained: 2150, peak: 2400, units: 5, util: 0.86, fit: 'good', shape: 'steady' },
      { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'europe-west4', sustained: 780, peak: 960, units: 2, util: 0.78, fit: 'good', shape: 'steady' },
      { model: 'Gemini 3.1 Flash', version: 'v2', region: 'us-central1', sustained: 205, peak: 2600, units: 1, util: 0.41, fit: 'borderline', shape: 'bursty' },
      { model: 'Gemini 2.5 Pro', version: 'v2.5', region: 'asia-southeast1', sustained: 120, peak: 980, units: 0, util: 0, fit: 'poor', shape: 'spiky' },
    ],
    inventory: [
      { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'us-central1', units: 5, util: 0.88, term: '1-month', expires: 'in 18 days', rebate: '$1.9K', status: 'Active' },
      { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'europe-west4', units: 2, util: 0.74, term: '1-month', expires: 'in 18 days', rebate: '$0.7K', status: 'Active' },
      { model: 'Gemini 3.1 Flash', version: 'v2', region: 'us-central1', units: 1, util: 0.39, term: '1-week', expires: 'in 3 days', rebate: '$0.2K', status: 'Expiring' },
    ],
  },
  Azure: {
    title: 'Azure OpenAI Provisioned Throughput',
    unit: 'PTU', unitLong: 'Provisioned Throughput Unit',
    reliabilitySKU: 'Hourly PTU', savingsPct: '64%',
    tokensPerUnit: 50, recommendedUnits: 80, term: '1-month', protectedValue: '$5.1K',
    seed: 3.1,
    note: <>Azure's provisioned throughput unit is a <strong>PTU</strong> (Provisioned Throughput Unit).</>,
    workloads: [
      { model: 'GPT-4o', version: '2024-08', region: 'eastus', sustained: 2150, peak: 2400, units: 50, util: 0.86, fit: 'good', shape: 'steady' },
      { model: 'GPT-4o', version: '2024-08', region: 'westeurope', sustained: 780, peak: 960, units: 20, util: 0.78, fit: 'good', shape: 'steady' },
      { model: 'GPT-4o mini', version: '2024-07', region: 'eastus', sustained: 205, peak: 2600, units: 10, util: 0.41, fit: 'borderline', shape: 'bursty' },
      { model: 'o1', version: '2024-12', region: 'swedencentral', sustained: 120, peak: 980, units: 0, util: 0, fit: 'poor', shape: 'spiky' },
    ],
    inventory: [
      { model: 'GPT-4o', version: '2024-08', region: 'eastus', units: 50, util: 0.9, term: '1-month', expires: 'in 12 days', rebate: '$3.0K', status: 'Active' },
      { model: 'GPT-4o', version: '2024-08', region: 'westeurope', units: 20, util: 0.72, term: '1-year', expires: 'in 240 days', rebate: '$1.4K', status: 'Active' },
    ],
  },
};

// Burndown weighting — same shape for both clouds in the scaffold (brief §2).
const BURNDOWN = [
  { type: 'Output / reasoning', share: 0.38, rate: '6×', note: 'dominates the capacity need' },
  { type: 'Input — text', share: 0.49, rate: '1×', note: '' },
  { type: 'Cached input', share: 0.13, rate: '0.1×', note: 'nearly free against capacity' },
];

// ─── fit verdict helpers ─────────────────────────────────────────────────────
const fitTone = (fit) => (fit === 'good' ? semantic.success : fit === 'borderline' ? semantic.warning : semantic.error);
const fitChipColor = (fit) => (fit === 'good' ? 'success' : fit === 'borderline' ? 'warning' : 'error');
const fitLabel = (fit) => (fit === 'good' ? 'Good fit' : fit === 'borderline' ? 'Borderline' : 'Poor fit');

// ─── series generators (deterministic) ──────────────────────────────────────
function aggSeries(capacity, seed) {
  return Array.from({ length: N }, (_, i) => {
    const diurnal = Math.sin((i / N) * Math.PI * 30 + seed) * (capacity * 0.21) + capacity * 0.65;
    const wobble = Math.sin(i * 1.7 + seed) * (capacity * 0.04);
    const burst = [14, 41, 67, 93, 110].includes(i) ? capacity * 0.55 : 0;
    return Math.max(Math.round(capacity * 0.07), Math.round(diurnal + wobble + burst));
  });
}
function workloadSeries(w, seed) {
  const n = 90;
  const s = w.sustained;
  return Array.from({ length: n }, (_, i) => {
    if (w.shape === 'steady') return Math.max(40, Math.round(s + Math.sin(i * 0.7 + seed) * s * 0.12 + Math.sin(i * 0.27) * s * 0.06));
    if (w.shape === 'bursty') {
      const burst = [12, 29, 47, 64, 80].includes(i) ? (w.peak - s) : 0;
      return Math.max(40, Math.round(s + Math.sin(i * 1.2 + seed) * s * 0.3 + burst));
    }
    const spike = [16, 40, 68].includes(i) ? (w.peak - s) : 0; // spiky-low
    return Math.max(20, Math.round(s + Math.sin(i * 0.9 + seed) * s * 0.35 + spike));
  });
}
function normShape(shape, seed) {
  const n = 40;
  const cfg = shape === 'steady' ? { base: 0.68, amp: 0.07, b: [] }
    : shape === 'bursty' ? { base: 0.3, amp: 0.09, b: [9, 22, 33] }
    : { base: 0.16, amp: 0.05, b: [13, 31] };
  return Array.from({ length: n }, (_, i) => {
    const w = Math.sin(i * 1.3 + seed) * cfg.amp;
    const burst = cfg.b.includes(i) ? (shape === 'bursty' ? 0.55 : 0.72) : 0;
    return Math.max(0.04, Math.min(1, cfg.base + w + burst));
  });
}

// ─── Throughput-vs-demand chart (hero + drill-in) ────────────────────────────
function ThroughputChart({ series, capacity, capLabel, height = 230 }) {
  const W = 960;
  const H = height;
  const padY = 14;
  const yMax = Math.max(...series, capacity || 0) * 1.18;
  const x = (i) => ((i / (series.length - 1)) * W).toFixed(1);
  const y = (v) => (padY + (1 - v / yMax) * (H - padY * 2)).toFixed(1);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const hasCap = capacity != null && capacity > 0;
  const capY = hasCap ? y(capacity) : null;
  const bursts = hasCap ? series.filter((v) => v > capacity).length : 0;

  const Legend = ({ swatch, label }) => (
    <Stack direction="row" alignItems="center" spacing={0.75}>{swatch}<Typography variant="caption" color="text.secondary">{label}</Typography></Stack>
  );

  return (
    <Box>
      <Stack direction="row" spacing={2.5} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
        <Legend swatch={<Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: palette.uiPrimary[500] }} />} label="Demand" />
        {hasCap && <Legend swatch={<Box sx={{ width: 14, borderTop: `2px dashed ${palette.brandPrimary[500]}` }} />} label={`Provisioned capacity — ${capLabel}`} />}
        {bursts > 0 && <Legend swatch={<Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: semantic.warning.main }} />} label={`Bursts over capacity (${bursts})`} />}
      </Stack>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={y(g * yMax)} y2={y(g * yMax)} stroke={color.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={alpha(palette.uiPrimary[500], 0.12)} />
        <path d={line} fill="none" stroke={palette.uiPrimary[500]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hasCap && series.map((v, i) => (v > capacity
          ? <line key={i} x1={x(i)} x2={x(i)} y1={capY} y2={y(v)} stroke={semantic.warning.main} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          : null))}
        {hasCap && <line x1="0" x2={W} y1={capY} y2={capY} stroke={palette.brandPrimary[500]} strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
      </svg>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">30 days ago</Typography>
        <Typography variant="caption" color="text.secondary">today</Typography>
      </Stack>
    </Box>
  );
}

// ─── Value lens card (one of three deliberately-separate modules) ────────────
function LensCard({ icon, grad, label, value, unit, sub }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1, p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ width: 44, height: 44, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
          <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 22, color: palette.neutral.white }}>{icon}</MuiIcon>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'none', lineHeight: 1.2 }}>{label}</Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: palette.text.primary }}>{value}</Typography>
            {unit && <Typography variant="body3" color="text.secondary" sx={{ fontWeight: 500 }}>{unit}</Typography>}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{sub}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

// ─── Per-workload planning rows ──────────────────────────────────────────────
const COL = { check: 40, shape: 150, tput: 150, rec: 130, util: 110, chev: 28 };

function MiniThroughput({ shape, fit, seed }) {
  const pts = normShape(shape, seed);
  const w = 130;
  const h = 30;
  const x = (i) => ((i / (pts.length - 1)) * w).toFixed(1);
  const y = (p) => (h - 2 - p * (h - 4)).toFixed(1);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const tone = fit === 'poor' ? palette.text.secondary : fitTone(fit).main;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill={alpha(tone, 0.12)} />
      <path d={line} fill="none" stroke={tone} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function WorkloadRow({ w, seed, unit, onOpen }) {
  const recommended = w.fit !== 'poor';
  return (
    <Stack
      direction="row" alignItems="center" spacing={1.5}
      onClick={onOpen}
      sx={{ px: 3, py: 1.5, borderTop: `1px solid ${color.divider}`, opacity: recommended ? 1 : 0.62, cursor: 'pointer', '&:hover': { bgcolor: alpha(palette.neutral.black, 0.02) } }}
    >
      <Box sx={{ width: COL.check, flexShrink: 0 }}>
        <Checkbox size="small" defaultChecked={recommended} sx={{ p: 0 }} onClick={(e) => e.stopPropagation()} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>{w.model}</Typography>
          <Chip size="small" variant="outlined" color={fitChipColor(w.fit)} label={<Typography variant="micro">{fitLabel(w.fit)}</Typography>} />
        </Stack>
        <Typography variant="caption" color="text.secondary">{w.version} · {w.region}</Typography>
      </Box>
      <Box sx={{ width: COL.shape, flexShrink: 0 }}><MiniThroughput shape={w.shape} fit={w.fit} seed={seed} /></Box>
      <Box sx={{ width: COL.tput, flexShrink: 0, textAlign: 'right' }}>
        <Typography variant="h6">{fmt(w.sustained)} / {fmt(w.peak)}</Typography>
        <Typography variant="caption" color="text.secondary">sustained / peak tok/s</Typography>
      </Box>
      <Box sx={{ width: COL.rec, flexShrink: 0, textAlign: 'right' }}>
        {recommended ? (
          <>
            <Typography variant="h6" sx={{ color: palette.brandPrimary[500] }}>{w.units} {unit}{w.units === 1 ? '' : 's'}</Typography>
            <Typography variant="caption" color="text.secondary">capacity</Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" color="text.secondary">—</Typography>
            <Typography variant="caption" color="text.secondary">keep on-demand</Typography>
          </>
        )}
      </Box>
      <Box sx={{ width: COL.util, flexShrink: 0, textAlign: 'right' }}>
        <Typography variant="h6">{recommended ? `${Math.round(w.util * 100)}%` : '—'}</Typography>
        <Typography variant="caption" color="text.secondary">throughput util.</Typography>
      </Box>
      <Box sx={{ width: COL.chev, flexShrink: 0, textAlign: 'right' }}>
        <MuiIcon sx={{ fontSize: 18, color: palette.text.secondary }}>chevron_right</MuiIcon>
      </Box>
    </Stack>
  );
}

function WorkloadsTable({ cfg, onOpen }) {
  return (
    <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Typography variant="h5">Workloads · provisioning recommendations</Typography>
        <Typography variant="body2" color="text.secondary">
          Per model · version · region. Throughput <em>shape</em> (burndown-adjusted) drives the fit verdict — a high monthly total isn't enough if traffic is too bursty. Select a row for the full breakdown.
        </Typography>
      </Box>
      <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ px: 3, pb: 1 }}>
        <Box sx={{ width: COL.check, flexShrink: 0 }} />
        <Typography variant="h6" color="text.secondary" sx={{ flex: 1 }}>Workload</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.shape, flexShrink: 0 }}>Throughput shape</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.tput, flexShrink: 0, textAlign: 'right' }}>Throughput</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.rec, flexShrink: 0, textAlign: 'right' }}>Recommended</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.util, flexShrink: 0, textAlign: 'right' }}>Utilization</Typography>
        <Box sx={{ width: COL.chev, flexShrink: 0 }} />
      </Stack>
      {cfg.workloads.map((w, i) => <WorkloadRow key={`${w.model}-${w.region}`} w={w} seed={i * 2.3} unit={cfg.unit} onOpen={() => onOpen(w)} />)}
    </Box>
  );
}

// ─── Per-workload drill-in (full chart + burndown-adjusted demand) ───────────
function WorkloadDrilldown({ workload, cfg, onClose }) {
  const w = workload;
  const open = Boolean(w);
  const capacity = w && w.fit !== 'poor' ? w.units * cfg.tokensPerUnit : null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {w && (
        <DialogContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h4">{w.model}</Typography>
                <Chip size="small" variant="outlined" color={fitChipColor(w.fit)} label={<Typography variant="micro">{fitLabel(w.fit)}</Typography>} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{w.version} · {w.region}</Typography>
            </Box>
            <IconButton onClick={onClose} size="small"><MuiIcon>close</MuiIcon></IconButton>
          </Stack>

          <Typography variant="h6" sx={{ mb: 1 }}>Throughput vs. demand — last 30 days</Typography>
          <ThroughputChart
            series={workloadSeries(w, 1.4)}
            capacity={capacity}
            capLabel={capacity ? `${w.units} ${cfg.unit}${w.units === 1 ? '' : 's'} (${fmt(capacity)} tok/s)` : ''}
            height={190}
          />

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="h6">Burndown-adjusted demand</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Capacity is sized on burndown-adjusted tokens, not raw counts — token types consume {cfg.unit} capacity at different rates.
          </Typography>
          <Stack spacing={0}>
            {BURNDOWN.map((b, i) => (
              <Stack key={b.type} direction="row" alignItems="center" spacing={2} sx={{ py: 1, borderTop: i ? `1px solid ${color.divider}` : 'none' }}>
                <Typography variant="body1" sx={{ flex: 1 }}>{b.type}</Typography>
                <Box sx={{ width: 160, flexShrink: 0 }}>
                  <Box sx={{ height: 6, borderRadius: 1, bgcolor: alpha(palette.uiPrimary[500], 0.15), overflow: 'hidden' }}>
                    <Box sx={{ width: `${b.share * 100}%`, height: 1, bgcolor: palette.uiPrimary[500] }} />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ width: 48, flexShrink: 0, textAlign: 'right' }}>{Math.round(b.share * 100)}%</Typography>
                <Typography variant="h6" sx={{ width: 56, flexShrink: 0, textAlign: 'right', color: palette.brandPrimary[500] }}>{b.rate}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 180, flexShrink: 0 }}>{b.note}</Typography>
              </Stack>
            ))}
          </Stack>

          <Box sx={{ mt: 2.5, p: 2, borderRadius: 1, bgcolor: alpha(palette.brandPrimary[50], 0.4) }}>
            <Typography variant="body2" color="text.secondary">
              {w.fit === 'good' && `Steady demand under ${fmt(w.units * cfg.tokensPerUnit)} tok/s — provision ${w.units} ${cfg.unit}${w.units === 1 ? '' : 's'} on a ${cfg.term} Archera term.`}
              {w.fit === 'borderline' && `Enough volume, but bursty — peaks hit ${fmt(w.peak)} tok/s against ${fmt(w.sustained)} sustained. A small ${w.units}-${cfg.unit} commitment covers the floor; bursts spill to ${cfg.reliabilitySKU}.`}
              {w.fit === 'poor' && `Not recommended — low, spiky demand (${fmt(w.sustained)} sustained) is cheaper and safer left on ${cfg.reliabilitySKU}.`}
            </Typography>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ─── PTU inventory view ──────────────────────────────────────────────────────
const INV = { cap: 150, term: 110, util: 130, expires: 120, rebate: 110, status: 110 };
function InventoryView({ cfg }) {
  return (
    <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Typography variant="h5">Provisioned throughput inventory</Typography>
        <Typography variant="body2" color="text.secondary">Active commitments — capacity, throughput utilization, and Archera-protected rebate value. No savings-vs-on-demand column.</Typography>
      </Box>
      <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ px: 3, pb: 1 }}>
        <Typography variant="h6" color="text.secondary" sx={{ flex: 1 }}>Model · version · region</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.cap, flexShrink: 0, textAlign: 'right' }}>Capacity</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.term, flexShrink: 0, textAlign: 'right' }}>Term</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.util, flexShrink: 0, textAlign: 'right' }}>Throughput util.</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.expires, flexShrink: 0, textAlign: 'right' }}>Expires</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.rebate, flexShrink: 0, textAlign: 'right' }}>Rebate value</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: INV.status, flexShrink: 0, textAlign: 'right' }}>Status</Typography>
      </Stack>
      {cfg.inventory.map((r) => (
        <Stack key={`${r.model}-${r.region}-${r.term}`} direction="row" alignItems="center" spacing={1.5} sx={{ px: 3, py: 1.5, borderTop: `1px solid ${color.divider}` }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{r.model}</Typography>
            <Typography variant="caption" color="text.secondary">{r.version} · {r.region}</Typography>
          </Box>
          <Box sx={{ width: INV.cap, flexShrink: 0, textAlign: 'right' }}>
            <Typography variant="h6">{r.units} {cfg.unit}{r.units === 1 ? '' : 's'}</Typography>
            <Typography variant="caption" color="text.secondary">{fmt(r.units * cfg.tokensPerUnit)} tok/s</Typography>
          </Box>
          <Typography variant="body1" sx={{ width: INV.term, flexShrink: 0, textAlign: 'right' }}>{r.term}</Typography>
          <Typography variant="body1" sx={{ width: INV.util, flexShrink: 0, textAlign: 'right', color: r.util < 0.5 ? semantic.warning.dark : palette.text.primary }}>{Math.round(r.util * 100)}%</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ width: INV.expires, flexShrink: 0, textAlign: 'right' }}>{r.expires}</Typography>
          <Typography variant="body1" sx={{ width: INV.rebate, flexShrink: 0, textAlign: 'right', color: semantic.success.dark }}>{r.rebate}</Typography>
          <Box sx={{ width: INV.status, flexShrink: 0, textAlign: 'right' }}>
            <Chip size="small" variant="outlined" color={r.status === 'Active' ? 'success' : 'warning'} label={<Typography variant="micro">{r.status}</Typography>} />
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

// ─── Planner view (recommendation + hero chart + lenses + workloads) ─────────
function PlannerView({ cfg, onOpen }) {
  const capacity = cfg.recommendedUnits * cfg.tokensPerUnit;
  const series = aggSeries(capacity, cfg.seed);
  const bursts = series.filter((v) => v > capacity).length;
  return (
    <>
      {/* Recommendation-first verdict (mirrors the GRI "Apply plan" affordance, for capacity) */}
      <Box sx={{ borderRadius: 1, p: 3, border: `1px solid ${palette.brandPrimary[300]}`, bgcolor: alpha(palette.brandPrimary[50], 0.4), boxShadow: elevation[1] }}>
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Chip size="small" color="success" label={<Typography variant="micro">Good fit</Typography>} />
              <Typography variant="h5">Provision {cfg.recommendedUnits} {cfg.unit}s · {cfg.term} Archera term</Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              Sustained demand fits comfortably under {fmt(capacity)} tokens/sec. {bursts} short bursts in the last 30 days
              briefly exceed capacity and spill to {cfg.reliabilitySKU} — expected and low-impact. Archera underwrites the
              longer native reservation, so you commit short and we absorb the unused-capacity risk.
            </Typography>
          </Box>
          <Button size="large" variant="contained" color="secondary" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>Apply this commitment</Button>
        </Stack>
      </Box>

      {/* Throughput hero chart */}
      <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1, p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="h5">Throughput vs. demand — last 30 days</Typography>
          <Typography variant="caption" color="text.secondary">burndown-adjusted tokens/sec</Typography>
        </Stack>
        <ThroughputChart series={series} capacity={capacity} capLabel={`${cfg.recommendedUnits} ${cfg.unit}s (${fmt(capacity)} tok/s)`} />
      </Box>

      {/* Three SEPARATE value lenses — never blended into one number (brief §6a) */}
      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>What you're getting</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Three separate lenses — capacity, protection, and rate. Deliberately not a single “total savings” figure (there is no on-demand savings here).
        </Typography>
        <Stack direction="row" spacing={2.5} alignItems="stretch">
          <LensCard icon="speed" grad={[palette.uiPrimary[400], palette.uiPrimary[600]]} label="Capacity secured" value={`${cfg.recommendedUnits}`} unit={`${cfg.unit}s`} sub={`${fmt(capacity)} tokens/sec guaranteed throughput`} />
          <LensCard icon="verified_user" grad={[palette.brandPrimary[400], palette.brandPrimary[600]]} label="Protected value" value={cfg.protectedValue} unit="/mo" sub="guaranteed back if you under-use the commitment" />
          <LensCard icon="trending_down" grad={[palette.brandSecondary[600], palette.brandSecondary[800]]} label={`Savings vs ${cfg.reliabilitySKU}`} value={cfg.savingsPct} sub={`vs ${cfg.reliabilitySKU} — not vs on-demand`} />
        </Stack>
      </Box>

      {/* Per-workload planning rows */}
      <WorkloadsTable cfg={cfg} onOpen={onOpen} />
    </>
  );
}

export default function PtuPlanner() {
  const [csp, setCsp] = useState('GCP');
  const [view, setView] = useState('planner');
  const [drill, setDrill] = useState(null);
  const cfg = CSP[csp];

  return (
    <AppShell breadcrumb="Cost Optimization" pageName="Provisioned Throughput Planner" provider={csp} providers={CSP_KEYS} onProviderChange={(k) => { setCsp(k); setDrill(null); }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>{cfg.title}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              {cfg.note} Based on your last 30 days of token usage: should you provision capacity, how many {cfg.unit}s, and for what term?
            </Typography>
          </Box>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)} sx={{ flexShrink: 0 }}>
            <ToggleButton value="planner">Planner</ToggleButton>
            <ToggleButton value="inventory">Inventory</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {view === 'planner' ? <PlannerView cfg={cfg} onOpen={setDrill} /> : <InventoryView cfg={cfg} />}

        <Divider />
        <Typography variant="caption" color="text.secondary">
          Scaffold — all data is mock. CSP selected from the side-nav badge (GCP / Azure); AWS Bedrock deferred per the brief.
        </Typography>
      </Stack>

      <WorkloadDrilldown workload={drill} cfg={cfg} onClose={() => setDrill(null)} />
    </AppShell>
  );
}
