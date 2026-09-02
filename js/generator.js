/* =========================================================
   PRAGYA COACHING — Student Online Test HTML Generator
   Produces one self-contained, offline-capable HTML file per test.
   ========================================================= */
const Generator = (() => {

  function esc(s){
    return String(s===undefined||s===null?'':s).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function collectOptions(){
    return {
      duration: Number(document.getElementById('exp-duration').value) || 60,
      randomizeQ: document.getElementById('exp-randomizeQ').checked,
      randomizeO: document.getElementById('exp-randomizeO').checked,
      showResult: document.getElementById('exp-showResult').checked,
      showExplain: document.getElementById('exp-showExplain').checked
    };
  }

  function getSelectedTest(){
    const id = document.getElementById('exp-testselect').value;
    return App.state.tests.find(t => t.id === id);
  }

  /* -------- CSS for the generated standalone file (system fonts only, no CDN) -------- */
  const css = [
    ':root{--navy:#1E2A4A;--gold:#C8912F;--gold-soft:#F3E3C2;--green:#2E8B57;--green-soft:#E4F3E9;--red:#C0392B;--red-soft:#FBE6E3;--bg:#F7F5EF;--panel:#fff;--border:#E4DFD2;--ink:#1C2333;--muted:#7B8194;}',
    '*{box-sizing:border-box;}',
    'body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5;}',
    '.wrap{max-width:900px;margin:0 auto;padding:20px 16px 60px;}',
    '.topbar{position:sticky;top:0;background:var(--navy);color:#fff;padding:12px 18px;display:flex;align-items:center;gap:12px;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,.15);}',
    '.topbar .mark{width:30px;height:30px;border-radius:8px;background:var(--gold);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;}',
    '.topbar .ttl{font-weight:700;font-size:14px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.timer{font-family:monospace;font-weight:700;background:rgba(255,255,255,.12);padding:6px 12px;border-radius:8px;font-size:14px;letter-spacing:.5px;}',
    '.timer.low{background:var(--red);}',
    '.card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin-top:18px;}',
    'h1{font-size:21px;margin:0 0 6px;}',
    'h2{font-size:17px;margin:0 0 10px;}',
    'p{margin:0 0 10px;}',
    '.muted{color:var(--muted);font-size:13px;}',
    '.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;border:1px solid var(--border);background:#fff;color:var(--ink);font-weight:600;cursor:pointer;font-size:13.5px;}',
    '.btn-primary{background:var(--navy);color:#fff;border-color:var(--navy);}',
    '.btn-gold{background:var(--gold);color:var(--navy);border-color:var(--gold);}',
    '.btn-outline-danger{background:var(--red-soft);color:var(--red);border-color:var(--red-soft);}',
    '.btn:disabled{opacity:.45;cursor:not-allowed;}',
    '.testgrid{display:grid;grid-template-columns:1fr 220px;gap:16px;align-items:start;}',
    '.qtext{font-size:15.5px;font-weight:600;margin-bottom:10px;}',
    '.qtext img{max-width:100%;border-radius:8px;display:block;margin-top:8px;}',
    '.opt{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;margin-bottom:9px;cursor:pointer;font-size:14px;}',
    '.opt:hover{border-color:var(--gold);}',
    '.opt.sel{border-color:var(--navy);background:#EEF1F8;}',
    '.opt .lt{width:22px;height:22px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}',
    '.opt.sel .lt{background:var(--navy);color:#fff;}',
    '.opt img{max-width:140px;max-height:90px;border-radius:6px;margin-top:6px;display:block;}',
    '.navrow{display:flex;justify-content:space-between;gap:8px;margin-top:16px;flex-wrap:wrap;}',
    '.navrow .grp{display:flex;gap:8px;flex-wrap:wrap;}',
    '.palette{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;}',
    '.pbtn{aspect-ratio:1;border-radius:7px;border:1px solid var(--border);background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:var(--ink);}',
    '.pbtn.current{outline:2px solid var(--navy);outline-offset:1px;}',
    '.pbtn.answered{background:var(--green);color:#fff;border-color:var(--green);}',
    '.pbtn.marked{background:var(--gold);color:var(--navy);border-color:var(--gold);}',
    '.pbtn.notanswered{background:var(--red-soft);color:var(--red);border-color:var(--red-soft);}',
    '.pbtn.notvisited{background:#fff;}',
    '.legend{display:flex;flex-direction:column;gap:6px;margin-top:12px;font-size:11.5px;color:var(--muted);}',
    '.legend span{display:inline-flex;align-items:center;gap:6px;}',
    '.dot{width:10px;height:10px;border-radius:3px;display:inline-block;}',
    '.side{position:sticky;top:70px;}',
    '.result-hero{text-align:center;padding:26px 10px;}',
    '.result-score{font-size:40px;font-weight:800;color:var(--navy);}',
    '.result-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;}',
    '.rs{background:var(--bg);border-radius:10px;padding:12px;text-align:center;}',
    '.rs b{display:block;font-size:19px;}',
    '.review-q{border-top:1px solid var(--border);padding:16px 0;}',
    '.explain-box{background:var(--bg);border-radius:8px;padding:10px 12px;margin-top:8px;font-size:13px;}',
    '.explain-box img{max-width:100%;max-height:220px;border-radius:8px;margin-top:6px;display:block;}',
    '.review-q .opt.correct-ans{border-color:var(--green);background:var(--green-soft);}',
    '.review-q .opt.wrong-ans{border-color:var(--red);background:var(--red-soft);}',
    '.badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;}',
    '.badge.ok{background:var(--green-soft);color:var(--green);}',
    '.badge.no{background:var(--red-soft);color:var(--red);}',
    '.badge.skip{background:var(--border);color:var(--muted);}',
    '@media(max-width:720px){.testgrid{grid-template-columns:1fr;}.side{position:static;}.palette{grid-template-columns:repeat(8,1fr);}}'
  ].join('\n');

  /* -------- runtime JS embedded verbatim in the generated file -------- */
  const runtime = [
    "(function(){",
    "  var app = document.getElementById('app');",
    "  function esc(s){ return String(s===undefined||s===null?'':s).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m];}); }",
    "  function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t;} return a; }",
    "  var letters=['A','B','C','D'];",
    "  var raw = TEST_DATA, opts = OPTS;",
    "  var order = raw.questions.map(function(q,i){return i;});",
    "  if(opts.randomizeQ) order = shuffle(order);",
    "  var qs = order.map(function(i){",
    "    var src = raw.questions[i];",
    "    var perm = [0,1,2,3];",
    "    if(opts.randomizeO) perm = shuffle(perm);",
    "    var opts4 = perm.map(function(p){ return src.options[p]; });",
    "    var displayedCorrect = perm.indexOf(src.correctIndex);",
    "    return { text:src.text, image:src.image||'', options:opts4, correctIndex:displayedCorrect,",
    "      marks: (src.marks===null||src.marks===undefined)? raw.defaultMarks : src.marks,",
    "      negMarks: (src.negMarks===null||src.negMarks===undefined)? raw.defaultNeg : src.negMarks,",
    "      explanation: src.explanation||'', explanationImage: src.explanationImage||'', selected:null, marked:false, visited:false };",
    "  });",
    "  var screen='start', current=0, timeLeft=opts.duration*60, timerId=null;",
    "",
    "  function statusClass(q,i){",
    "    if(i===current) return 'current';",
    "    if(q.marked) return 'marked';",
    "    if(q.selected!==null) return 'answered';",
    "    if(q.visited) return 'notanswered';",
    "    return 'notvisited';",
    "  }",
    "",
    "  function renderStart(){",
    "    app.innerHTML = ''+",
    "      '<div class=\"topbar\"><div class=\"mark\">\\u092A\\u094D\\u0930</div><div class=\"ttl\">'+esc(raw.title)+'</div></div>'+",
    "      '<div class=\"wrap\"><div class=\"card\">'+",
    "      '<h1>'+esc(raw.title)+'</h1>'+",
    "      '<p class=\"muted\">'+esc(raw.subject||'')+(raw.chapter?(' &middot; '+esc(raw.chapter)):'')+'</p>'+",
    "      '<p>This test has <b>'+qs.length+'</b> questions &middot; <b>'+opts.duration+'</b> minutes &middot; every question has exactly 4 options (A\\u2013D).</p>'+",
    "      '<p class=\"muted\">Once you start, the timer cannot be paused. The test auto-submits when time runs out. Good luck!</p>'+",
    "      '<button class=\"btn btn-primary\" id=\"startBtn\">Start test</button>'+",
    "      '</div></div>';",
    "    document.getElementById('startBtn').onclick=function(){ screen='test'; startTimer(); renderTest(); };",
    "  }",
    "",
    "  function startTimer(){",
    "    timerId = setInterval(function(){",
    "      timeLeft--;",
    "      var t=document.getElementById('timerBox');",
    "      if(t){ t.textContent = fmtTime(timeLeft); t.className='timer'+(timeLeft<=60?' low':''); }",
    "      if(timeLeft<=0){ clearInterval(timerId); submitTest(true); }",
    "    },1000);",
    "  }",
    "  function fmtTime(s){ if(s<0) s=0; var m=Math.floor(s/60), sec=s%60; return (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec; }",
    "",
    "  function renderTest(){",
    "    var q = qs[current];",
    "    q.visited = true;",
    "    var optsHtml = q.options.map(function(o,idx){",
    "      return '<div class=\"opt'+(q.selected===idx?' sel':'')+'\" data-idx=\"'+idx+'\">'+",
    "        '<span class=\"lt\">'+letters[idx]+'</span><span>'+esc(o.text)+(o.image?('<br><img src=\"'+o.image+'\">'):'')+'</span></div>';",
    "    }).join('');",
    "    var paletteHtml = qs.map(function(qq,i){",
    "      return '<button class=\"pbtn '+statusClass(qq,i)+'\" data-goto=\"'+i+'\">'+(i+1)+'</button>';",
    "    }).join('');",
    "    app.innerHTML = ''+",
    "      '<div class=\"topbar\"><div class=\"mark\">\\u092A\\u094D\\u0930</div><div class=\"ttl\">'+esc(raw.title)+'</div><div class=\"timer\" id=\"timerBox\">'+fmtTime(timeLeft)+'</div></div>'+",
    "      '<div class=\"wrap\"><div class=\"testgrid\">'+",
    "        '<div class=\"card\">'+",
    "          '<p class=\"muted\">Question '+(current+1)+' of '+qs.length+' &middot; '+q.marks+' mark(s)'+(q.negMarks>0?(' &middot; -'+q.negMarks+' negative'):'')+'</p>'+",
    "          '<div class=\"qtext\">'+esc(q.text)+(q.image?('<br><img src=\"'+q.image+'\">'):'')+'</div>'+",
    "          optsHtml+",
    "          '<div class=\"navrow\">'+",
    "            '<div class=\"grp\">'+",
    "              '<button class=\"btn\" id=\"prevBtn\" '+(current===0?'disabled':'')+'>Previous</button>'+",
    "              '<button class=\"btn btn-outline-danger\" id=\"clearBtn\">Clear response</button>'+",
    "            '</div>'+",
    "            '<div class=\"grp\">'+",
    "              '<button class=\"btn btn-gold\" id=\"markBtn\">'+(q.marked?'Unmark':'Mark for review')+'</button>'+",
    "              '<button class=\"btn btn-primary\" id=\"nextBtn\">'+(current===qs.length-1?'Finish':'Save & Next')+'</button>'+",
    "            '</div>'+",
    "          '</div>'+",
    "        '</div>'+",
    "        '<div class=\"side\"><div class=\"card\">'+",
    "          '<h2>Question palette</h2><div class=\"palette\">'+paletteHtml+'</div>'+",
    "          '<div class=\"legend\">'+",
    "            '<span><i class=\"dot\" style=\"background:#2E8B57\"></i>Answered</span>'+",
    "            '<span><i class=\"dot\" style=\"background:#C8912F\"></i>Marked for review</span>'+",
    "            '<span><i class=\"dot\" style=\"background:#FBE6E3\"></i>Visited, not answered</span>'+",
    "            '<span><i class=\"dot\" style=\"background:#fff;border:1px solid #ccc\"></i>Not visited</span>'+",
    "          '</div>'+",
    "          '<button class=\"btn btn-primary\" id=\"submitBtn\" style=\"width:100%;margin-top:14px;\">Submit test</button>'+",
    "        '</div></div>'+",
    "      '</div></div>';",
    "",
    "    var t=document.getElementById('timerBox'); if(t) t.className='timer'+(timeLeft<=60?' low':'');",
    "    Array.prototype.forEach.call(document.querySelectorAll('.opt'),function(el){",
    "      el.onclick=function(){ q.selected = Number(el.dataset.idx); renderTest(); };",
    "    });",
    "    Array.prototype.forEach.call(document.querySelectorAll('[data-goto]'),function(el){",
    "      el.onclick=function(){ current = Number(el.dataset.goto); renderTest(); };",
    "    });",
    "    document.getElementById('prevBtn').onclick=function(){ if(current>0){ current--; renderTest(); } };",
    "    document.getElementById('nextBtn').onclick=function(){ if(current<qs.length-1){ current++; renderTest(); } else { renderTest(); } };",
    "    document.getElementById('clearBtn').onclick=function(){ q.selected=null; renderTest(); };",
    "    document.getElementById('markBtn').onclick=function(){ q.marked=!q.marked; renderTest(); };",
    "    document.getElementById('submitBtn').onclick=function(){ if(confirm('Submit the test now? You cannot change answers after this.')) submitTest(false); };",
    "  }",
    "",
    "  function submitTest(auto){",
    "    if(timerId) clearInterval(timerId);",
    "    screen='result';",
    "    var score=0, correct=0, incorrect=0, unanswered=0, total=0;",
    "    qs.forEach(function(q){",
    "      total += q.marks;",
    "      if(q.selected===null){ unanswered++; return; }",
    "      if(q.selected===q.correctIndex){ score+=q.marks; correct++; }",
    "      else { score-=q.negMarks; incorrect++; }",
    "    });",
    "    renderResult(auto, score, total, correct, incorrect, unanswered);",
    "  }",
    "",
    "  function renderResult(auto, score, total, correct, incorrect, unanswered){",
    "    var reviewHtml = '';",
    "    if(opts.showResult){",
    "      reviewHtml = qs.map(function(q,i){",
    "        var badge = q.selected===null ? '<span class=\"badge skip\">Not answered</span>' : (q.selected===q.correctIndex ? '<span class=\"badge ok\">Correct</span>' : '<span class=\"badge no\">Incorrect</span>');",
    "        var optsHtml = q.options.map(function(o,idx){",
    "          var cls='opt';",
    "          if(idx===q.correctIndex) cls+=' correct-ans';",
    "          else if(idx===q.selected) cls+=' wrong-ans';",
    "          return '<div class=\"'+cls+'\"><span class=\"lt\">'+letters[idx]+'</span><span>'+esc(o.text)+'</span></div>';",
    "        }).join('');",
    "        var explain = (opts.showExplain && (q.explanation||q.explanationImage)) ? ('<div class=\"explain-box\"><b>Explanation:</b> '+esc(q.explanation)+(q.explanationImage?('<br><img src=\"'+q.explanationImage+'\">'):'')+'</div>') : '';",
    "        return '<div class=\"review-q\"><p><b>Q'+(i+1)+'.</b> '+esc(q.text)+' '+badge+'</p>'+optsHtml+explain+'</div>';",
    "      }).join('');",
    "    }",
    "    app.innerHTML = ''+",
    "      '<div class=\"topbar\"><div class=\"mark\">\\u092A\\u094D\\u0930</div><div class=\"ttl\">'+esc(raw.title)+' \\u2014 Result</div></div>'+",
    "      '<div class=\"wrap\"><div class=\"card result-hero\">'+",
    "        (auto?'<p class=\"muted\">Time is up \\u2014 your test was submitted automatically.</p>':'')+",
    "        '<div class=\"muted\">Your score</div><div class=\"result-score\">'+score+' / '+total+'</div>'+",
    "        '<div class=\"result-stats\">'+",
    "          '<div class=\"rs\"><b style=\"color:#2E8B57\">'+correct+'</b>Correct</div>'+",
    "          '<div class=\"rs\"><b style=\"color:#C0392B\">'+incorrect+'</b>Incorrect</div>'+",
    "          '<div class=\"rs\"><b style=\"color:#7B8194\">'+unanswered+'</b>Unanswered</div>'+",
    "        '</div></div>'+",
    "      (opts.showResult ? ('<div class=\"card\"><h2>Answer review</h2>'+reviewHtml+'</div>') : '')+",
    "      '</div>';",
    "  }",
    "",
    "  renderStart();",
    "})();"
  ].join('\n');

  function buildHtmlDoc(test, opts){
    const testData = {
      title: test.title, subject: test.subject, chapter: test.chapter,
      defaultMarks: test.defaultMarks || 1, defaultNeg: test.defaultNeg || 0,
      questions: test.questions.map(q => ({
        text: q.text, image: q.image || '',
        options: q.options.map(o => ({text:o.text, image:o.image||''})),
        correctIndex: q.correctIndex,
        marks: q.marks, negMarks: q.negMarks,
        explanation: q.explanation || '', explanationImage: q.explanationImage || ''
      }))
    };
    const optsData = opts;

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
      '<title>' + esc(test.title) + ' — Pragya Coaching</title>',
      '<style>' + css + '</style>',
      '</head>',
      '<body>',
      '<div id="app"></div>',
      '<script>',
      'var TEST_DATA = ' + JSON.stringify(testData) + ';',
      'var OPTS = ' + JSON.stringify(optsData) + ';',
      runtime,
      '</script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  function download(){
    const test = getSelectedTest();
    if(!test){ App.toast('Select a test first', 'err'); return; }
    if(!test.questions.length){ App.toast('This test has no questions', 'err'); return; }
    const opts = collectOptions();
    const html = buildHtmlDoc(test, opts);
    const filename = (test.title || 'pragya-test').replace(/[^a-z0-9]+/gi,'-').toLowerCase() + '-student-test.html';
    App.downloadFile(filename, html, 'text/html');
    App.toast('Standalone test file downloaded — ready for WhatsApp', 'ok');
  }

  function previewInNewTab(){
    const test = getSelectedTest();
    if(!test){ App.toast('Select a test first', 'err'); return; }
    if(!test.questions.length){ App.toast('This test has no questions', 'err'); return; }
    const opts = collectOptions();
    const html = buildHtmlDoc(test, opts);
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function init(){
    document.getElementById('btnExportDownload').addEventListener('click', download);
    document.getElementById('btnExportPreview').addEventListener('click', previewInNewTab);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { buildHtmlDoc };
})();
