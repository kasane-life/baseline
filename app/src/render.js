// render.js — Results rendering: rings, tiers, moves, insights
// Takes scored output and renders into DOM

import { Standing, FRESHNESS_WINDOWS } from '../score.js';
import { renderBpTracker } from './bp-tracker.js';
import { renderDiscoveryForm } from './discovery.js';
import { getIntervention } from './interventions.js';
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
  // R-W3: Classify gaps as wearable vs lab for CTA framing
  const wearableGapCount = output.gaps.filter(g => /wearable|watch/i.test(g.costToClose || '')).length;
  const labGapCount = gapCount - wearableGapCount;
  const mostGapsAreLabs = gapCount > 0 && labGapCount > wearableGapCount;

  let ctx = '';
  if (output.coverageScore >= 90) ctx = "Near-complete picture. Keep it fresh.";
  else if (output.coverageScore < 30) ctx = `We're working with a rough sketch — ${gapCount} gaps to fill.`;
  else if (output.coverageScore < 50) ctx = `You're missing more than half the picture. ${gapCount} gaps to close.`;
  else if (output.coverageScore < 70) ctx = `Solid start — ${gapCount} gap${gapCount !== 1 ? 's' : ''} left to sharpen your score.`;
  else if (gapCount > 0 && mostGapsAreLabs) ctx = `Your wearable data is flowing. ${labGapCount} lab${labGapCount !== 1 ? 's' : ''} left to complete the picture.`;
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

  // ACT 1: Tier bars — staggered after rings
  const tierSummary = document.querySelector('.tier-summary');
  if (tierSummary && !tierSummary.querySelector('.tier-summary-heading')) {
    const heading = document.createElement('div');
    heading.className = 'tier-summary-heading';
    heading.textContent = 'Test coverage';
    tierSummary.prepend(heading);
  }
  setTimeout(() => {
    document.getElementById('r-t1-fill').style.width = output.tier1Pct + '%';
    document.getElementById('r-t2-fill').style.width = output.tier2Pct + '%';
  }, 600);
  document.getElementById('r-t1-pct').textContent = `${output.tier1Pct}%`;
  document.getElementById('r-t2-pct').textContent = `${output.tier2Pct}%`;

  // ACT 1: Health flags (rendered into dedicated slot, above moves)
  const results_ = output.results || [];
  renderHealthFlags(results_, document.getElementById('health-flags-slot'));

  // ACT 2: Action plan (moves)
  const devices = (profile._devices || []).filter(d => d !== 'none');
  renderMoves(output.gaps, output.coverageScore, output.results, devices);

  // BP tracker — only render inline (inside moves) when BP is a top-3 gap
  const bpInline = document.getElementById('bp-tracker-inline');
  if (bpInline) {
    renderBpTracker(bpInline, devices);
  }
  const bpSlot = document.getElementById('bp-tracker-slot');
  if (bpSlot) bpSlot.innerHTML = '';

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

/** Map a gap to its tracking device key (if any) */
function gapTrackingDevice(gap) {
  const name = gap.name?.toLowerCase() || '';
  const metric = gap.metric || '';
  if (metric === 'systolic' || metric === 'sbp' || name.includes('blood pressure')) return 'bp_cuff';
  if (metric === 'waist' || name.includes('waist')) return 'tape_measure';
  if (metric === 'weight_trends' || name.includes('weight')) return 'scale';
  return null;
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

/** Determine gap category for tag display */
function gapCategory(gap) {
  const cost = (gap.costToClose || '').toLowerCase();
  const name = (gap.name || '').toLowerCase();
  if (/wearable|watch|garmin|oura|apple/i.test(cost)) return 'wearable';
  if (/sleep|hrv|heart rate variab|resting.hr|steps|vo2/i.test(name)) return 'wearable';
  if (/cuff|scale|tape|measure/i.test(cost)) return 'equipment';
  if (/phq|zone.*2|cardio|depression/i.test(name)) return 'lifestyle';
  if (/\$|lab|panel|test|blood/i.test(cost)) return 'lab';
  return 'lab';
}

const CATEGORY_LABELS = { lab: 'Lab', wearable: 'Wearable', equipment: 'Equipment', lifestyle: 'Lifestyle' };

// Name-to-intervention-key mapping for results that lack a metric key
const NAME_TO_METRIC_KEY = {
  'Blood Pressure': 'bp_systolic',
  'Lipid Panel + ApoB': 'apob',
  'Metabolic Panel': 'hba1c',
  'Lp(a)': 'lpa',
  'Resting Heart Rate': 'rhr',
  'Waist Circumference': 'waist',
  'Sleep Duration': 'sleep_duration',
  'Sleep Regularity': 'sleep_regularity',
  'Daily Steps': 'daily_steps',
  'VO2 Max': 'vo2_max',
  'hs-CRP': 'hscrp',
  'Weight Trends': 'weight_trends',
};

function metricKeyFor(r) {
  if (r.metric) return r.metric;
  // HRV name varies by device type, e.g. "HRV RMSSD (7-day avg)"
  if (r.name && r.name.startsWith('HRV')) return 'hrv_rmssd';
  // Vitamin D + Ferritin composite
  if (r.name && r.name.startsWith('Vitamin D')) return 'vitamin_d';
  return NAME_TO_METRIC_KEY[r.name] || null;
}

/** ACT 1: Health flags — rendered above the moves section */
function renderHealthFlags(results, container) {
  if (!container) return;
  const flags = results.filter(r =>
    r.hasData && (r.standing === 'Below Average' || r.standing === 'Concerning')
  );

  // Build wins list (Optimal or Good with data + percentile)
  const wins = results
    .filter(r => r.hasData && r.percentile != null && (r.standing === 'Optimal' || r.standing === 'Good'))
    .sort((a, b) => b.percentile - a.percentile)
    .slice(0, 3);

  let html = '';

  if (flags.length > 0) {
    const concerning = flags.filter(r => r.standing === 'Concerning').length;
    const watching = flags.length - concerning;
    const summaryParts = [];
    if (concerning > 0) summaryParts.push(`${concerning} flagged`);
    if (watching > 0) summaryParts.push(`${watching} to watch`);

    html += `<div class="health-flags-act1">`;
    html += `<div class="moves-section-label">Health <span class="moves-section-meta">${summaryParts.join(', ')}</span></div>`;
    flags.forEach(r => {
      const color = r.standing === 'Concerning' ? 'var(--red)' : '#e08850';
      const key = metricKeyFor(r);
      const interv = key ? getIntervention(key) : null;
      const valueStr = r.value != null ? ` (${r.value}${r.unit ? ' ' + r.unit : ''})` : '';
      html += `<div class="move-card health-flag-card">
        <div class="move-body">
          <h4>${r.name}</h4>
          <p class="move-detail">${r.standing === 'Concerning' ? 'Needs attention' : 'Room to improve'} — ${ordinal(r.percentile)} percentile${valueStr}</p>
          ${interv ? `<p class="flag-lever">${interv.lever}</p>` : ''}
        </div>
        <div class="move-tag" style="background:${color}20;color:${color};">${r.standing === 'Concerning' ? 'Flag' : 'Watch'}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // Wins block — show after flags, or as main content when no flags
  if (wins.length > 0) {
    const winParts = wins.map(r => {
      const valueStr = r.value != null ? `${r.value}${r.unit ? ' ' + r.unit : ''}` : '';
      return `${r.name}${valueStr ? ` (${valueStr}, ${ordinal(r.percentile)} percentile)` : ` (${ordinal(r.percentile)} percentile)`}`;
    });
    const key0 = metricKeyFor(wins[0]);
    const topWhy = key0 ? getIntervention(key0) : null;
    const joined = winParts.length <= 2 ? winParts.join(' and ') : winParts.slice(0, -1).join(', ') + ', and ' + winParts[winParts.length - 1];
    let sentence = `Your ${joined} ${wins.length === 1 ? 'is' : 'are'} above average for your age.`;
    if (topWhy) sentence += ` ${topWhy.why.split('.')[0]}.`;
    html += `<div class="wins-block">
      <div class="wins-label">What's working</div>
      <p class="wins-text">${sentence}</p>
    </div>`;
  } else if (flags.length === 0) {
    const assessedCount = results.filter(r => r.hasData && r.percentile != null).length;
    if (assessedCount >= 5) {
      html += `<div class="health-flags-act1">
        <div class="moves-section-label">Health</div>
        <p style="color:var(--text-muted);font-size:0.88rem;margin:8px 0 4px;">All clear — ${assessedCount} metrics assessed, no flags.</p>
      </div>`;
    }
  }

  container.innerHTML = html;
}

export function renderMoves(gaps, currentScore, results, devices) {
  const el = document.getElementById('r-moves');
  const deviceSet = new Set(devices || []);

  const top3 = gaps.slice(0, 3);
  const remaining = gaps.slice(3);
  const top3Pts = top3.reduce((sum, g) => sum + g.weight, 0);
  const projectedScore = Math.min(100, currentScore + Math.round(top3Pts / 85 * 100));

  let html = `<div class="action-plan">`;
  html += `<h3>Your next moves</h3>`;

  if (gaps.length > 0) {
    // Estimate total cost from top-3 costToClose strings
    let totalCost = 0;
    top3.forEach(g => {
      const m = (g.costToClose || '').match(/\$(\d+)/);
      if (m) totalCost += parseInt(m[1], 10);
    });
    const costNote = totalCost > 0 ? ` · ~$${totalCost}` : '';

    html += `<div class="moves-section-label">Coverage <span class="moves-section-meta">${gaps.length} gap${gaps.length !== 1 ? 's' : ''}</span></div>`;
    html += `<div class="moves-projection">
      <span class="proj-current">${currentScore}%</span>
      <span class="proj-arrow">&rarr;</span>
      <span class="proj-target">${projectedScore}%</span>
      <span class="proj-label">projected with these ${top3.length}${costNote}</span>
    </div>`;

    top3.forEach((g, i) => {
      const isBp = g.metric === 'systolic' || g.metric === 'sbp' || g.name?.toLowerCase().includes('blood pressure');
      const detail = equipmentAwareCost(g, deviceSet);
      const trackingKey = gapTrackingDevice(g);
      const trackingSugg = trackingKey ? TRACKING_SUGGESTIONS[trackingKey] : null;
      const hasDevice = trackingKey && deviceSet.has(trackingKey);
      const cat = gapCategory(g);

      // Inline tracking instruction when user has the device
      let trackingInline = '';
      if (hasDevice && trackingSugg) {
        trackingInline = `<p class="move-tracking">${trackingSugg.instruction}</p>`;
      }

      const gKey = metricKeyFor(g);
      const interv = gKey ? getIntervention(gKey) : null;

      html += `<div class="move-card">
        <div class="move-num">${i + 1}</div>
        <div class="move-body">
          <span class="move-category move-cat-${cat}">${CATEGORY_LABELS[cat]}</span>
          <h4>${g.name}</h4>
          ${interv ? `<p class="move-why">${interv.why}</p>` : ''}
          <p class="move-detail">${detail}</p>
          ${trackingInline}
          ${interv?.source ? `<p class="move-source">Source: ${interv.source}</p>` : ''}
        </div>
        <div class="move-tag">+${g.weight} pts</div>
      </div>`;

      // BP tracker slot — inline right after the BP gap card
      if (isBp) {
        html += `<div id="bp-tracker-inline"></div>`;
      }
    });

    if (remaining.length > 0) {
      const totalRemaining = remaining.reduce((s, g) => s + g.weight, 0);
      const rgId = 'remaining-gaps-toggle';
      html += `<div class="remaining-gaps${remaining.length <= 5 ? ' open' : ''}" id="${rgId}">`;
      html += `<div class="remaining-gaps-label" onclick="document.getElementById('${rgId}').classList.toggle('open')">Remaining ${remaining.length} gaps · +${totalRemaining} pts</div>`;
      html += `<div class="remaining-gap-rows"><div>`;
      remaining.forEach(g => {
        const detail = equipmentAwareCost(g, deviceSet);
        const needsEquip = detail !== g.costToClose;
        const rCat = gapCategory(g);
        html += `<div class="remaining-gap-row">
          <span><span class="move-category move-cat-${rCat}" style="font-size:0.6rem;padding:1px 6px;vertical-align:middle;margin-right:6px;">${CATEGORY_LABELS[rCat]}</span>${g.name}${needsEquip ? `<span class="remaining-gap-equip">${detail}</span>` : ''}</span>
          <span class="gap-pts">+${g.weight}</span>
        </div>`;
      });
      html += `</div></div></div>`;
    }
  } else {
    html += `<div class="moves-section-label">Coverage</div>`;
    html += `<p style="color:var(--text-muted);font-size:0.88rem;margin:8px 0 20px;">Fully covered — all 20 metrics have data.</p>`;
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


// ── Insights carousel ──
const INSIGHTS = [
  {
    tag: 'Steps',
    metricKey: 'daily_steps',
    evidence: 'Each additional 1,000 daily steps cuts all-cause mortality ~15%. The first 7,000 deliver the biggest return.',
    contextGood: 'You\'re in a strong position here — benefits plateau above 10K, and you\'re close.',
    contextLow: 'Walking after meals and taking calls on foot are the easiest levers.',
    gapAction: 'Your wearable already collects this — connect it to close this gap.',
    source: 'Paluch et al., JAMA Network Open 2021',
  },
  {
    tag: 'ApoB',
    metricKey: 'apob',
    evidence: 'ApoB predicts cardiovascular events better than LDL alone. Each 10 mg/dL reduction cuts events ~10%.',
    contextGood: 'Your ApoB is well-managed — keep it here.',
    contextLow: 'Reducing saturated fat and adding soluble fiber are first-line. Statins lower ApoB 30-50% if lifestyle isn\'t enough.',
    gapAction: 'A $15-30 add-on to your next lipid panel — the single most informative lipid marker.',
    source: 'Sniderman et al., Lancet 2019',
  },
  {
    tag: 'Blood pressure',
    metricKey: 'bp_systolic',
    evidence: 'Lowering systolic below 120 reduced major cardiovascular events by 25% in the SPRINT trial.',
    contextGood: 'Your blood pressure is well-controlled — this is one of the strongest protective factors you have.',
    contextLow: 'DASH diet (-11 mmHg), 150 min/week exercise (-5-8 mmHg), sodium <2300mg/day (-3-5 mmHg).',
    gapAction: 'A $30 home cuff and 2 minutes a week gives you the data to act on this.',
    source: 'SPRINT Trial, NEJM 2015',
  },
  {
    tag: 'Sleep',
    metricKey: 'sleep_duration',
    evidence: 'Moving from <6 hours to 7-8 hours reverses a 12% mortality increase and restores insulin sensitivity.',
    contextGood: 'You\'re hitting the target range — sleep is one of the highest-leverage health behaviors.',
    contextLow: 'Fixed wake time, no screens 1hr before bed, room temp 65-68°F. Consistency matters more than duration.',
    gapAction: 'Your wearable tracks this — connect it to see where you stand.',
    source: 'Cappuccio et al., Sleep Medicine Reviews 2010',
  },
  {
    tag: 'HbA1c',
    metricKey: 'hba1c',
    evidence: 'HbA1c detects metabolic drift years before fasting glucose flags a problem. Each 1% above 5.0% raises CV mortality 20-30%.',
    contextGood: 'Your metabolic health looks solid — diet and exercise are keeping this in check.',
    contextLow: 'Resistance training 3x/week improves insulin sensitivity within weeks. Prioritize protein and fiber at every meal.',
    gapAction: 'Standard on most lab panels — catches pre-diabetes years before symptoms.',
    source: 'American Diabetes Association, Standards of Care 2024',
  },
  {
    tag: 'Lp(a)',
    metricKey: 'lpa',
    evidence: 'Lp(a) is genetically set — it doesn\'t change with diet or exercise. If elevated (20% of people), it triples cardiovascular risk.',
    contextGood: 'Your Lp(a) is normal — one fewer thing to worry about. This test is done forever.',
    contextLow: 'No current drug lowers it meaningfully, but knowing changes your entire risk calculus and may warrant earlier statin therapy.',
    gapAction: '$15-30 add-on to any lipid panel. One test, lifetime answer.',
    source: 'Tsimikas et al., JACC 2018',
  },
  {
    tag: 'VO2 max',
    metricKey: 'vo2_max',
    evidence: 'Strongest modifiable mortality predictor. Moving from the bottom 25% to average cuts death risk by 70%.',
    contextGood: 'Your fitness level is protective — larger effect than quitting smoking. Keep the Zone 2 work going.',
    contextLow: '150 min/week Zone 2 cardio (conversational pace). Add 1-2 HIIT sessions per week for faster VO2 gains.',
    gapAction: 'Estimated by most fitness wearables, or tested directly at a sports medicine clinic (~$150).',
    source: 'Mandsager et al., JAMA Network Open 2018',
  },
  {
    tag: 'Vitamin D',
    metricKey: 'vitamin_d',
    evidence: '42% of US adults are deficient. Below 20 ng/mL impairs bone density, immunity, and raises all-cause mortality.',
    contextGood: 'Your levels are healthy — maintain with current supplementation or sun exposure.',
    contextLow: 'Supplement D3 1000-2000 IU/day, take with fat for absorption. Retest in 3 months. Aim for 30-50 ng/mL.',
    gapAction: 'A $20 test tells you if you need a $10/year supplement.',
    source: 'Forrest & Stuhldreher, Nutrition Research 2011',
  },
];

export function renderInsights(output, profile) {
  const el = document.getElementById('r-insights');

  // Build lookup for result by metricKey
  const resultByKey = {};
  for (const r of output.results) {
    const k = metricKeyFor(r);
    if (k) resultByKey[k] = r;
  }
  const gapKeys = new Set(output.gaps.map(g => g.metric));

  // Score and personalize each insight
  const scored = INSIGHTS.map(ins => {
    const result = resultByKey[ins.metricKey];
    const hasData = result && result.hasData;
    const isGap = gapKeys.has(ins.metricKey);
    // relevance: 2 = has data, 1 = gap (actionable), 0 = unrelated
    const relevance = hasData ? 2 : isGap ? 1 : 0;

    let stat, body;
    if (hasData) {
      const pctLabel = result.percentile != null ? ` (${ordinal(result.percentile)} percentile)` : '';
      stat = `You're at ${result.value} ${result.unit}${pctLabel}`;
      const isStrong = result.standing === 'Optimal' || result.standing === 'Good';
      if (isStrong) {
        body = ins.evidence + ' ' + ins.contextGood;
      } else {
        const intervention = getIntervention(ins.metricKey);
        const lever = intervention ? intervention.lever : ins.contextLow;
        body = ins.evidence + ' ' + lever;
      }
    } else {
      stat = 'Not yet tracked';
      body = ins.evidence + ' ' + ins.gapAction;
    }

    return { ...ins, stat, body, relevance, hasData };
  });

  scored.sort((a, b) => b.relevance - a.relevance);
  const shown = scored.slice(0, 6);
  const personalCount = shown.filter(s => s.hasData).length;

  const insId = 'insights-toggle';
  let html = `<div class="remaining-gaps open" id="${insId}">`;
  html += `<div class="remaining-gaps-label" onclick="document.getElementById('${insId}').classList.toggle('open')">Evidence · personalized · ${personalCount} of ${shown.length} matched</div>`;
  html += `<div class="remaining-gap-rows"><div>`;
  html += `<div class="insights-grid">`;
  shown.forEach(ins => {
    const relevanceLabel = ins.hasData ? 'Your data' : ins.relevance === 1 ? 'Closes a gap' : '';
    const relevanceBadge = relevanceLabel ? `<span class="insight-relevance insight-rel-${ins.hasData ? 'match' : 'gap'}">${relevanceLabel}</span>` : '';
    html += `<div class="insight-card">
      <div class="insight-tag">${ins.tag}${relevanceBadge}</div>
      <div class="insight-stat">${ins.stat}</div>
      <div class="insight-body">${ins.body}</div>
      <div class="insight-source">${ins.source}</div>
    </div>`;
  });
  html += '</div>';
  html += `</div></div></div>`;

  el.innerHTML = html;
}
