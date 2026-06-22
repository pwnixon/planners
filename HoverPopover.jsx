import { useState, useRef, cloneElement } from 'react';
import { Popper, Paper } from '@mui/material';

// Hover-triggered popover built on MUI Popper (NOT Popover/Modal). Popper is pure
// positioning — no backdrop and no inert/aria-hidden on the rest of the app — so
// the element underneath stays clickable. It's the same primitive Tooltip uses.
// Clones its single child to attach the handlers (no extra DOM), like Tooltip.
//
// Default (read-only) mode: pointerEvents:none so clicks pass through and hover
// doesn't flicker — for non-interactive tooltips.
// `interactive` mode: the Paper accepts pointer events and keeps the popover open
// while the cursor is over it (a short close delay bridges the trigger→popover
// gap), so the content can have working buttons (e.g. copy).
export default function HoverPopover({ children, content, placement = 'bottom', paperSx, interactive = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const closeTimer = useRef();
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setAnchorEl(null), interactive ? 140 : 0);
  };
  const trigger = cloneElement(children, {
    onMouseEnter: (e) => { children.props.onMouseEnter?.(e); cancelClose(); setAnchorEl(e.currentTarget); },
    onMouseLeave: (e) => { children.props.onMouseLeave?.(e); scheduleClose(); },
  });
  return (
    <>
      {trigger}
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement={placement}
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={{ pointerEvents: interactive ? 'auto' : 'none', zIndex: (t) => t.zIndex.tooltip }}
      >
        <Paper
          elevation={8}
          sx={paperSx}
          {...(interactive && { onMouseEnter: cancelClose, onMouseLeave: () => setAnchorEl(null) })}
        >
          {content}
        </Paper>
      </Popper>
    </>
  );
}
