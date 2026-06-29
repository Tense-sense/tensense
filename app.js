// Application State
const state = {
  currentView: 'essay-select',
  settings: {
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.3-70b-versatile'
  },
  essay: {
    selectedTense: null,
    currentPrompt: '',
    evaluation: null
  }
};

// DOM Elements
const views = {};
const navLogo = document.getElementById('nav-logo');

// Initialize Views
const viewIds = ['essay-select', 'essay-play'];
viewIds.forEach(id => {
  views[id] = document.getElementById(`view-${id}`);
});

// Load Settings from LocalStorage (migration check only)
function loadSettings() {
  const savedModel = localStorage.getItem('grammar_game_model');
  
  if (savedModel === 'llama-3.3-70b-specdec') {
    state.settings.model = 'llama-3.3-70b-versatile';
    localStorage.setItem('grammar_game_model', 'llama-3.3-70b-versatile');
  } else if (savedModel) {
    state.settings.model = savedModel;
  }
}

// View Navigation
function navigateTo(viewId) {
  Object.keys(views).forEach(key => {
    if (key === viewId) {
      views[key].classList.add('active');
    } else {
      views[key].classList.remove('active');
    }
  });
  state.currentView = viewId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navLogo.addEventListener('click', () => navigateTo('essay-select'));

/* --- ESSAY MODE LOGIC --- */

function initEssaySelect() {
  const grid = document.getElementById('tense-selection-grid');
  grid.innerHTML = '';
  
  Object.keys(window.TENSES_DATA).forEach(tenseName => {
    const data = window.TENSES_DATA[tenseName];
    const card = document.createElement('div');
    card.className = 'tense-select-card';
    card.innerHTML = `
      <div class="tense-select-name">${tenseName}</div>
      <div class="tense-select-formula">${data.formula}</div>
      <div class="tense-select-desc">${data.explanation}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.tense-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.essay.selectedTense = tenseName;
      
      // Auto move to writing panel after a brief delay
      setTimeout(() => {
        startEssayPlay(tenseName);
      }, 350);
    });
    grid.appendChild(card);
  });
  
  navigateTo('essay-select');
}

function startEssayPlay(tenseName) {
  state.essay.selectedTense = tenseName;
  document.getElementById('essay-tense-name').textContent = tenseName;
  document.getElementById('essay-tense-formula').textContent = window.TENSES_DATA[tenseName].formula;
  
  // Choose random prompt
  const randomPrompt = window.ESSAY_PROMPTS[Math.floor(Math.random() * window.ESSAY_PROMPTS.length)];
  state.essay.currentPrompt = randomPrompt;
  document.getElementById('essay-prompt-text').textContent = randomPrompt;
  
  // Clear input and outputs
  document.getElementById('essay-user-input').value = '';
  document.getElementById('essay-loading').style.display = 'none';
  document.getElementById('essay-evaluation').style.display = 'none';
  document.getElementById('essay-submit-btn').disabled = false;
  
  navigateTo('essay-play');
}

// Generate new prompt inside writing view
document.getElementById('btn-new-prompt').addEventListener('click', () => {
  const randomPrompt = window.ESSAY_PROMPTS[Math.floor(Math.random() * window.ESSAY_PROMPTS.length)];
  state.essay.currentPrompt = randomPrompt;
  document.getElementById('essay-prompt-text').textContent = randomPrompt;
});

// Essay submission handler
document.getElementById('essay-submit-btn').addEventListener('click', async () => {
  const text = document.getElementById('essay-user-input').value.trim();
  if (!text) {
    alert("Silakan tulis kalimat terlebih dahulu!");
    return;
  }
  
  // Show Loading state
  document.getElementById('essay-submit-btn').disabled = true;
  document.getElementById('essay-loading').style.display = 'flex';
  document.getElementById('essay-evaluation').style.display = 'none';
  
  try {
    const result = await evaluateSentence(state.essay.selectedTense, state.essay.currentPrompt, text);
    result.original = text;
    displayEssayEvaluation(result);
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat memeriksa kalimat: " + err.message);
    document.getElementById('essay-submit-btn').disabled = false;
    document.getElementById('essay-loading').style.display = 'none';
  }
});

// Mock Evaluation when no API Key is provided (Offline Mode)
function getMockEvaluation(tense, prompt, sentence) {
  const lowerSentence = sentence.toLowerCase();
  const lowerPrompt = prompt.toLowerCase();
  
  let correct = true;
  let score = 90;
  let tenseMatch = true;
  let contextMatch = true;
  let explanation = "Penjelasan (Simulasi Offline): Kalimat Anda terlihat bagus secara umum! ";
  let corrected_tense = sentence;
  let suggested_context = sentence;
  let highlightExplanation = "Tidak ada kesalahan yang dideteksi dalam simulasi offline.";

  // Quick word token matching to simulate context match
  // Extract content words from prompt to see if user sentence is completely unrelated
  const promptWords = lowerPrompt.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).filter(w => w.length > 3);
  let overlapCount = 0;
  promptWords.forEach(w => {
    if (lowerSentence.includes(w)) overlapCount++;
  });
  
  // If user sentence is very short, score penalty
  if (sentence.split(/\s+/).length < 3) {
    correct = false;
    score = 40;
    explanation = "Kalimat Anda terlalu pendek untuk dianalisis secara akurat.";
    contextMatch = false;
    suggested_context = "I am studying grammar now.";
  } else if (promptWords.length > 0 && overlapCount === 0) {
    // If absolutely zero overlap with prompt keywords, trigger context warning
    contextMatch = false;
    score = Math.min(score, 70);
    explanation = "Kalimat Anda secara tata bahasa mungkin benar, tetapi tampaknya tidak berkaitan dengan prompt/topik yang diberikan: '" + prompt + "'.";
    suggested_context = "I am writing a response based on the prompt.";
  }

  // Simple heuristic checks for tense formulas to make the mock interactive
  if (tense === "Simple Present") {
    // If contains past time indicators, flag tense match
    if (lowerSentence.includes("yesterday") || lowerSentence.includes("last week") || lowerSentence.includes(" ago")) {
      tenseMatch = false;
      score = Math.min(score, 55);
      explanation = "Tense tidak cocok. Anda menggunakan penanda waktu lampau (seperti 'yesterday' atau 'ago') yang seharusnya tidak digunakan pada Simple Present tense.";
      corrected_tense = sentence.replace(/yesterday|last week/gi, "every day");
      highlightExplanation = "Mengubah penanda waktu lampau menjadi penanda kebiasaan (present habit).";
    }
  } else if (tense === "Present Continuous") {
    const hasIng = lowerSentence.includes("ing");
    const hasBe = lowerSentence.includes("am") || lowerSentence.includes("is") || lowerSentence.includes("are");
    if (!hasIng || !hasBe) {
      tenseMatch = false;
      score = Math.min(score, 50);
      explanation = "Tense tidak cocok. Present Continuous mewajibkan adanya auxiliary verb (am/is/are) diikuti dengan verb-ing.";
      corrected_tense = "I am writing a sentence now.";
      highlightExplanation = "Menambahkan struktur 'am/is/are + verb-ing' untuk kesesuaian tense.";
    }
  } else if (tense === "Simple Past") {
    if (lowerSentence.includes("will") || lowerSentence.includes("tomorrow") || lowerSentence.includes("going to")) {
      tenseMatch = false;
      score = Math.min(score, 50);
      explanation = "Tense tidak cocok. Anda memasukkan indikator masa depan (seperti 'will' atau 'tomorrow') pada tense Simple Past yang seharusnya menjelaskan masa lampau.";
      corrected_tense = sentence.replace(/will|tomorrow/gi, "yesterday");
      highlightExplanation = "Mengubah penanda waktu ke masa lampau.";
    }
  }

  explanation += "\n\n💡 Catatan: Aktifkan API Key di menu Settings (ikon gerigi) untuk penilaian grammar dan kesesuaian konteks prompt secara akurat menggunakan AI.";

  return {
    correct,
    score,
    tenseMatch,
    contextMatch,
    explanation,
    original: sentence,
    corrected_tense,
    suggested_context,
    highlight_explanation: highlightExplanation
  };
};

// Call LLM API (via Vercel or local Python proxy server)
async function evaluateSentence(tense, prompt, sentence) {
  const payload = {
    provider: state.settings.provider,
    apiKey: state.settings.apiKey,
    model: state.settings.model,
    tense: tense,
    prompt: prompt,
    sentence: sentence
  };

  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data;
}

function displayEssayEvaluation(result) {
  document.getElementById('essay-loading').style.display = 'none';
  document.getElementById('essay-submit-btn').disabled = false;
  
  const evalDiv = document.getElementById('essay-evaluation');
  evalDiv.style.display = 'block';
  evalDiv.classList.add('active');
  
  // Radial Score configuration
  const radial = document.getElementById('essay-score-radial');
  radial.textContent = result.score;
  
  radial.className = 'score-radial';
  if (result.score >= 80) {
    radial.classList.add('success');
    document.getElementById('essay-score-title').textContent = "Luar Biasa!";
    if (result.tenseMatch && result.contextMatch && result.score === 100) {
      launchConfetti();
    }
  } else if (result.score >= 50) {
    radial.classList.add('warning');
    document.getElementById('essay-score-title').textContent = "Cukup Bagus!";
  } else {
    radial.classList.add('danger');
    document.getElementById('essay-score-title').textContent = "Perlu Perbaikan";
  }
  
  // Update Tense Match Badge
  const tenseBadge = document.getElementById('eval-tense-match-badge');
  if (result.tenseMatch) {
    tenseBadge.className = 'status-badge success';
    tenseBadge.textContent = "Sesuai";
  } else {
    tenseBadge.className = 'status-badge danger';
    tenseBadge.textContent = "Tidak Sesuai";
  }

  // Update Context Match Badge
  const contextBadge = document.getElementById('eval-context-match-badge');
  if (result.contextMatch) {
    contextBadge.className = 'status-badge success';
    contextBadge.textContent = "Sesuai";
  } else {
    contextBadge.className = 'status-badge danger';
    contextBadge.textContent = "Tidak Sesuai";
  }
  
  // Update explanation
  document.getElementById('eval-explanation').textContent = result.explanation;
  
  // Handle correction diff
  const diffSection = document.getElementById('eval-diff-section');
  const hasErrors = !result.tenseMatch || !result.contextMatch || result.score < 100;
  
  if (!hasErrors) {
    diffSection.style.display = 'none';
  } else {
    diffSection.style.display = 'block';
    
    // Tense Correction Block
    const tenseBlock = document.getElementById('eval-tense-correction-block');
    if (result.tenseMatch && result.original === result.corrected_tense) {
      tenseBlock.style.display = 'none';
    } else {
      tenseBlock.style.display = 'block';
      const diffContainer = document.getElementById('eval-diff-container');
      diffContainer.innerHTML = `
        <div><span class="diff-original">${result.original}</span></div>
        <div style="margin-top:0.4rem"><span class="diff-corrected">${result.corrected_tense || result.corrected || ''}</span></div>
      `;
    }
    
    // Context Recommendation Block
    const contextBlock = document.getElementById('eval-context-recommendation-block');
    if (result.contextMatch) {
      contextBlock.style.display = 'none';
    } else {
      contextBlock.style.display = 'block';
      const contextContainer = document.getElementById('eval-context-recommendation-container');
      contextContainer.textContent = result.suggested_context || 'Coba gunakan topik yang sesuai dengan prompt.';
    }
    
    document.getElementById('eval-diff-explanation').textContent = result.highlight_explanation || 'Tidak ada keterangan perbaikan.';
  }
}

// Back buttons handlers
document.getElementById('btn-back-essay-play').addEventListener('click', () => {
  navigateTo('essay-select');
});

/* --- CONFETTI ANIMATION --- */

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  let particles = [];
  const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#f43f5e'];
  
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }
  
  let active = true;
  setTimeout(() => {
    active = false;
  }, 4000); // Stop drawing after 4 seconds
  
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let hasVisibleParticles = false;
    
    particles.forEach((p, idx) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;
      
      if (p.y <= canvas.height) {
        hasVisibleParticles = true;
      }
      
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    
    if (active && hasVisibleParticles) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  draw();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, { once: true });
}

// App Init
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initEssaySelect();
});
