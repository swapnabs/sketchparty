import { useEffect, useRef } from 'react';
import { socket } from '../socket.js';
import { canvasStore } from '../canvasStore.js';
import { CANVAS_W, CANVAS_H } from '../canvasModel.js';
import Toolbar from './Toolbar.jsx';
import { useState } from 'react';

const clamp = (v, max) => Math.min(max, Math.max(0, v));

/**
 * The drawer draws locally first (zero perceived lag), then streams the same events to the
 * server in ~30ms batches. Everyone else renders what the server relays, in seq order.
 */
export default function Board({ canDraw, isDrawer, children }) {
  const host = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#14212b');
  const [size, setSize] = useState(6);
  const cfg = useRef({ tool, color, size });
  cfg.current = { tool, color, size };

  // Mount the long-lived canvas element
  useEffect(() => {
    const c = canvasStore.canvas;
    host.current.appendChild(c);
    return () => c.remove();
  }, []);

  const send = (ev) => socket.emit('draw', ev);
  const local = (ev) => { canvasStore.model.apply(ev); send(ev); };
  const undo = () => local({ type: 'undo' });
  const clear = () => local({ type: 'clear' });

  useEffect(() => {
    const canvas = canvasStore.canvas;
    canvas.style.cursor = canDraw ? 'crosshair' : 'default';
    if (!canDraw) return undefined;

    let id = null, buf = [], timer = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [
        Math.round(clamp(((e.clientX - r.left) * CANVAS_W) / r.width, CANVAS_W) * 10) / 10,
        Math.round(clamp(((e.clientY - r.top) * CANVAS_H) / r.height, CANVAS_H) * 10) / 10,
      ];
    };
    const flush = () => {
      while (buf.length) send({ type: 'pts', id, pts: buf.splice(0, 40) });
    };
    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const { tool: t, color: c, size: s } = cfg.current;
      const pt = pos(e);
      if (t === 'fill') return local({ type: 'fill', x: Math.floor(pt[0]), y: Math.floor(pt[1]), color: c });
      id = Math.random().toString(36).slice(2, 10);
      local({ type: 'start', id, tool: t, color: t === 'eraser' ? '#ffffff' : c, size: s, pt });
      canvas.setPointerCapture(e.pointerId);
      timer = setInterval(flush, 30);
    };
    const move = (e) => {
      if (!id) return;
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const pt = pos(ev);
        canvasStore.model.apply({ type: 'pts', id, pts: [pt] });   // draw instantly
        buf.push(pt);                                             // network is batched
      }
    };
    const up = () => {
      if (!id) return;
      flush();
      send({ type: 'end', id });
      clearInterval(timer);
      id = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/input|textarea/i.test(e.target.tagName)) {
        e.preventDefault(); undo();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      up();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw]);

  return (
    <div className="board">
      <div className="stage">
        <div className="paper" ref={host} />
        {children}
      </div>
      {isDrawer && (
        <Toolbar tool={tool} setTool={setTool} color={color} setColor={setColor} size={size} setSize={setSize}
          onUndo={undo} onClear={clear} disabled={!canDraw} />
      )}
    </div>
  );
}
