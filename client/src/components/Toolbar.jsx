const COLORS = ['#14212b', '#7a7a7a', '#ef476f', '#ff8a3d', '#ffd93d', '#06d6a0', '#3a86ff', '#8338ec', '#ff7ab6', '#8b5a2b', '#ffffff', '#b5e3ff'];
const SIZES = [3, 6, 12, 24];

export default function Toolbar({ tool, setTool, color, setColor, size, setSize, onUndo, onClear, disabled }) {
  return (
    <div className={'toolbar' + (disabled ? ' disabled' : '')} role="toolbar" aria-label="Drawing tools">
      <div className="group">
        {[['pen', 'Pen'], ['eraser', 'Eraser'], ['fill', 'Fill']].map(([id, label]) => (
          <button key={id} className={'tool' + (tool === id ? ' on' : '')} aria-pressed={tool === id}
            disabled={disabled} onClick={() => setTool(id)}>{label}</button>
        ))}
      </div>
      <div className="group swatches" aria-label="Colours">
        {COLORS.map((c) => (
          <button key={c} className={'sw' + (color === c ? ' on' : '')} style={{ background: c }} aria-label={`Colour ${c}`}
            aria-pressed={color === c} disabled={disabled} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }} />
        ))}
        <input type="color" value={color} disabled={disabled} aria-label="Custom colour" onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="group" aria-label="Brush size">
        {SIZES.map((s) => (
          <button key={s} className={'size' + (size === s ? ' on' : '')} aria-label={`Brush size ${s}`} aria-pressed={size === s}
            disabled={disabled} onClick={() => setSize(s)}>
            <i style={{ width: Math.max(4, s * 0.8), height: Math.max(4, s * 0.8) }} />
          </button>
        ))}
      </div>
      <div className="group">
        <button className="tool" disabled={disabled} onClick={onUndo}>Undo</button>
        <button className="tool danger" disabled={disabled} onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}
