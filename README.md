# 🛡️ Sentiment Shield — Browser Extension

> A free, privacy-first social media feed filter powered by on-device NLP. No API keys. No subscriptions. No data leaves your browser.

---

## 🗂️ File Structure

```
sentiment-shield/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker (sets defaults on install)
├── content.js             # DOM scanner + overlay logic
├── overlay.css            # Injected styles for blur + overlay
├── popup.html             # Settings dashboard UI
├── popup.js               # Dashboard logic
├── lib/
│   └── sentiment.js       # Client-side NLP engine
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Real-Time NLP** | Scans posts as you scroll using a lexicon + pattern-matching engine running 100% in your browser |
| **5 Emotion Categories** | Anger, Toxic, Sadness, Fear, Spam — toggle each independently |
| **Warning Overlay** | Blurs blocked posts with an emotion label + "Reveal Anyway" button |
| **Steering Dashboard** | Click the extension icon for a clean settings popup |
| **Whitelist** | Whitelist specific @users or keywords to never be filtered |
| **Stats Counter** | See how many posts were analyzed and blocked in real-time |
| **Supported Sites** | Twitter/X, Reddit (new + old), LinkedIn |

---

## 📦 Installation (Chrome / Edge / Brave)

1. **Download** or clone this folder to your computer
2. Open your browser and go to `chrome://extensions/`
3. Enable **Developer Mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `sentiment-shield` folder
6. The 🛡️ icon will appear in your toolbar — pin it for easy access

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select any file inside the `sentiment-shield` folder

> ⚠️ Firefox temporary add-ons are removed on browser restart. For permanent install, the extension would need to be submitted to AMO (free).

---

## ⚙️ Settings

Click the 🛡️ toolbar icon to open the dashboard:

- **ON/OFF toggle** — Disable the extension without uninstalling
- **Emotion toggles** — Click any emotion card to block/unblock it
- **Whitelist users** — Type `@username` and click `+ User`
- **Whitelist keywords** — Any post containing this word is never filtered
- **Stats** — Analyzed / Blocked / Block Rate (resettable)

---

## 🔒 Privacy

- **Zero network requests** — the NLP runs entirely in your browser
- **No telemetry** — nothing is sent anywhere
- **Storage** — settings saved locally via `chrome.storage.local`
- **Permissions used:**
  - `storage` — save your settings
  - `activeTab` — apply overlays to the current tab
  - Host permissions for Twitter, Reddit, LinkedIn

---

## 🛠️ For Developers

### Add a new site

In `content.js`, add an entry to `SITE_CONFIGS`:

```js
'news.ycombinator.com': {
  postSelector: '.athing',
  textSelector: '.titleline > a',
  authorSelector: '.hnuser',
},
```

### Improve the NLP

Edit `lib/sentiment.js` — add words to any lexicon's `words` array or add regex `patterns`. The engine is entirely self-contained.

### Add a new emotion category

1. Add the lexicon in `lib/sentiment.js`
2. Add color + label in `content.js`
3. Add the card config in `popup.js`'s `EMOTIONS` array

---

## 📄 License

MIT License — free to use, modify, and distribute. No cost, no sign-up, no API key required.

#### Signed Ananta the Developer