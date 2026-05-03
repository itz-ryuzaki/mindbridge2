/* ═══════════════════════════════════════════════════════════
   MindBridge — Shared script.js
   Handles: sidebar toggle, lucide icon init, mood interactions
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  // ── Read More and Comments Section ──
  // Helper to fetch comments from localStorage or fallback to comments.json
  async function getCommentsData() {
    let comments = localStorage.getItem('commentsData');
    if (comments) {
      return JSON.parse(comments);
    } else {
      // Fetch from comments.json
      try {
        const res = await fetch('comments.json');
        const data = await res.json();
        localStorage.setItem('commentsData', JSON.stringify(data));
        return data;
      } catch (e) {
        return {};
      }
    }
  }

  // Helper to save comments to localStorage
  function saveCommentsData(data) {
    localStorage.setItem('commentsData', JSON.stringify(data));
  }

  // Render comments for a post
  function renderComments(postId, comments) {
    const section = document.querySelector('.comments-section[data-post-id="' + postId + '"] .comments-list');
    if (!section) return;
    section.innerHTML = '';
    if (comments && comments.length) {
      comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<strong>${c.author}</strong>: <span>${c.text}</span>`;
        section.appendChild(div);
      });
    } else {
      section.innerHTML = '<div class="comment-item comment-empty">No comments yet.</div>';
    }
  }

  // Setup comment forms
  function setupCommentForms(commentsData) {
    document.querySelectorAll('.add-comment-form').forEach(form => {
      const postId = form.closest('.comments-section').getAttribute('data-post-id');
      form.onsubmit = function(e) {
        e.preventDefault();
        const author = form.querySelector('.comment-author').value.trim() || 'Anonymous';
        const text = form.querySelector('.comment-text').value.trim();
        if (!text) return;
        if (!commentsData[postId]) commentsData[postId] = [];
        commentsData[postId].push({ author, text });
        saveCommentsData(commentsData);
        renderComments(postId, commentsData[postId]);
        form.reset();
      };
    });
  }

  // Read More logic
  document.querySelectorAll('.read-more-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const postId = btn.getAttribute('data-post-id');
      const postCard = btn.closest('.post-card');
      const body = postCard.querySelector('.post-card-body');
      if (body.classList.contains('post-body-full')) {
        body.classList.remove('post-body-full');
        btn.textContent = 'Read More';
      } else {
        body.classList.add('post-body-full');
        btn.textContent = 'Show Less';
      }
    });
  });

  // Initialize comments for all posts
  getCommentsData().then(commentsData => {
    document.querySelectorAll('.comments-section').forEach(section => {
      const postId = section.getAttribute('data-post-id');
      renderComments(postId, commentsData[postId] || []);
    });
    setupCommentForms(commentsData);
  });

  // ── Lucide Icons ──
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ── Sidebar Toggle ──
  const menuBtn      = document.getElementById('menuBtn');
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar && sidebar.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar && sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuBtn  && menuBtn.addEventListener('click', openSidebar);
  overlay  && overlay.addEventListener('click', closeSidebar);

  // close sidebar when a nav link is clicked (mobile)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

  // ── Mood button feedback ──
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.mood-btn').forEach(b => {
        b.style.background = '';
        b.style.transform  = '';
      });
      this.style.background = 'var(--secondary-container)';
      this.style.transform  = 'scale(1.08)';
    });
  });

  // ── Feed: filter chip selection ──
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // ── Smooth fade-in for cards ──
  // Already handled by CSS animations, nothing extra needed.

  // ── Post action button like toggle ──
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const icon = this.querySelector('svg');
      if (!icon) return;
      const liked = this.dataset.liked === 'true';
      if (liked) {
        this.dataset.liked = 'false';
        icon.style.fill  = 'none';
        icon.style.color = '';
      } else {
        this.dataset.liked = 'true';
        icon.style.fill  = 'var(--secondary)';
        icon.style.color = 'var(--secondary)';
      }
    });
  });

  // ── Collapse mobile nav on resize ──
  // ── Read Thread navigation ──
  window.readThread = function(postId) {
    window.location.href = `post-detail.html?id=${postId}`;
  };

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
      closeSidebar();
    }
  });

});

