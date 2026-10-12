export default function Avatar({ a, size = 28 }) {
  if (!a) return null;
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.88 }}>
      {a.emoji}
    </span>
  );
}
