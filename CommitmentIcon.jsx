import { Box } from '@mui/material';
import { TERMS } from './data';

import relCommit from './assets/commitments/guaranteed-release-commitment.svg';
import rebCommit from './assets/commitments/guaranteed-rebate-commitment.svg';
import stdCommit from './assets/commitments/non-guaranteed-commitment.svg';
import relSP from './assets/commitments/guaranteed-release-savings-plan.svg';
import rebSP from './assets/commitments/guaranteed-rebate-savings-plan.svg';
import stdSP from './assets/commitments/non-guaranteed-savings-plan.svg';

// Commitment-type icons (from Figma "Release & Rebate Guarantees", node 2586:19500):
//   • Savings Plans render as a STANDALONE rounded-square icon in the type color.
//   • Commitments (RIs) render as the INFRA icon with the type badge overlaid
//     bottom-right.
// Type/glyph/color: release = purple arrow, rebate = green ↻$, non-guaranteed =
// cloud-brand $.
const BADGE = { release: relCommit, rebate: rebCommit, standard: stdCommit };
const SP_ICON = { release: relSP, rebate: rebSP, standard: stdSP };

// Per-style accent color (matches the SVG glyphs).
export const STYLE_COLOR = { release: '#7101FF', rebate: '#2A8265', standard: '#FF9900' };

// AWS guaranteed commitments come in Release and Rebate flavors; they don't mix
// in one plan and Release is the common default. GCP/Azure are rebate-only.
export const GUARANTEE_STYLE = 'release';

// The icon style for a commitment given its selected term:
//   null (excluded) → muted · guaranteed term → release (default) · native → standard
export function iconStyleFor(termId) {
  if (!termId || termId === 'mixed') return null;
  return TERMS[termId].guaranteed ? GUARANTEE_STYLE : 'standard';
}

export default function CommitmentIcon({ kind, infraSrc, termId, size = 30 }) {
  const style = iconStyleFor(termId);
  const muted = style === null;

  if (kind === 'sp') {
    return (
      <Box
        component="img"
        src={SP_ICON[style || 'standard']}
        alt=""
        sx={{ width: size, height: size, flexShrink: 0, ...(muted && { filter: 'grayscale(1)', opacity: 0.45 }) }}
      />
    );
  }

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        component="img"
        src={infraSrc}
        alt=""
        sx={{ width: size, height: size, objectFit: 'contain', ...(muted && { filter: 'grayscale(1)', opacity: 0.5 }) }}
      />
      {!muted && (
        <Box
          component="img"
          src={BADGE[style]}
          alt=""
          sx={{ position: 'absolute', right: -4, bottom: -4, width: Math.round(size * 0.625), height: Math.round(size * 0.625) }}
        />
      )}
    </Box>
  );
}
