# Custom Plan Builder

Archera prototype: build a commitment plan by hand — pick services, terms, and amounts as
line items instead of starting from a recommendation.

## Setup

```bash
./setup.sh   # npm install (pulls the @archera/design-system dependency)
npm run dev
```

The shared design system (`theme`, `tokens`, `palette`, `AppShell`) is the
`@archera/design-system` package (`github:pwnixon/design-system`), pinned in
`package.json`. Import from `@archera/design-system/*` — never a relative path.

## Screens

The landing page (no `?demo` param) lists available demos. Each demo is a URL like
`/?demo=default`. Edit `DemoIndex.jsx` to add screens.
