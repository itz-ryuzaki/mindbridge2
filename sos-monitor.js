/* ═══════════════════════════════════════════════════════════
   MindBridge — SOS Emergency Monitor (sos-monitor.js)
   
   This script runs on EVERY page. It monitors:
   - AI Chat messages (chat.html)
   - Feed posts (feed.html)
   - Comments (post-detail.html)
   - Any text input across the platform
   
   If harmful keywords are detected, it auto-triggers
   the SOS Emergency Alarm.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Harmful Keywords / Phrases ──
  // These are checked case-insensitively against user input
  const HARMFUL_KEYWORDS = [
    // Suicide / self-harm
    'suicide', 'kill myself', 'end my life', 'want to die', 'wanna die',
    'better off dead', 'no reason to live', 'not worth living',
    'take my own life', 'end it all', 'i want to die',
    'self harm', 'self-harm', 'cut myself', 'hurt myself',
    'hang myself', 'jump off', 'overdose',
    // Violence / harm to others
    'kill someone', 'kill him', 'kill her', 'kill them',
    'i will kill', 'going to kill', 'murder',
    // Severe distress
    'can\'t go on', 'can\'t take it anymore', 'no way out',
    'nobody cares', 'hopeless', 'give up on life',
    'i don\'t want to live', 'i dont want to live',
    'wish i was dead', 'wish i were dead',
    'planning to die', 'ready to die',
    'nothing to live for', 'life is not worth',
    // Direct crisis phrases
    'help me die', 'how to die', 'ways to die',
    'painless death', 'suicidal', 'i am suicidal'
  ];

  // ── Alert Cooldown (prevent spam) ──
  const COOLDOWN_MS = 60000; // 1 minute cooldown between auto-alerts
  let lastAlertTime = 0;

  // ── SOS Notification Banner (injected across all pages) ──
  function createSOSBanner() {
    if (document.getElementById('sosAutoAlertBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'sosAutoAlertBanner';
    banner.className = 'sos-auto-banner';
    banner.innerHTML = `
      <div class="sos-auto-banner-inner">
        <div class="sos-auto-banner-pulse"></div>
        <div class="sos-auto-banner-icon">🚨</div>
        <div class="sos-auto-banner-text">
          <strong>Distress Detected</strong>
          <span id="sosBannerReason">Harmful content was detected in your message.</span>
        </div>
        <div class="sos-auto-banner-actions">
          <button class="sos-auto-banner-btn help" onclick="window.location.href='sos.html'">Get Help</button>
          <button class="sos-auto-banner-btn dismiss" onclick="dismissSOSBanner()">I'm Okay</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
  }

  function showSOSBanner(reason) {
    createSOSBanner();
    const banner = document.getElementById('sosAutoAlertBanner');
    const reasonEl = document.getElementById('sosBannerReason');
    if (reasonEl) reasonEl.textContent = reason;
    banner.classList.add('show');
  }

  window.dismissSOSBanner = function() {
    const banner = document.getElementById('sosAutoAlertBanner');
    if (banner) banner.classList.remove('show');
  };

  // ── Check Text for Harmful Content ──
  function detectHarmfulContent(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase().trim();
    for (const keyword of HARMFUL_KEYWORDS) {
      if (lower.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }

  // ── Trigger Auto SOS ──
  function triggerAutoSOS(detectedKeyword, sourceContext) {
    const now = Date.now();
    if (now - lastAlertTime < COOLDOWN_MS) return; // Cooldown
    lastAlertTime = now;

    const reason = `Auto-detected: "${detectedKeyword}" found in ${sourceContext}`;
    
    // Show the banner on current page
    showSOSBanner(reason);

    // If emergency mode is ON, trigger the full alarm
    const emergencyMode = localStorage.getItem('sosEmergencyMode') === 'true';
    if (emergencyMode) {
      // Log to alert history
      const history = JSON.parse(localStorage.getItem('sosAlertHistory') || '[]');
      history.unshift({
        time: new Date().toLocaleString(),
        reason: reason,
        auto: true,
        dismissed: false
      });
      localStorage.setItem('sosAlertHistory', JSON.stringify(history));

      // If we're on the SOS page, trigger the full alarm modal
      if (typeof window.triggerSOSAlarm === 'function') {
        window.triggerSOSAlarm(reason, true);
      } else {
        // On other pages, redirect to SOS page with alarm param
        window.location.href = 'sos.html?autoalarm=1&reason=' + encodeURIComponent(reason);
      }
    }

    // Play a subtle alert beep on any page
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = 600; osc.type = 'sine';
      gain.gain.value = 0.15;
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
  }

  // ── Monitor Hooks ──

  // 1. Chat Page — Intercept sendMessage
  function hookChatPage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!chatInput || !sendBtn) return;

    // Listen to the send button click and Enter key
    function checkChatInput() {
      const text = chatInput.value;
      const harmful = detectHarmfulContent(text);
      if (harmful) {
        triggerAutoSOS(harmful, 'AI Chat message');
      }
    }

    sendBtn.addEventListener('click', checkChatInput, true);
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        checkChatInput();
      }
    }, true);
  }

  // 2. Feed Page — Intercept post creation
  function hookFeedPage() {
    // Monitor the post modal submission
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.id === 'postModal') {
            const form = node.querySelector('#newPostForm');
            if (form) {
              form.addEventListener('submit', function() {
                const body = document.getElementById('newPostBody');
                if (body) {
                  const harmful = detectHarmfulContent(body.value);
                  if (harmful) {
                    triggerAutoSOS(harmful, 'Feed post');
                  }
                }
              }, true);
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true });
  }

  // 3. Post-Detail Page — Intercept comment submission
  function hookPostDetailPage() {
    const commentForm = document.getElementById('addCommentForm');
    if (!commentForm) return;

    commentForm.addEventListener('submit', function() {
      const textarea = document.getElementById('commentText');
      if (textarea) {
        const harmful = detectHarmfulContent(textarea.value);
        if (harmful) {
          triggerAutoSOS(harmful, 'post comment');
        }
      }
    }, true);
  }

  // 4. Universal — Monitor any textarea/input for real-time typing
  function hookUniversalInputs() {
    document.addEventListener('input', function(e) {
      const target = e.target;
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) {
        const harmful = detectHarmfulContent(target.value);
        if (harmful) {
          // Only trigger on substantial matches (not just partial typing)
          const words = target.value.trim().split(/\s+/);
          if (words.length >= 3) {
            triggerAutoSOS(harmful, 'text input');
          }
        }
      }
    });
  }

  // ── Check for auto-alarm on SOS page load ──
  function checkAutoAlarmOnLoad() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoalarm') === '1') {
      const reason = params.get('reason') || 'Automatic distress detection triggered.';
      // Wait for the page to fully load
      setTimeout(function() {
        if (typeof window.triggerSOSAlarm === 'function') {
          window.triggerSOSAlarm(reason, true);
        }
      }, 500);
      // Clean URL
      window.history.replaceState({}, '', 'sos.html');
    }
  }

  // ── Inject SOS Banner Styles ──
  function injectStyles() {
    if (document.getElementById('sosMonitorStyles')) return;
    const style = document.createElement('style');
    style.id = 'sosMonitorStyles';
    style.textContent = `
      .sos-auto-banner {
        position: fixed;
        top: -120px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        width: calc(100% - 2rem);
        max-width: 600px;
        transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      .sos-auto-banner.show {
        top: 80px;
        pointer-events: auto;
      }
      .sos-auto-banner-inner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
        border: 2px solid #f87171;
        border-radius: 1rem;
        box-shadow: 0 8px 32px rgba(248, 113, 113, 0.3), 0 2px 8px rgba(0,0,0,0.08);
        position: relative;
        overflow: hidden;
      }
      .sos-auto-banner-pulse {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border-radius: 1rem;
        animation: sosBannerPulse 2s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes sosBannerPulse {
        0%, 100% { box-shadow: inset 0 0 0 2px transparent; }
        50% { box-shadow: inset 0 0 0 2px rgba(248, 113, 113, 0.4); }
      }
      .sos-auto-banner-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
        animation: sosBannerShake 0.8s ease-in-out infinite;
      }
      @keyframes sosBannerShake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-10deg); }
        75% { transform: rotate(10deg); }
      }
      .sos-auto-banner-text {
        flex: 1;
        font-size: 0.85rem;
        line-height: 1.4;
        color: #7f1d1d;
      }
      .sos-auto-banner-text strong {
        display: block;
        font-size: 0.9rem;
        margin-bottom: 2px;
      }
      .sos-auto-banner-actions {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        flex-shrink: 0;
      }
      .sos-auto-banner-btn {
        padding: 0.4rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        border: none;
        cursor: pointer;
        font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
        white-space: nowrap;
        transition: opacity 0.15s;
      }
      .sos-auto-banner-btn:hover { opacity: 0.85; }
      .sos-auto-banner-btn.help {
        background: #dc2626;
        color: #fff;
      }
      .sos-auto-banner-btn.dismiss {
        background: rgba(127, 29, 29, 0.1);
        color: #7f1d1d;
      }
      @media (max-width: 600px) {
        .sos-auto-banner { max-width: calc(100% - 1rem); }
        .sos-auto-banner-inner { flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem; }
        .sos-auto-banner-actions { flex-direction: row; width: 100%; }
        .sos-auto-banner-btn { flex: 1; text-align: center; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Initialize ──
  document.addEventListener('DOMContentLoaded', function() {
    injectStyles();
    hookChatPage();
    hookFeedPage();
    hookPostDetailPage();
    hookUniversalInputs();
    checkAutoAlarmOnLoad();
  });

})();
