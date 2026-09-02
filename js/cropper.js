/* =========================================================
   PRAGYA COACHING — Image Cropper (dependency-free)
   Cropper.open(dataUrl, callback, options) -> callback(croppedDataUrl | null)
   ========================================================= */
const Cropper = (() => {
  let img, stage, box;
  let natural = { w: 0, h: 0 };
  let displayed = { w: 0, h: 0 };
  let doneCallback = null;
  let dragState = null;
  let aspect = null; // null = free, or a number (w/h)

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function setBox(x, y, w, h){
    w = clamp(w, 24, displayed.w);
    h = clamp(h, 24, displayed.h);
    x = clamp(x, 0, displayed.w - w);
    y = clamp(y, 0, displayed.h - h);
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  }

  function getBox(){
    return {
      x: parseFloat(box.style.left) || 0,
      y: parseFloat(box.style.top) || 0,
      w: parseFloat(box.style.width) || 0,
      h: parseFloat(box.style.height) || 0
    };
  }

  function centeredDefaultBox(){
    const bw = displayed.w * 0.82, bh = displayed.h * 0.82;
    setBox((displayed.w - bw) / 2, (displayed.h - bh) / 2, bw, bh);
  }

  function open(dataUrl, callback, options){
    options = options || {};
    doneCallback = callback;
    aspect = options.aspect || null;
    img = document.getElementById('cropperImg');
    stage = document.getElementById('cropperStage');
    box = document.getElementById('cropBox');

    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.toggle('active', b.dataset.ratio === (options.ratioKey || 'free')));

    img.onload = () => {
      natural.w = img.naturalWidth;
      natural.h = img.naturalHeight;
      requestAnimationFrame(() => {
        displayed.w = img.clientWidth;
        displayed.h = img.clientHeight;
        centeredDefaultBox();
      });
    };
    img.src = dataUrl;
    document.getElementById('cropModalBackdrop').classList.add('open');
  }

  function close(){
    document.getElementById('cropModalBackdrop').classList.remove('open');
    doneCallback = null;
  }

  function onPointerDown(e){
    const target = e.target;
    const mode = target.dataset.handle ? target.dataset.handle : (target === box ? 'move' : null);
    if(!mode) return;
    e.preventDefault();
    dragState = { mode, startX: e.clientX, startY: e.clientY, startBox: getBox() };
    if(target.setPointerCapture) { try { target.setPointerCapture(e.pointerId); } catch(err){} }
  }

  function onPointerMove(e){
    if(!dragState) return;
    const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
    let { x, y, w, h } = dragState.startBox;

    if(dragState.mode === 'move'){
      setBox(x + dx, y + dy, w, h);
      return;
    }

    if(dragState.mode.includes('n')){ y = y + dy; h = h - dy; }
    if(dragState.mode.includes('s')){ h = h + dy; }
    if(dragState.mode.includes('w')){ x = x + dx; w = w - dx; }
    if(dragState.mode.includes('e')){ w = w + dx; }
    if(aspect){ h = w / aspect; }
    setBox(x, y, w, h);
  }

  function onPointerUp(){ dragState = null; }

  function applyCrop(){
    const b = getBox();
    const scaleX = natural.w / displayed.w, scaleY = natural.h / displayed.h;
    const sx = b.x * scaleX, sy = b.y * scaleY, sw = b.w * scaleX, sh = b.h * scaleY;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.86);
    const cb = doneCallback;
    close();
    if(cb) cb(result);
  }

  function skipCrop(){
    const cb = doneCallback;
    const src = img.src;
    close();
    if(cb) cb(src);
  }

  function cancel(){
    const cb = doneCallback;
    close();
    if(cb) cb(null);
  }

  function init(){
    document.getElementById('cropperStage').addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    document.querySelectorAll('.ratio-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const v = b.dataset.ratio;
      aspect = v === 'free' ? null : v === '1:1' ? 1 : 4 / 3;
      if(aspect){ const cur = getBox(); setBox(cur.x, cur.y, cur.w, cur.w / aspect); }
    }));
    document.getElementById('cropResetBtn').addEventListener('click', centeredDefaultBox);
    document.getElementById('cropApplyBtn').addEventListener('click', applyCrop);
    document.getElementById('cropSkipBtn').addEventListener('click', skipCrop);
    document.getElementById('cropModalClose').addEventListener('click', cancel);
    document.getElementById('cropModalBackdrop').addEventListener('click', (e) => {
      if(e.target.id === 'cropModalBackdrop') cancel();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open };
})();
window.Cropper = Cropper;
