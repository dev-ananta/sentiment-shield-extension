(function () {
  'use strict';

  // Site Selectors

  const SITE_CONFIGS = {
    'twitter.com': {
      postSelector: 'article[data-testid="tweet"]',
      textSelector: '[data-testid="tweetText"]',
      authorSelector: '[data-testid="User-Name"] a[role="link"]:first-child',
    },
    'x.com': {
      postSelector: 'article[data-testid="tweet"]',
      textSelector: '[data-testid="tweetText"]',
      authorSelector: '[data-testid="User-Name"] a[role="link"]:first-child',
    },
    'reddit.com': {
      postSelector: 'shreddit-post, .Post, [data-testid="post-container"]',
      textSelector: 'shreddit-post h1, .Post h3, [data-testid="post-title"], .RichTextJSON-root',
      authorSelector: '[data-testid="post_author_link"], .author',
    },
    'old.reddit.com': {
      postSelector: '.thing.link, .thing.comment',
      textSelector: '.title a.title, .usertext-body .md',
      authorSelector: '.author',
    },
    'linkedin.com': {
      postSelector: '.feed-shared-update-v2, .occludable-update',
      textSelector: '.feed-shared-text, .update-components-text',
      authorSelector: '.feed-shared-actor__name',
    },
  };

  // State

  let settings = {
    enabled: true,
    blockedEmotions: {anger: true, toxic: true, fear: false, sadness: false, spam: false },
    whitelist: { users: [], keywords: [] },
    analyzed: 0,
    blocked: 0,
  };

  const processedPosts = new WeakSet();

  // Helpers

  function getSiteConfig() {
    const hostname = location.hostname.replace('www.', '');
    for (const [site, config] of Object.entries(SITE_CONFIGS)) {
      if (hostname.includes(site)) return config;
    }
    return null;
  }

  function extractText(post, config) {
    const textEl = post.querySelector(config.textSelector);
    return textEl ? textEl.innerText.trim() : post.innerText.trim().slice(0, 500);
  }

  function extractAuthor(post, config) {
    const authorEl = post.querySelector(config.authorSelector);
    return authorEl ? authorEl.textContent.trim().replace('@', '').toLowerCase() : '';
  }

  function isWhitelisted(text, author) {
    // be defensive: whitelist may not be initialized yet
    const { users = [], keywords = [] } = settings.whitelist || {};
    if (users.some(u => author.toLowerCase().includes(u.toLowerCase()))) return true;
    if (keywords.some(k => k && text.toLowerCase().includes(k.toLowerCase()))) return true;
    return false;
  }

  function shouldBlock(result) {
    if (!result.dominantEmotion) return false;
    return settings.blockedEmotions[result.dominantEmotion] && result.dominantScore > 0.15;
  }

  // Overlay

  const EMOTION_LABELS = {
    anger: '😤 Anger Detected',
    sadness: '😢 Sadness Detected',
    toxic: '☣️ Toxic Content',
    fear: '😨 Fear-Inducing',
    spam: '📢 Possible Spam',
  };

  const EMOTION_COLORS = {
    anger:   '#ff4d4d',
    sadness: '#6b9fd4',
    toxic:   '#c44dff',
    fear:    '#ff9933',
    spam:    '#ffcc00',
  };

  function applyOverlay(post, result) {
    if (post.querySelector('.ss-overlay')) return;

    post.style.position = 'relative';
    post.style.overflow = 'hidden';

    // Blur Direct Children (Not Overlay)
    const blurTarget = document.createElement('div');
    blurTarget.className = 'ss-blur-wrapper';
    while (post.firstChild) blurTarget.appendChild(post.firstChild);
    post.appendChild(blurTarget);

    const color = EMOTION_COLORS[result.dominantEmotion] || '#888';
    const label = EMOTION_LABELS[result.dominantEmotion] || 'Negative Content';
    const confidence = Math.round(result.confidence * 100);

    const overlay = document.createElement('div');
    overlay.className = 'ss-overlay';
    overlay.setAttribute('data-emotion', result.dominantEmotion);
    overlay.innerHTML = `
      <div class="ss-overlay-inner">
        <div class="ss-shield-icon">🛡️</div>
        <div class="ss-overlay-title">Sentiment Shield</div>
        <div class="ss-overlay-label" style="color:${color}">${label}</div>
        <div class="ss-overlay-conf">Confidence: ${confidence}%</div>
        <button class="ss-reveal-btn" style="border-color:${color};color:${color}">Reveal Anyway</button>
      </div>
    `;

    overlay.querySelector('.ss-reveal-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
      blurTarget.classList.remove('ss-blurred');
      settings.blocked = Math.max(0, settings.blocked - 1);
      saveStats();
    });

    post.appendChild(overlay);
    blurTarget.classList.add('ss-blurred');

    settings.blocked++;
    saveStats();
  }

  function saveStats() {
    chrome.storage.local.set({ analyzed: settings.analyzed, blocked: settings.blocked });
  }

  // Processing

  function processPost(post, config) {
    if (processedPosts.has(post) || !settings.enabled) return;
    processedPosts.add(post);

    const text = extractText(post, config);
    if (!text || text.length < 10) return;

    const author = extractAuthor(post, config);
    if (isWhitelisted(text, author)) return;

    const result = window.SentimentEngine.analyzeText(text);
    settings.analyzed++;

    if (shouldBlock(result)) {
      // Small Timeout (Allow DOM Settle)
      setTimeout(() => applyOverlay(post, result), 50);
    }

    // Occasional Stat Persistence
    if (settings.analyzed % 10 === 0) saveStats();
  }

  function scanPosts() {
    const config = getSiteConfig();
    if (!config) return;
    const posts = document.querySelectorAll(config.postSelector);
    posts.forEach(post => processPost(post, config));
  }

  // Mutation Observer

  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanPosts, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Init

  function init() {
    chrome.storage.local.get(
      ['enabled', 'blockedEmotions', 'whitelist', 'analyzed', 'blocked'],
      (data) => {
        if (data.enabled !== undefined) settings.enabled = data.enabled;
        if (data.blockedEmotions) settings.blockedEmotions = data.blockedEmotions;
        if (data.whitelist) {
        // ensure both arrays exist when loading stale/partial data
        settings.whitelist = {
          users: [],
          keywords: [],
          ...data.whitelist,
        };
      }
        if (data.analyzed) settings.analyzed = data.analyzed;
        if (data.blocked) settings.blocked = data.blocked;
        scanPosts();
      }
    );
  }

  // Setting Change Listener Popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      // merge whitelist carefully to avoid undefined arrays
      const incoming = { ...msg.settings };
      if (incoming.whitelist) {
        incoming.whitelist = {
          users: [],
          keywords: [],
          ...incoming.whitelist,
        };
      }
      settings = { ...settings, ...incoming };
      if (!settings.enabled) {
        // Overlay Removal
        document.querySelectorAll('.ss-overlay').forEach(el => {
          const blurWrapper = el.parentElement.querySelector('.ss-blur-wrapper');
          if (blurWrapper) blurWrapper.classList.remove('ss-blurred');
          el.remove();
        });
      }
    }
  });

  init();

})();