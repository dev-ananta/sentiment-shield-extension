chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      enabled: true,
      blockedEmotions: {
        anger: true,
        toxic: true,
        fear: false,
        sadness: false,
        spam: false,
      },
      whitelist: { users: [], keyqwords: [] },
      analyzed: 0,
      blocked: 0,
    });
    console.log('[Sentiment Shield] Installed w/ Default Settings');
  }
});