import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { AppHeader } from '@archera/design-system/AppShell';

// ─── Edit this to add / remove demos ─────────────────────────────────────────
const PROJECT = {
  name: "Archera Planners",
  desc: "Commitment and provisioned-throughput planning prototypes on a shared chassis (simulator, configurable KPI strip, derived presets).",
};

const DEMOS = [
  {
    demo: "default",
    title: "Commitment Planner (returning user)",
    desc: "Prefilled builder: KPI strip with configurable library, strategy presets, per-service and per-instance term selection with risk-framed option cards.",
    version: "v1",
    status: "live",
  },
  {
    demo: "briefing",
    title: "First-run analysis briefing",
    desc: "For users with no actioned plan: 3-step analysis briefing (data-bound findings) that resolves into the prefilled builder.",
    version: "v1",
    status: "live",
  },
  {
    demo: "ptu",
    title: "PTU / GSU Planner (scaffold)",
    desc: "Provisioned AI throughput planner — GCP Gemini / GSU. Capacity-not-savings framing: throughput-vs-demand hero chart, recommendation-first fit verdict, and three separate value lenses (capacity / protected value / vs reliability SKU).",
    version: "v0",
    status: "wip",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

function DemoCard({ title, desc, version, status, onClick }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={0.75}>
              <Chip size="small" variant="outlined" label={version} />
              <Chip
                size="small"
                color={status === 'live' ? 'success' : 'warning'}
                label={status === 'live' ? 'Live' : 'WIP'}
              />
            </Stack>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">{desc}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DemoIndex() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader pageName="Prototypes" />
      <Box component="main" sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: 5, pt: 6, pb: 10 }}>
        <Box sx={{ mb: 4.5 }}>
          <Typography variant="h2" gutterBottom>{PROJECT.name}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>{PROJECT.desc}</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1.75 }}>
          {DEMOS.map((d) => (
            <DemoCard
              key={d.demo}
              title={d.title}
              desc={d.desc}
              version={d.version}
              status={d.status}
              onClick={() => { window.location.href = `?demo=${d.demo}`; }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
