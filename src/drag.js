/**
 * Pointer-event drag and drop for mouse, pen and touch.
 * Sources carry data-drag (and data-slot); targets carry data-drop (and data-slot).
 * Plain taps are left to normal click handlers; the click that follows a drag is swallowed.
 */

const THRESHOLD = 6;

/**
 * @typedef {{kind:string, slot:number}} DragSource
 * @typedef {{kind:string, slot:number}|null} DropTarget
 */

function describe(node) {
  return { kind: node.dataset.drag || node.dataset.drop, slot: node.dataset.slot === undefined ? -1 : Number(node.dataset.slot) };
}

function targetAt(x, y) {
  const hit = document.elementFromPoint(x, y);
  const target = hit && hit.closest('[data-drop]');
  return target ? describe(target) : null;
}

/**
 * Enable dragging inside a root element.
 * @param {HTMLElement} root
 * @param {{start:(src:DragSource)=>void, drop:(src:DragSource, target:DropTarget)=>void, end:()=>void}} handlers
 */
export function enableDrag(root, handlers) {
  let drag = null;
  let swallowClick = false;

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (drag && drag.ghost) drag.ghost.remove();
    const started = drag && drag.ghost;
    drag = null;
    if (started) handlers.end();
  };

  const place = (x, y) => {
    drag.ghost.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px)`;
  };

  function onMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < THRESHOLD) return;
      const rect = drag.node.getBoundingClientRect();
      drag.dx = drag.x - rect.left;
      drag.dy = drag.y - rect.top;
      drag.ghost = drag.node.cloneNode(true);
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.style.width = `${rect.width}px`;
      drag.ghost.style.height = `${rect.height}px`;
      drag.ghost.style.fontSize = getComputedStyle(drag.node).fontSize;
      document.body.append(drag.ghost);
      handlers.start(drag.source);
    }
    place(event.clientX, event.clientY);
  }

  function onUp(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.ghost) {
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      const source = drag.source;
      const target = targetAt(event.clientX, event.clientY);
      cleanup();
      handlers.drop(source, target);
      return;
    }
    cleanup();
  }

  function onCancel() {
    cleanup();
  }

  root.addEventListener('pointerdown', (event) => {
    if (drag || event.button > 0) return;
    const node = event.target.closest('[data-drag]');
    if (!node || !root.contains(node)) return;
    const visual = node.classList.contains('tile') ? node : node.querySelector('.stack .tile:last-child') || node.querySelector('.tile') || node;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, node: visual, source: describe(node), ghost: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });

  root.addEventListener('click', (event) => {
    if (!swallowClick) return;
    event.stopPropagation();
    event.preventDefault();
  }, true);
}
