const params = new URLSearchParams(location.search);
let secs = Math.max(1, parseInt(params.get('secs') || '20', 10));
const clock = document.getElementById('clock');
const fmt = (n) => String(n).padStart(2,'0');

let audioCtx, masterGain, active = false, ids = [];
function initAudio(volume){
  const C = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx){ audioCtx = new C(); masterGain = audioCtx.createGain(); masterGain.connect(audioCtx.destination); }
  masterGain.gain.value = volume;
}
function beep({duration=320,freq=1500,waveform='square'}){
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = waveform; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(masterGain.gain.value, audioCtx.currentTime + 0.02);
    o.connect(g); g.connect(masterGain); o.start();
    setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05); o.stop(audioCtx.currentTime + 0.08); }, duration);
  } catch {}
}
function startLoop(s){
  if (active) return; active = true; initAudio(s.volume);
  const cycle = () => {
    let i = 0;
    const once = () => {
      if (!active) return;
      beep({ duration: s.beepDurMs, freq: s.beepFreq, waveform: s.waveform });
      if (++i < s.breakBeeps) { ids.push(setTimeout(once, s.beepDurMs + s.beepGapMs)); }
      else if (s.loopBreakBeep) { ids.push(setTimeout(cycle, Math.max(200, s.beepGapMs))); }
      else { active = false; }
    };
    once();
  };
  cycle();
}
function stopLoop(){ active = false; while(ids.length) clearTimeout(ids.pop()); }
document.getElementById('stop').addEventListener('click', stopLoop);

function tick(){
  clock.textContent = `00:${fmt(secs)}`; secs -= 1;
  if (secs < 0){ stopLoop(); window.api.breakDone(); }
  else { setTimeout(tick, 1000); }
}
(async function init(){
  const s = await window.api.loadSettings();
  const st = {
    volume: Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):0.9,
    breakBeeps: s.breakBeeps ?? 10, beepGapMs: s.beepGapMs ?? 160, beepDurMs: s.beepDurMs ?? 320,
    beepFreq: s.beepFreq ?? 1500, waveform: s.waveform || 'square', loopBreakBeep: !!s.loopBreakBeep
  };
  clock.textContent = `00:${fmt(secs)}`; startLoop(st); setTimeout(tick, 1000);
})();
