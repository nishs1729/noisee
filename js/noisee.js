const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContextClass();
const masterGain = ctx.createGain();
masterGain.connect(ctx.destination);

let sounds = {};

async function toggleSoundPlayback(s) {
  if (ctx.state === "suspended") await ctx.resume();

  if (!s.buf) {
    const ab = await fetch(s.src).then(r => r.arrayBuffer());
    s.buf = await ctx.decodeAudioData(ab);
  }

  if (s.playing) {
    s.node.stop();
    s.playing = false;
    s.playBtn.textContent = "▶";
  } else {
    const src = ctx.createBufferSource();
    src.buffer = s.buf;
    src.loop = true;
    src.connect(s.gain);
    src.start();
    s.node = src;
    s.playing = true;
    s.playBtn.textContent = "⏸";
  }
}

const soundsDef = [
  {id:"rain", icon:"🌧️", name:"Rain",
   src:"assets/sounds/rain.mp3"},
  {id:"river", icon:"🏞️", name:"River",
   src:"assets/sounds/river.mp3"},
  {id:"wind", icon:"🌬️", name:"Wind",
   src:"assets/sounds/wind.mp3"},
  {id:"fire", icon:"🔥", name:"Fire",
   src:"assets/sounds/bonfire.mp3"},
  {id:"birds", icon:"🦜", name:"Birds",
   src:"assets/sounds/birds.mp3"},
  {id:"night-birds", icon:"🦉", name:"Night birds",
   src:"assets/sounds/owl.mp3"},
  {id:"cicada", icon:"🦗", name:"Cicada",
   src:"assets/sounds/cicada.mp3"},
  {id:"sea", icon:"🌊", name:"Sea",
   src:"assets/sounds/sea.mp3"}
];

soundsDef.forEach(s => {
  const volEl = document.getElementById(`vol-${s.id}`);
  const playBtn = document.getElementById(`play-${s.id}`);
  const gain = ctx.createGain();
  gain.gain.value = volEl.value;
  gain.connect(masterGain);

  sounds[s.id] = {...s, gain, buf:null, node:null, playing:false, vol:volEl.value, volEl:volEl, playBtn:playBtn};

  volEl.oninput = () => updateSoundVolume(sounds[s.id], volEl.value);

  playBtn.onclick = () => toggleSoundPlayback(sounds[s.id]);
});

// drag-drop ordering
const list = document.querySelector('.card:nth-of-type(2)'); // Select the second card which contains the sound cards
let dragSrc;
list.addEventListener("dragstart",e=>{
  dragSrc = e.target.closest(".sound-card");
  e.dataTransfer.effectAllowed = "move";
});
list.addEventListener("dragover",e=>{
  e.preventDefault();
  const target = e.target.closest(".sound-card");
  if (target && target !== dragSrc) {
    const rect = target.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > .5;
    list.insertBefore(dragSrc, next && target.nextSibling || target);
  }
});
list.addEventListener("drop",e=>{
  e.preventDefault();
});

document.getElementById("masterVol").oninput=e=>{
  masterGain.gain.value=parseFloat(e.target.value);
};
const playAllBtn = document.getElementById("playAll");
const stopAllBtn = document.getElementById("stopAll");

playAllBtn.onclick = async () => {
  for (const s of Object.values(sounds)) {
    if (!s.playing) {
      await toggleSoundPlayback(s);
    }
  }
};

stopAllBtn.onclick = async () => {
  for (const s of Object.values(sounds)) {
    if (s.playing) {
      await toggleSoundPlayback(s);
    }
  }
};

function updateSoundVolume(s, volume) {
  s.vol = volume;
  s.volEl.value = volume;
  s.gain.gain.value = volume;
}

// === PRESETS ===
const presetSelect=document.getElementById("presetSelect");

for(const name in builtInPresets){
    const opt=document.createElement("option");
    opt.value=name;
    opt.textContent=name;
    presetSelect.appendChild(opt);
}

function applyPreset(p){
  for(const id in sounds){
    if(p[id]!==undefined){
      updateSoundVolume(sounds[id], p[id]);
    }
  }
}

presetSelect.onchange = () => {
    const name = presetSelect.value;
    if(builtInPresets[name]) applyPreset(builtInPresets[name]);
}

applyPreset(builtInPresets[presetSelect.value]);