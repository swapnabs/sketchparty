export const CANVAS_W = 800;
export const CANVAS_H = 600;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Scanline flood fill with a small tolerance so anti-aliased edges are filled too. */
export function floodFill(ctx, sx, sy, hex, tol = 48) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [fr, fg, fb] = hexToRgb(hex);
  const i0 = (sy * w + sx) * 4;
  const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
  if (Math.abs(tr - fr) < 3 && Math.abs(tg - fg) < 3 && Math.abs(tb - fb) < 3) return;
  const match = (i) => Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol;
  const seen = new Uint8Array(w * h);
  const stack = [sy * w + sx];
  while (stack.length) {
    const p = stack.pop();
    const y = (p / w) | 0;
    let x = p - y * w;
    let xl = x;
    while (xl >= 0 && !seen[y * w + xl] && match((y * w + xl) * 4)) xl--;
    xl++;
    let xr = x;
    while (xr < w && !seen[y * w + xr] && match((y * w + xr) * 4)) xr++;
    xr--;
    let up = false, down = false;
    for (let i = xl; i <= xr; i++) {
      const idx = y * w + i;
      seen[idx] = 1;
      const o = idx * 4;
      d[o] = fr; d[o + 1] = fg; d[o + 2] = fb; d[o + 3] = 255;
      if (y > 0) {
        const u = idx - w;
        const m = !seen[u] && match(u * 4);
        if (m && !up) { stack.push(u); up = true; } else if (!m) up = false;
      }
      if (y < h - 1) {
        const dn = idx + w;
        const m = !seen[dn] && match(dn * 4);
        if (m && !down) { stack.push(dn); down = true; } else if (!m) down = false;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function dot(ctx, op, p) {
  ctx.fillStyle = op.color;
  ctx.beginPath();
  ctx.arc(p[0], p[1], op.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function segment(ctx, op, a, b) {
  ctx.strokeStyle = op.color;
  ctx.lineWidth = op.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

function renderOp(ctx, op) {
  if (op.t === 'fill') return floodFill(ctx, op.x, op.y, op.color);
  if (op.pts.length === 1) return dot(ctx, op, op.pts[0]);
  dot(ctx, op, op.pts[0]);
  for (let i = 1; i < op.pts.length; i++) segment(ctx, op, op.pts[i - 1], op.pts[i]);
}

/**
 * The canvas is just a rendering of an ordered list of operations (strokes and fills).
 * Replaying the same ops in the same order gives every client the same picture, which is
 * how snapshots, undo, late joiners and the end-of-game replay all work.
 */
export class CanvasModel {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.ops = [];
    this.cur = null;
    this.redraw();
  }

  redraw() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const op of this.ops) renderOp(this.ctx, op);
  }

  setOps(ops) {
    this.ops = ops.map((o) => (o.t === 'stroke' ? { ...o, pts: [...o.pts] } : { ...o }));
    this.cur = null;
    this.redraw();
  }

  apply(ev) {
    switch (ev.type) {
      case 'start': {
        const op = { t: 'stroke', id: ev.id, tool: ev.tool, color: ev.color, size: ev.size, pts: [ev.pt] };
        this.ops.push(op);
        this.cur = op;
        dot(this.ctx, op, ev.pt);
        break;
      }
      case 'pts': {
        let op = this.cur && this.cur.id === ev.id ? this.cur : null;
        if (!op) {
          const last = this.ops[this.ops.length - 1];
          if (last && last.t === 'stroke' && last.id === ev.id) op = last;
        }
        if (!op) break;
        for (const p of ev.pts) {
          segment(this.ctx, op, op.pts[op.pts.length - 1], p);
          op.pts.push(p);
        }
        break;
      }
      case 'fill': {
        const op = { t: 'fill', x: ev.x, y: ev.y, color: ev.color };
        this.ops.push(op);
        this.cur = null;
        floodFill(this.ctx, op.x, op.y, op.color);
        break;
      }
      case 'undo':
        this.ops.pop();
        this.cur = null;
        this.redraw();
        break;
      case 'clear':
        this.ops = [];
        this.cur = null;
        this.redraw();
        break;
      default:
    }
  }
}
