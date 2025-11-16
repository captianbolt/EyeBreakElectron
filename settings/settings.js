const $ = id => document.getElementById(id);
async function load(){
  const s = await window.api.loadSettings();
  $('workMin').value = s.workMin ?? 20;
  $('breakSec').value = s.breakSec ?? 20;
  $('volume').value = s.volume ?? 0.9;
  $('breakBeeps').value = s.breakBeeps ?? 10;
  $('beepGapMs').value = s.beepGapMs ?? 160;
  $('beepDurMs').value = s.beepDurMs ?? 320;
  $('beepFreq').value = s.beepFreq ?? 1500;
  $('waveform').value = s.waveform || 'square';
  $('loopBreakBeep').checked = !!s.loopBreakBeep;
  updateStatus();
}
function collect(){
  return {
    workMin: Number($('workMin').value || 20),
    breakSec: Number($('breakSec').value || 20),
    volume: Number($('volume').value || 0.9),
    breakBeeps: Number($('breakBeeps').value || 10),
    beepGapMs: Number($('beepGapMs').value || 160),
    beepDurMs: Number($('beepDurMs').value || 320),
    beepFreq: Number($('beepFreq').value || 1500),
    waveform: String($('waveform').value || 'square'),
    loopBreakBeep: $('loopBreakBeep').checked
  };
}
async function save(){ await window.api.saveSettings(collect()); }
async function start(){ await save(); await window.api.start(); updateStatus(); }
async function pause(){ await window.api.pause(); updateStatus(); }
async function updateStatus(){ const s = await window.api.status(); $('status').textContent = `Mode: ${s.mode.toUpperCase()} • Remain: ${Math.floor(s.remain/60)}:${String(s.remain%60).padStart(2,'0')}`; setTimeout(updateStatus,1000); }
document.getElementById('save').addEventListener('click', save);
document.getElementById('start').addEventListener('click', start);
document.getElementById('pause').addEventListener('click', pause);
load();
