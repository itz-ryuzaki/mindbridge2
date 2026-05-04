/* ═══════════════════════════════════════════════
   MindBridge — Wellness Popup Tracker
   Proactive stress check-ins like Zomato notifications
   ═══════════════════════════════════════════════ */
(function() {
  'use strict';

  const QUESTIONS = [
    {
      id: 'stress',
      emoji: '🧠',
      question: "How's your stress level right now?",
      options: [
        { text: '😌 Very Calm', xp: 5, sentiment: 'good' },
        { text: '😐 A bit tense', xp: 5, sentiment: 'neutral' },
        { text: '😰 Pretty stressed', xp: 5, sentiment: 'bad' },
        { text: '😵 Overwhelmed', xp: 5, sentiment: 'critical' }
      ]
    },
    {
      id: 'break',
      emoji: '☕',
      question: 'Have you taken a break in the last hour?',
      options: [
        { text: '✅ Yes, felt great!', xp: 5, sentiment: 'good' },
        { text: '🕐 Planning to soon', xp: 5, sentiment: 'neutral' },
        { text: '❌ No, too busy', xp: 5, sentiment: 'bad' },
        { text: '💭 Forgot to', xp: 5, sentiment: 'neutral' }
      ]
    },
    {
      id: 'focus',
      emoji: '🎯',
      question: "How's your focus today?",
      options: [
        { text: '🎯 Sharp & clear', xp: 5, sentiment: 'good' },
        { text: '😊 Pretty decent', xp: 5, sentiment: 'good' },
        { text: '😓 Struggling a bit', xp: 5, sentiment: 'bad' },
        { text: '🌊 All over the place', xp: 5, sentiment: 'critical' }
      ]
    },
    {
      id: 'sleep',
      emoji: '🌙',
      question: 'Did you get enough sleep last night?',
      options: [
        { text: '😴 Yes, 7-8 hrs', xp: 5, sentiment: 'good' },
        { text: '😪 A little less', xp: 5, sentiment: 'neutral' },
        { text: '😟 Under 5 hours', xp: 5, sentiment: 'bad' },
        { text: "☕ What's sleep?", xp: 5, sentiment: 'critical' }
      ]
    },
    {
      id: 'workload',
      emoji: '📚',
      question: 'How are you managing your workload?',
      options: [
        { text: '💪 Handling it well', xp: 5, sentiment: 'good' },
        { text: '📋 It\'s manageable', xp: 5, sentiment: 'neutral' },
        { text: '😰 Falling behind', xp: 5, sentiment: 'bad' },
        { text: '🆘 Need support', xp: 5, sentiment: 'critical' }
      ]
    },
    {
      id: 'social',
      emoji: '🤝',
      question: 'Have you talked to someone you trust today?',
      options: [
        { text: '💬 Yes, felt supported', xp: 5, sentiment: 'good' },
        { text: '😊 A little chat', xp: 5, sentiment: 'good' },
        { text: '😶 Not yet today', xp: 5, sentiment: 'neutral' },
        { text: '🏠 Feeling isolated', xp: 5, sentiment: 'critical' }
      ]
    }
  ];

  let popupShown = false;

  function getNextQuestion() {
    const history = JSON.parse(localStorage.getItem('wellnessHistory') || '[]');
    const usedToday = history
      .filter(h => new Date(h.time).toLocaleDateString() === new Date().toLocaleDateString())
      .map(h => h.id);
    const available = QUESTIONS.filter(q => !usedToday.includes(q.id));
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function saveResponse(questionId, answer, sentiment) {
    const history = JSON.parse(localStorage.getItem('wellnessHistory') || '[]');
    history.unshift({ id: questionId, answer, sentiment, time: new Date().toISOString() });
    if (history.length > 200) history.length = 200;
    localStorage.setItem('wellnessHistory', JSON.stringify(history));
    if (sentiment === 'critical') {
      const alerts = JSON.parse(localStorage.getItem('sosAlertHistory') || '[]');
      alerts.unshift({ time: new Date().toLocaleString(), reason: 'Wellness check flagged: ' + answer, auto: true, dismissed: false });
      localStorage.setItem('sosAlertHistory', JSON.stringify(alerts));
    }
  }

  function injectStyles() {
    if (document.getElementById('wellnessPopupStyles')) return;
    const s = document.createElement('style');
    s.id = 'wellnessPopupStyles';
    s.textContent = `
      #wellnessPopup {
        position: fixed;
        bottom: -320px;
        right: 1.5rem;
        width: 320px;
        background: #fff;
        border-radius: 1.25rem;
        box-shadow: 0 8px 40px rgba(45,50,46,0.18), 0 2px 8px rgba(124,149,133,0.12);
        z-index: 9999;
        transition: bottom 0.4s cubic-bezier(0.34,1.56,0.64,1);
        border: 1px solid var(--surface-dim, #E8E5DF);
        overflow: hidden;
      }
      #wellnessPopup.show { bottom: 1.5rem; }
      .wp-header {
        background: linear-gradient(135deg, #7C9585, #8B7E66);
        padding: 1rem 1.25rem 0.75rem;
        display: flex; align-items: center; justify-content: space-between;
      }
      .wp-header-left { display: flex; align-items: center; gap: 0.6rem; }
      .wp-emoji { font-size: 1.5rem; }
      .wp-brand { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.8); }
      .wp-title { font-size: 0.875rem; font-weight: 700; color: #fff; }
      .wp-close {
        background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
        width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
        color: #fff; cursor: pointer; font-size: 1rem; transition: background 0.15s;
        flex-shrink: 0;
      }
      .wp-close:hover { background: rgba(255,255,255,0.35); }
      .wp-body { padding: 1.1rem 1.25rem 1.25rem; }
      .wp-question { font-size: 0.9375rem; font-weight: 600; color: #2D322E; line-height: 1.5; margin-bottom: 1rem; }
      .wp-options { display: flex; flex-direction: column; gap: 0.5rem; }
      .wp-option {
        background: #F1EEE6; border: 1.5px solid transparent;
        border-radius: 0.75rem; padding: 0.65rem 1rem;
        font-size: 0.875rem; font-weight: 600; color: #2D322E;
        cursor: pointer; text-align: left; transition: all 0.15s;
        font-family: inherit;
      }
      .wp-option:hover { background: #d4e4da; border-color: #7C9585; }
      .wp-option.selected { background: #7C9585; color: #fff; border-color: #7C9585; }
      .wp-footer { padding: 0.5rem 1.25rem 1rem; text-align: center; }
      .wp-skip { font-size: 0.7rem; color: #8D948E; cursor: pointer; font-weight: 600; background: none; border: none; font-family: inherit; }
      .wp-skip:hover { color: #5D645E; }
      .wp-done {
        text-align: center; padding: 1.5rem 1.25rem;
        font-size: 0.875rem; font-weight: 600; color: #166534;
      }
      .wp-pulse {
        width: 8px; height: 8px; border-radius: 50%;
        background: #4ade80; display: inline-block;
        animation: wpPulse 1.5s infinite;
      }
      @keyframes wpPulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
    `;
    document.head.appendChild(s);
  }

  function showPopup() {
    if (popupShown) return;
    const q = getNextQuestion();
    if (!q) return;
    popupShown = true;

    injectStyles();
    const existing = document.getElementById('wellnessPopup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'wellnessPopup';
    popup.innerHTML = `
      <div class="wp-header">
        <div class="wp-header-left">
          <span class="wp-emoji">${q.emoji}</span>
          <div>
            <div class="wp-brand"><span class="wp-pulse"></span> Wellness Check</div>
            <div class="wp-title">Quick question for you</div>
          </div>
        </div>
        <button class="wp-close" id="wpClose">✕</button>
      </div>
      <div class="wp-body">
        <div class="wp-question">${q.question}</div>
        <div class="wp-options" id="wpOptions">
          ${q.options.map((o, i) => `<button class="wp-option" data-idx="${i}" data-xp="${o.xp}" data-sentiment="${o.sentiment}" data-text="${o.text}">${o.text}</button>`).join('')}
        </div>
      </div>
      <div class="wp-footer">
        <button class="wp-skip" id="wpSkip">Skip for now</button>
      </div>
    `;
    document.body.appendChild(popup);

    requestAnimationFrame(() => popup.classList.add('show'));

    document.getElementById('wpClose').onclick = () => closePopup(popup);
    document.getElementById('wpSkip').onclick = () => closePopup(popup);

    popup.querySelectorAll('.wp-option').forEach(btn => {
      btn.onclick = function() {
        popup.querySelectorAll('.wp-option').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        const answer = this.dataset.text;
        const sentiment = this.dataset.sentiment;
        const xp = parseInt(this.dataset.xp);
        saveResponse(q.id, answer, sentiment);
        if (typeof awardXP === 'function') awardXP(xp, 'Wellness check-in (' + q.id + ')');
        const body = popup.querySelector('.wp-body');
        const footer = popup.querySelector('.wp-footer');
        body.innerHTML = `<div class="wp-done">✅ Thanks for checking in!<br><span style="font-size:0.75rem;color:#5D645E;font-weight:500;">+${xp} XP earned</span></div>`;
        if (footer) footer.remove();
        setTimeout(() => closePopup(popup), 2000);
      };
    });
  }

  function closePopup(popup) {
    popup.classList.remove('show');
    setTimeout(() => { if (popup.parentNode) popup.remove(); popupShown = false; }, 400);
  }

  function schedulePopups() {
    const FIRST_DELAY = 45 * 1000;      // 45 seconds after load
    const INTERVAL   = 20 * 60 * 1000;  // every 20 minutes
    setTimeout(() => { showPopup(); setInterval(showPopup, INTERVAL); }, FIRST_DELAY);
  }

  document.addEventListener('DOMContentLoaded', function() {
    injectStyles();
    schedulePopups();
    window.showWellnessPopup = showPopup;
  });
})();
