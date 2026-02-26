
(function(global) {
  'use strict';

  // Emotion Lexicons

  const LEXICONS = {
    anger: {
      words: [
        'angry','anger','furious','rage','outraged','infuriated','livid','enraged',
        'mad','pissed','hate','despise','loathe','disgusted','furiously','hatred',
        'violent','attack','destroy','kill','murder','idiots','morons','stupid',
        'ridiculous','absurd','pathetic','worthless','garbage','trash','screw',
        'damn','hell','crap','bastard','jerk','asshole','idiot','fool','dumb',
        'worst','terrible','horrible','awful','disgusting','revolting','vile',
        'infuriating','maddening','outrageous','unacceptable','intolerable'
      ],
      patterns: [
        /\bwtf\b/i, /\bffs\b/i, /\bstfu\b/i, /!{2,}/, /[A-Z]{4,}/,
        /\bso\s+stupid\b/i, /\bcan'?t\s+stand\b/i, /\bdone\s+with\b/i
      ],
      weight: 1.0
    },
    sadness: {
      words: [
        'sad','sadness','depressed','depression','hopeless','hopelessness','grief',
        'grieve','mourning','mourn','cry','crying','tears','weep','heartbroken',
        'devastated','miserable','suffering','pain','lonely','alone','empty',
        'worthless','failure','failed','lost','give up','giving up','no hope',
        'never gets better','why bother','pointless','meaningless','numb',
        'exhausted','drained','broken','shattered','crushed','defeated','helpless',
        'despair','despairing','unfortunate','tragic','tragedy','terrible loss',
        'miss','missing','gone','never coming back','rip','passed away'
      ],
      patterns: [
        /\b(i|we)\s+(can'?t|cannot)\s+go\s+on\b/i,
        /\bno\s+(one|point|reason)\b/i,
        /\bwish\s+i\s+was(n'?t)?\b/i
      ],
      weight: 0.9
    },
    toxic: {
      words: [
        'toxic','toxicity','harassment','harass','bully','bullying','abuse','abusive',
        'racist','racism','sexist','sexism','bigot','bigotry','nazi','fascist',
        'slur','slurs','dehumanize','dehumanizing','threaten','threat','stalk',
        'doxx','doxxing','manipulate','manipulative','gaslight','gaslighting',
        'narcissist','predator','groomer','exploit','exploitation','coerce',
        'intimidate','discrimination','xenophobia','homophobia','transphobia',
        'misogyny','misogynist','incel','conspiracy','extremist','radicalize'
      ],
      patterns: [
        /\bkill\s+yourself\b/i, /\byou\s+should\s+(die|suffer)\b/i,
        /\bgo\s+(to\s+hell|f+\s*yourself)\b/i,
        /\b(n|f)[\*\-]word\b/i
      ],
      weight: 1.5
    },
    fear: {
      words: [
        'afraid','fear','scared','terrified','panic','anxiety','anxious','worried',
        'worry','dread','dreading','nightmare','horror','horrifying','alarming',
        'threatening','dangerous','unsafe','crisis','catastrophe','disaster',
        'emergency','warning','alert','beware','caution','hazard','risk',
        'threat','imminent','attack','invasion','collapse','apocalypse','doomed'
      ],
      patterns: [
        /\boh\s+no\b/i, /\bthis\s+is\s+(bad|terrible|awful)\b/i,
        /\bwe'?re\s+(all\s+)?doomed\b/i
      ],
      weight: 0.8
    },
    spam: {
      words: [
        'click here','buy now','limited offer','act now','exclusive deal',
        'free money','make money','earn cash','work from home','guaranteed',
        'no risk','100% free','click the link','subscribe now','follow back',
        'dm me','check my bio','check bio','promo code','use code','discount'
      ],
      patterns: [
        /\b(https?:\/\/\S+){3,}/,
        /\$\d+[\s\/]+(hour|day|week|month)/i,
        /\b\d{3}[-%]\s*(off|discount)\b/i,
        /\bfollow\s+(me|for\s+follow)\b/i
      ],
      weight: 0.7
    }
  };

  const POSITIVE_BOOSTERS = [
    'very','extremely','incredibly','absolutely','totally','completely',
    'utterly','seriously','deeply','profoundly','massively','hugely'
  ];

  const NEGATION_WORDS = [
    "not","no","never","neither","nor","without","hardly","barely","scarcely",
    "don't","doesn't","didn't","isn't","aren't","wasn't","weren't","can't",
    "cannot","couldn't","won't","wouldn't","shouldn't","haven't","hasn't","hadn't"
  ];

  // Tokenizer

  function tokenize(text) {
    return text.toLowerCase()
      .replace(/['']/g, "'")
      .replace(/[^\w\s'!?]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  // Core Analysis

  function analyzeText(text) {
    if (!text || text.trim().length < 5) {
      return { sentiment: 'neutral', emotions: {}, score: 0, confidence: 0 };
    }

    const tokens = tokenize(text);
    const scores = {};
    let totalScore = 0;

    // Check Emotion Lexicons
    for (const [emotion, lexicon] of Object.entries(LEXICONS)) {
      let emotionScore = 0;

      // Word Matching w/ Negation Context
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (lexicon.words.includes(token)) {
          // Check for Negation
          let negated = false;
          for (let j = Math.max(0, i - 3); j < i; j++) {
            if (NEGATION_WORDS.includes(tokens[j])) {
              negated = true;
              break;
            }
          }
          // Check for Intensifiers
          let intensity = 1.0;
          if (i > 0 && POSITIVE_BOOSTERS.includes(tokens[i - 1])) {
            intensity = 1.5;
          }
          emotionScore += negated ? -0.3 : (1.0 * intensity);
        }
      }

      // Pattern Matching
      for (const pattern of lexicon.patterns) {
        if (pattern.test(text)) {
          emotionScore += 2.0;
        }
      }

      // Apply Weight & Normalize Text Length
      const lengthFactor = Math.min(1, tokens.length / 20);
      const normalizedScore = (emotionScore * lexicon.weight) / Math.max(1, tokens.length / 10);
      scores[emotion] = Math.max(0, normalizedScore);
      totalScore += scores[emotion];
    }

    // Determine Dominant Emotion
    const dominantEmotion = totalScore > 0
      ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
      : null;

    const threshold = 0.15;
    const isNegative = totalScore > threshold;

    return {
      sentiment: isNegative ? 'negative' : 'neutral',
      emotions: scores,
      dominantEmotion: dominantEmotion ? dominantEmotion[0] : null,
      dominantScore: dominantEmotion ? dominantEmotion[1] : 0,
      totalScore,
      confidence: Math.min(1, totalScore / 2),
      text: text.slice(0, 100)
    };
  }

  // Export

  global.SentimentEngine = { analyzeText, tokenize };

})(typeof window !== 'undefined' ? window : this);