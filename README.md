# Custom Plan Builder

Archera prototype: build a commitment plan by hand — pick services, terms, and amounts as
line items instead of starting from a recommendation.

## Setup

```bash
./setup.sh   # clones pwnixon/design-system as ../_template and installs deps
npm run dev
```

The shared design system (`theme`, `tokens`, `palette`, `AppShell`) lives in the sibling
`../_template` directory and is not committed to this repo.

## Screens

The landing page (no `?demo` param) lists available demos. Each demo is a URL like
`/?demo=default`. Edit `DemoIndex.jsx` to add screens.
