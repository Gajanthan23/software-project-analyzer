/**
 * components/AnalysisTypeBadge.jsx
 *
 * Section 42 & Rule 16 Compliance:
 * Visually distinguishes FACTS vs HEURISTICS in the UI.
 */

import React from 'react';

const BADGE_CONFIGS = {
  fact: {
    label: 'FACT',
    tooltip: 'Measured deterministically from source code parsing & static logs',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: '📊'
  },
  heuristic: {
    label: 'HEURISTIC',
    tooltip: 'Heuristically inferred from folder structures & rule-based scoring models',
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: '💡'
  },
};

export default function AnalysisTypeBadge({ type = 'fact', className = '' }) {
  const config = BADGE_CONFIGS[type.toLowerCase()] || BADGE_CONFIGS.fact;

  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-sm ${config.bg} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
