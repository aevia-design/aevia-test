// Blind comparison page with a vote per row (S199). Used by compare-luna.js and rebuild.js.
// sections: [{ id, thumbs: [base64], A: [caption], B: [caption], C?: [caption] }] — 2 or 3 columns
// Votes autosave in the browser; "Copy results" gives JSON to paste back to Claude, who
// un-blinds it with key.json. The page itself never knows which side is which.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

module.exports = function render(sections, runId) {
  const cols = sections[0].C ? ['A', 'B', 'C'] : ['A', 'B'];
  // Tick every column you would use; 'Neither' clears the others (and vice versa).
  const CHOICES = [...cols.map(c => [c, c]), ['neither', 'Neither']];
  return `<!doctype html><meta charset="utf-8"><title>Caption comparison</title>
<style>
body{font:15px/1.4 system-ui;margin:24px auto;max-width:1100px;padding:0 16px;color:#222;background:#fff}
table{border-collapse:collapse;width:100%;margin-bottom:32px}
td{border-top:1px solid #ddd;padding:8px;vertical-align:middle}td:first-child{width:120px}
img{max-width:110px}th{text-align:left}
.v{white-space:nowrap}.v label{display:inline-block;border:1px solid #ccc;border-radius:4px;padding:4px 8px;margin:2px;cursor:pointer;font-size:13px}
.v input{display:none}.v input:checked+span{font-weight:700}
.v label:has(input:checked){background:#222;color:#fff;border-color:#222}
tr.done td{background:#f6f6f4}
#bar{position:sticky;top:0;background:#fff;padding:10px 0;border-bottom:1px solid #ddd;z-index:1}
button{font:inherit;padding:6px 14px;cursor:pointer}
@media(max-width:700px){body{margin:12px auto}table{table-layout:fixed}td{padding:6px 4px;overflow-wrap:anywhere}td:first-child{width:70px}.v label{padding:4px 2px}img{max-width:64px}.v{white-space:normal}.v label{display:block;text-align:center}}
</style>
<div id="bar"><b>Caption comparison</b> · <span id="count"></span>
 <button id="copy">Copy results</button> <button id="reset">Clear votes</button></div>
<p>Each book was captioned in order, so later captions see the earlier ones. Columns are shuffled
per book. Tick every caption you'd use, or Neither; votes save automatically. When done, press <b>Copy results</b> and paste to Claude.</p>
${sections.map(s => `<h2>${s.id}</h2><table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}<th>Your pick</th></tr>
${s.thumbs.map((t, i) => {
    const name = `${s.id}-${i}`;
    return `<tr data-row="${name}"><td><img src="data:image/jpeg;base64,${t}"></td>${cols.map(c => `<td>${esc(s[c][i])}</td>`).join('')}
<td class="v">${CHOICES.map(([v, l]) => `<label><input type="checkbox" name="${name}" value="${v}"><span>${l}</span></label>`).join('')}</td></tr>`;
  }).join('')}</table>`).join('')}
<script>
const KEY = 'caption-votes-${runId}';
let votes = {};
try { votes = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
const rows = [...document.querySelectorAll('tr[data-row]')];
function paint() {
  rows.forEach(r => r.classList.toggle('done', !!votes[r.dataset.row]));
  document.getElementById('count').textContent = Object.keys(votes).length + ' / ' + rows.length + ' rows voted';
}
for (const [name, v] of Object.entries(votes)) {
  [].concat(v).forEach(x => { const el = document.querySelector('input[name="' + name + '"][value="' + x + '"]'); if (el) el.checked = true; });
}
document.addEventListener('change', e => {
  if (e.target.type !== 'checkbox') return;
  const boxes = [...document.querySelectorAll('input[name="' + e.target.name + '"]')];
  if (e.target.checked) boxes.forEach(b => {
    if (b !== e.target && (e.target.value === 'neither' || b.value === 'neither')) b.checked = false;
  });
  const picked = boxes.filter(b => b.checked).map(b => b.value);
  if (picked.length) votes[e.target.name] = picked; else delete votes[e.target.name];
  try { localStorage.setItem(KEY, JSON.stringify(votes)); } catch (err) {}
  paint();
});
document.getElementById('copy').onclick = async () => {
  const out = JSON.stringify({ run: '${runId}', votes });
  try { await navigator.clipboard.writeText(out); alert('Copied ' + Object.keys(votes).length + ' votes.'); }
  catch (e) { prompt('Copy this:', out); }
};
document.getElementById('reset').onclick = () => {
  if (!confirm('Clear all votes?')) return;
  votes = {}; try { localStorage.removeItem(KEY); } catch (e) {}
  document.querySelectorAll('input[type=checkbox]').forEach(i => i.checked = false); paint();
};
paint();
</script>`;
};
