import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, Button, Chip, Checkbox, FormControlLabel, Tooltip, Switch, Collapse,
  Snackbar, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppShell from '@archera/design-system/AppShell';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';
import PlanKpiSection from './PlanKpiSection';
import ServiceCard from './ServiceCard';
import StrategyCard, { planColor } from './StrategyCard';
import CommitmentIcon from './CommitmentIcon';
import { SERVICE_ICON } from './serviceIcons';
import BriefingOverlay from './BriefingOverlay';
import {
  SERVICES, TERMS, TERM_ORDER, TERM_LENGTHS, PRESETS, defaultSelections, applyPreset, detectPlan,
  pageMetrics, PLAN_KPIS, fmtMoney, fmtPct,
  serviceCommitments, aggregateOption, commitmentTerm, planCommitmentCount, planSummary,
} from './data';

function SectionHeader({ title, description, action }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={2}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h3" sx={{ mb: 0.5 }}>{title}</Typography>
        {description && <Typography variant="body1" color="text.secondary">{description}</Typography>}
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

// ─── Review & apply modal ────────────────────────────────────────────────────
// Plan summary (savings / coverage / count) over a condensed line-item table,
// grouped by service.
function ReviewApplyModal({ open, onClose, onConfirm, planName, metrics, selections }) {
  const netSavings = metrics.savingsMo.projected - metrics.savingsMo.current;
  const groups = SERVICES
    .map((svc) => ({
      service: svc,
      rows: serviceCommitments(svc)
        .map((c) => {
          const termId = commitmentTerm(c, selections);
          if (!termId || termId === 'mixed') return null;
          const opt = aggregateOption(c.instances, termId);
          return {
            key: c.key,
            vehicle: c.vehicle,
            scope: c.scope,
            kind: c.kind,
            termId,
            term: TERMS[termId].label,
            guaranteed: TERMS[termId].guaranteed,
            count: c.instances.length,
            cost: opt.commitCostMo,
            savings: opt.savingsMo,
          };
        })
        .filter(Boolean),
    }))
    .filter((g) => g.rows.length > 0);

  const commitmentCount = groups.reduce((a, g) => a + g.rows.length, 0);
  const W = { term: 136, res: 80, cost: 100, sav: 124 };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{planName} — review &amp; apply</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={5} sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: alpha(palette.brandPrimary[50], 0.4) }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Net monthly savings</Typography>
            <Typography variant="h4" sx={{ color: semantic.success.dark }}>+{fmtMoney(netSavings)}/mo</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Projected coverage</Typography>
            <Typography variant="h4">{fmtPct(metrics.coverage.projected)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Commitments</Typography>
            <Typography variant="h4">{commitmentCount}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ pb: 1, borderBottom: `1px solid ${color.outlineBorder}` }}>
          <Typography variant="h6" color="text.secondary" sx={{ flex: 1 }}>Commitment</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: W.term, flexShrink: 0 }}>Term</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: W.res, flexShrink: 0, textAlign: 'right' }}>Resources</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: W.cost, flexShrink: 0, textAlign: 'right' }}>Cost/mo</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: W.sav, flexShrink: 0, textAlign: 'right' }}>Net savings/mo</Typography>
        </Stack>

        {groups.map((g) => (
          <Box key={g.service.id}>
            <Typography variant="subtitle2" sx={{ textTransform: 'none', color: palette.text.secondary, bgcolor: palette.neutral[50], px: 1, py: 0.5, mt: 1.5, borderRadius: 0.5 }}>
              {g.service.name}
            </Typography>
            {g.rows.map((r, idx) => (
              <Stack key={r.key} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderTop: idx ? `1px solid ${color.divider}` : 'none' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CommitmentIcon kind={r.kind} infraSrc={SERVICE_ICON[g.service.id]} termId={r.termId} size={24} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.vehicle}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: '32px' }}>{r.scope}</Typography>
                </Box>
                <Box sx={{ width: W.term, flexShrink: 0 }}>
                  <Chip size="small" variant="outlined" color={r.guaranteed ? 'secondary' : 'default'} label={<Typography variant="micro">{r.term}</Typography>} />
                </Box>
                <Typography variant="body2" sx={{ width: W.res, flexShrink: 0, textAlign: 'right' }}>{r.count}</Typography>
                <Typography variant="body2" sx={{ width: W.cost, flexShrink: 0, textAlign: 'right' }}>{fmtMoney(r.cost)}/mo</Typography>
                <Typography variant="body2" sx={{ width: W.sav, flexShrink: 0, textAlign: 'right', fontWeight: 600, color: semantic.success.dark }}>+{fmtMoney(r.savings)}/mo</Typography>
              </Stack>
            ))}
          </Box>
        ))}
        {groups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No commitments selected yet — add coverage before applying.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} disabled={groups.length === 0}>Apply this plan</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PlanView() {
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
  const [savedToast, setSavedToast] = useState(false);
  // Comparison is opt-in in the plan view: off (default) keeps cards collapsed to
  // plan summaries; on reveals the term/type controls and expands every card.
  const [compare, setCompare] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [customToast, setCustomToast] = useState(false);
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

  // Info snackbar the moment edits turn a predefined plan into a custom plan.
  const prevPlan = useRef(activePlan);
  useEffect(() => {
    if (activePlan === 'custom' && prevPlan.current !== 'custom') setCustomToast(true);
    prevPlan.current = activePlan;
  }, [activePlan]);

  // A commitment (line item) is the unit of term selection — set the term on the
  // whole block of resources it covers at once.
  const setCommitmentTerm = (instanceIds, termId) => {
    setSelections((s) => {
      const next = { ...s };
      instanceIds.forEach((id) => { next[id] = termId; });
      return next;
    });
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
    // Changing plans resets to that plan's defaults: the commitment selections AND
    // the comparison view (term-length columns + types) return to the defaults.
    setSelections(applyPreset(presetId));
    setVisibleLengths(DEFAULT_VISIBLE_LENGTHS);
    setVisibleTypes(['guaranteed', 'standard']);
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

  // Custom card → modal. The primary path is to start from a plan and edit (which
  // becomes a custom plan automatically); this action builds a blank plan instead.
  const startBlank = () => {
    clearAll();                  // nothing preselected → KPIs zero until the user selects
    setCustomModalOpen(false);
  };

  return (
    <AppShell breadcrumb="Cost Optimization" pageName="Commitment Planner" provider="AWS">
      <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        {/* #1 — condensed sticky header (plan name + the three plan KPI values) that
            appears once the plan + KPI sections have scrolled out of view. */}
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
              {PLAN_KPIS.map((k) => {
                const vv = k.get(metrics);
                return (
                  <Stack key={k.id} direction="row" spacing={0.5} alignItems="baseline" sx={{ flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>{k.label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{vv.projected}{k.unit}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={6} sx={{ width: '100%' }}>
        {/* Plan cards + their KPIs sit tighter together (12px) than the 48px gap down to coverage. */}
        <Stack spacing={1.5}>
        {/* Plan tabs — the active plan is the wide card (metric tiles); the rest are
            compact. Width swaps instantly on selection (no animated reflow). */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: [...Object.keys(PRESETS).filter((k) => k !== 'high_savings'), 'custom']
              .map((id) => (activePlan === id ? '2fr' : '1fr'))
              .join(' '),
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {Object.entries(PRESETS).filter(([id]) => id !== 'high_savings').map(([id, p]) => {
            const sum = planSummary(id, selections);
            return (
              <StrategyCard
                key={id}
                title={p.label}
                desc={p.desc}
                tone={id}
                active={activePlan === id}
                savings={sum.savings}
                term={sum.term}
                onSelect={() => handleApply(id)}
                onApply={() => setReviewOpen(true)}
              />
            );
          })}
          {(() => {
            // Active custom plan shows its live savings; an inactive-but-saved custom
            // plan shows its snapshot's savings; otherwise there's no custom plan yet.
            const sum = activePlan === 'custom'
              ? { savings: fmtMoney(metrics.savingsMo.projected), term: '—' }
              : hasCustomPlan && customSnapshot.current
                ? { savings: fmtMoney(pageMetrics(customSnapshot.current).savingsMo.projected), term: '—' }
                : { savings: '—', term: '—' };
            return (
              <StrategyCard
                title="Custom Plan"
                desc="Start from any plan — your changes are collected here as a custom plan. Revert your changes and the original plan takes back over."
                active={activePlan === 'custom'}
                isCustom
                tone="custom"
                savings={sum.savings}
                term={sum.term}
                // Restore the saved custom plan if one exists; otherwise open the
                // start-a-custom-plan modal.
                onSelect={() => {
                  if (hasCustomPlan && customSnapshot.current) setSelections(customSnapshot.current);
                  else setCustomModalOpen(true);
                }}
                onApply={() => setReviewOpen(true)}
                onSave={() => setSavedToast(true)}
                onConfigure={() => setCustomModalOpen(true)}
              />
            );
          })()}
        </Box>

        {/* KPI strip (ref tracks when it scrolls past, to toggle the sticky header).
            Plan view = a fixed trio (coverage / breakeven / upfront), not the builder's
            configurable library. */}
        <Box ref={kpiRef}>
          <PlanKpiSection metrics={metrics} tone={activePlan} />
        </Box>
        </Stack>

        {/* Commitment coverage — one section (header, filters, per-service cards) at the
            tighter 20px internal spacing; 48px separates it from the plan/KPI section above. */}
        <Stack spacing={2}>
        {/* Header + compare toggle grouped tightly (4px), separate from the 16px
            gap down to the service cards. */}
        <Stack spacing={0.5}>
        <SectionHeader
          title={(
            <>
              {activePlanName} Commitment Coverage
              {includedTermLabels.length > 0 && (
                <Box component="span" sx={{ color: planColor(activePlan), fontWeight: 400 }}>: {includedTermLabels.join(' · ')}</Box>
              )}
            </>
          )}
        />
        {/* Comparison is opt-in: the switch names the feature (so it's discoverable),
            reveals the term/type controls, and expands every card. The controls never
            float without a grid beneath them, and the default view stays uncluttered. */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} useFlexGap flexWrap="wrap">
            <FormControlLabel
              control={<Switch checked={compare} onChange={(e) => setCompare(e.target.checked)} />}
              label={<Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Compare terms</Typography>}
              sx={{ mr: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              {compare
                ? 'Each commitment shows on-demand and every term side by side — pick the column that fits.'
                : 'Weigh 30-day, 1-year and longer terms side by side before you commit. Off by default.'}
            </Typography>
          </Stack>
          <Collapse in={compare}>
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5, bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`, borderRadius: 1, px: 2, py: 1 }}>
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
            </Stack>
          </Collapse>
        </Box>
        </Stack>

        {/* Service cards — 8px between each */}
        <Stack spacing={1}>
        {SERVICES.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            selections={selections}
            setCommitmentTerm={setCommitmentTerm}
            setServiceTerm={setServiceTerm}
            visibleTermIds={visibleTermIds}
            planView
            compareMode={compare}
          />
        ))}
        </Stack>

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
          <Typography variant="body1" color="text.secondary">
            The quickest path is to start from a plan — pick Recommended or Balanced, then adjust any
            commitment; your edits automatically become a custom plan. Prefer a clean start? Create a
            blank plan with nothing preselected and build your coverage from the ground up, one
            commitment at a time.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={startBlank}>Create from a Blank Plan</Button>
        </DialogActions>
      </Dialog>

      <ReviewApplyModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => { setReviewOpen(false); setSavedToast(true); }}
        planName={activePlanName}
        metrics={metrics}
        selections={selections}
      />

      <Snackbar
        open={savedToast}
        autoHideDuration={4000}
        onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSavedToast(false)}>
          Draft saved — {planCommitmentCount(selections)} commitments, +{fmtMoney(metrics.savingsMo.projected - metrics.savingsMo.current)}/mo
          projected net savings. Nothing is purchased until you execute.
        </Alert>
      </Snackbar>

      <Snackbar
        open={customToast}
        autoHideDuration={5000}
        onClose={() => setCustomToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setCustomToast(false)}>
          You&apos;re now editing a Custom Plan — your changes are collected here. Revert them to restore the original plan.
        </Alert>
      </Snackbar>
    </AppShell>
  );
}
