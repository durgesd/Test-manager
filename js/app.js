/* =========================================================
   PRAGYA COACHING — Smart Test Builder
   Core app: state, storage, router, dashboard, builder, bank, settings
   ========================================================= */

const App = (() => {

  /* ---------------------------------------------------------
     Storage keys & in-memory state
  --------------------------------------------------------- */
  const LS_TESTS    = 'pragya_tests_v1';
  const LS_BANK     = 'pragya_bank_v1';
  const LS_SETTINGS = 'pragya_settings_v1';
  const LS_DRAFT    = 'pragya_draft_v1';

  const state = {
    tests: [],
    bank: [],
    settings: { theme: 'light' },
    currentTest: null,     // test object currently open in the builder
    editingQuestionId: null,
    navodayaSection: 'Mental Ability',
    navodayaCustomName: '',
    bankPickerSelection: new Set(),
    view: 'dashboard'
  };

  /* ---------------------------------------------------------
     Utilities
  --------------------------------------------------------- */
  function uid(prefix){ return (prefix||'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function escapeHtml(str){
    if(str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function debounce(fn, ms){
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function compressImage(dataUrl, maxW){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW||900) / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function toast(msg, type){
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function confirmDialog(title, msg){
    return new Promise(resolve => {
      const backdrop = document.getElementById('confirmBackdrop');
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMsg').textContent = msg;
      backdrop.classList.add('open');
      const ok = document.getElementById('confirmOk');
      const cancel = document.getElementById('confirmCancel');
      function cleanup(result){
        backdrop.classList.remove('open');
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
    });
  }

  function fmtDate(ts){
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }

  function downloadFile(filename, content, mime){
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------------------------------------------------------
     Persistence
  --------------------------------------------------------- */
  function loadAll(){
    try{ state.tests = JSON.parse(localStorage.getItem(LS_TESTS)) || []; }catch(e){ state.tests = []; }
    try{ state.bank  = JSON.parse(localStorage.getItem(LS_BANK))  || []; }catch(e){ state.bank = []; }
    try{ state.settings = Object.assign({theme:'light'}, JSON.parse(localStorage.getItem(LS_SETTINGS)) || {}); }catch(e){ state.settings = {theme:'light'}; }
  }
  function saveTests(){ localStorage.setItem(LS_TESTS, JSON.stringify(state.tests)); }
  function saveBank(){ localStorage.setItem(LS_BANK, JSON.stringify(state.bank)); }
  function saveSettings(){ localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings)); }
  function saveDraft(){ localStorage.setItem(LS_DRAFT, JSON.stringify(state.currentTest)); }
  function loadDraft(){ try{ return JSON.parse(localStorage.getItem(LS_DRAFT)); }catch(e){ return null; } }

  const autosaveDraft = debounce(() => {
    saveDraft();
    const note = document.getElementById('autosaveNote');
    if(note){ note.textContent = 'Draft saved ' + new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
  }, 500);

  /* ---------------------------------------------------------
     Blank test / question factories
  --------------------------------------------------------- */
  function blankTest(category){
    return {
      id: uid('test'),
      category: category || 'general',
      title: '', subject: '', chapter: '', section: '',
      difficulty: 'Medium', duration: 60,
      defaultMarks: 1, defaultNeg: 0,
      randomizeQ: false, randomizeO: false, showExplain: true,
      questions: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }

  function blankQuestion(){
    return {
      id: uid('q'), text: '', image: '',
      options: [{text:'',image:''},{text:'',image:''},{text:'',image:''},{text:'',image:''}],
      correctIndex: 0,
      marks: null, negMarks: null,
      subject: '', chapter: '', difficulty: 'Medium',
      explanation: '', section: ''
    };
  }

  /* ---------------------------------------------------------
     ROUTER
  --------------------------------------------------------- */
  const viewMeta = {
    dashboard: { title:'Dashboard', sub:'An overview of your tests, question bank and activity.' },
    builder:   { title:'Test Builder', sub:'Create MCQ tests with exactly four options — A, B, C, D.' },
    navodaya:  { title:'Navodaya / JNVST Generator', sub:'Mental Ability, Arithmetic, Language and Custom sections.' },
    bank:      { title:'Question Bank', sub:'Search, filter and reuse questions across tests.' },
    omr:       { title:'OMR Sheet Builder', sub:'Printable, exam-style A4 OMR answer sheets.' },
    export:    { title:'Student Test Export', sub:'Generate a standalone, offline HTML test file.' },
    settings:  { title:'Settings', sub:'Appearance, backup and data management.' }
  };

  function goto(view){
    state.view = view;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    document.getElementById('viewTitle').textContent = viewMeta[view].title;
    document.getElementById('viewSubtitle').textContent = viewMeta[view].sub;
    closeSidebarMobile();
    if(view === 'dashboard') renderDashboard();
    if(view === 'bank') renderBank();
    if(view === 'navodaya') renderNavodayaList();
    if(view === 'export') renderExportView();
    if(view === 'omr' && window.OMR) window.OMR.refresh();
    window.scrollTo({top:0, behavior:'instant'});
  }

  function closeSidebarMobile(){
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('show');
  }

  /* ---------------------------------------------------------
     DASHBOARD
  --------------------------------------------------------- */
  function renderDashboard(){
    const totalTests = state.tests.length;
    const totalQ = state.tests.reduce((s,t) => s + t.questions.length, 0) + state.bank.length;
    const navodayaCount = state.tests.filter(t => t.category === 'navodaya').length;
    const totalMinutes = state.tests.reduce((s,t) => s + (Number(t.duration)||0), 0);

    document.getElementById('statRow').innerHTML = `
      <div class="stat-card"><div class="stat-num">${totalTests}</div><div class="stat-label">Saved tests</div></div>
      <div class="stat-card"><div class="stat-num">${totalQ}</div><div class="stat-label">Questions (tests + bank)</div></div>
      <div class="stat-card"><div class="stat-num">${navodayaCount}</div><div class="stat-label">Navodaya papers</div></div>
      <div class="stat-card"><div class="stat-num">${totalMinutes}</div><div class="stat-label">Total exam minutes planned</div></div>
    `;

    const recent = [...state.tests].sort((a,b) => b.updatedAt - a.updatedAt).slice(0,5);
    document.getElementById('recentTests').innerHTML = recent.length ? recent.map(t => `
      <div class="list-row">
        <div class="lr-main">
          <strong>${escapeHtml(t.title || 'Untitled test')}</strong>
          <span>${escapeHtml(t.subject||'—')} · ${t.questions.length} questions · updated ${fmtDate(t.updatedAt)}</span>
        </div>
        <div class="lr-actions">
          <button class="btn btn-ghost btn-sm" data-open-test="${t.id}">Open</button>
        </div>
      </div>
    `).join('') : `<p class="muted-note">No tests yet — start with “New test”.</p>`;

    const bySubject = {};
    state.tests.forEach(t => t.questions.forEach(q => {
      const s = (q.subject || t.subject || 'Unspecified').trim() || 'Unspecified';
      bySubject[s] = (bySubject[s]||0) + 1;
    }));
    state.bank.forEach(q => {
      const s = (q.subject || 'Unspecified').trim() || 'Unspecified';
      bySubject[s] = (bySubject[s]||0) + 1;
    });
    const entries = Object.entries(bySubject).sort((a,b) => b[1]-a[1]).slice(0,7);
    const max = entries.length ? entries[0][1] : 1;
    document.getElementById('subjectBars').innerHTML = entries.length ? entries.map(([name,count]) => `
      <div class="bar-item">
        <span class="bar-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/max*100).toFixed(0)}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>
    `).join('') : `<p class="muted-note">Add questions to see the subject breakdown.</p>`;

    document.querySelectorAll('[data-open-test]').forEach(b => b.addEventListener('click', () => {
      openExistingTest(b.dataset.openTest);
    }));
    document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));
  }

  /* ---------------------------------------------------------
     BUILDER — meta form binding
  --------------------------------------------------------- */
  const metaFieldMap = {
    'f-title':'title', 'f-subject':'subject', 'f-chapter':'chapter', 'f-section':'section',
    'f-difficulty':'difficulty', 'f-duration':'duration', 'f-defmarks':'defaultMarks', 'f-defneg':'defaultNeg'
  };

  function bindMetaForm(){
    Object.entries(metaFieldMap).forEach(([id, key]) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        let v = el.value;
        if(['duration','defaultMarks','defaultNeg'].includes(key)) v = v === '' ? 0 : Number(v);
        state.currentTest[key] = v;
        state.currentTest.updatedAt = Date.now();
        autosaveDraft();
      });
    });
    ['f-randomizeQ','f-randomizeO','f-showExplain'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        const key = id === 'f-randomizeQ' ? 'randomizeQ' : id === 'f-randomizeO' ? 'randomizeO' : 'showExplain';
        state.currentTest[key] = e.target.checked;
        autosaveDraft();
      });
    });
  }

  function fillMetaForm(t){
    document.getElementById('f-title').value = t.title || '';
    document.getElementById('f-subject').value = t.subject || '';
    document.getElementById('f-chapter').value = t.chapter || '';
    document.getElementById('f-section').value = t.section || '';
    document.getElementById('f-difficulty').value = t.difficulty || 'Medium';
    document.getElementById('f-duration').value = t.duration || 60;
    document.getElementById('f-defmarks').value = t.defaultMarks ?? 1;
    document.getElementById('f-defneg').value = t.defaultNeg ?? 0;
    document.getElementById('f-randomizeQ').checked = !!t.randomizeQ;
    document.getElementById('f-randomizeO').checked = !!t.randomizeO;
    document.getElementById('f-showExplain').checked = t.showExplain !== false;
    document.getElementById('sectionField').style.display = t.category === 'navodaya' ? 'none' : '';
    document.getElementById('builderCategoryPill').textContent = t.category === 'navodaya' ? 'Navodaya / JNVST' : 'General';
    document.getElementById('builderPanelTitle').textContent = t.category === 'navodaya' ? 'Navodaya paper details' : 'Test details';
  }

  function openNewTest(category){
    state.currentTest = blankTest(category);
    fillMetaForm(state.currentTest);
    renderQuestionList();
    goto('builder');
  }

  function openExistingTest(testId){
    const t = state.tests.find(x => x.id === testId);
    if(!t) return;
    state.currentTest = JSON.parse(JSON.stringify(t));
    fillMetaForm(state.currentTest);
    renderQuestionList();
    goto('builder');
  }

  /* ---------------------------------------------------------
     BUILDER — question list
  --------------------------------------------------------- */
  const letters = ['A','B','C','D'];

  function renderQuestionList(){
    const list = document.getElementById('questionList');
    const qs = state.currentTest.questions;
    document.getElementById('qCountBadge').textContent = qs.length;
    if(!qs.length){
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M4 19.5V17l10-10 2.5 2.5-10 10H4z"/></svg>
        <p>No questions yet. Add your first MCQ — every question always has exactly 4 options (A–D).</p>
      </div>`;
      return;
    }
    list.innerHTML = qs.map((q, i) => `
      <div class="qcard" draggable="true" data-qid="${q.id}" data-index="${i}">
        <div class="qcard-top">
          <div class="qcard-num">${i+1}</div>
          <div class="qcard-body">
            <div class="qcard-text">${escapeHtml(q.text) || '<em>(empty question text)</em>'}${q.image ? `<img src="${q.image}" alt="">` : ''}</div>
            <div class="qcard-opts">
              ${q.options.map((o,idx) => `<span class="${idx===q.correctIndex?'opt-correct':''}">${letters[idx]}. ${escapeHtml(o.text)||'—'}</span>`).join('')}
            </div>
            <div class="qcard-meta">
              <span class="tag">${q.marks ?? state.currentTest.defaultMarks} marks</span>
              ${(q.negMarks ?? state.currentTest.defaultNeg) > 0 ? `<span class="tag">−${q.negMarks ?? state.currentTest.defaultNeg} neg</span>` : ''}
              <span class="tag">${escapeHtml(q.difficulty||'Medium')}</span>
              ${q.section ? `<span class="tag correct">${escapeHtml(q.section)}</span>` : ''}
              ${q.subject ? `<span class="tag">${escapeHtml(q.subject)}</span>` : ''}
            </div>
          </div>
          <div class="qcard-actions">
            <button class="icon-btn" title="Move up" data-act="up"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
            <button class="icon-btn" title="Move down" data-act="down"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
            <button class="icon-btn" title="Duplicate" data-act="dup"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
            <button class="icon-btn" title="Edit" data-act="edit"><svg viewBox="0 0 24 24"><path d="M4 19.5V17l10-10 2.5 2.5-10 10H4z"/></svg></button>
            <button class="icon-btn" title="Delete" data-act="del"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7m2 0-.7 12a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7"/></svg></button>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.qcard').forEach(card => {
      const qid = card.dataset.qid;
      card.querySelector('[data-act="edit"]').addEventListener('click', () => openQuestionModal(qid));
      card.querySelector('[data-act="del"]').addEventListener('click', async () => {
        if(await confirmDialog('Delete question?', 'This cannot be undone.')){
          state.currentTest.questions = state.currentTest.questions.filter(q => q.id !== qid);
          renderQuestionList(); autosaveDraft();
        }
      });
      card.querySelector('[data-act="dup"]').addEventListener('click', () => {
        const idx = state.currentTest.questions.findIndex(q => q.id === qid);
        const copy = JSON.parse(JSON.stringify(state.currentTest.questions[idx]));
        copy.id = uid('q');
        state.currentTest.questions.splice(idx+1, 0, copy);
        renderQuestionList(); autosaveDraft();
        toast('Question duplicated');
      });
      card.querySelector('[data-act="up"]').addEventListener('click', () => moveQuestion(qid, -1));
      card.querySelector('[data-act="down"]').addEventListener('click', () => moveQuestion(qid, 1));

      card.addEventListener('dragstart', () => card.classList.add('dragging'));
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); commitDomOrder(); });
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = list.querySelector('.dragging');
      if(!dragging) return;
      const after = [...list.querySelectorAll('.qcard:not(.dragging)')].find(el => {
        const r = el.getBoundingClientRect();
        return e.clientY < r.top + r.height/2;
      });
      if(after) list.insertBefore(dragging, after); else list.appendChild(dragging);
    });
  }

  function commitDomOrder(){
    const ids = [...document.querySelectorAll('#questionList .qcard')].map(c => c.dataset.qid);
    state.currentTest.questions.sort((a,b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    renderQuestionList();
    autosaveDraft();
  }

  function moveQuestion(qid, dir){
    const qs = state.currentTest.questions;
    const i = qs.findIndex(q => q.id === qid);
    const j = i + dir;
    if(j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    renderQuestionList(); autosaveDraft();
  }

  /* ---------------------------------------------------------
     BUILDER — question modal (add/edit)
  --------------------------------------------------------- */
  function renderOptionsEditor(q){
    const grid = document.getElementById('optionsEditor');
    grid.innerHTML = q.options.map((o, idx) => `
      <div class="opt-edit ${idx===q.correctIndex?'is-correct':''}" data-idx="${idx}">
        <div class="opt-edit-head">
          <span class="opt-letter">${letters[idx]}</span>
          <label class="opt-radio-row">
            <input type="radio" name="correctOpt" ${idx===q.correctIndex?'checked':''} data-correct-radio="${idx}">
            Correct answer
          </label>
        </div>
        <input type="text" placeholder="Option ${letters[idx]} text" data-opt-text="${idx}" value="${escapeHtml(o.text)}">
        <input type="file" accept="image/*" data-opt-image="${idx}">
        <div class="img-preview" data-opt-preview="${idx}">${o.image ? `<img src="${o.image}">` : ''}</div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-correct-radio]').forEach(r => r.addEventListener('change', () => {
      currentEditQuestion.correctIndex = Number(r.dataset.correctRadio);
      grid.querySelectorAll('.opt-edit').forEach((el,i) => el.classList.toggle('is-correct', i === currentEditQuestion.correctIndex));
    }));
    grid.querySelectorAll('[data-opt-text]').forEach(inp => inp.addEventListener('input', () => {
      currentEditQuestion.options[Number(inp.dataset.optText)].text = inp.value;
    }));
    grid.querySelectorAll('[data-opt-image]').forEach(inp => inp.addEventListener('change', async () => {
      const idx = Number(inp.dataset.optImage);
      const file = inp.files[0];
      if(!file) return;
      const raw = await fileToDataURL(file);
      const compressed = await compressImage(raw, 500);
      currentEditQuestion.options[idx].image = compressed;
      grid.querySelector(`[data-opt-preview="${idx}"]`).innerHTML = `<img src="${compressed}">`;
    }));
  }

  let currentEditQuestion = null;

  function openQuestionModal(qid){
    modalSaveTarget = 'test';
    const isNavodaya = state.currentTest.category === 'navodaya';
    if(qid){
      currentEditQuestion = JSON.parse(JSON.stringify(state.currentTest.questions.find(q => q.id === qid)));
      document.getElementById('qModalTitle').textContent = 'Edit question';
    } else {
      currentEditQuestion = blankQuestion();
      currentEditQuestion.subject = state.currentTest.subject;
      currentEditQuestion.chapter = state.currentTest.chapter;
      if(isNavodaya) currentEditQuestion.section = state.navodayaSection === 'Custom' ? (state.navodayaCustomName || 'Custom') : state.navodayaSection;
      document.getElementById('qModalTitle').textContent = 'Add question';
    }
    state.editingQuestionId = qid || null;

    document.getElementById('q-text').value = currentEditQuestion.text || '';
    document.getElementById('q-image-preview').innerHTML = currentEditQuestion.image ? `<img src="${currentEditQuestion.image}">` : '';
    document.getElementById('q-marks').value = currentEditQuestion.marks ?? state.currentTest.defaultMarks ?? 1;
    document.getElementById('q-negmarks').value = currentEditQuestion.negMarks ?? state.currentTest.defaultNeg ?? 0;
    document.getElementById('q-subject').value = currentEditQuestion.subject || '';
    document.getElementById('q-chapter').value = currentEditQuestion.chapter || '';
    document.getElementById('q-difficulty').value = currentEditQuestion.difficulty || 'Medium';
    document.getElementById('q-explanation').value = currentEditQuestion.explanation || '';

    renderOptionsEditor(currentEditQuestion);
    document.getElementById('qModalBackdrop').classList.add('open');
  }

  function closeQuestionModal(){
    document.getElementById('qModalBackdrop').classList.remove('open');
    currentEditQuestion = null;
  }

  function saveQuestionFromModal(){
    if(!currentEditQuestion) return;
    currentEditQuestion.text = document.getElementById('q-text').value.trim();
    currentEditQuestion.marks = document.getElementById('q-marks').value === '' ? null : Number(document.getElementById('q-marks').value);
    currentEditQuestion.negMarks = document.getElementById('q-negmarks').value === '' ? null : Number(document.getElementById('q-negmarks').value);
    currentEditQuestion.subject = document.getElementById('q-subject').value.trim();
    currentEditQuestion.chapter = document.getElementById('q-chapter').value.trim();
    currentEditQuestion.difficulty = document.getElementById('q-difficulty').value;
    currentEditQuestion.explanation = document.getElementById('q-explanation').value.trim();

    if(!currentEditQuestion.text){ toast('Question text is required', 'err'); return; }
    if(currentEditQuestion.options.some(o => !o.text.trim())){ toast('All 4 options (A–D) need text', 'err'); return; }

    const qs = state.currentTest.questions;
    if(state.editingQuestionId){
      const idx = qs.findIndex(q => q.id === state.editingQuestionId);
      qs[idx] = currentEditQuestion;
    } else {
      qs.push(currentEditQuestion);
    }
    state.currentTest.updatedAt = Date.now();
    renderQuestionList();
    autosaveDraft();
    closeQuestionModal();
    toast('Question saved', 'ok');
  }

  document.addEventListener('change', async (e) => {
    if(e.target && e.target.id === 'q-image'){
      const file = e.target.files[0];
      if(!file || !currentEditQuestion) return;
      const raw = await fileToDataURL(file);
      const compressed = await compressImage(raw, 900);
      currentEditQuestion.image = compressed;
      document.getElementById('q-image-preview').innerHTML = `<img src="${compressed}">`;
    }
  });

  /* ---------------------------------------------------------
     BUILDER — save / export / preview / clear
  --------------------------------------------------------- */
  function saveCurrentTest(){
    const t = state.currentTest;
    if(!t.title.trim()){ toast('Give the test a title before saving', 'err'); return; }
    if(!t.questions.length){ toast('Add at least one question before saving', 'err'); return; }
    t.updatedAt = Date.now();
    const idx = state.tests.findIndex(x => x.id === t.id);
    if(idx >= 0) state.tests[idx] = JSON.parse(JSON.stringify(t));
    else state.tests.push(JSON.parse(JSON.stringify(t)));
    saveTests();
    toast('Test saved: ' + t.title, 'ok');
    refreshExportTestOptions();
  }

  function exportCurrentTestJson(){
    const t = state.currentTest;
    downloadFile((t.title || 'pragya-test').replace(/[^a-z0-9]+/gi,'-').toLowerCase() + '.json', JSON.stringify(t, null, 2), 'application/json');
  }

  function clearCurrentTest(){
    confirmDialog('Clear this test?', 'All unsaved changes in the builder will be discarded.').then(ok => {
      if(!ok) return;
      state.currentTest = blankTest(state.currentTest.category);
      fillMetaForm(state.currentTest);
      renderQuestionList();
      saveDraft();
      toast('Builder cleared');
    });
  }

  function renderTestPreviewHtml(t){
    return `
      <div style="font-family:var(--font-body);">
        <h2 style="font-family:var(--font-display);margin-bottom:2px;">${escapeHtml(t.title||'Untitled test')}</h2>
        <p class="muted-note" style="margin-bottom:16px;">${escapeHtml(t.subject||'')} ${t.chapter ? '· '+escapeHtml(t.chapter):''} · ${t.duration} min · ${t.questions.length} questions</p>
        ${t.questions.map((q,i) => `
          <div style="margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border-soft);">
            <p style="font-weight:600;">${i+1}. ${escapeHtml(q.text)}</p>
            ${q.image ? `<img src="${q.image}" style="max-width:100%;max-height:200px;border-radius:8px;margin:8px 0;">` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
              ${q.options.map((o,idx) => `
                <div style="padding:8px 10px;border:1px solid ${idx===q.correctIndex?'var(--green)':'var(--border)'};border-radius:8px;background:${idx===q.correctIndex?'var(--green-soft)':'transparent'};font-size:13px;">
                  <strong>${letters[idx]}.</strong> ${escapeHtml(o.text)} ${o.image ? `<br><img src="${o.image}" style="max-width:100px;max-height:70px;border-radius:6px;margin-top:4px;">` : ''}
                </div>
              `).join('')}
            </div>
            ${q.explanation ? `<p class="muted-note" style="margin-top:8px;"><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function openPreview(){
    document.getElementById('previewModalBody').innerHTML = renderTestPreviewHtml(state.currentTest);
    document.getElementById('previewModalBackdrop').classList.add('open');
  }

  /* ---------------------------------------------------------
     NAVODAYA VIEW
  --------------------------------------------------------- */
  function renderNavodayaList(){
    const navTests = state.tests.filter(t => t.category === 'navodaya').sort((a,b) => b.updatedAt - a.updatedAt);
    document.getElementById('navodayaTestList').innerHTML = navTests.length ? navTests.map(t => {
      const sections = [...new Set(t.questions.map(q => q.section).filter(Boolean))];
      return `
      <div class="list-row">
        <div class="lr-main">
          <strong>${escapeHtml(t.title || 'Untitled paper')}</strong>
          <span>${t.questions.length} questions · sections: ${sections.map(escapeHtml).join(', ') || '—'} · updated ${fmtDate(t.updatedAt)}</span>
        </div>
        <div class="lr-actions">
          <button class="btn btn-ghost btn-sm" data-open-test="${t.id}">Open</button>
        </div>
      </div>`;
    }).join('') : `<p class="muted-note">No Navodaya papers yet.</p>`;

    document.querySelectorAll('#navodayaTestList [data-open-test]').forEach(b => b.addEventListener('click', () => openExistingTest(b.dataset.openTest)));
  }

  /* ---------------------------------------------------------
     QUESTION BANK
  --------------------------------------------------------- */
  function renderBank(){
    const search = document.getElementById('bankSearch').value.trim().toLowerCase();
    const fSubject = document.getElementById('bankFilterSubject').value;
    const fDiff = document.getElementById('bankFilterDifficulty').value;

    const subjects = [...new Set(state.bank.map(q => q.subject).filter(Boolean))].sort();
    const sel = document.getElementById('bankFilterSubject');
    const current = sel.value;
    sel.innerHTML = '<option value="">All subjects</option>' + subjects.map(s => `<option ${s===current?'selected':''}>${escapeHtml(s)}</option>`).join('');

    let items = state.bank.filter(q =>
      (!search || q.text.toLowerCase().includes(search)) &&
      (!fSubject || q.subject === fSubject) &&
      (!fDiff || q.difficulty === fDiff)
    );

    document.getElementById('bankCountBadge').textContent = state.bank.length;
    const list = document.getElementById('bankList');
    if(!items.length){
      list.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="8" ry="3"/></svg>
        <p>No questions match. Try clearing filters, or add a new question to the bank.</p>
      </div>`;
      return;
    }
    list.innerHTML = items.map(q => `
      <div class="qcard" data-qid="${q.id}">
        <div class="qcard-top">
          <div class="qcard-body">
            <div class="qcard-text">${escapeHtml(q.text)}${q.image ? `<img src="${q.image}" alt="">`:''}</div>
            <div class="qcard-opts">${q.options.map((o,idx) => `<span class="${idx===q.correctIndex?'opt-correct':''}">${letters[idx]}. ${escapeHtml(o.text)}</span>`).join('')}</div>
            <div class="qcard-meta">
              <span class="tag">${escapeHtml(q.subject||'—')}</span>
              <span class="tag">${escapeHtml(q.difficulty||'Medium')}</span>
            </div>
          </div>
          <div class="qcard-actions">
            <button class="icon-btn" title="Edit" data-act="edit"><svg viewBox="0 0 24 24"><path d="M4 19.5V17l10-10 2.5 2.5-10 10H4z"/></svg></button>
            <button class="icon-btn" title="Delete" data-act="del"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7m2 0-.7 12a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7"/></svg></button>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.qcard').forEach(card => {
      const qid = card.dataset.qid;
      card.querySelector('[data-act="edit"]').addEventListener('click', () => openBankQuestionModal(qid));
      card.querySelector('[data-act="del"]').addEventListener('click', async () => {
        if(await confirmDialog('Delete from bank?', 'This only removes it from the bank, not from tests it was copied into.')){
          state.bank = state.bank.filter(q => q.id !== qid);
          saveBank(); renderBank();
        }
      });
    });
  }

  let bankEditingId = null;
  function openBankQuestionModal(qid){
    // Reuse the same question modal, but save target is the bank.
    if(qid){
      currentEditQuestion = JSON.parse(JSON.stringify(state.bank.find(q => q.id === qid)));
      document.getElementById('qModalTitle').textContent = 'Edit bank question';
    } else {
      currentEditQuestion = blankQuestion();
      document.getElementById('qModalTitle').textContent = 'Add question to bank';
    }
    bankEditingId = qid || null;
    document.getElementById('q-text').value = currentEditQuestion.text || '';
    document.getElementById('q-image-preview').innerHTML = currentEditQuestion.image ? `<img src="${currentEditQuestion.image}">` : '';
    document.getElementById('q-marks').value = currentEditQuestion.marks ?? 1;
    document.getElementById('q-negmarks').value = currentEditQuestion.negMarks ?? 0;
    document.getElementById('q-subject').value = currentEditQuestion.subject || '';
    document.getElementById('q-chapter').value = currentEditQuestion.chapter || '';
    document.getElementById('q-difficulty').value = currentEditQuestion.difficulty || 'Medium';
    document.getElementById('q-explanation').value = currentEditQuestion.explanation || '';
    renderOptionsEditor(currentEditQuestion);
    modalSaveTarget = 'bank';
    document.getElementById('qModalBackdrop').classList.add('open');
  }

  let modalSaveTarget = 'test'; // 'test' | 'bank'

  function saveBankQuestion(){
    currentEditQuestion.text = document.getElementById('q-text').value.trim();
    currentEditQuestion.marks = Number(document.getElementById('q-marks').value)||1;
    currentEditQuestion.negMarks = Number(document.getElementById('q-negmarks').value)||0;
    currentEditQuestion.subject = document.getElementById('q-subject').value.trim();
    currentEditQuestion.chapter = document.getElementById('q-chapter').value.trim();
    currentEditQuestion.difficulty = document.getElementById('q-difficulty').value;
    currentEditQuestion.explanation = document.getElementById('q-explanation').value.trim();
    if(!currentEditQuestion.text){ toast('Question text is required', 'err'); return; }
    if(currentEditQuestion.options.some(o => !o.text.trim())){ toast('All 4 options (A–D) need text', 'err'); return; }

    if(bankEditingId){
      const idx = state.bank.findIndex(q => q.id === bankEditingId);
      state.bank[idx] = currentEditQuestion;
    } else {
      state.bank.push(currentEditQuestion);
    }
    saveBank(); renderBank(); closeQuestionModal();
    toast('Saved to question bank', 'ok');
  }

  /* ---------------------------------------------------------
     BANK PICKER (import into builder)
  --------------------------------------------------------- */
  function openBankPicker(){
    state.bankPickerSelection = new Set();
    renderBankPickerList();
    document.getElementById('bankPickerBackdrop').classList.add('open');
  }
  function renderBankPickerList(){
    const search = document.getElementById('bankPickerSearch').value.trim().toLowerCase();
    const items = state.bank.filter(q => !search || q.text.toLowerCase().includes(search));
    const list = document.getElementById('bankPickerList');
    list.innerHTML = items.length ? items.map(q => `
      <label class="bank-pick-row">
        <input type="checkbox" data-pick-id="${q.id}" ${state.bankPickerSelection.has(q.id)?'checked':''}>
        <span>${escapeHtml(q.text)} <span class="tag" style="margin-left:6px;">${escapeHtml(q.subject||'—')}</span></span>
      </label>
    `).join('') : `<p class="muted-note">Your question bank is empty. Add questions to it from the Question Bank page.</p>`;

    list.querySelectorAll('[data-pick-id]').forEach(cb => cb.addEventListener('change', () => {
      if(cb.checked) state.bankPickerSelection.add(cb.dataset.pickId);
      else state.bankPickerSelection.delete(cb.dataset.pickId);
      document.getElementById('bankPickerCount').textContent = state.bankPickerSelection.size + ' selected';
    }));
  }

  function importSelectedFromBank(){
    state.bankPickerSelection.forEach(id => {
      const q = state.bank.find(x => x.id === id);
      if(q){
        const copy = JSON.parse(JSON.stringify(q));
        copy.id = uid('q');
        state.currentTest.questions.push(copy);
      }
    });
    renderQuestionList();
    autosaveDraft();
    document.getElementById('bankPickerBackdrop').classList.remove('open');
    toast(state.bankPickerSelection.size + ' question(s) imported', 'ok');
  }

  /* ---------------------------------------------------------
     EXPORT VIEW helpers (used by generator.js)
  --------------------------------------------------------- */
  function refreshExportTestOptions(){
    const sel = document.getElementById('exp-testselect');
    if(!sel) return;
    const current = sel.value;
    sel.innerHTML = state.tests.length
      ? state.tests.map(t => `<option value="${t.id}">${escapeHtml(t.title || 'Untitled')} (${t.questions.length} Qs)</option>`).join('')
      : `<option value="">No saved tests yet</option>`;
    if([...sel.options].some(o => o.value === current)) sel.value = current;
    renderExportSummary();
  }

  function renderExportView(){
    refreshExportTestOptions();
  }

  function renderExportSummary(){
    const sel = document.getElementById('exp-testselect');
    const t = state.tests.find(x => x.id === sel.value);
    const box = document.getElementById('exp-summary');
    if(!t){ box.innerHTML = `<div>Select a test to see its summary.</div>`; return; }
    document.getElementById('exp-duration').value = t.duration || 60;
    const totalMarks = t.questions.reduce((s,q) => s + Number(q.marks ?? t.defaultMarks ?? 1), 0);
    box.innerHTML = `
      <div><b>${t.questions.length}</b>Questions</div>
      <div><b>${totalMarks}</b>Total marks</div>
      <div><b>${t.duration||60}m</b>Suggested duration</div>
    `;
  }

  /* ---------------------------------------------------------
     SETTINGS
  --------------------------------------------------------- */
  function applyTheme(){
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    document.getElementById('themeLabel').textContent = state.settings.theme === 'dark' ? 'Light mode' : 'Dark mode';
    const setToggle = document.getElementById('set-darkmode');
    if(setToggle) setToggle.checked = state.settings.theme === 'dark';
  }
  function toggleTheme(){
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); saveSettings();
  }

  function exportAllData(){
    const payload = { tests: state.tests, bank: state.bank, settings: state.settings, exportedAt: new Date().toISOString(), app: 'Pragya Coaching Smart Test Builder' };
    downloadFile('pragya-coaching-backup-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup downloaded', 'ok');
  }

  function importAllData(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(Array.isArray(data.tests)) state.tests = state.tests.concat(data.tests.filter(t => !state.tests.some(x => x.id === t.id)));
        if(Array.isArray(data.bank)) state.bank = state.bank.concat(data.bank.filter(q => !state.bank.some(x => x.id === q.id)));
        saveTests(); saveBank();
        toast('Backup imported', 'ok');
        renderDashboard();
      }catch(e){
        toast('Could not read that file', 'err');
      }
    };
    reader.readAsText(file);
  }

  function eraseAllData(){
    confirmDialog('Erase everything?', 'This deletes all tests and question bank data stored in this browser. This cannot be undone.').then(ok => {
      if(!ok) return;
      localStorage.removeItem(LS_TESTS);
      localStorage.removeItem(LS_BANK);
      localStorage.removeItem(LS_DRAFT);
      state.tests = []; state.bank = [];
      state.currentTest = blankTest('general');
      toast('All data erased');
      renderDashboard();
    });
  }

  /* ---------------------------------------------------------
     INIT / EVENT WIRING
  --------------------------------------------------------- */
  function init(){
    loadAll();
    applyTheme();

    // sidebar nav
    document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => goto(btn.dataset.view)));
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('scrim').classList.add('show');
    });
    document.getElementById('scrim').addEventListener('click', closeSidebarMobile);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('set-darkmode').addEventListener('change', toggleTheme);

    // draft restore or blank
    const draft = loadDraft();
    state.currentTest = draft || blankTest('general');
    bindMetaForm();
    fillMetaForm(state.currentTest);
    renderQuestionList();

    // builder buttons
    document.getElementById('btnAddQuestion').addEventListener('click', () => { modalSaveTarget='test'; openQuestionModal(null); });
    document.getElementById('btnSaveTest').addEventListener('click', saveCurrentTest);
    document.getElementById('btnExportJson').addEventListener('click', exportCurrentTestJson);
    document.getElementById('btnClearTest').addEventListener('click', clearCurrentTest);
    document.getElementById('btnPreviewTest').addEventListener('click', openPreview);
    document.getElementById('btnImportBank').addEventListener('click', openBankPicker);

    document.getElementById('qModalClose').addEventListener('click', closeQuestionModal);
    document.getElementById('qModalCancel').addEventListener('click', closeQuestionModal);
    document.getElementById('qModalSave').addEventListener('click', () => {
      if(modalSaveTarget === 'bank') saveBankQuestion(); else saveQuestionFromModal();
    });
    document.getElementById('previewModalClose').addEventListener('click', () => document.getElementById('previewModalBackdrop').classList.remove('open'));

    document.getElementById('bankPickerClose').addEventListener('click', () => document.getElementById('bankPickerBackdrop').classList.remove('open'));
    document.getElementById('bankPickerSearch').addEventListener('input', renderBankPickerList);
    document.getElementById('bankPickerImport').addEventListener('click', importSelectedFromBank);

    // dashboard quick actions delegated already via renderDashboard
    document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));

    // navodaya view
    document.querySelectorAll('.section-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.navodayaSection = tab.dataset.section;
      document.getElementById('navodayaCustomNameField').style.display = state.navodayaSection === 'Custom' ? '' : 'none';
    }));
    document.getElementById('f-navCustomName').addEventListener('input', (e) => state.navodayaCustomName = e.target.value);
    document.getElementById('btnOpenNavodayaBuilder').addEventListener('click', () => {
      if(state.currentTest.category !== 'navodaya') openNewTest('navodaya');
      else goto('builder');
    });

    // question bank view
    document.getElementById('btnAddBankQuestion').addEventListener('click', () => openBankQuestionModal(null));
    document.getElementById('bankSearch').addEventListener('input', renderBank);
    document.getElementById('bankFilterSubject').addEventListener('change', renderBank);
    document.getElementById('bankFilterDifficulty').addEventListener('change', renderBank);

    // export view
    document.getElementById('exp-testselect').addEventListener('change', renderExportSummary);

    // settings
    document.getElementById('btnExportAll').addEventListener('click', exportAllData);
    document.getElementById('importAllFile').addEventListener('change', (e) => { if(e.target.files[0]) importAllData(e.target.files[0]); });
    document.getElementById('btnClearAll').addEventListener('click', eraseAllData);

    // confirm/backdrop click-away
    document.querySelectorAll('.modal-backdrop').forEach(bd => bd.addEventListener('click', (e) => { if(e.target === bd) bd.classList.remove('open'); }));

    renderDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    state, uid, escapeHtml, toast, confirmDialog, fmtDate, downloadFile,
    saveTests, saveBank, letters, openNewTest, openExistingTest, goto,
    refreshExportTestOptions
  };
})();
