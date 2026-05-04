/* ═══════════════════════════════════════════════════════════
   MindBridge — XP Tracker (xp-tracker.js)

   Shared XP system. Loaded on all pages.
   Awards XP for user actions and persists in localStorage.

   XP Rules:
   - Comment on a post:  +10 XP
   - Create a feed post: +5 XP
   - Send AI Chat msg:   +5 XP
   - Like a post:        +5 XP
   - Read a thread:      +5 XP
   - Rate a session:     +5 XP
   - Book a session:     +5 XP
   - Page visit:         +1 XP (once per day per page)

   Rank Thresholds (XP-based):
   - Newcomer:   0 – 499 XP
   - Supporter:  500 – 1,499 XP
   - Mentor:     1,500 – 2,999 XP
   - Champion:   3,000+ XP
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Rank definitions ──
  const RANKS = [
    { name: 'Newcomer',  min: 0,    max: 499  },
    { name: 'Supporter', min: 500,  max: 1499 },
    { name: 'Mentor',    min: 1500, max: 2999 },
    { name: 'Champion',  min: 3000, max: Infinity }
  ];

  function getRankInfo(xp) {
    let rankObj = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].min) { rankObj = RANKS[i]; break; }
    }
    const isLast = rankObj.max === Infinity;
    const nextRankXP = isLast ? rankObj.min : rankObj.max + 1;
    const remaining = isLast ? 0 : nextRankXP - xp;
    const progress = isLast ? 100 : Math.round(((xp - rankObj.min) / (nextRankXP - rankObj.min)) * 100);
    return { rank: rankObj.name, remaining, progress };
  }

  // ── Get / Set XP ──
  function getXP() {
    return parseInt(localStorage.getItem('mindbridge_xp') || '0', 10);
  }

  function setXP(val) {
    localStorage.setItem('mindbridge_xp', String(val));
  }

  function getXPLog() {
    return JSON.parse(localStorage.getItem('mindbridge_xp_log') || '[]');
  }

  function addXPLog(entry) {
    const log = getXPLog();
    log.unshift(entry);
    if (log.length > 100) log.length = 100; // keep last 100
    localStorage.setItem('mindbridge_xp_log', JSON.stringify(log));
  }

  // ── Award XP ──
  window.awardXP = function(amount, reason) {
    const currentXP = getXP();
    const newXP = currentXP + amount;
    setXP(newXP);
    addXPLog({
      xp: amount,
      reason: reason,
      total: newXP,
      time: new Date().toLocaleString()
    });

    // Show a small toast notification
    showXPToast(amount, reason);

    // Update XP display on current page if exists
    updateXPDisplays(newXP);

    return newXP;
  };

  // ── XP Toast Notification ──
  function showXPToast(amount, reason) {
    // Remove existing toast
    const existing = document.getElementById('xpToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'xpToast';
    toast.innerHTML = `
      <div class="xp-toast-inner">
        <span class="xp-toast-amount">+${amount} XP</span>
        <span class="xp-toast-reason">${reason}</span>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove after 2.5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // ── Update XP displays on current page ──
  function updateXPDisplays(xp) {
    const level = Math.floor(xp / 200) + 1;
    const { rank, remaining, progress } = getRankInfo(xp);

    // Level card on xp.html
    const xpVal = document.querySelector('.level-xp-val');
    if (xpVal) xpVal.textContent = xp.toLocaleString();

    const levelTitle = document.querySelector('.level-title');
    if (levelTitle) levelTitle.textContent = 'Level ' + level + ' Wellness ' + rank;

    // Progress bar
    const fill = document.querySelector('.prog-fill');
    if (fill) fill.style.width = progress + '%';

    // Rank sub label
    const progSub = document.querySelector('.prog-sub');
    if (progSub) {
      const nextRankName = RANKS.find(r => r.min > getRankInfo(xp - 1).min)?.name || 'Max Rank';
      progSub.innerHTML = '<span>Rank: ' + rank + '</span><span class="next">Next Rank: ' + nextRankName + ' (' + (remaining > 0 ? remaining + ' XP remaining' : 'Achieved!') + ')</span>';
    }

    // Rank chips (highlight active rank)
    document.querySelectorAll('.prog-chip').forEach(chip => {
      chip.className = 'prog-chip future';
    });
    const chips = document.querySelectorAll('.prog-chip');
    const rankNames = ['Supporter', 'Mentor', 'Champion'];
    chips.forEach((chip, idx) => {
      const chipRank = rankNames[idx];
      if (chipRank === rank) {
        chip.className = 'prog-chip active';
      } else if (RANKS.findIndex(r => r.name === chipRank) < RANKS.findIndex(r => r.name === rank)) {
        chip.className = 'prog-chip inactive';
      }
    });

    // Update navbar level text
    document.querySelectorAll('.user-level').forEach(el => {
      el.textContent = 'Level ' + level + ' ' + rank;
    });
    document.querySelectorAll('.sidebar-rank').forEach(el => {
      el.textContent = 'Lvl ' + level + ' ' + rank;
    });

    // Leaderboard "You" row
    const youXPEl = document.querySelector('.lb-divider .lb-xp');
    if (youXPEl) youXPEl.textContent = xp >= 1000 ? (xp / 1000).toFixed(1) + 'k XP' : xp + ' XP';

    // Today's XP for leaderboard sub
    const log = getXPLog();
    const todayStr = new Date().toLocaleDateString();
    const todayXP = log.filter(e => e.time && e.time.includes(todayStr)).reduce((sum, e) => sum + e.xp, 0);
    const youSubEl = document.querySelector('.lb-divider .lb-sub');
    if (youSubEl) youSubEl.textContent = todayXP + ' XP today';

    // Activity stats rows
    const commentCount = log.filter(e => e.reason && (e.reason.toLowerCase().includes('comment'))).length;
    const activityCount = log.filter(e => e.reason && !e.reason.toLowerCase().includes('comment')).length;
    const helpingPoints = commentCount * 10 + activityCount * 5;

    const statRows = document.querySelectorAll('.stat-row');
    if (statRows[1]) statRows[1].querySelector('.stat-val').textContent = (commentCount + activityCount) + ' Actions';
    if (statRows[2]) statRows[2].querySelector('.stat-val').textContent = helpingPoints + ' Points';

    // Reward bar (to Level 15)
    const rewardFill = document.querySelector('.reward-bar-fill');
    const rewardPct = document.querySelector('.reward-bar-pct');
    const pct = Math.min(Math.round((level / 15) * 100), 100);
    if (rewardFill) rewardFill.style.width = pct + '%';
    if (rewardPct) rewardPct.textContent = pct + '%';
  }

  // ── Get XP info (for xp.html) ──
  window.getXPInfo = function() {
    const xp = getXP();
    const level = Math.floor(xp / 200) + 1;
    const { rank, remaining, progress } = getRankInfo(xp);
    const log = getXPLog();
    return { xp, level, rank, remaining, progress, log };
  };

  // ── Inject XP Toast Styles ──
  function injectStyles() {
    if (document.getElementById('xpTrackerStyles')) return;
    const style = document.createElement('style');
    style.id = 'xpTrackerStyles';
    style.textContent = `
      #xpToast {
        position: fixed;
        bottom: -60px;
        right: 1.5rem;
        z-index: 10001;
        transition: bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      #xpToast.show {
        bottom: 1.5rem;
      }
      .xp-toast-inner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 1.25rem;
        background: linear-gradient(135deg, #166534 0%, #15803d 100%);
        color: #fff;
        border-radius: 9999px;
        box-shadow: 0 4px 20px rgba(22, 101, 52, 0.35);
        font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
      }
      .xp-toast-amount {
        font-weight: 800;
        font-size: 0.9rem;
        color: #bbf7d0;
      }
      .xp-toast-reason {
        font-size: 0.75rem;
        font-weight: 500;
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Initialize ──
  document.addEventListener('DOMContentLoaded', function() {
    injectStyles();
    // Initialize XP to 0 if not set (fresh start)
    if (!localStorage.getItem('mindbridge_xp')) {
      setXP(0);
    }
    // Update all displays on load
    updateXPDisplays(getXP());
  });

})();
