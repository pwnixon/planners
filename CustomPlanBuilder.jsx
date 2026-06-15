import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Typography, Button, Chip, Checkbox, Switch, FormControlLabel, Tooltip,
  Snackbar, Alert, Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppShell from '../_template/AppShell';
import palette from '../_template/palettes/archera-palette';
import { color, elevation } from '../_template/tokens';
import KpiSection from './KpiSection';
import ServiceCard from './ServiceCard';
import BriefingOverlay from './BriefingOverlay';
import InfoPopover from './InfoPopover';
import HoverPopover from './HoverPopover';
import {
  SERVICES, TERMS, TERM_ORDER, TERM_LENGTHS, PRESETS, defaultSelections, applyPreset, detectPlan,
  pageMetrics, DEFAULT_FEATURED, fmtMoney,
} from './data';

// Active-plan highlight — same branded treatment as selected commitment cells
const activeBg = alpha(palette.brandPrimary[50], 0.2);

function SectionHeader({ title, description, action }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={2}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
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
// Each predefined plan (and Custom) is a first-class object: apply it, automate
// it. Active plan is derived from selections — see detectPlan in data.js.

function StrategyCard({ title, desc, active, isCustom, onSelect, onApply, onSaveDraft }) {
  const [automation, setAutomation] = useState(false);
  return (
    <Box
      onClick={!active ? onSelect : undefined} // tab click loads the plan into the builder
      sx={{
        flex: 1,
        minWidth: 230,
        border: active ? `1px solid ${palette.brandPrimary[300]}` : '1px solid transparent',
        borderRadius: 2,
        p: 2,
        background: active ? palette.surface : palette.background,
        display: 'flex',
        flexDirection: 'column',
        cursor: !active && onSelect ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
        ...(!active && onSelect && { '&:hover': { background: alpha(palette.neutral.black, 0.04), '& .tab-title': { color: `${palette.text.primary} !important` } } }),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        {!isCustom && (
          <Box
            component="img"
            src={active ? archeraMarkSvg : archeraMarkBlackSvg}
            alt=""
            sx={{ width: 27, height: 24, flexShrink: 0, opacity: active ? 1 : 0.27 }}
          />
        )}
        <Typography variant="h4" className="tab-title" color={active ? 'text.primary' : 'text.secondary'} sx={{ flex: 1 }}>
          {title}
        </Typography>
        {active && (
          <Chip size="small" color="secondary" label={<Typography variant="micro">Active</Typography>} />
        )}
      </Stack>
      <Tooltip
        title={isCustom
          ? 'Automation requires a predefined plan — revert your edits to re-enable'
          : 'Automatically re-apply this plan as your usage changes'}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={automation}
              disabled={isCustom}
              onChange={(e) => setAutomation(e.target.checked)}
            />
          }
          label={<Typography variant="caption" color="text.secondary">Automation enabled</Typography>}
          sx={{ mx: 0, my: 0.5 }}
        />
      </Tooltip>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mb: 2 }}>
        {desc}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!active}
          sx={{ flex: 1 }}
          onClick={(e) => { e.stopPropagation(); onApply(); }}
        >
          Apply this plan
        </Button>
        {isCustom && (
          <Tooltip title={active ? 'Saves a draft — nothing is purchased until you execute' : 'Activate the custom plan first'}>
            <span style={{ flex: 1, display: 'flex' }}>
              <Button
                fullWidth
                      variant="outlined"
                disabled={!active}
                onClick={(e) => { e.stopPropagation(); onSaveDraft(); }}
              >
                Save as draft
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

// Listing Page Header — Archera NEW Design System node 1906:4650 ("Alt Hero 1").
// 120px brand band with gradient blob art (Figma MCP asset), white H1 + body3.
import heroBlob from './assets/hero-blob.svg';
import archeraMarkSvg from './assets/archera-mark.svg';
import archeraMarkBlackSvg from './assets/archera-mark-black.svg';

function PageHero({ title, subtitle }) {
  return (
    <Box
      sx={{
        position: 'relative',
        height: 120,
        overflow: 'hidden',
        borderRadius: 2,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        bgcolor: palette.brandPrimary[500],
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={heroBlob}
        alt=""
        sx={{
          position: 'absolute',
          left: -129,
          top: -390,
          width: 1968,
          height: 780,
          transform: 'rotate(-0.87deg) skewX(2.66deg)',
        }}
      />
      <Stack spacing={0.5} sx={{ position: 'relative', px: 3 }}>
        <Typography variant="h1" sx={{ color: palette.neutral.white, letterSpacing: 0 }}>
          {title}
        </Typography>
        <Typography variant="body3" sx={{ color: palette.neutral.white }}>
          {subtitle}
        </Typography>
      </Stack>
    </Box>
  );
}

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

  const metrics = useMemo(() => pageMetrics(selections), [selections]);
  // Derived, never stored: editing a predefined plan makes it Custom; reverting
  // the edits makes it predefined again (keeps automation eligibility honest).
  const activePlan = useMemo(() => detectPlan(selections), [selections]);

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
    setSelections(applyPreset(presetId));
    if (PRESETS[presetId].needsNative && !visibleLengths.includes('3y')) {
      setVisibleLengths((v) => [...v, '3y']);
    }
  };

  const clearAll = () => {
    setSelections((s) => {
      const next = {};
      Object.keys(s).forEach((k) => { next[k] = null; });
      return next;
    });
  };

  return (
    <AppShell breadcrumb="Cost Optimization" pageName="Commitment Planner" provider="AWS">
      <Stack spacing={2.5} sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        {/* Page header — Listing Page Header hero band */}
        <PageHero
          title="Commitment Planner"
          subtitle="Your plan is pre-built from last night's analysis — adjust term lengths by service or instance, or execute as-is. Savings shown are net of Archera premiums."
        />

        {/* Plan tabs — predefined strategies + the custom plan; active tab opens into the page */}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="stretch"
          useFlexGap
          flexWrap="wrap"
          sx={{}}
        >
          {Object.entries(PRESETS).filter(([id]) => id !== 'high_savings').map(([id, p]) => (
            <StrategyCard
              key={id}
              title={p.label}
              desc={p.desc}
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
            onSelect={hasCustomPlan ? () => setSelections(customSnapshot.current) : undefined}
            onApply={() => setSavedToast(true)}
            onSaveDraft={() => setSavedToast(true)}
          />
        </Stack>

        {/* KPI strip */}
        <KpiSection
          metrics={metrics}
          featured={featured}
          setFeatured={setFeatured}
          libOpen={kpiLibOpen}
          setLibOpen={setKpiLibOpen}
        />

        {/* Commitment coverage section header + term filters */}
        <SectionHeader
          title="Commitment Coverage"
          description="Reservable infrastructure grouped by service. Select a term per resource — Guaranteed commitments include Archera's buyback if usage drops; native terms carry full lock-in risk. Uncovered resources are paying full on-demand rates."
        />
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Term lengths:</Typography>
          {TERM_LENGTHS.map((length) => (
            <HoverPopover
              key={length.id}
              content={(
                <InfoPopover
                  eyebrow="Term Length"
                  title={length.label}
                  description="Commitments available at this horizon. Toggle to show or hide them across all resources."
                  rows={length.termIds.map((t) => ({
                    k: TERMS[t].guaranteed ? 'Guaranteed' : 'Standard',
                    val: TERMS[t].label,
                  }))}
                />
              )}
            >
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
            </HoverPopover>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>Type:</Typography>
          <HoverPopover
            content={(
              <InfoPopover
                eyebrow="Commitment Type"
                title="Guaranteed"
                description="Archera-insured commitments. If usage drops, Archera buys back unused capacity and pays the shortfall — your downside is $0."
                rows={[
                  { k: 'Terms', val: '30-day · 1-year' },
                  { k: 'Exit', val: 'Monthly or guaranteed' },
                  { k: 'At risk', val: '$0' },
                  { k: 'Premium', val: 'Only when you save' },
                  { k: 'Products', val: 'GRI · GSP · GVM · GCUD' },
                ]}
              />
            )}
          >
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
          </HoverPopover>
          <HoverPopover
            content={(
              <InfoPopover
                eyebrow="Commitment Type"
                title="Standard"
                description="Native cloud commitments (RI, SP, CUD). No buyback — if usage drops, you keep paying for unused capacity until the term ends."
                rows={[
                  { k: 'Terms', val: '1-year · 3-year' },
                  { k: 'Exit', val: 'Locked for full term' },
                  { k: 'At risk', val: 'Unused capacity' },
                  { k: 'Cost', val: 'Free to manage' },
                  { k: 'Products', val: 'RI · SP · CUD' },
                ]}
              />
            )}
          >
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
          </HoverPopover>
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

      {briefing && <BriefingOverlay metrics={metrics} onDismiss={() => setBriefing(false)} />}

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
