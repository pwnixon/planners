import { Box, Stack, Typography, Button, Divider, Icon as MuiIcon } from '@mui/material';
import { alpha } from '@mui/material/styles';
import palette from '@archera/design-system/palettes/archera-palette';
import { color, semantic, elevation } from '@archera/design-system/tokens';
import archeraMarkBlackSvg from './assets/archera-mark-black.svg';

// ─── Strategy plan card (Figma node 163:319) ─────────────────────────────────
// The active plan is a wide brand-gradient card featuring two metric tiles
// (Net Monthly Savings, Term Length); inactive plans are compact light cards
// with the same two metrics as rows and a footer action.
const bp = palette.brandPrimary;
const bt = palette.brandTertiary;  // pink / salmon
const bs = palette.brandSecondary; // light blue / cyan
// Inactive cards get a soft tint from the same color family as their active gradient.
const lightGrad = (p) => `linear-gradient(160deg, ${palette.neutral.white} 0%, ${alpha(p[50], 0.85)} 100%)`;
const CARD_TONE = {
  recommended: { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[800]} 32%, ${bp[600]} 78%, ${bp[500]} 100%)`, light: lightGrad(bp), status: bp[500], statusDark: bp[700], termValue: bp[700], termLabel: bp[900] },
  balanced:    { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[900]} 24%, ${bt[800]} 66%, ${bt[600]} 100%)`, light: lightGrad(bt), status: bt[600], statusDark: bt[800], termValue: bt[700], termLabel: bt[900] },
  custom:      { grad: `linear-gradient(115deg, ${bp[900]} 0%, ${bp[800]} 30%, ${bs[800]} 70%, ${bs[600]} 100%)`, light: lightGrad(bs), status: bs[700], statusDark: bs[800], termValue: bs[700], termLabel: bs[900] },
};
// The active plan's signature color — used to tie related surfaces (e.g. the plan
// KPIs) back to the plan, so they read as "this plan's metrics" not generic ones.
// Mirrors the card's status color; falls back to Recommended for any unmapped tone.
export const planColor = (tone) => (CARD_TONE[tone] || CARD_TONE.recommended).status;

// Cross-fade the card body when it swaps between active (tiles) and inactive
// (rows) layouts, so the width change isn't jarring (no reflow animation).
const FADE_SX = { animation: 'scFade 0.22s ease', '@keyframes scFade': { from: { opacity: 0 }, to: { opacity: 1 } } };
const tileGradient = `linear-gradient(180deg, ${alpha(palette.neutral.white, 0.8)} 0%, ${palette.neutral.white} 100%)`;
// ds-audit-ignore-next-line — Figma inactive-title neutral (#57575c) not a palette token
const INACTIVE_TITLE = '#57575c';
// Fixed height so the row never reflows when the active plan or copy length changes.
const CARD_HEIGHT = 344;

const planTitleOf = (title) => (/\bplan$/i.test(title) ? title : `${title} Plan`);

function InfoIcon({ size = 16, sx }) {
  return <MuiIcon baseClassName="material-icons-outlined" sx={{ fontSize: size, ...sx }}>info</MuiIcon>;
}

// ds-audit-ignore-start — literal type sizes reproduced from Figma node 163:319
// Big metric tile inside the active card.
function MetricTile({ value, valueColor, label, labelColor, desc }) {
  return (
    <Box
      sx={{
        flex: 1, minWidth: 0,
        border: `2px solid ${palette.neutral.white}`,
        borderRadius: '8px',
        p: 2,
        background: tileGradient,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}
    >
      <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: '32px', color: valueColor }}>{value}</Typography>
      <Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography sx={{ fontSize: 16, fontWeight: 500, lineHeight: 1.25, color: labelColor }}>{label}</Typography>
          <InfoIcon size={20} sx={{ color: labelColor }} />
        </Stack>
        {desc && <Typography variant="body1" sx={{ color: palette.text.primary, mt: 0.5 }}>{desc}</Typography>}
      </Box>
    </Box>
  );
}

// Compact metric row inside an inactive card.
function MetricRow({ label, value }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" color="text.primary">{label}</Typography>
        <InfoIcon sx={{ color: palette.text.secondary }} />
      </Stack>
      <Typography variant="body1" sx={{ color: palette.text.primary }}>{value}</Typography>
    </Stack>
  );
}

export default function StrategyCard({
  title, desc, active, isCustom, tone = 'recommended',
  savings, term, onSelect, onApply, onSave, onConfigure,
}) {
  const t = CARD_TONE[tone] || CARD_TONE.recommended;
  const clickable = !active && Boolean(onSelect);
  const planTitle = planTitleOf(title);
  const indent = isCustom ? 0 : '36px';

  if (active) {
    return (
      <Box sx={{ minWidth: 0, height: CARD_HEIGHT, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, bgcolor: palette.surface, border: `1px solid ${t.status}` }}>
        <Box key="body-active" sx={{ flex: 1, minHeight: 0, background: t.grad, p: 3, ...FADE_SX }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            {!isCustom && (
              <Box component="img" src={archeraMarkBlackSvg} alt="" sx={{ width: 27, height: 24, flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
            )}
            <Typography sx={{ fontSize: 24, fontWeight: 500, color: palette.neutral.white }}>{planTitle}</Typography>
          </Stack>
          <Typography sx={{ pl: indent, fontSize: 16, lineHeight: 1.5, color: alpha(palette.neutral.white, 0.9), mb: 2 }}>{desc}</Typography>
          <Stack direction="row" spacing={3} sx={{ pl: indent }}>
            <MetricTile
              value={savings}
              valueColor={semantic.success.main}
              label="Net Monthly Savings"
              labelColor={semantic.success.dark}
              desc="Projected monthly savings, net of premiums."
            />
            <MetricTile
              value={term}
              valueColor={t.termValue}
              label="Term Length"
              labelColor={t.termLabel}
              desc="Commitment length applied across this plan."
            />
          </Stack>
        </Box>
        <Box sx={{ bgcolor: palette.surface, p: 1 }}>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            {isCustom && (
              <Button variant="outlined" startIcon={<MuiIcon>settings</MuiIcon>} onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}>
                Configure
              </Button>
            )}
            <Button variant="contained" onClick={(e) => { e.stopPropagation(); onApply?.(); }} sx={{ bgcolor: t.status, '&:hover': { bgcolor: t.statusDark } }}>
              Review &amp; Apply
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      onClick={clickable ? onSelect : undefined}
      sx={{
        minWidth: 0, height: CARD_HEIGHT, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2,
        bgcolor: palette.surface, border: `1px solid ${color.outlineBorder}`,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: clickable ? elevation[4] : 'none' },
      }}
    >
      <Box key="body-inactive" sx={{ flex: 1, minHeight: 0, background: t.light, px: 3, py: 4, display: 'flex', flexDirection: 'column', gap: 3, ...FADE_SX }}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            {!isCustom && (
              <Box component="img" src={archeraMarkBlackSvg} alt="" sx={{ width: 27, height: 24, flexShrink: 0, opacity: 0.25 }} />
            )}
            <Typography sx={{ fontSize: 20, fontWeight: 500, color: INACTIVE_TITLE }}>{planTitle}</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">{desc}</Typography>
        </Box>
        <Stack spacing={1} sx={{ mb: 5 }}>
          <MetricRow label="Net Monthly Savings" value={savings} />
          <Divider />
          <MetricRow label="Term Length" value={term} />
        </Stack>
      </Box>
      <Box sx={{ bgcolor: palette.surface, p: 1 }}>
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          {isCustom ? (
            <>
              <Button size="small" variant="outlined" disabled onClick={(e) => { e.stopPropagation(); onSave?.(); }}>Save</Button>
              <Button size="small" variant="outlined" startIcon={<MuiIcon>settings</MuiIcon>} onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}>Configure</Button>
            </>
          ) : (
            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>View Plan</Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

// ds-audit-ignore-end
