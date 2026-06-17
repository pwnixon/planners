import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, Button, Chip, Checkbox, FormControlLabel, Tooltip,
  Snackbar, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppShell from '@archera/design-system/AppShell';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, elevation } from '@archera/design-system/tokens';
import KpiSection from './KpiSection';
import ServiceCard from './ServiceCard';
import BriefingOverlay from './BriefingOverlay';
import {
  SERVICES, TERMS, TERM_ORDER, TERM_LENGTHS, PRESETS, defaultSelections, applyPreset, detectPlan,
  pageMetrics, DEFAULT_FEATURED, fmtMoney, KPI_CATALOG,
} from './data';

const kpiById = Object.fromEntries(KPI_CATALOG.map((k) => [k.id, k]));

function SectionHeader({ title, description, action }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={2}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h3" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="body1" color="text.secondary">{description}</Typography>
      </Box>
      {action}
    </Stack>
  );
}

const DEFAULT_VISIBLE_LENGTHS = ['30d', '1y'];

// Derive the ordered list of visible term IDs from selected length groups + commitment types
function deriveVisibleTerms(lengths, types) {
  const ids = new Set(
    TERM_LENGTHS.filter((l) => lengths.includes(l.id)).flatMap((l) => l.termIds)
  );
  return TERM_ORDER.filter((t) => {
    if (!ids.has(t)) return false;
    return TERMS[t].guaranteed ? types.includes('guaranteed') : types.includes('standard');
  });
}

// ─── Strategy plan card ──────────────────────────────────────────────────────
// Each predefined plan (and Custom) is a first-class object: apply it or save it.
// Active plan is derived from selections — see detectPlan in data.js.
//
// The active card grows to 2× the inactive ones and swaps to a dark brand
// gradient with white type; inactive cards sit on a subtle light gradient with
// dark type. On selection, everything cross-fades together (the standard
// material-emphasis curve). Notes on the moving parts:
//   • width      — animated via flex-grow (2 vs 1); flexBasis:0 keeps the ratio exact
//   • background — two stacked gradient layers; the dark one fades in (gradients
//                  can't be tweened directly, so we cross-fade opacity instead)
//   • type       — title size + text colors transition; logo cross-fades black↔white
//   • chrome     — the Active chip fades/scales in, padding & desc indent ease in
// Per-card active gradient over a dark brand base — each card favors its own hue,
// with a matching status color (Active chip + border + Apply button).
const bp = palette.brandPrimary;
const bt = palette.brandTertiary;  // pink / salmon
const bs = palette.brandSecondary; // light blue / cyan
const CARD_TONE = {
  recommended: { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[800]} 32%, ${bp[600]} 78%, ${bp[500]} 100%)`, status: bp[500], statusDark: bp[700] },
  balanced:    { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[900]} 24%, ${bt[800]} 66%, ${bt[600]} 100%)`, status: bt[600], statusDark: bt[800] },
  custom:      { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[800]} 30%, ${bs[800]} 70%, ${bs[600]} 100%)`, status: bs[700], statusDark: bs[800] },
};
const cardLightGradient = `linear-gradient(160deg, ${palette.surface} 0%, ${alpha(palette.brandPrimary[50], 0.45)} 100%)`;
const EMPHASIZED = 'cubic-bezier(0.4, 0, 0.2, 1)';
const PLAN_ACTION_WIDTH = 154; // footer buttons are a fixed width per the Figma spec

function StrategyCard({ title, desc, active, isCustom, tone = 'recommended', onSelect, onApply, onSaveDraft }) {
  const clickable = !active && Boolean(onSelect);
  const t = CARD_TONE[tone] || CARD_TONE.recommended;
  return (
    <Box
      onClick={clickable ? onSelect : undefined} // tab click loads the plan into the builder
      sx={{
        minWidth: 0, // grid track owns the width; allow it to shrink below content
        // Lock a constant height (card already clips overflow) so re-wrapping the
        // description at different widths/sizes can't change the card height —
        // text reflow stays contained and the row never shifts.
        height: 208,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 1,
        bgcolor: palette.surface,
        border: `1px solid ${active ? t.status : color.outlineBorder}`,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.3s ease, box-shadow 0.2s ease',
        '&:hover': { boxShadow: elevation[4] },
        '&:hover .card-hover': { opacity: 1 },
      }}
    >
      {/* BODY — gradient (active) or light (inactive); footer below stays white */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
          px: 3,
          pt: 4,
          pb: active ? 4 : 2.5,
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: cardLightGradient }} />
        <Box sx={{ position: 'absolute', inset: 0, background: t.grad, opacity: active ? 1 : 0, transition: `opacity 0.4s ${EMPHASIZED}` }} />
        {clickable && (
          <Box className="card-hover" sx={{ position: 'absolute', inset: 0, bgcolor: alpha(palette.neutral.black, 0.04), opacity: 0, transition: 'opacity 0.2s ease' }} />
        )}

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: active ? 0.25 : 1 }}>
            {!isCustom && (
              <Box
                component="img"
                src={archeraMarkBlackSvg}
                alt=""
                sx={{ width: 27, height: 24, flexShrink: 0, opacity: active ? 1 : 0.25, filter: active ? 'brightness(0) invert(1)' : 'none', transition: 'opacity 0.3s ease, filter 0.3s ease' }}
              />
            )}
            <Typography
              variant="h4"
              sx={{
                flex: 1,
                color: active ? palette.neutral.white : palette.text.primary,
                fontSize: (theme) => (active ? theme.typography.h2.fontSize : theme.typography.h4.fontSize),
                transition: 'color 0.3s ease',
              }}
            >
              {/\bplan$/i.test(title) ? title : `${title} Plan`}
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            sx={{
              pl: active && !isCustom ? '36px' : 0,
              fontSize: (theme) => (active ? theme.typography.body3.fontSize : theme.typography.body1.fontSize),
              lineHeight: (theme) => (active ? theme.typography.body3.lineHeight : theme.typography.body1.lineHeight),
              color: active ? palette.neutral[300] : palette.text.secondary,
              transition: 'color 0.3s ease',
            }}
          >
            {desc}
          </Typography>
        </Box>
      </Box>

      {/* FOOTER — white bar with status chip + action(s); only on the active plan.
          Inactive cards are just selectable tabs (click the body to load them). */}
      {active && (
        <Box sx={{ bgcolor: palette.surface, p: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip size="small" label={<Typography variant="micro" sx={{ color: palette.neutral.white }}>Active</Typography>} sx={{ flexShrink: 0, bgcolor: t.status }} />
            <Box sx={{ flex: 1 }} />
            {isCustom && (
              <Tooltip title="Saves a draft — nothing is purchased until you execute">
                <span style={{ display: 'flex' }}>
                  <Button size="large" variant="outlined" onClick={(e) => { e.stopPropagation(); onSaveDraft(); }} sx={{ width: PLAN_ACTION_WIDTH }}>
                    Save as draft
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              size="large"
              variant="contained"
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              sx={{ width: PLAN_ACTION_WIDTH, bgcolor: t.status, '&:hover': { bgcolor: t.statusDark } }}
            >
              Apply this plan
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

import archeraMarkBlackSvg from './assets/archera-mark-black.svg';

export default function CustomPlanBuilder() {
  const demo = new URLSearchParams(window.location.search).get('demo');
  const [briefing, setBriefing] = useState(demo === 'briefing'); // has_actioned_plan === false
  const [selections, setSelections] = useState(defaultSelections); // prefilled: nightly Recommended plan
  const [visibleLengths, setVisibleLengths] = useState(DEFAULT_VISIBLE_LENGTHS);
  const [visibleTypes, setVisibleTypes] = useState(['guaranteed', 'standard']);
  const visibleTermIds = deriveVisibleTerms(visibleLengths, visibleTypes);

  const toggleLength = (lengthId) => {
    setVisibleLengths((v) => {
      if (v.includes(lengthId)) return v.length > 1 ? v.filter((l) => l !== lengthId) : v;
      return [...v, lengthId];
    });
  };

  const toggleType = (type) => {
    setVisibleTypes((v) => {
      if (v.includes(type)) return v.length > 1 ? v.filter((t) => t !== type) : v;
      return [...v, type];
    });
  };
  const [featured, setFeatured] = useState(DEFAULT_FEATURED);
  const [kpiLibOpen, setKpiLibOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState('recommended');
  // #1 — fixed condensed header once the plan + KPI sections scroll out of view.
  const [stuck, setStuck] = useState(false);
  const kpiRef = useRef(null);

  const metrics = useMemo(() => pageMetrics(selections), [selections]);
  // Derived, never stored: editing a predefined plan makes it Custom; reverting
  // the edits makes it predefined again (keeps automation eligibility honest).
  const activePlan = useMemo(() => detectPlan(selections), [selections]);
  // Display label for the active plan — matches the card titles (with " Plan" suffix).
  const activePlanName = (() => {
    const raw = activePlan === 'custom' ? 'Custom Plan' : (PRESETS[activePlan]?.label ?? 'Plan');
    return /\bplan$/i.test(raw) ? raw : `${raw} Plan`;
  })();
  // Distinct commitment terms actually selected in the plan (TERM_ORDER for stable order).
  const includedTermIds = new Set(Object.values(selections).filter(Boolean));
  const includedTermLabels = TERM_ORDER.filter((t) => includedTermIds.has(t)).map((t) => TERMS[t].label);

  // Keep the latest custom state so clicking the Custom tab can restore it
  // after switching to a predefined plan.
  const customSnapshot = useRef(null);
  const [hasCustomPlan, setHasCustomPlan] = useState(false);
  useEffect(() => {
    if (activePlan === 'custom') {
      customSnapshot.current = selections;
      setHasCustomPlan(true);
    }
  }, [activePlan, selections]);

  const setSelection = (instanceId, termId) => {
    setSelections((s) => ({ ...s, [instanceId]: termId }));
  };

  const setServiceTerm = (serviceId, termId) => {
    const svc = SERVICES.find((s) => s.id === serviceId);
    setSelections((s) => {
      const next = { ...s };
      svc.instances.forEach((i) => { next[i.id] = termId; });
      return next;
    });
  };

  const handleApply = (presetId) => {
    const sel = applyPreset(presetId);
    setSelections(sel);
    // #2 — pre-select to match the plan: make sure every term the plan uses is a
    // visible comparison column, so each panel shows the plan's selection.
    const used = new Set(Object.values(sel).filter(Boolean));
    const usedLengths = TERM_LENGTHS.filter((l) => l.termIds.some((t) => used.has(t))).map((l) => l.id);
    setVisibleLengths((v) => Array.from(new Set([...v, ...usedLengths])));
  };

  const clearAll = () => {
    setSelections((s) => {
      const next = {};
      Object.keys(s).forEach((k) => { next[k] = null; });
      return next;
    });
  };

  // Show the condensed header once the bottom of the KPI section scrolls above the
  // top of the scroll container (AppShell's <main>).
  useEffect(() => {
    const el = kpiRef.current;
    if (!el) return undefined;
    let sc = el.parentElement;
    while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
    const scroller = sc || window;
    const onScroll = () => {
      const refTop = sc ? sc.getBoundingClientRect().top : 0;
      setStuck(el.getBoundingClientRect().bottom <= refTop + 4);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // Custom card → modal: pick a starting point, then customize from there.
  const startCustom = () => {
    if (customStart === 'clean') clearAll();           // deselect everything → KPIs zero out
    else setSelections(applyPreset(customStart));      // seed from a plan, then edits make it custom
    setCustomModalOpen(false);
  };

  return (
    <AppShell breadcrumb="Cost Optimization" pageName="Commitment Planner" provider="AWS">
      <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        {/* #1 — condensed sticky header (plan name + featured KPI values) that appears
            once the plan + KPI sections have scrolled out of view. */}
        <Box
          sx={{
            position: 'sticky', top: 0, zIndex: 20,
            bgcolor: palette.surface,
            borderBottom: `1px solid ${color.divider}`,
            boxShadow: stuck ? elevation[2] : 'none',
            maxHeight: stuck ? 64 : 0,
            opacity: stuck ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.25s ease, opacity 0.2s ease',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ textTransform: 'none', flexShrink: 0 }}>{activePlanName}</Typography>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" spacing={3} sx={{ overflowX: 'auto' }}>
              {featured.map((id) => {
                const k = kpiById[id];
                if (!k) return null;
                const vv = k.get(metrics);
                return (
                  <Stack key={id} direction="row" spacing={0.5} alignItems="baseline" sx={{ flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>{k.label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{vv.projected}{k.unit}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={6} sx={{ width: '100%' }}>
        {/* Plan tabs — predefined strategies + the custom plan; active tab opens into the page */}
        {/* Grid (not flex): Chrome interpolates grid-template-columns fr units, so
            the active card's 2fr↔1fr width change animates smoothly — flex-grow
            does not animate and was snapping. */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: [...Object.keys(PRESETS).filter((k) => k !== 'high_savings'), 'custom']
              .map((id) => (activePlan === id ? '2fr' : '1fr'))
              .join(' '),
            gap: 1.5,
            alignItems: 'stretch',
            transition: `grid-template-columns 0.4s ${EMPHASIZED}`,
          }}
        >
          {Object.entries(PRESETS).filter(([id]) => id !== 'high_savings').map(([id, p]) => (
            <StrategyCard
              key={id}
              title={p.label}
              desc={p.desc}
              tone={id}
              active={activePlan === id}
              onSelect={() => handleApply(id)}
              onApply={() => setSavedToast(true)}
            />
          ))}
          <StrategyCard
            title="Custom Plan"
            desc="Start from any plan — your changes are collected here as a custom plan. Revert your changes and the original plan takes back over."
            active={activePlan === 'custom'}
            isCustom
            tone="custom"
            onSelect={() => setCustomModalOpen(true)}
            onApply={() => setSavedToast(true)}
            onSaveDraft={() => setSavedToast(true)}
          />
        </Box>

        {/* KPI strip (ref tracks when it scrolls past, to toggle the sticky header) */}
        <Box ref={kpiRef}>
          <KpiSection
            planName={activePlanName}
            metrics={metrics}
            featured={featured}
            setFeatured={setFeatured}
            libOpen={kpiLibOpen}
            setLibOpen={setKpiLibOpen}
          />
        </Box>

        {/* Commitment coverage — one section (header, filters, per-service cards) at the
            tighter 20px internal spacing; 48px separates it from the KPI section above. */}
        <Stack spacing={2.5}>
        <SectionHeader
          title={(
            <>
              {activePlanName} Commitment Coverage
              {includedTermLabels.length > 0 && (
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>: {includedTermLabels.join(' · ')}</Box>
              )}
            </>
          )}
          description="Reservable infrastructure grouped by service. Select a term per resource — Guaranteed commitments include Archera's buyback if usage drops; native terms carry full lock-in risk. Uncovered resources are paying full on-demand rates."
        />
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Comparison term lengths:</Typography>
          {TERM_LENGTHS.map((length) => (
            <Tooltip key={length.id} title="Show or hide commitments at this term length across all resources.">
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={visibleLengths.includes(length.id)}
                    onChange={() => toggleLength(length.id)}
                  />
                }
                label={<Typography variant="body2">{length.label}</Typography>}
                sx={{ mr: 0.5 }}
              />
            </Tooltip>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Comparison types:</Typography>
          <Tooltip title="Archera-insured commitments. If usage drops, Archera buys back unused capacity and pays the shortfall — your downside is $0.">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={visibleTypes.includes('guaranteed')}
                  onChange={() => toggleType('guaranteed')}
                />
              }
              label={<Typography variant="body2">Guaranteed</Typography>}
              sx={{ mr: 0.5 }}
            />
          </Tooltip>
          <Tooltip title="Native cloud commitments (RI, SP, CUD). No buyback — if usage drops, you keep paying for unused capacity until the term ends.">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={visibleTypes.includes('standard')}
                  onChange={() => toggleType('standard')}
                />
              }
              label={<Typography variant="body2">Standard</Typography>}
              sx={{ mr: 0.5 }}
            />
          </Tooltip>
          <Box sx={{ flex: 1 }} />
        </Stack>

        {/* Service cards */}
        {SERVICES.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            selections={selections}
            setSelection={setSelection}
            setServiceTerm={setServiceTerm}
            visibleTermIds={visibleTermIds}
          />
        ))}

        <Box sx={{ borderTop: `1px solid ${color.divider}`, pt: 2, pb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Plans are rebuilt nightly from your Cost and Usage Report with a 7-day lookback. Guaranteed
            Commitments are insured by Archera — if your usage drops, Archera buys back the unused
            commitment. The platform is free; Archera charges a premium only on Guaranteed Commitments,
            and only when they save you money. Figures shown are net of premiums.
          </Typography>
        </Box>
        </Stack>
        </Stack>
      </Box>

      {briefing && <BriefingOverlay metrics={metrics} onDismiss={() => setBriefing(false)} />}

      {/* Custom plan starting point */}
      <Dialog open={customModalOpen} onClose={() => setCustomModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start your custom plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We recommend starting from a plan, then customizing from there — it's faster than building from nothing.
          </Typography>
          <RadioGroup value={customStart} onChange={(e) => setCustomStart(e.target.value)}>
            {[
              { id: 'recommended', label: 'Start from the Recommended plan', desc: '30-day Guaranteed Commitments on every coverable resource.' },
              { id: 'balanced', label: 'Start from the Balanced plan', desc: '1-year Guaranteed on stable workloads, 30-day everywhere else.' },
              { id: 'clean', label: 'Start from a clean slate', desc: 'Nothing selected — build the plan up yourself. KPIs reset to zero until you start selecting.' },
            ].map((o) => (
              <FormControlLabel
                key={o.id}
                value={o.id}
                control={<Radio />}
                sx={{ alignItems: 'flex-start', mb: 1, mr: 0 }}
                label={(
                  <Box sx={{ py: 0.5 }}>
                    <Typography variant="body1">{o.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{o.desc}</Typography>
                  </Box>
                )}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={startCustom}>Start customizing</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={savedToast}
        autoHideDuration={4000}
        onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSavedToast(false)}>
          Draft saved — {metrics.count} commitments, +{fmtMoney(metrics.savingsMo.projected - metrics.savingsMo.current)}/mo
          projected savings. Nothing is purchased until you execute.
        </Alert>
      </Snackbar>
    </AppShell>
  );
}
