import { Box, Stack, Typography } from '@mui/material';
import { color } from '../_template/tokens';

// Shared popover body — rendered inside a MUI Popover's Paper (which provides the
// surface, elevation, and radius). eyebrow (type) over an h6 name, one or more
// description lines, then optional key/value rows. Keys are body2 (not uppercase);
// values are body2 at a heavier weight.
export default function InfoPopover({ eyebrow, title, description, rows = [] }) {
  const desc = (Array.isArray(description) ? description : [description]).filter(Boolean);
  return (
    <Box sx={{ p: 2, width: 300 }}>
      <Stack spacing={0.5} sx={{ mb: rows.length ? 2 : 0 }}>
        <Box>
          {eyebrow && (
            <Typography variant="micro" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{eyebrow}</Typography>
          )}
          <Typography variant="h6" color="text.primary">{title}</Typography>
        </Box>
        {desc.map((d, i) => (
          <Typography key={i} variant="body2" color="text.secondary">{d}</Typography>
        ))}
      </Stack>
      {rows.length > 0 && (
        <Box>
          {rows.map((r) => (
            <Stack
              key={r.k}
              direction="row"
              alignItems="center"
              spacing={3}
              sx={{ py: 0.5, borderBottom: `1px solid ${color.outlineBorder}` }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{r.k}</Typography>
              <Typography variant="body2" color="text.primary" sx={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{r.val}</Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Box>
  );
}
