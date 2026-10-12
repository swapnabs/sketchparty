import { CanvasModel } from './canvasModel.js';

/**
 * One long-lived canvas for the whole session, fed straight from the socket.
 * Keeping it outside React means no stroke is ever missed while components mount/unmount,
 * and a late/refreshed client simply gets a snapshot and continues from its seq.
 */
class CanvasStore {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.model = new CanvasModel(this.canvas);
    this.seq = 0;
    this.waiting = false;       // true while a resync snapshot is in flight
    this.onNeedResync = null;
  }

  snapshot({ seq, ops }) {
    this.model.setOps(ops);
    this.seq = seq;
    this.waiting = false;
  }

  /** Remote draw event: strictly in-order by seq; a gap triggers a resync. */
  remote(ev) {
    if (this.waiting || ev.seq <= this.seq) return;
    if (ev.seq !== this.seq + 1) {
      this.waiting = true;
      this.onNeedResync && this.onNeedResync();
      return;
    }
    this.seq = ev.seq;
    this.model.apply(ev);
  }
}

export const canvasStore = new CanvasStore();
