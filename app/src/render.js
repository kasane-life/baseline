// render.js — Results rendering: rings, tiers, moves, insights
// Takes scored output and renders into DOM

import { Standing, FRESHNESS_WINDOWS } from '../score.js';
import { renderBpTracker } from './bp-tracker.js';
import { renderDiscoveryForm } from './discovery.js';
import { createLogger } from './logger.js';
const log = createLogger('render');

/** Animate a number counting up from start to end over duration ms */
function animateValue(el, start, end, duration) {
  const range = end - start;
  if (range === 0) { el.textContent = end + '%'; return; }
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + range * eased);
    el.textContent = current + '%';
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function standingClass(s) {
  switch (s) {
    case Standing.OPTIMAL: return 'standing-optimal';
    case Standing.GOOD: return 'standing-good';
    case Standing.AVERAGE: return 'standing-average';
    case Standing.BELOW_AVG: return 'standing-below';
    case Standing.CONCERNING: return 'standing-concerning';
    default: return 'standing-unknown';
  }
}

export function renderResults(output, profile) {
  log.info('rendering results', { score: output.coverageScore, gaps: output.gaps.length });

  // Hide form, show results
  document.getElementById('questionnaire').style.display = 'none';
  document.getElementById('return-banner').classList.remove('active');
  const resultsEl = document.getElementById('results');
  resultsEl.classList.add('active');

  // Score ring — color by tier + glow
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (output.coverageScore / 100) * circumference;
  const arc = document.getElementById('score-arc');
  const scoreRingEl = arc.closest('.score-ring');
  arc.style.strokeDasharray = circumference;
  arc.classList.remove('score-low', 'score-mid', 'score-high');
  scoreRingEl.classList.remove('glow-active', 'glow-low', 'glow-mid', 'glow-high', 'pulse-complete');

  let glowTier;
  if (output.coverageScore < 40) { arc.classList.add('score-low'); glowTier = 'glow-low'; }
  else if (output.coverageScore < 75) { arc.classList.add('score-mid'); glowTier = 'glow-mid'; }
  else { arc.classList.add('score-high'); glowTier = 'glow-high'; }

  scoreRingEl.classList.add(glowTier);
  setTimeout(() => {
    arc.style.strokeDashoffset = offset;
    scoreRingEl.classList.add('glow-active');
  }, 50);
  setTimeout(() => { scoreRingEl.classList.add('pulse-complete'); }, 1600);

  // Score count-up animation
  const scoreEl = document.getElementById('r-score');
  if (output.coverageScore < 40) scoreEl.style.color = 'var(--red)';
  else if (output.coverageScore < 75) scoreEl.style.color = '#d4a24c';
  else scoreEl.style.color = 'var(--green)';
  animateValue(scoreEl, 0, output.coverageScore, 1400);

  // Context — framing line that tells the user what the score means
  const gapCount = output.gaps.length;
  let ctx = '';
  if (output.coverageScore >= 90) ctx = "Near-complete picture. Keep it fresh.";
  else if (output.coverageScore < 30) ctx = `We're working with a rough sketch — ${gapCount} gaps to fill.`;
  else if (output.coverageScore < 50) ctx = `You're missing more than half the picture. ${gapCount} gaps to close.`;
  else if (output.coverageScore < 70) ctx = `Solid start — ${gapCount} gap${gapCount !== 1 ? 's' : ''} left to sharpen your score.`;
  else if (gapCount > 0) ctx = `${gapCount} gap${gapCount !== 1 ? 's' : ''} in your coverage.`;
  else ctx = "All metrics covered.";
  document.getElementById('r-context').innerHTML = ctx;

  // Health ring — staggered reveal after score ring
  const healthArc = document.getElementById('health-arc');
  const healthEl = document.getElementById('r-health');
  const healthRing = document.getElementById('health-ring');
  if (output.avgPercentile != null) {
    const healthOffset = circumference - (output.avgPercentile / 100) * circumference;
    healthArc.style.strokeDasharray = circumference;
    healthArc.classList.remove('health-low', 'health-mid', 'health-high');
    healthRing.classList.remove('glow-active', 'glow-low', 'glow-mid', 'glow-high', 'pulse-complete');

    let healthGlow;
    if (output.avgPercentile < 30) { healthArc.classList.add('health-low'); healthGlow = 'glow-low'; }
    else if (output.avgPercentile < 60) { healthArc.classList.add('health-mid'); healthGlow = 'glow-mid'; }
    else { healthArc.classList.add('health-high'); healthGlow = 'glow-high'; }

    healthRing.classList.add(healthGlow);
    setTimeout(() => {
      healthArc.style.strokeDashoffset = healthOffset;
      healthRing.classList.add('glow-active');
    }, 800);
    setTimeout(() => { healthRing.classList.add('pulse-complete'); }, 2400);

    if (output.avgPercentile < 30) healthEl.style.color = 'var(--red)';
    else if (output.avgPercentile < 60) healthEl.style.color = '#d4a24c';
    else healthEl.style.color = 'var(--green)';
    // Delay health ring text animation to match staggered ring
    setTimeout(() => {
      healthEl.textContent = ordinal(output.avgPercentile);
    }, 800);
    healthRing.style.display = '';
  } else {
    healthRing.style.display = 'none';
  }

  // Tier bars
  setTimeout(() => {
    document.getElementById('r-t1-fill').style.width = output.tier1Pct + '%';
    document.getElementById('r-t2-fill').style.width = output.tier2Pct + '%';
  }, 100);
  document.getElementById('r-t1-pct').textContent = `${output.tier1Pct}%`;
  document.getElementById('r-t2-pct').textContent = `${output.tier2Pct}%`;

  // Action plan
  const devices = (profile._devices || []).filter(d => d !== 'none');
  renderMoves(output.gaps, output.coverageScore, output.results, devices);

  // Post-score tracking modules
  const bpSlot = document.getElementById('bp-tracker-slot');
  if (bpSlot) renderBpTracker(bpSlot, devices);

  // "Start tracking today" based on equipment selections
  renderTrackingToday(profile);

  // Metric tables
  renderTier('r-tier1', 'Core tests', output.results.filter(r => r.tier === 1));
  renderTier('r-tier2', 'Advanced tests', output.results.filter(r => r.tier === 2));

  // Insights carousel
  renderInsights(output, profile);

  // Discovery form — "What should we build next?"
  renderDiscoveryForm(document.getElementById('discovery-slot'));

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const BINARY_METRICS = new Set([
  'Family History', 'Medication List', 'Weight Trends', 'PHQ-9 (Depression)', 'Zone 2 Cardio',
]);

function metricRowHtml(r) {
  const isBinary = BINARY_METRICS.has(r.name) && r.hasData && r.value == null;
  let valStr;
  if (isBinary) {
    valStr = '<span class="binary-check">✓</span>';
  } else if (r.hasData && r.value != null) {
    const v = Number(r.value);
    valStr = v > 100000 ? 'Error — recheck' : `${v.toLocaleString(undefined, {maximumFractionDigits: 1})} ${r.unit}`;
  } else {
    valStr = r.hasData ? 'Collected' : '— missing';
  }
  const cls = standingClass(r.standing);

  // Freshness badge
  let freshBadge = '';
  if (r.hasData && r.freshness != null && r.freshness < 1.0) {
    const win = r.freshnessMetric ? FRESHNESS_WINDOWS[r.freshnessMetric] : null;
    let label = 'retest soon';
    if (win) {
      if (r.freshness <= 0) {
        label = 'overdue';
      } else {
        const monthsUntilStale = Math.round(r.freshness * (win.stale - win.fresh));
        if (monthsUntilStale <= 0) label = 'retest this month';
        else if (monthsUntilStale === 1) label = 'retest in 1mo';
        else label = `retest in ${monthsUntilStale}mo`;
      }
    }
    const fClass = r.freshness >= 0.5 ? 'freshness-aging' : 'freshness-stale';
    freshBadge = `<span class="freshness-badge ${fClass}">${label}</span>`;
  }

  let pctStr = '';
  if (r.percentile != null) {
    pctStr = `${r.percentile}th`;
  }

  // Sparkline SVG
  let sparkHtml = '<span class="metric-spark"></span>';
  if (r.trends && r.trends.length > 0) {
    const firstWithPoints = r.trends.find(t => t.points && t.points.length >= 2);
    const pts = firstWithPoints ? firstWithPoints.points : [];
    if (pts.length >= 2) {
      const vals = pts.map(p => p.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const w = 48, h = 18, pad = 2;
      const coords = vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const sparkColors = {
        [Standing.OPTIMAL]: '#5cb85c',
        [Standing.GOOD]: '#5bc0de',
        [Standing.AVERAGE]: '#f0ad4e',
        [Standing.BELOW_AVG]: '#e08850',
        [Standing.CONCERNING]: '#d9534f',
      };
      const color = sparkColors[r.standing] || '#9a9aaa';
      sparkHtml = `<span class="metric-spark"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>${vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / range) * (h - pad * 2);
        const isLast = i === vals.length - 1;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isLast ? '2.5' : '1.5'}" fill="${color}" opacity="${isLast ? '1' : '0.5'}"/>`;
      }).join('')}</svg></span>`;
    }
  }

  // Sub-metric breakdown
  let subsHtml = '';
  if (r.subMetrics && r.subMetrics.length > 0) {
    const subRows = r.subMetrics.map(s => {
      const sCls = standingClass(s.standing);
      const sPct = s.percentile != null ? `${s.percentile}th` : '';
      const sVal = s.value != null ? `${Number(s.value).toLocaleString(undefined, {maximumFractionDigits: 1})} ${s.unit}` : '';
      return `<div class="sub-metric-row">
        <span class="sub-metric-name">${s.name}</span>
        <span class="sub-metric-value">${sVal}</span>
        <span class="metric-standing ${sCls}" style="font-size:0.7rem;padding:2px 8px;">${s.standing}</span>
        <span class="metric-pct">${sPct}</span>
      </div>`;
    }).join('');
    subsHtml = `<div class="sub-metrics">${subRows}</div>`;
  }

  return `<div class="metric-row${r.subMetrics ? ' has-subs' : ''}">
    <span class="metric-rank">${String(r.rank).padStart(2, '0')}</span>
    <span class="metric-name">${r.name}${freshBadge}</span>
    ${sparkHtml}
    <span class="metric-value">${valStr}</span>
    ${isBinary ? '' : `<span class="metric-standing ${cls}">${r.standing}</span>`}
    <span class="metric-pct">${pctStr}</span>
  </div>${subsHtml}`;
}

export function renderTier(containerId, title, metrics) {
  const el = document.getElementById(containerId);
  const covered = metrics.filter(r => r.hasData).length;

  const coveredMetrics = metrics.filter(r => r.hasData);
  const missingMetrics = metrics.filter(r => !r.hasData);

  let inner = '';
  coveredMetrics.forEach(r => { inner += metricRowHtml(r); });

  if (missingMetrics.length > 0) {
    if (coveredMetrics.length > 0) {
      inner += `<div class="missing-divider">${missingMetrics.length} not yet tracked</div>`;
    }
    inner += '<div class="missing-metrics-group">';
    missingMetrics.forEach(r => { inner += metricRowHtml(r); });
    inner += '</div>';
  }

  // Collapsed by default — toggle to expand
  const toggleId = `${containerId}-toggle`;
  let html = `<button class="tier-toggle" id="${toggleId}" onclick="document.getElementById('${toggleId}').classList.toggle('open');document.getElementById('${containerId}-content').classList.toggle('open')">
    <span class="toggle-chevron">&#9654;</span>
    ${title} <span class="count">${covered} of ${metrics.length} covered</span>
  </button>`;
  html += `<div class="tier-content" id="${containerId}-content"><div>${inner}</div></div>`;

  el.innerHTML = html;
}

/** Adjust gap costToClose text based on equipment the user owns */
function equipmentAwareCost(gap, deviceSet) {
  const name = gap.name?.toLowerCase() || '';
  const metric = gap.metric || '';

  // Blood pressure
  if (metric === 'systolic' || metric === 'sbp' || name.includes('blood pressure')) {
    if (deviceSet.has('bp_cuff')) return 'Start your 7-day BP protocol';
    return 'Get a BP cuff (~$40, Omron) — then start your 7-day protocol';
  }
  // Waist circumference
  if (metric === 'waist' || name.includes('waist')) {
    if (deviceSet.has('tape_measure')) return 'Measure at your navel, standing, after a normal exhale';
    return 'Get a tape measure (~$3) — measure at navel, standing, after a normal exhale';
  }
  // Weight trends
  if (metric === 'weight_trends' || name.includes('weight')) {
    if (deviceSet.has('scale')) return 'Weigh yourself first thing each morning';
    return 'Get a scale (~$20-50) — weigh yourself first thing each morning';
  }
  return gap.costToClose;
}

export function renderMoves(gaps, currentScore, results, devices) {
  const el = document.getElementById('r-moves');
  const results_ = results || [];
  const deviceSet = new Set(devices || []);

  const top3 = gaps.slice(0, 3);
  const remaining = gaps.slice(3);
  const top3Pts = top3.reduce((sum, g) => sum + g.weight, 0);
  const projectedScore = Math.min(100, currentScore + Math.round(top3Pts / 85 * 100));

  const healthFlags = results_.filter(r =>
    r.hasData && (r.standing === 'Below Average' || r.standing === 'Concerning')
  );

  let html = `<div class="action-plan">`;
  html += `<h3>Your next moves</h3>`;

  if (gaps.length > 0) {
    html += `<div class="moves-section-label">Coverage <span class="moves-section-meta">${gaps.length} gap${gaps.length !== 1 ? 's' : ''}</span></div>`;
    html += `<div class="moves-projection">
      <span class="proj-current">${currentScore}%</span>
      <span class="proj-arrow">&rarr;</span>
      <span class="proj-target">${projectedScore}%</span>
      <span class="proj-label">projected with these ${top3.length}</span>
    </div>`;

    top3.forEach((g, i) => {
      const isBp = g.metric === 'systolic' || g.metric === 'sbp' || g.name?.toLowerCase().includes('blood pressure');
      const clickAttr = isBp ? ` onclick="document.getElementById('bp-tracker-slot')?.scrollIntoView({behavior:'smooth',block:'start'})" style="cursor:pointer"` : '';
      const detail = equipmentAwareCost(g, deviceSet);
      html += `<div class="move-card"${clickAttr}>
        <div class="move-num">${i + 1}</div>
        <div class="move-body">
          <h4>${g.name}</h4>
          <p class="move-detail">${g.note ? `<strong>${g.note}</strong> ` : ''}${detail}</p>
        </div>
        <div class="move-tag">+${g.weight} pts</div>
      </div>`;
    });

    if (remaining.length > 0) {
      const totalRemaining = remaining.reduce((s, g) => s + g.weight, 0);
      const rgId = 'remaining-gaps-toggle';
      html += `<div class="remaining-gaps" id="${rgId}">`;
      html += `<div class="remaining-gaps-label" onclick="document.getElementById('${rgId}').classList.toggle('open')">Remaining ${remaining.length} gaps · +${totalRemaining} pts</div>`;
      html += `<div class="remaining-gap-rows"><div>`;
      remaining.forEach(g => {
        html += `<div class="remaining-gap-row">
          <span>${g.name}</span>
          <span class="gap-pts">+${g.weight}</span>
        </div>`;
      });
      html += `</div></div></div>`;
    }
  } else {
    html += `<div class="moves-section-label">Coverage</div>`;
    html += `<p style="color:var(--text-muted);font-size:0.88rem;margin:8px 0 20px;">Fully covered — all 20 metrics have data.</p>`;
  }

  if (healthFlags.length > 0) {
    html += `<div class="moves-divider"></div>`;
    html += `<div class="moves-section-label">Health <span class="moves-section-meta">${healthFlags.length} flag${healthFlags.length !== 1 ? 's' : ''}</span></div>`;

    healthFlags.forEach(r => {
      const color = r.standing === 'Concerning' ? 'var(--red)' : '#e08850';
      html += `<div class="move-card health-flag-card">
        <div class="move-body">
          <h4>${r.name}</h4>
          <p class="move-detail">${r.standing === 'Concerning' ? 'Needs attention' : 'Room to improve'} — ${ordinal(r.percentile)} percentile${r.value != null ? ` (${r.value})` : ''}</p>
        </div>
        <div class="move-tag" style="background:${color}20;color:${color};">${r.standing === 'Concerning' ? 'Flag' : 'Watch'}</div>
      </div>`;
    });
  }

  html += `</div>`;
  el.innerHTML = html;
}

// ── "Start tracking today" — personalized from equipment selections ──
const TRACKING_SUGGESTIONS = {
  bp_cuff: {
    icon: '\u2665',
    name: 'Track your blood pressure',
    instruction: 'Sit quietly for 5 min, then take 2 readings 1 min apart. Same arm, same time each morning.',
  },
  scale: {
    icon: '\u2696',
    name: 'Track your weight',
    instruction: 'Weigh yourself first thing each morning, after using the bathroom, before eating or drinking.',
  },
  tape_measure: {
    icon: '\uD83D\uDCCF',
    name: 'Track your waist circumference',
    instruction: 'Measure at your navel, standing, after a normal exhale. Once a week, same day.',
  },
};

function renderTrackingToday(profile) {
  const el = document.getElementById('tracking-today');
  if (!el) return;
  const devices = (profile._devices || []).filter(d => d !== 'none');
  if (devices.length === 0) { el.innerHTML = ''; return; }

  let html = '<div class="mb-8">';
  html += '<div class="font-mono text-[0.72rem] font-medium text-text-dim tracking-wider uppercase mb-5">Start tracking today</div>';
  html += '<div class="flex flex-col gap-3">';
  for (const d of devices) {
    const s = TRACKING_SUGGESTIONS[d];
    if (!s) continue;
    html += `<div class="tracking-suggestion-card">
      <div class="text-xl opacity-40 shrink-0">${s.icon}</div>
      <div>
        <div class="text-[0.88rem] text-text-muted font-medium">${s.name}</div>
        <div class="text-[0.8rem] text-text-dim leading-relaxed mt-0.5">${s.instruction}</div>
      </div>
    </div>`;
  }
  html += '</div></div>';
  el.innerHTML = html;
}

// ── Insights carousel ──
const INSIGHTS = [
  {
    tag: 'Steps',
    stat: '+1,000 steps → −15% mortality',
    body: 'Each additional 1,000 daily steps reduces all-cause mortality by ~15%. The first 7,000 steps deliver the biggest return — going from sedentary to 7K cuts risk by roughly half.',
    source: 'Paluch et al., JAMA Network Open 2021'
  },
  {
    tag: 'ApoB',
    stat: '$30 test → best cardiac predictor',
    body: 'ApoB predicts cardiovascular events better than LDL alone. A $15-30 add-on to your next panel gives you the single most informative lipid marker — and a real target to manage.',
    source: 'Sniderman et al., Lancet 2019'
  },
  {
    tag: 'Blood pressure',
    stat: '120 → 110 = −20% CV risk',
    body: 'Lowering systolic from 120 to under 120 reduced major cardiovascular events by 25% in the SPRINT trial. A $30 home cuff and 2 minutes a week gives you the data to act on this.',
    source: 'SPRINT Trial, NEJM 2015'
  },
  {
    tag: 'Sleep',
    stat: '7–8 hrs → −12% mortality',
    body: 'Moving from <6 hours to 7–8 hours of consistent sleep reverses a 12% mortality increase. It also restores insulin sensitivity, improves recovery, and protects cognitive function.',
    source: 'Cappuccio et al., Sleep Medicine Reviews 2010'
  },
  {
    tag: 'HbA1c',
    stat: 'Catches pre-diabetes years early',
    body: 'HbA1c detects metabolic drift years before fasting glucose flags a problem. Catching it early means diet and exercise can reverse it — once you cross the diabetes threshold, the math changes.',
    source: 'American Diabetes Association, Standards of Care 2024'
  },
  {
    tag: 'Lp(a)',
    stat: '$30 · one test · lifetime answer',
    body: 'Lp(a) is genetically set — it doesn\'t change with diet or exercise. If it\'s elevated (20% of people), it changes your entire risk calculus. One test, done forever.',
    source: 'Tsimikas et al., JACC 2018'
  },
  {
    tag: 'VO2 max',
    stat: 'Bottom 25% → average = −70% risk',
    body: 'Low cardiorespiratory fitness predicts mortality more strongly than smoking. Moving from the bottom quartile to above-average cuts all-cause mortality risk by ~70%. Zone 2 training is the lever.',
    source: 'Mandsager et al., JAMA Network Open 2018'
  },
  {
    tag: 'Vitamin D',
    stat: '$10/yr supplement if low',
    body: 'If your levels are below 30 ng/mL (42% of US adults), a $10/year vitamin D3 supplement improves bone density, immune function, and mood. A $20 test tells you whether you need it.',
    source: 'Forrest & Stuhldreher, Nutrition Research 2011'
  },
];

export function renderInsights(output, profile) {
  const el = document.getElementById('r-insights');

  const gapMetrics = new Set(output.gaps.map(g => g.metric));
  const coveredMetrics = new Set(output.results.filter(r => r.hasData).map(r => r.metric));

  const relevanceMap = {
    'Steps': ['daily_steps_avg'],
    'ApoB': ['apob'],
    'Blood pressure': ['systolic', 'sbp'],
    'Sleep': ['sleep_duration_avg', 'sleep_hours'],
    'HbA1c': ['hba1c'],
    'Lp(a)': ['lpa'],
    'VO2 max': ['vo2_max'],
    'Vitamin D': ['vitamin_d'],
  };

  const scored = INSIGHTS.map(ins => {
    const related = relevanceMap[ins.tag] || [];
    const isGap = related.some(m => gapMetrics.has(m));
    const isCovered = related.some(m => coveredMetrics.has(m));
    return { ...ins, relevance: isGap ? 2 : isCovered ? 1 : 0 };
  });

  scored.sort((a, b) => b.relevance - a.relevance);
  const shown = scored.slice(0, 6);

  let html = `<h3>The evidence</h3><div class="insights-grid">`;
  shown.forEach(ins => {
    html += `<div class="insight-card">
      <div class="insight-tag">${ins.tag}</div>
      <div class="insight-stat">${ins.stat}</div>
      <div class="insight-body">${ins.body}</div>
      <div class="insight-source">${ins.source}</div>
    </div>`;
  });
  html += '</div>';

  el.innerHTML = html;
}
