/**
 * Noisee - Ambient Sound Studio
 * Vanilla JavaScript Audio Engine & UI Controller
 */

(() => {
  'use strict';

  // --- Sound Definitions ---
  const SOUNDS_DEF = [
    { id: 'rain', icon: '🌧️', name: 'Rain', src: 'assets/sounds/rain.mp3', defaultVol: 0.6 },
    { id: 'river', icon: '🏞️', name: 'River', src: 'assets/sounds/river.mp3', defaultVol: 0.5 },
    { id: 'wind', icon: '🌬️', name: 'Wind', src: 'assets/sounds/wind.mp3', defaultVol: 0.4 },
    { id: 'fire', icon: '🔥', name: 'Fire', src: 'assets/sounds/bonfire.mp3', defaultVol: 0.7 },
    { id: 'birds', icon: '🦜', name: 'Birds', src: 'assets/sounds/birds.mp3', defaultVol: 0.5 },
    { id: 'night-birds', icon: '🦉', name: 'Night Birds', src: 'assets/sounds/owl.mp3', defaultVol: 0.4 },
    { id: 'cicada', icon: '🦗', name: 'Cicada', src: 'assets/sounds/cicada.mp3', defaultVol: 0.3 },
    { id: 'sea', icon: '🌊', name: 'Sea', src: 'assets/sounds/sea.mp3', defaultVol: 0.6 }
  ];

  // --- Built-in Presets ---
  const BUILTIN_PRESETS = {
    'Cozy Fireplace': { fire: 0.7, cicada: 0.3, 'night-birds': 0.35, wind: 0.15 },
    'Gentle Rain': { rain: 0.6, wind: 0.15 },
    'Rainy Night': { rain: 0.75, river: 0.3, wind: 0.25, cicada: 0.2 },
    'Tropical Beach': { sea: 0.75, birds: 0.8, river: 0.3, wind: 0.15 },
    'Thunderstorm': { rain: 0.9, wind: 0.75, river: 0.4 },
    'Summer Night': { cicada: 0.8, 'night-birds': 0.6, fire: 0.35, river: 0.2 },
    'Forest Campfire': { fire: 0.85, birds: 0.6, cicada: 0.5, 'night-birds': 0.35 },
    'Windy River': { river: 0.85, wind: 0.45 },
    'Beach Day': { sea: 0.8, birds: 0.5, wind: 0.2 },
    'Night Swamp': { cicada: 0.85, 'night-birds': 0.6, river: 0.5, sea: 0.15 }
  };

  // --- State ---
  let audioCtx = null;
  let masterGain = null;
  let analyserNode = null;
  let sounds = {};
  let customPresets = {};
  let activeMixCache = [];
  let isMuted = false;
  let prevVolume = 0.5;
  let sleepTimerInterval = null;
  let sleepTimerEndsAt = null;
  let sleepTimerDurationSec = 0;
  let pomodoroInterval = null;
  let pomodoroTimeLeft = 25 * 60;
  let pomodoroMode = 'work'; // 'work' or 'break'

  // --- LocalStorage Keys ---
  const LS_VOL = 'noisee_master_vol';
  const LS_ORDER = 'noisee_sound_order';
  const LS_CUSTOM_PRESETS = 'noisee_custom_presets';

  // --- Helper: Get or Init Audio Context ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();

      masterGain = audioCtx.createGain();
      const savedMasterVol = localStorage.getItem(LS_VOL);
      const initVol = savedMasterVol !== null ? parseFloat(savedMasterVol) : 0.5;
      masterGain.gain.setValueAtTime(initVol, audioCtx.currentTime);

      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.8;

      masterGain.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      initVisualizer();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // --- Sound Playback Controller ---
  async function toggleSound(s, forceState = null) {
    const ctx = getAudioContext();
    const shouldPlay = forceState !== null ? forceState : !s.playing;

    if (shouldPlay === s.playing) return;

    if (shouldPlay) {
      if (!s.buffer) {
        s.playBtn.classList.add('loading');
        try {
          const resp = await fetch(s.src);
          const buf = await resp.arrayBuffer();
          s.buffer = await ctx.decodeAudioData(buf);
        } catch (err) {
          console.error(`Failed to load audio for ${s.name}:`, err);
          showToast(`Error loading ${s.name}`);
          s.playBtn.classList.remove('loading');
          return;
        } finally {
          s.playBtn.classList.remove('loading');
        }
      }

      const srcNode = ctx.createBufferSource();
      srcNode.buffer = s.buffer;
      srcNode.loop = true;
      srcNode.connect(s.gain);
      srcNode.start(0);

      s.node = srcNode;
      s.playing = true;
      s.cardEl.classList.add('active');
      s.playBtn.innerHTML = getIconSvg('pause');
      s.playBtn.setAttribute('aria-label', `Pause ${s.name}`);
    } else {
      if (s.node) {
        try {
          s.node.stop();
          s.node.disconnect();
        } catch (e) {
          // Ignore already stopped nodes
        }
        s.node = null;
      }
      s.playing = false;
      s.cardEl.classList.remove('active');
      s.playBtn.innerHTML = getIconSvg('play');
      s.playBtn.setAttribute('aria-label', `Play ${s.name}`);
    }

    updateMasterDeckState();
  }

  function setSoundVolume(s, vol, updateSlider = true) {
    vol = Math.max(0, Math.min(1, parseFloat(vol)));
    s.vol = vol;
    if (s.gain && audioCtx) {
      s.gain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.03);
    }
    if (updateSlider && s.sliderEl) {
      s.sliderEl.value = vol;
      updateSliderFill(s.sliderEl);
    }
    if (s.volTextEl) {
      s.volTextEl.textContent = `${Math.round(vol * 100)}%`;
    }
  }

  // --- Master Volume & Controls ---
  function setMasterVolume(vol) {
    vol = Math.max(0, Math.min(1, parseFloat(vol)));
    const masterSlider = document.getElementById('masterVolume');
    const masterVolText = document.getElementById('masterVolPct');
    const muteBtn = document.getElementById('btnMute');

    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.02);
    }
    if (masterSlider) {
      masterSlider.value = vol;
      updateSliderFill(masterSlider);
    }
    if (masterVolText) {
      masterVolText.textContent = `${Math.round(vol * 100)}%`;
    }

    if (vol === 0) {
      isMuted = true;
      muteBtn.innerHTML = getIconSvg('volume-x');
    } else {
      isMuted = false;
      muteBtn.innerHTML = vol > 0.5 ? getIconSvg('volume-2') : getIconSvg('volume-1');
      prevVolume = vol;
      localStorage.setItem(LS_VOL, vol);
    }
  }

  function toggleMasterMute() {
    getAudioContext();
    if (isMuted) {
      setMasterVolume(prevVolume > 0 ? prevVolume : 0.5);
    } else {
      prevVolume = parseFloat(document.getElementById('masterVolume').value) || 0.5;
      setMasterVolume(0);
    }
  }

  function getActiveSounds() {
    return Object.values(sounds).filter(s => s.playing);
  }

  async function toggleMasterPlay() {
    getAudioContext();
    const active = getActiveSounds();

    if (active.length > 0) {
      // Pause all currently playing and save them in activeMixCache
      activeMixCache = active.map(s => s.id);
      for (const s of active) {
        await toggleSound(s, false);
      }
    } else {
      // Resume previously cached mix, or sounds with volume > 0
      let toPlayIds = activeMixCache.length > 0
        ? activeMixCache
        : Object.values(sounds).filter(s => s.vol > 0).map(s => s.id);

      if (toPlayIds.length === 0) {
        toPlayIds = ['rain', 'wind']; // Friendly default fallback
      }

      for (const id of toPlayIds) {
        if (sounds[id]) {
          await toggleSound(sounds[id], true);
        }
      }
    }
    updateMasterDeckState();
  }

  async function stopAllSounds() {
    for (const s of Object.values(sounds)) {
      if (s.playing) {
        await toggleSound(s, false);
      }
    }
    activeMixCache = [];
    updateMasterDeckState();
  }

  function updateMasterDeckState() {
    const active = getActiveSounds();
    const masterPlayBtn = document.getElementById('btnMasterPlay');
    const masterStatus = document.getElementById('masterStatus');
    const visualizerBox = document.querySelector('.visualizer-container');
    const visualizerText = document.getElementById('visualizerStatusText');

    if (active.length > 0) {
      masterPlayBtn.classList.add('playing');
      masterPlayBtn.innerHTML = getIconSvg('pause-large');
      masterPlayBtn.setAttribute('aria-label', 'Pause Master Mix');
      masterStatus.textContent = `${active.length} sound${active.length === 1 ? '' : 's'} playing`;
      visualizerBox.classList.add('playing');
      visualizerText.textContent = 'Active Soundscape';
    } else {
      masterPlayBtn.classList.remove('playing');
      masterPlayBtn.innerHTML = getIconSvg('play-large');
      masterPlayBtn.setAttribute('aria-label', 'Play Master Mix');
      masterStatus.textContent = 'Ready to play';
      visualizerBox.classList.remove('playing');
      visualizerText.textContent = 'Quiet';
    }
  }

  // --- Slider Fill Effect ---
  function updateSliderFill(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 1;
    const val = parseFloat(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #38bdf8 0%, #818cf8 ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%, rgba(255, 255, 255, 0.1) 100%)`;
  }

  // --- Visualizer ---
  function initVisualizer() {
    const canvas = document.getElementById('visualizerCanvas');
    if (!canvas || !analyserNode) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function resize() {
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    let waveOffset = 0;

    function render() {
      requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const hasActive = getActiveSounds().length > 0;

      if (hasActive) {
        analyserNode.getByteFrequencyData(dataArray);

        const barCount = 48;
        const barWidth = width / barCount;
        const grad = ctx.createLinearGradient(0, height, width, 0);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#818cf8');
        grad.addColorStop(1, '#c084fc');

        ctx.fillStyle = grad;

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const val = dataArray[index] / 255;
          const barHeight = Math.max(4, val * (height * 0.85));
          const x = i * barWidth;
          const y = (height - barHeight) / 2;

          ctx.beginPath();
          ctx.roundRect(x + 2, y, Math.max(1, barWidth - 4), barHeight, 4);
          ctx.fill();
        }
      } else {
        // Resting ambient breathing wave
        waveOffset += 0.02;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.015 + waveOffset) * (8 * window.devicePixelRatio);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    render();
  }

  // --- Presets System ---
  function loadCustomPresets() {
    try {
      const stored = localStorage.getItem(LS_CUSTOM_PRESETS);
      customPresets = stored ? JSON.parse(stored) : {};
    } catch (e) {
      customPresets = {};
    }
  }

  function saveCustomPresets() {
    localStorage.setItem(LS_CUSTOM_PRESETS, JSON.stringify(customPresets));
  }

  function populatePresetSelect() {
    const select = document.getElementById('presetSelect');
    select.innerHTML = '<option value="" disabled selected>Select a Preset...</option>';

    const builtinGroup = document.createElement('optgroup');
    builtinGroup.label = 'Built-in Presets';
    for (const name in BUILTIN_PRESETS) {
      const opt = document.createElement('option');
      opt.value = `builtin:${name}`;
      opt.textContent = name;
      builtinGroup.appendChild(opt);
    }
    select.appendChild(builtinGroup);

    if (Object.keys(customPresets).length > 0) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = 'Custom Presets';
      for (const name in customPresets) {
        const opt = document.createElement('option');
        opt.value = `custom:${name}`;
        opt.textContent = name;
        customGroup.appendChild(opt);
      }
      select.appendChild(customGroup);
    }
  }

  async function applyPreset(presetData, autoPlay = true) {
    getAudioContext();
    for (const id in sounds) {
      const targetVol = presetData[id] !== undefined ? presetData[id] : 0;
      setSoundVolume(sounds[id], targetVol);

      if (autoPlay) {
        if (targetVol > 0) {
          await toggleSound(sounds[id], true);
        } else {
          await toggleSound(sounds[id], false);
        }
      }
    }
  }

  function saveCurrentAsPreset() {
    const active = Object.values(sounds).filter(s => s.vol > 0);
    if (active.length === 0) {
      showToast('Set at least one sound volume before saving!');
      return;
    }

    const name = prompt('Name your custom mix preset:');
    if (!name || !name.trim()) return;

    const presetName = name.trim();
    const config = {};
    for (const s of Object.values(sounds)) {
      if (s.vol > 0) {
        config[s.id] = s.vol;
      }
    }

    customPresets[presetName] = config;
    saveCustomPresets();
    populatePresetSelect();

    const select = document.getElementById('presetSelect');
    select.value = `custom:${presetName}`;
    showToast(`Preset "${presetName}" saved!`);
  }

  function randomizeMix() {
    getAudioContext();
    const soundList = Object.values(sounds);
    // Pick 2 to 4 random sounds
    const count = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...soundList].sort(() => 0.5 - Math.random());
    const chosen = shuffled.slice(0, count);

    for (const s of soundList) {
      if (chosen.includes(s)) {
        const randomVol = Math.round((0.25 + Math.random() * 0.55) * 100) / 100;
        setSoundVolume(s, randomVol);
        toggleSound(s, true);
      } else {
        setSoundVolume(s, 0);
        toggleSound(s, false);
      }
    }

    document.getElementById('presetSelect').value = '';
    showToast(`🎲 Generated balanced ${count}-sound ambient mix`);
  }

  // --- URL Hash Share / Import ---
  function getShareUrl() {
    const params = [];
    for (const s of Object.values(sounds)) {
      if (s.playing && s.vol > 0) {
        params.push(`${s.id}=${Math.round(s.vol * 100)}`);
      }
    }
    const masterVol = Math.round((parseFloat(document.getElementById('masterVolume').value) || 0.5) * 100);
    params.push(`master=${masterVol}`);

    const url = new URL(window.location.href);
    url.hash = params.join('&');
    return url.toString();
  }

  function copyShareLink() {
    const url = getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 Soundscape link copied to clipboard!');
      }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('🔗 Soundscape link copied to clipboard!');
  }

  function loadMixFromHash() {
    if (!window.location.hash || window.location.hash.length < 2) return false;
    const hash = window.location.hash.substring(1);
    const pairs = hash.split('&');
    const mixData = {};
    let masterV = null;

    pairs.forEach(pair => {
      const [k, v] = pair.split('=');
      if (k === 'master') {
        masterV = parseInt(v, 10) / 100;
      } else if (v !== undefined) {
        mixData[k] = parseInt(v, 10) / 100;
      }
    });

    if (masterV !== null && !isNaN(masterV)) {
      setMasterVolume(masterV);
    }

    if (Object.keys(mixData).length > 0) {
      applyPreset(mixData, true);
      showToast('Loaded shared soundscape mix');
      return true;
    }
    return false;
  }

  // --- Timers Suite (Sleep Timer & Pomodoro) ---
  function startSleepTimer(minutes, fadeOut = true) {
    clearInterval(sleepTimerInterval);
    const durationMs = minutes * 60 * 1000;
    sleepTimerDurationSec = minutes * 60;
    sleepTimerEndsAt = Date.now() + durationMs;

    const timerStatusBadge = document.getElementById('timerStatusBadge');
    timerStatusBadge.style.display = 'inline-flex';
    document.getElementById('sleepCountdownDisplay').style.display = 'block';

    const initialMasterVol = parseFloat(document.getElementById('masterVolume').value) || 0.5;

    sleepTimerInterval = setInterval(() => {
      const remainingMs = sleepTimerEndsAt - Date.now();
      if (remainingMs <= 0) {
        clearInterval(sleepTimerInterval);
        stopAllSounds();
        setMasterVolume(initialMasterVol);
        timerStatusBadge.style.display = 'none';
        document.getElementById('sleepCountdownDisplay').style.display = 'none';
        showToast('🌙 Sleep timer finished. All sounds stopped.');
        return;
      }

      const remainingSec = Math.ceil(remainingMs / 1000);
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      const formatted = `${m}:${s < 10 ? '0' : ''}${s}`;

      document.getElementById('sleepTimeRemaining').textContent = formatted;
      document.getElementById('timerBadgeText').textContent = formatted;

      // Smooth fade-out in final 30 seconds
      if (fadeOut && remainingSec <= 30) {
        const factor = remainingSec / 30;
        setMasterVolume(initialMasterVol * factor);
      }
    }, 1000);

    showToast(`🌙 Sleep timer set for ${minutes} minute${minutes === 1 ? '' : 's'}`);
  }

  function cancelSleepTimer() {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
      document.getElementById('timerStatusBadge').style.display = 'none';
      document.getElementById('sleepCountdownDisplay').style.display = 'none';
      showToast('Sleep timer cancelled');
    }
  }

  function startPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(() => {
      pomodoroTimeLeft--;
      updatePomodoroDisplay();

      if (pomodoroTimeLeft <= 0) {
        playChime();
        if (pomodoroMode === 'work') {
          pomodoroMode = 'break';
          pomodoroTimeLeft = 5 * 60;
          showToast('☕ Focus session finished! Take a 5-minute break.');
        } else {
          pomodoroMode = 'work';
          pomodoroTimeLeft = 25 * 60;
          showToast('🎯 Break over! Time to focus.');
        }
      }
    }, 1000);
    document.getElementById('btnStartPomodoro').textContent = 'Pause Focus';
  }

  function pausePomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    document.getElementById('btnStartPomodoro').textContent = 'Resume Focus';
  }

  function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    pomodoroMode = 'work';
    pomodoroTimeLeft = 25 * 60;
    updatePomodoroDisplay();
    document.getElementById('btnStartPomodoro').textContent = 'Start Focus';
  }

  function updatePomodoroDisplay() {
    const m = Math.floor(pomodoroTimeLeft / 60);
    const s = pomodoroTimeLeft % 60;
    const formatted = `${m}:${s < 10 ? '0' : ''}${s}`;
    document.getElementById('pomodoroTimeDigits').textContent = formatted;
    document.getElementById('pomodoroModeLabel').textContent = pomodoroMode === 'work' ? 'Focus Session' : 'Rest Break';
  }

  function playChime() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      // Audio context might be restricted
    }
  }

  // --- Drag and Drop Reordering ---
  function initDragAndDrop() {
    const grid = document.getElementById('soundsGrid');
    let draggedCard = null;

    grid.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.sound-card');
      if (!card) return;
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });

    grid.addEventListener('dragend', () => {
      if (draggedCard) {
        draggedCard.classList.remove('dragging');
        draggedCard = null;
      }
      grid.querySelectorAll('.sound-card').forEach(c => c.classList.remove('drag-over'));
      saveSoundOrder();
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const targetCard = e.target.closest('.sound-card');
      if (!targetCard || targetCard === draggedCard) return;

      const rect = targetCard.getBoundingClientRect();
      const isNext = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      grid.insertBefore(draggedCard, isNext ? targetCard.nextSibling : targetCard);
    });

    grid.addEventListener('dragenter', (e) => {
      const targetCard = e.target.closest('.sound-card');
      if (targetCard && targetCard !== draggedCard) {
        targetCard.classList.add('drag-over');
      }
    });

    grid.addEventListener('dragleave', (e) => {
      const targetCard = e.target.closest('.sound-card');
      if (targetCard) {
        targetCard.classList.remove('drag-over');
      }
    });
  }

  function saveSoundOrder() {
    const order = Array.from(document.querySelectorAll('.sound-card')).map(c => c.dataset.id);
    localStorage.setItem(LS_ORDER, JSON.stringify(order));
  }

  function applySavedOrder() {
    try {
      const stored = localStorage.getItem(LS_ORDER);
      if (!stored) return;
      const order = JSON.parse(stored);
      const grid = document.getElementById('soundsGrid');
      order.forEach(id => {
        const card = grid.querySelector(`.sound-card[data-id="${id}"]`);
        if (card) {
          grid.appendChild(card);
        }
      });
    } catch (e) {
      console.warn('Failed to load saved order:', e);
    }
  }

  // --- Toast Notifications ---
  function showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }

  // --- SVG Icons Provider ---
  function getIconSvg(name) {
    const icons = {
      'play': '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      'pause': '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      'play-large': '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>',
      'pause-large': '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      'volume-2': '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
      'volume-1': '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
      'volume-x': '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
      'grip': '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"></circle><circle cx="15" cy="6" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="9" cy="18" r="1.5"></circle><circle cx="15" cy="18" r="1.5"></circle></svg>'
    };
    return icons[name] || '';
  }

  // --- App Initialization ---
  function initApp() {
    const ctx = getAudioContext();
    loadCustomPresets();

    // Sound elements binding
    SOUNDS_DEF.forEach(def => {
      const cardEl = document.querySelector(`.sound-card[data-id="${def.id}"]`);
      if (!cardEl) return;

      const playBtn = cardEl.querySelector('.btn-track-play');
      const sliderEl = cardEl.querySelector('.sound-vol-slider');
      const volTextEl = cardEl.querySelector('.track-vol-text');
      const handleEl = cardEl.querySelector('.drag-handle');

      if (handleEl) {
        handleEl.innerHTML = getIconSvg('grip');
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(def.defaultVol, ctx.currentTime);
      gain.connect(masterGain);

      sounds[def.id] = {
        ...def,
        gain,
        buffer: null,
        node: null,
        playing: false,
        vol: def.defaultVol,
        cardEl,
        playBtn,
        sliderEl,
        volTextEl
      };

      // Events
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound(sounds[def.id]);
      });

      sliderEl.addEventListener('input', (e) => {
        setSoundVolume(sounds[def.id], e.target.value, false);
        updateSliderFill(e.target);
      });

      // Quick-click card (except on controls) toggles sound
      cardEl.addEventListener('click', (e) => {
        if (!e.target.closest('input') && !e.target.closest('button')) {
          toggleSound(sounds[def.id]);
        }
      });

      updateSliderFill(sliderEl);
    });

    applySavedOrder();
    initDragAndDrop();

    // Master controls
    const masterSlider = document.getElementById('masterVolume');
    const masterVolText = document.getElementById('masterVolPct');
    const savedMasterVol = localStorage.getItem(LS_VOL);
    const initialMasterVol = savedMasterVol !== null ? parseFloat(savedMasterVol) : 0.5;

    masterSlider.value = initialMasterVol;
    masterVolText.textContent = `${Math.round(initialMasterVol * 100)}%`;
    updateSliderFill(masterSlider);

    masterSlider.addEventListener('input', (e) => {
      setMasterVolume(e.target.value);
    });

    document.getElementById('btnMute').addEventListener('click', toggleMasterMute);
    document.getElementById('btnMasterPlay').addEventListener('click', toggleMasterPlay);
    document.getElementById('btnStopAll').addEventListener('click', stopAllSounds);
    document.getElementById('btnRandomize').addEventListener('click', randomizeMix);
    document.getElementById('btnShareMix').addEventListener('click', copyShareLink);
    document.getElementById('btnSavePreset').addEventListener('click', saveCurrentAsPreset);

    // Preset selector
    populatePresetSelect();
    const presetSelect = document.getElementById('presetSelect');
    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value;
      if (val.startsWith('builtin:')) {
        const name = val.replace('builtin:', '');
        if (BUILTIN_PRESETS[name]) {
          applyPreset(BUILTIN_PRESETS[name], true);
          showToast(`Applied preset: ${name}`);
        }
      } else if (val.startsWith('custom:')) {
        const name = val.replace('custom:', '');
        if (customPresets[name]) {
          applyPreset(customPresets[name], true);
          showToast(`Applied custom preset: ${name}`);
        }
      }
    });

    // Modals setup
    initModals();

    // Keyboard shortcuts
    initKeyboardShortcuts();

    // Try loading shared hash mix
    loadMixFromHash();

    // Register Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('ServiceWorker registered with scope:', reg.scope);
        }).catch((err) => {
          console.warn('ServiceWorker registration failed:', err);
        });
      });
    }
  }

  // --- Modal Logic ---
  function initModals() {
    const timerModal = document.getElementById('timerModal');
    const shortcutsModal = document.getElementById('shortcutsModal');

    document.getElementById('btnOpenTimer').addEventListener('click', () => {
      timerModal.classList.add('open');
    });

    document.getElementById('btnOpenShortcuts').addEventListener('click', () => {
      shortcutsModal.classList.add('open');
    });


    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el || e.target.closest('.modal-close')) {
          timerModal.classList.remove('open');
          shortcutsModal.classList.remove('open');
        }
      });
    });

    // Modal Tabs (Sleep vs Pomodoro)
    const tabs = document.querySelectorAll('.modal-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        document.getElementById(targetId).classList.add('active');
      });
    });

    // Sleep Timer Preset Buttons
    let selectedSleepMinutes = 30;
    document.querySelectorAll('.timer-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSleepMinutes = parseInt(btn.dataset.min, 10);
        document.getElementById('customSleepMinutes').value = '';
      });
    });

    document.getElementById('customSleepMinutes').addEventListener('input', (e) => {
      document.querySelectorAll('.timer-pill-btn').forEach(b => b.classList.remove('active'));
      selectedSleepMinutes = parseInt(e.target.value, 10) || 0;
    });

    document.getElementById('btnStartSleepTimer').addEventListener('click', () => {
      const customVal = parseInt(document.getElementById('customSleepMinutes').value, 10);
      const mins = customVal > 0 ? customVal : selectedSleepMinutes;
      if (mins > 0) {
        const fadeOut = document.getElementById('chkSleepFadeOut').checked;
        startSleepTimer(mins, fadeOut);
        timerModal.classList.remove('open');
      }
    });

    document.getElementById('btnCancelSleepTimer').addEventListener('click', () => {
      cancelSleepTimer();
    });

    // Pomodoro Controls
    document.getElementById('btnStartPomodoro').addEventListener('click', () => {
      if (pomodoroInterval) {
        pausePomodoro();
      } else {
        startPomodoro();
      }
    });

    document.getElementById('btnResetPomodoro').addEventListener('click', resetPomodoro);
  }

  // --- Keyboard Shortcuts ---
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger when inside inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleMasterPlay();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMasterMute();
      } else if (e.key === 'r' || e.key === 'R') {
        randomizeMix();
      } else if (e.key === 's' || e.key === 'S') {
        stopAllSounds();
      } else if (e.key === 't' || e.key === 'T') {
        const modal = document.getElementById('timerModal');
        modal.classList.toggle('open');
      } else if (e.key === '?') {
        const modal = document.getElementById('shortcutsModal');
        modal.classList.toggle('open');
      } else if (e.key >= '1' && e.key <= '8') {
        const index = parseInt(e.key, 10) - 1;
        if (SOUNDS_DEF[index] && sounds[SOUNDS_DEF[index].id]) {
          toggleSound(sounds[SOUNDS_DEF[index].id]);
        }
      }
    });
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
