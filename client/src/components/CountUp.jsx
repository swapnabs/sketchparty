import { useCountUp } from '../hooks.js';

export default function CountUp({ to, ms = 900, initial = 0, delay = 0 }) {
  const v = useCountUp(to, ms, initial, delay);
  return <>{v}</>;
}
