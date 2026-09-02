/* =========================================================
   PRAGYA COACHING — OMR Sheet Builder
   ========================================================= */
const OMR = (() => {

  function getCount(){
    const sel = document.getElementById('omr-count');
    if(sel.value === 'custom') return Math.max(1, Math.min(300, Number(document.getElementById('omr-customCount').value) || 60));
    return Number(sel.value);
  }

  // Choose a column/row layout that fits neatly on an A4 page.
  function computeLayout(count){
    let cols;
    if(count <= 20) cols = 1;
    else if(count <= 40) cols = 2;
    else if(count <= 60) cols = 3;
    else if(count <= 80) cols = 4;
    else cols = 5;
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  }

  function buildColumns(count, cols){
    // column-major numbering, like a real OMR sheet (1..rows in col 1, then continue in col 2, ...)
    const rows = Math.ceil(count / cols);
    const columns = Array.from({length: cols}, () => []);
    let n = 1;
    for(let c = 0; c < cols; c++){
      for(let r = 0; r < rows; r++){
        if(n > count) break;
        columns[c].push(n);
        n++;
      }
    }
    return columns;
  }

  function renderSheet(){
    const testName = document.getElementById('omr-testname').value.trim() || 'Practice Test';
    const setCode = document.getElementById('omr-setcode').value;
    const count = getCount();
    const { cols } = computeLayout(count);
    const columns = buildColumns(count, cols);
    const letters = ['A','B','C','D'];

    const gridHtml = columns.map(colNums => `
      <div class="omr-col">
        ${colNums.map(n => `
          <div class="omr-row">
            <span class="omr-qno">${n}.</span>
            <div class="omr-bubbles">
              ${letters.map(l => `<span class="omr-bub">${l}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    document.getElementById('omrSheet').innerHTML = `
      <div class="omr-head">
        <div class="omr-logo">प्र</div>
        <div class="omr-head-text">
          <h2>PRAGYA COACHING</h2>
          <p>${escapeAttr(testName)} — OMR Answer Sheet · ${count} Questions</p>
        </div>
        <div class="omr-setcode">SET<br><span style="font-size:15px;">${setCode}</span><small>Booklet Code</small></div>
      </div>

      <div class="omr-fields">
        <div class="of"><b>Student Name:</b></div>
        <div class="of"><b>Roll Number:</b></div>
        <div class="of"><b>Class:</b></div>
        <div class="of"><b>Date:</b></div>
        <div class="of"><b>Test Name:</b> ${escapeAttr(testName)}</div>
        <div class="of"><b>Set / Booklet:</b> ${setCode}</div>
      </div>

      <div class="omr-instructions">
        <b>Instructions:</b> Use a blue/black ball-point pen only. Darken the circle completely for the chosen option (A, B, C or D). Do not use whitener. One question has exactly one correct answer.
      </div>

      <div class="omr-grid">${gridHtml}</div>

      <div class="omr-sign">
        <div>Student Signature</div>
        <div>Invigilator Signature</div>
      </div>
      <div class="omr-foot-note">Pragya Coaching · Smart Test Builder &amp; Assessment System</div>
    `;
  }

  function escapeAttr(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function printSheet(){
    renderSheet();
    setTimeout(() => window.print(), 80);
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      if(document.querySelector(`script[src="${src}"]`)){ resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function exportPdf(){
    App.toast('Preparing PDF…');
    renderSheet();
    try{
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const sheet = document.getElementById('omrSheet');
      const canvas = await html2canvas(sheet, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const testName = document.getElementById('omr-testname').value.trim() || 'omr-sheet';
      pdf.save(testName.replace(/[^a-z0-9]+/gi,'-').toLowerCase() + '.pdf');
      App.toast('PDF downloaded', 'ok');
    }catch(err){
      console.error(err);
      App.toast('Could not generate PDF — check your internet connection', 'err');
    }
  }

  function init(){
    document.getElementById('omr-count').addEventListener('change', (e) => {
      document.getElementById('omr-customCountField').style.display = e.target.value === 'custom' ? '' : 'none';
      renderSheet();
    });
    ['omr-testname','omr-setcode','omr-customCount'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderSheet);
    });
    document.getElementById('btnOmrPreview').addEventListener('click', renderSheet);
    document.getElementById('btnOmrPrint').addEventListener('click', printSheet);
    document.getElementById('btnOmrPdf').addEventListener('click', exportPdf);
    renderSheet();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { refresh: renderSheet };
})();
window.OMR = OMR;
