import { useState } from 'react';
import { Box, Stack, Typography, Button, Link, Fade, Icon as MuiIcon } from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '../_template/palettes/archera-palette';
import { semantic } from '../_template/tokens';
import { ANALYSIS, COVERAGE_TARGET, fmtMoney, fmtPct } from './data';

// First-run analysis briefing — shown only when `overview.has_actioned_plan` is false.
// Resolves by revealing the prefilled builder underneath; afterwards lives as an Analysis tab.

function Stat({ value, label }) {
  return (
    <Box sx={{ textAlign: 'center', px: 3 }}>
      <Typography variant="h2" sx={{ color: palette.neutral.white }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: alpha(palette.neutral.white, 0.65) }}>{label}</Typography>
    </Box>
  );
}

function FindingCard({ icon, title, body }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 240,
        bgcolor: alpha(palette.neutral.white, 0.06),
        border: `1px solid ${alpha(palette.neutral.white, 0.15)}`,
        borderRadius: 2,
        p: 2.5,
        textAlign: 'left',
      }}
    >
      <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: 28, color: palette.brandSecondary[400], mb: 1 }}>
        {icon}
      </MuiIcon>
      <Typography variant="h6" sx={{ color: palette.neutral.white, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: alpha(palette.neutral.white, 0.75) }}>{body}</Typography>
    </Box>
  );
}

export default function BriefingOverlay({ metrics, onDismiss }) {
  const [step, setStep] = useState(0);
  const missedSavings = metrics.savingsMo.projected - metrics.savingsMo.current;

  const steps = [
    {
      kicker: 'Your cost analysis is ready',
      title: 'We analyzed your AWS spend',
      body: (
        <>
          <Typography variant="body3" sx={{ color: alpha(palette.neutral.white, 0.75), maxWidth: 560, mx: 'auto' }}>
            Using your Cost and Usage Report — data back to {ANALYSIS.dataAvailableSince} — we modeled
            commitment options against your last {ANALYSIS.lookbackDays} days of usage. Your plan was
            built {ANALYSIS.planBuiltAt} and refreshes nightly.
          </Typography>
          <Stack direction="row" justifyContent="center" sx={{ mt: 5 }}>
            <Stat value={fmtPct(metrics.coverage.current)} label="of reservable spend covered today" />
            <Stat value={fmtMoney(metrics.uncovered.current) + '/mo'} label="paying full on-demand rates" />
            <Stat value={String(metrics.count)} label="coverable resources found" />
          </Stack>
        </>
      ),
    },
    {
      kicker: 'What uncovered spend is costing you',
      title: `${fmtMoney(metrics.uncovered.current)}/mo at list price`,
      body: (
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4, maxWidth: 860, mx: 'auto' }} useFlexGap flexWrap="wrap">
          <FindingCard
            icon="local_fire_department"
            title="No rate protection"
            body={`${fmtMoney(metrics.uncovered.current)}/mo of reservable spend is paying maximum on-demand rates — the most expensive way to buy capacity you're already using.`}
          />
          <FindingCard
            icon="event_repeat"
            title="Stable workloads, uncovered"
            body={`${ANALYSIS.stableUncoveredCount} of your workloads ran continuously for 90+ days at on-demand rates. Steady usage with no commitment is pure missed savings.`}
          />
          <FindingCard
            icon="show_chart"
            title="Budget volatility"
            body={`Your on-demand spend swung ±${ANALYSIS.onDemandSwingPct}% month to month. Committed spend is flat and forecastable.`}
          />
        </Stack>
      ),
    },
    {
      kicker: 'No plan to build — it’s already done',
      title: 'Your plan is ready',
      body: (
        <>
          <Typography variant="body3" sx={{ color: alpha(palette.neutral.white, 0.75), maxWidth: 600, mx: 'auto' }}>
            We pre-selected 30-day Guaranteed Commitments on every coverable workload. If your usage
            drops, Archera buys back the unused commitment — you can exit monthly with $0 at risk.
            Review it, adjust term lengths, or execute as-is.
          </Typography>
          <Stack direction="row" justifyContent="center" sx={{ mt: 5 }}>
            <Stat value={`+${fmtMoney(missedSavings)}/mo`} label="savings, net of premiums" />
            <Stat value={fmtPct(metrics.coverage.projected)} label={`projected coverage (target ${COVERAGE_TARGET * 100}%)`} />
            <Stat value={`${Math.round(metrics.breakevenDays)} days`} label="to breakeven" />
          </Stack>
        </>
      ),
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <Fade in>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal,
          bgcolor: palette.header,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Typography variant="overline" sx={{ color: palette.brandSecondary[400], mb: 1 }}>
          {s.kicker}
        </Typography>
        <Typography variant="h1" sx={{ color: palette.neutral.white, mb: 3 }}>
          {s.title}
        </Typography>
        <Box>{s.body}</Box>

        <Stack direction="row" spacing={1} sx={{ mt: 6, mb: 3 }}>
          {steps.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: i === step ? palette.brandSecondary[400] : alpha(palette.neutral.white, 0.25),
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            size="large"
            onClick={() => (last ? onDismiss() : setStep(step + 1))}
          >
            {last ? 'Review your plan' : 'Next'}
          </Button>
          {!last && (
            <Link component="button" onClick={onDismiss} sx={{ color: alpha(palette.neutral.white, 0.65) }}>
              Skip to plan
            </Link>
          )}
        </Stack>
      </Box>
    </Fade>
  );
}
