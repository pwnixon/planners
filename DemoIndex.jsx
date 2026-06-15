import { useState } from "react";
import palette from '../_template/palettes/archera-palette';
import { color, typography, spacing, radius } from '../_template/tokens';
import { AppHeader } from '../_template/AppShell';

const { sp } = spacing;

// ─── Edit this to add / remove demos ─────────────────────────────────────────
const PROJECT = {
  name: "Commitment Planner",
  desc: "Build a commitment plan by hand — pick services, terms, and amounts as line items.",
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
];
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, desc, version, status, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: palette.surface,
        border: `1px solid ${hovered ? palette.brandPrimary[500] : color.divider}`,
        borderRadius: 10,
        padding: `18px 20px`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? `0 2px 12px ${palette.brandPrimary[500]}1a` : "none",
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{
          ...typography.overline,
          padding: "2px 7px", borderRadius: radius.sm,
          background: `${palette.neutral.black}0f`, color: palette.text.secondary,
        }}>{version}</span>
        <span style={{
          ...typography.overline,
          padding: "2px 7px", borderRadius: radius.sm,
          background: status === "live" ? `${palette.success[500]}1a` : `${palette.warning[500]}1a`,
          color: status === "live" ? palette.success[500] : palette.warning[500],
        }}>{status === "live" ? "Live" : "WIP"}</span>
      </div>
      <div style={{ ...typography.h6, color: palette.text.primary, lineHeight: 1.3 }}>
        {title}
      </div>
      <div style={{ ...typography.body1, color: palette.text.secondary, lineHeight: 1.5, flex: 1 }}>
        {desc}
      </div>
      <div style={{
        display: "flex", justifyContent: "flex-end",
        paddingTop: sp(1), borderTop: `1px solid ${color.divider}`,
        ...typography.body2, fontWeight: 500,
        color: hovered ? palette.brandPrimary[700] : palette.brandPrimary[500],
        transition: "color 0.15s",
      }}>
        Open ›
      </div>
    </div>
  );
}

export default function DemoIndex() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: palette.background, fontFamily: typography.fontFamily }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <AppHeader pageName="Prototypes" />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: `${sp(6)} ${sp(5)} ${sp(10)}`, width: "100%" }}>
        <div style={{ marginBottom: sp(4.5) }}>
          <h1 style={{ ...typography.h2, color: palette.text.primary, marginBottom: sp(1) }}>
            {PROJECT.name}
          </h1>
          <p style={{ ...typography.body1, color: palette.text.secondary, lineHeight: 1.6, maxWidth: 560 }}>
            {PROJECT.desc}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {DEMOS.map(d => (
            <Card
              key={d.demo}
              title={d.title}
              desc={d.desc}
              version={d.version}
              status={d.status}
              onClick={() => { window.location.href = `?demo=${d.demo}`; }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
