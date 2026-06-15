import { useState, cloneElement } from 'react';
import { Popper, Paper } from '@mui/material';

// Hover-triggered popover built on MUI Popper (NOT Popover/Modal). Popper is pure
// positioning — no backdrop and no inert/aria-hidden on the rest of the app — so
// the element underneath stays clickable. It's the same primitive Tooltip uses.
// Content sits in a standard Paper for the surface + elevation. pointerEvents:none
// lets clicks pass through where the Paper overlaps a target, and keeps the mouse
// "on" the trigger so hover doesn't flicker. Clones its single child to attach the
// handlers (no extra DOM), like Tooltip.
export default function HoverPopover({ children, content, placement = 'bottom', paperSx }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const trigger = cloneElement(children, {
    onMouseEnter: (e) => { children.props.onMouseEnter?.(e); setAnchorEl(e.currentTarget); },
    onMouseLeave: (e) => { children.props.onMouseLeave?.(e); setAnchorEl(null); },
  });
  return (
    <>
      {trigger}
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement={placement}
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={{ pointerEvents: 'none', zIndex: (t) => t.zIndex.tooltip }}
      >
        <Paper elevation={8} sx={paperSx}>{content}</Paper>
      </Popper>
    </>
  );
}
