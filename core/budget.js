// Subscription-aware budget helpers for Homunculus.
// Uses quota percentages when available; dollar cost is optional.

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PROFILE = {
  plan: 'max5x',
  source: 'subscription',
  session_limit_pct: 90,
  conserve_session_pct: 70,
  weekly_reserve_pct: 5,
  weekly_tight_remaining_pct: 2,
  max_parallel_agents: 1,
  opus_policy: 'manual-only',
  notes: 'Default Max 5x profile: daily evolution with conservative quota guards.',
};

const PLAN_PROFILES = {
  pro: {
    plan: 'pro',
    source: 'subscription',
    session_limit_pct: 85,
    conserve_session_pct: 65,
    weekly_reserve_pct: 12,
    weekly_tight_remaining_pct: 5,
    max_parallel_agents: 1,
    opus_policy: 'unavailable-in-claude-code',
    notes: 'Pro profile: keep nightly evolution minimal and preserve interactive usage.',
  },
  max5x: DEFAULT_PROFILE,
  max20x: {
    plan: 'max20x',
    source: 'subscription',
    session_limit_pct: 92,
    conserve_session_pct: 78,
    weekly_reserve_pct: 5,
    weekly_tight_remaining_pct: 2,
    max_parallel_agents: 3,
    opus_policy: 'allowed-for-planning-and-review',
    notes: 'Max 20x profile: full evolution with bounded parallelism.',
  },
  api: {
    plan: 'api',
    source: 'api',
    session_limit_pct: 95,
    conserve_session_pct: 85,
    weekly_reserve_pct: 0,
    weekly_tight_remaining_pct: 0,
    max_parallel_agents: 2,
    opus_policy: 'cost-capped',
    notes: 'API profile: quota guards are advisory; enforce spend caps separately.',
  },
};

function profileForPlan(plan) {
  return { ...DEFAULT_PROFILE, ...(PLAN_PROFILES[plan] || PLAN_PROFILES.max5x) };
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function loadBudgetProfile(projectDir) {
  const profilePath = path.join(projectDir, 'homunculus', 'budget-profile.json');
  return { ...DEFAULT_PROFILE, ...(loadJson(profilePath) || {}) };
}

function loadUsage(projectDir) {
  const candidates = [
    path.join(projectDir, 'homunculus', 'usage-cache.json'),
    path.join(projectDir, 'quest-board', 'data', 'usage-cache.json'),
  ];
  for (const filePath of candidates) {
    const data = loadJson(filePath);
    if (data) return { path: filePath, data };
  }
  return { path: null, data: null };
}

function classifyBudget(profile, usage) {
  if (!usage) {
    return {
      level: 'unknown',
      reason: 'no usage cache found',
      session_pct: null,
      weekly_pct: null,
      weekly_remaining_pct: null,
    };
  }

  const sessionPct = Number(usage.session ?? usage.five_hour ?? 0);
  const weeklyPct = Number(usage.weekly_all ?? usage.percentage ?? 0);
  const budgetPct = Number(usage.budget_pct ?? 100);
  const weeklyRemaining = budgetPct - weeklyPct;

  if (sessionPct >= profile.session_limit_pct) {
    return {
      level: 'mp_empty',
      reason: `session usage ${sessionPct}% >= ${profile.session_limit_pct}%`,
      session_pct: sessionPct,
      weekly_pct: weeklyPct,
      weekly_remaining_pct: weeklyRemaining,
    };
  }

  if (weeklyRemaining < 0) {
    return {
      level: 'skip',
      reason: `weekly usage ${weeklyPct}% exceeds budget ${budgetPct}%`,
      session_pct: sessionPct,
      weekly_pct: weeklyPct,
      weekly_remaining_pct: weeklyRemaining,
    };
  }

  if (sessionPct >= profile.conserve_session_pct ||
      weeklyRemaining < profile.weekly_tight_remaining_pct) {
    return {
      level: 'half',
      reason: 'quota is tight; run only bounded optional work',
      session_pct: sessionPct,
      weekly_pct: weeklyPct,
      weekly_remaining_pct: weeklyRemaining,
    };
  }

  return {
    level: 'full',
    reason: 'quota available',
    session_pct: sessionPct,
    weekly_pct: weeklyPct,
    weekly_remaining_pct: weeklyRemaining,
  };
}

module.exports = {
  DEFAULT_PROFILE,
  PLAN_PROFILES,
  profileForPlan,
  loadBudgetProfile,
  loadUsage,
  classifyBudget,
};
