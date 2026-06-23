import { useState, useRef, useEffect } from 'react';
import { Box, Stack, Typography, Collapse, Link, Icon as MuiIcon } from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic } from '@archera/design-system/tokens';
import { planColor } from './StrategyCard';
import { PLAN_KPIS } from './data';

// ─── Plan-view KPI card (Figma node 167:357) ─────────────────────────────────
// One horizontal row: icon tile · label + description · value + delta. The icon,
// its background, and the value all take the active plan's color, so the trio
// reads as "this plan's metrics" rather than generic KPIs. The delta stays
// success-green (a gain is a gain, whichever plan is active). Type uses the theme
// variants the Figma referenced (label h5, description body2, value h2).
function PlanKpiCard({ kpi, metrics, accent }) {
  const v = kpi.get(metrics);

  return (
    <Box
      sx={{
        bgcolor: palette.surface,
        border: `1px solid ${color.outlineBorder}`,
        borderRadius: 2,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="flex-start">
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: alpha(accent, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 32, color: accent }}>
            {kpi.icon}
          </MuiIcon>
        </Box>

        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, pl: 2, pr: 1 }}>
          <Typography variant="h5">{kpi.label}</Typography>
          <Typography variant="body2" color="text.secondary">{kpi.desc}</Typography>
        </Stack>

        <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.5} justifyContent="flex-end">
            <Typography variant="h2" sx={{ fontWeight: 700, color: accent }}>{v.projected}</Typography>
            {kpi.unit && <Typography variant="body3" color="text.secondary">{kpi.unit}</Typography>}
          </Stack>
          {v.delta && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: semantic.success.main }}>{v.delta}</Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

// ─── Plan-view KPI section ─────────────────────────────────────────────────────
// Fixed trio (coverage / breakeven / upfront) — no library, no configure affordance.
// That configurability lives in the builder view's KpiSection. The cards take the
// active plan's color (via `tone`) to tie them to the plan.
export default function PlanKpiSection({ metrics, tone = 'recommended' }) {
  const accent = planColor(tone);
  // These KPIs are supplementary to the plan card's headline metrics, so they're
  // hidden by default; a toggle reveals them on demand to keep the page uncluttered.
  const [show, setShow] = useState(true);

  // Brief opacity dip when the metrics change (plan switch / edit), mirroring
  // KpiSection so the cards visibly signal they're recomputing. Skip first mount.
  const [updating, setUpdating] = useState(false);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setUpdating(true);
    const t = setTimeout(() => setUpdating(false), 450);
    return () => clearTimeout(t);
  }, [metrics]);

  return (
    <Stack spacing={0}>
      <Collapse in={show}>
        {/* Bottom padding lives inside the Collapse so the cards↔toggle gap only
            exists when expanded — collapsed, the toggle hugs right under the plan. */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 1.5,
            pb: 1.5,
            alignItems: 'stretch',
            opacity: updating ? 0.35 : 1,
            transition: 'opacity 0.25s ease',
          }}
        >
          {PLAN_KPIS.map((kpi) => (
            <PlanKpiCard key={kpi.id} kpi={kpi} metrics={metrics} accent={accent} />
          ))}
        </Box>
      </Collapse>
      <Link
        component="button"
        type="button"
        variant="body1"
        underline="hover"
        onClick={() => setShow((s) => !s)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content', fontWeight: 700 }}
      >
        <MuiIcon sx={{ fontSize: 20 }}>{show ? 'expand_less' : 'expand_more'}</MuiIcon>
        {show ? 'Hide additional plan KPIs' : 'Show additional plan KPIs'}
      </Link>
    </Stack>
  );
}
