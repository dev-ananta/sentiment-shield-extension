const EMOTIONS = [
  {
    key: 'anger',
    icon: '😤',
    name: 'Anger',
    desc: 'Rage, hatred, hostility',
    color: '#ff5555',
  },
  {
    key: 'toxic',
    icon: '☣️',
    name: 'Toxic',
    desc: 'Harassment, abuse, slurs',
    color: '#0a6124',
  },
  {
    key: 'sadness',
    icon: '😢',
    name: 'Sadness',
    desc: 'Grief, depression, despair',
    color: '#5599ff',
  },
  {
    key: 'fear',
    icon: '😨',
    name: 'Fear',
    desc: 'Panic, dread, alarm',
    color: '#c44dff',
  },
  {
    key: 'spam',
    icon: '📢',
    name: 'Spam',
    desc: 'Ads, promotions, scams',
    color: '#f1c40f',
  },
];

// State

let state = {
  enabled: true,
  blockedEmotions: { anger: true, toxic: true, fear: false, sadness: false, spam: false },
  whitelist: { users: [], keywords: [] },
  analyzed: 0,
  blocked: 0,
};

// Load Settings

chrome.storage.local.get(
  ['enabled', 'blockedEmotions', 'whitelist', 'analyzed', 'blocked'],
  (data) => {
    if (data.enabled !== undefined) state.enabled = data.enabled;
    if (data.blockedEmotions) state.blockedEmotions = { ...state.blockedEmotions, ...data.blockedEmotions };

    // ensure whitelist always has expected structure
    if (data.whitelist) {
      state.whitelist = {
        users: Array.isArray(data.whitelist.users) ? data.whitelist.users : [],
        keywords: Array.isArray(data.whitelist.keywords) ? data.whitelist.keywords : [],
      };
    } else {
      state.whitelist = { users: [], keywords: [] };
    }

    if (data.analyzed) state.analyzed = data.analyzed;
    if (data.blocked) state.blocked = data.blocked;
    render();
  }
);

// Render

function render() {
  renderPowerToggle();
  renderStats();
  renderEmotions();
  renderWhitelist();
}

function renderPowerToggle() {
  const toggle = document.getElementById('power-toggle');
  const label = document.getElementById('power-label');
  const body = document.getElementById('body');
  const statsBar = document.getElementById('stats-bar');

  toggle.checked = state.enabled;
  label.textContent = state.enabled ? 'ON' : 'OFF';
  body.classList.toggle('disabled', !state.enabled);
  statsBar.classList.toggle('disabled', !state.enabled);
}

function renderStats() {
  document.getElementById('stat-analyzed').textContent = state.analyzed.toLocaleString();
  document.getElementById('stat-blocked').textContent = state.blocked.toLocaleString();
  const rate = state.analyzed > 0 ? Math.round((state.blocked / state.analyzed) * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
}

function renderEmotions() {
  const grid = document.getElementById('emotion-grid');
  grid.innerHTML = '';

  EMOTIONS.forEach(({ key, icon, name, desc, color }) => {
    const active = !!state.blockedEmotions[key];
    const btn = document.createElement('button');
    btn.className = 'emotion-btn' + (active ? ' active' : '');
    btn.style.setProperty('--emotion-color', color);
    btn.innerHTML = `
      <span class="emotion-icon">${icon}</span>
      <div class="emotion-text">
        <div class="emotion-name">${name}</div>
        <div class="emotion-desc">${desc}</div>
      </div>
      <div class="emotion-check">${active ? '✓' : ''}</div>
    `;
    btn.addEventListener('click', () => {
      state.blockedEmotions[key] = !state.blockedEmotions[key];
      saveAndSync();
      renderEmotions();
    });
    grid.appendChild(btn);
  });
}

function renderWhitelist() {
  const users = (state.whitelist && Array.isArray(state.whitelist.users)) ? state.whitelist.users : [];
  const keywords = (state.whitelist && Array.isArray(state.whitelist.keywords)) ? state.whitelist.keywords : [];

  renderTags('user-tags', users, 'user-tag', '@', (i) => {
    users.splice(i, 1);
    saveAndSync();
    renderWhitelist();
  });

  renderTags('keyword-tags', keywords, 'keyword-tag', '', (i) => {
    keywords.splice(i, 1);
    saveAndSync();
    renderWhitelist();
  });
}

function renderTags(containerId, items, tagClass, prefix, onRemove) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach((item, i) => {
    const tag = document.createElement('div');
    tag.className = `tag ${tagClass}`;
    tag.innerHTML = `${prefix}${item} <span class="tag-remove" data-i="${i}">×</span>`;
    tag.querySelector('.tag-remove').addEventListener('click', () => onRemove(i));
    container.appendChild(tag);
  });
}

// Save & Sync

function saveAndSync() {
  // normalize whitelist before saving
  const whitelist = {
    users: Array.isArray(state.whitelist?.users) ? state.whitelist.users : [],
    keywords: Array.isArray(state.whitelist?.keywords) ? state.whitelist.keywords : [],
  };

  const toSave = {
    enabled: state.enabled,
    blockedEmotions: state.blockedEmotions,
    whitelist,
  };
  chrome.storage.local.set(toSave);

  // Notify Active Tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SETTINGS_UPDATED',
        settings: toSave,
      }).catch(() => {});
    }
  });
}

// Event Listeners

document.getElementById('power-toggle').addEventListener('change', (e) => {
  state.enabled = e.target.checked;
  saveAndSync();
  renderPowerToggle();
});

// Add User Whitelist
document.getElementById('add-user').addEventListener('click', () => {
  const input = document.getElementById('user-input');
  const val = input.value.trim().replace('@', '');
  if (val && !state.whitelist.users.includes(val)) {
    state.whitelist.users.push(val);
    saveAndSync();
    renderWhitelist();
  }
  input.value = '';
});

document.getElementById('user-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-user').click();
});

// Add Keyword Whitelist
document.getElementById('add-keyword').addEventListener('click', () => {
  const input = document.getElementById('keyword-input');
  const val = input.value.trim();
  if (val && !state.whitelist.keywords.includes(val)) {
    state.whitelist.keywords.push(val);
    saveAndSync();
    renderWhitelist();
  }
  input.value = '';
});

document.getElementById('keyword-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-keyword').click();
});

// Reset Stats
document.getElementById('reset-stats').addEventListener('click', () => {
  state.analyzed = 0;
  state.blocked = 0;
  chrome.storage.local.set({ analyzed: 0, blocked: 0 });
  renderStats();
});
