import { Box, Stack, Typography, Chip, Button, Checkbox, Divider, Icon as MuiIcon } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppShell from '@archera/design-system/AppShell';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// PTU / GSU Planner — SCAFFOLD (see Confluence "PTU Design Brief", ARS 1202421769)
//
// Capacity / reliability product — NOT savings-vs-on-demand. Three deliberately
// SEPARATE value lenses (capacity / protected value / vs reliability-SKU), never a
// blended "total savings" number (brief §6a). GCP Gemini first → unit = GSU.
// Mock data lives inline for now; split into ptuData.js when this grows past a shell.
// Net-new vs the commitment chassis: the throughput-shape hero chart, burndown-
// adjusted demand, and the fit verdict. Everything else (AppShell, tokens, card
// treatment) is shared.
// ─────────────────────────────────────────────────────────────────────────────

const TOKENS_PER_GSU = 500;          // Gemini 3.1 Pro: 1 GSU = 500 tok/s (brief §2)
const RECOMMENDED_GSUS = 8;
const CAPACITY = RECOMMENDED_GSUS * TOKENS_PER_GSU; // 4,000 tok/s provisioned

// Deterministic burndown-adjusted throughput series (~30 days, 6h buckets → 120 pts):
// a steady diurnal workload that mostly sits under provisioned capacity, with a few
// short bursts that spike above it (the burstiness story the chart has to tell).
const N = 120;
const SERIES = Array.from({ length: N }, (_, i) => {
  const diurnal = Math.sin((i / N) * Math.PI * 30) * 850 + 2600; // ~1750–3450 band
  const wobble = Math.sin(i * 1.7) * 160;
  const burst = [14, 41, 67, 93, 110].includes(i) ? 2300 : 0;    // 5 bursts over capacity
  return Math.max(300, Math.round(diurnal + wobble + burst));
});
const Y_MAX = 6000;
const BURSTS = SERIES.filter((v) => v > CAPACITY).length;

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);

// ─── Throughput-vs-demand hero chart ─────────────────────────────────────────
function ThroughputChart() {
  const W = 960;
  const H = 230;
  const padY = 14;
  const x = (i) => ((i / (N - 1)) * W).toFixed(1);
  const y = (v) => (padY + (1 - v / Y_MAX) * (H - padY * 2)).toFixed(1);
  const line = SERIES.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const capY = y(CAPACITY);

  const Legend = ({ swatch, label }) => (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      {swatch}
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 4, p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="h5">Throughput vs. demand — last 30 days</Typography>
        <Typography variant="caption" color="text.secondary">burndown-adjusted tokens/sec</Typography>
      </Stack>
      <Stack direction="row" spacing={2.5} sx={{ mb: 1.5 }}>
        <Legend swatch={<Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: palette.uiPrimary[500] }} />} label="Demand" />
        <Legend swatch={<Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${palette.brandPrimary[500]}` }} />} label={`Provisioned capacity — ${RECOMMENDED_GSUS} GSUs (${fmt(CAPACITY)} tok/s)`} />
        <Legend swatch={<Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: semantic.warning.main }} />} label={`Bursts over capacity (${BURSTS})`} />
      </Stack>

      <Box sx={{ position: 'relative', width: '100%' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={y(g * Y_MAX)} y2={y(g * Y_MAX)} stroke={color.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill={alpha(palette.uiPrimary[500], 0.12)} />
          <path d={line} fill="none" stroke={palette.uiPrimary[500]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {/* bursts that exceed provisioned capacity → would throttle / spill to PayGo */}
          {SERIES.map((v, i) => (v > CAPACITY
            ? <line key={i} x1={x(i)} x2={x(i)} y1={capY} y2={y(v)} stroke={semantic.warning.main} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            : null))}
          <line x1="0" x2={W} y1={capY} y2={capY} stroke={palette.brandPrimary[500]} strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </svg>
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">30 days ago</Typography>
        <Typography variant="caption" color="text.secondary">today</Typography>
      </Stack>
    </Box>
  );
}

// ─── Value lens card (one of three deliberately-separate value modules) ──────
function LensCard({ icon, grad, label, value, unit, sub }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 4, p: 3 }}>
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

// ─── Per-workload planning rows (model · version · region) ───────────────────
// PTU's equivalent of the commitment planner's instance table: throughput SHAPE
// drives a fit verdict, not savings. Mock workloads with varied fit.
const WORKLOADS = [
  { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'us-central1', sustained: 3100, peak: 4200, gsus: 5, util: 0.86, fit: 'good', shape: 'steady' },
  { model: 'Gemini 3.1 Pro', version: 'v3.1', region: 'europe-west4', sustained: 900, peak: 1400, gsus: 2, util: 0.78, fit: 'good', shape: 'steady' },
  { model: 'Gemini 3.1 Flash', version: 'v2', region: 'us-central1', sustained: 480, peak: 2600, gsus: 1, util: 0.41, fit: 'borderline', shape: 'bursty' },
  { model: 'Gemini 2.5 Pro', version: 'v2.5', region: 'asia-southeast1', sustained: 120, peak: 980, gsus: 0, util: 0, fit: 'poor', shape: 'spiky' },
];

const COL = { check: 40, shape: 150, tput: 150, rec: 130, util: 110 };

const fitTone = (fit) => (fit === 'good' ? semantic.success : fit === 'borderline' ? semantic.warning : semantic.error);
const fitChipColor = (fit) => (fit === 'good' ? 'success' : fit === 'borderline' ? 'warning' : 'error');
const fitLabel = (fit) => (fit === 'good' ? 'Good fit' : fit === 'borderline' ? 'Borderline' : 'Poor fit');

// Deterministic per-workload throughput shape (0–1 normalized).
function shapeSeries(shape, seed) {
  const n = 40;
  const cfg = shape === 'steady' ? { base: 0.68, amp: 0.07, bursts: [] }
    : shape === 'bursty' ? { base: 0.3, amp: 0.09, bursts: [9, 22, 33] }
    : { base: 0.16, amp: 0.05, bursts: [13, 31] }; // spiky-low
  return Array.from({ length: n }, (_, i) => {
    const wobble = Math.sin(i * 1.3 + seed) * cfg.amp;
    const burst = cfg.bursts.includes(i) ? (shape === 'bursty' ? 0.55 : 0.72) : 0;
    return Math.max(0.04, Math.min(1, cfg.base + wobble + burst));
  });
}

function MiniThroughput({ shape, fit, seed }) {
  const pts = shapeSeries(shape, seed);
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

function WorkloadRow({ w, seed }) {
  const recommended = w.fit !== 'poor';
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 3, py: 1.5, borderTop: `1px solid ${color.divider}`, opacity: recommended ? 1 : 0.62 }}>
      <Box sx={{ width: COL.check, flexShrink: 0 }}>
        <Checkbox size="small" defaultChecked={recommended} sx={{ p: 0 }} />
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
            <Typography variant="h6" sx={{ color: palette.brandPrimary[500] }}>{w.gsus} GSUs</Typography>
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
    </Stack>
  );
}

function WorkloadsTable() {
  return (
    <Box sx={{ bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 4, overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Typography variant="h5">Workloads · provisioning recommendations</Typography>
        <Typography variant="body2" color="text.secondary">
          Per model · version · region. Throughput <em>shape</em> (burndown-adjusted) drives the fit verdict — a high monthly total isn't enough if traffic is too bursty.
        </Typography>
      </Box>
      <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ px: 3, pb: 1, bgcolor: palette.surface }}>
        <Box sx={{ width: COL.check, flexShrink: 0 }} />
        <Typography variant="h6" color="text.secondary" sx={{ flex: 1 }}>Workload</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.shape, flexShrink: 0 }}>Throughput shape</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.tput, flexShrink: 0, textAlign: 'right' }}>Throughput</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.rec, flexShrink: 0, textAlign: 'right' }}>Recommended</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ width: COL.util, flexShrink: 0, textAlign: 'right' }}>Utilization</Typography>
      </Stack>
      {WORKLOADS.map((w, i) => <WorkloadRow key={`${w.model}-${w.region}`} w={w} seed={i * 2.3} />)}
    </Box>
  );
}

export default function PtuPlanner() {
  return (
    <AppShell breadcrumb="Cost Optimization" pageName="Provisioned Throughput Planner" provider="GCP">
      <Stack spacing={2.5} sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        {/* Header — mirrors the Commitment Planner section-header treatment (h3 + body1) */}
        <Box>
          <Typography variant="h3" sx={{ mb: 0.5 }}>Gemini Provisioned Throughput</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
            Google's provisioned throughput unit is a <strong>GSU</strong> (Generative AI Scale Unit). Based on your
            last 30 days of token usage: should you provision capacity, how many GSUs, and for what term?
          </Typography>
        </Box>

        {/* Recommendation-first verdict (mirrors the GRI "Apply plan" affordance, for capacity) */}
        <Box sx={{ borderRadius: 4, p: 3, border: `1px solid ${palette.brandPrimary[300]}`, bgcolor: alpha(palette.brandPrimary[50], 0.4), boxShadow: elevation[1] }}>
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Chip size="small" color="success" label={<Typography variant="micro">Good fit</Typography>} />
                <Typography variant="h5">Provision {RECOMMENDED_GSUS} GSUs · 1-month Archera term</Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                Your sustained demand fits comfortably under {fmt(CAPACITY)} tokens/sec. {BURSTS} short bursts over the last
                30 days briefly exceed capacity and spill to pay-as-you-go — expected and low-impact. Archera underwrites
                the longer native reservation, so you commit short and we absorb the unused-capacity risk.
              </Typography>
            </Box>
            <Button size="large" variant="contained" color="secondary" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              Apply this commitment
            </Button>
          </Stack>
        </Box>

        {/* Throughput hero chart — the make-or-break burstiness visualization */}
        <ThroughputChart />

        {/* Three SEPARATE value lenses — never blended into one number (brief §6a) */}
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>What you're getting</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Three separate lenses — capacity, protection, and rate. Deliberately not a single “total savings” figure
            (there is no on-demand savings here).
          </Typography>
          <Stack direction="row" spacing={2.5} alignItems="stretch">
            <LensCard
              icon="speed"
              grad={[palette.uiPrimary[400], palette.uiPrimary[600]]}
              label="Capacity secured"
              value={`${RECOMMENDED_GSUS}`}
              unit="GSUs"
              sub={`${fmt(CAPACITY)} tokens/sec guaranteed throughput`}
            />
            <LensCard
              icon="verified_user"
              grad={[palette.brandPrimary[400], palette.brandPrimary[600]]}
              label="Protected value"
              value="$3.2K"
              unit="/mo"
              sub="guaranteed back if you under-use the commitment"
            />
            <LensCard
              icon="trending_down"
              grad={[palette.brandSecondary[600], palette.brandSecondary[800]]}
              label="Savings vs Priority PayGo"
              value="42%"
              sub="vs GCP's priority reliability rate — not vs on-demand"
            />
          </Stack>
        </Box>

        {/* Per-workload planning rows */}
        <WorkloadsTable />

        <Divider />
        <Typography variant="caption" color="text.secondary">
          Scaffold — data is mock. Still to come: burndown-adjusted demand detail, the per-workload throughput
          drill-in, and the PTU inventory view.
        </Typography>
      </Stack>
    </AppShell>
  );
}
