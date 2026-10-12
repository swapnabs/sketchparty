import { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { EMOJIS, randomAvatar } from '../avatars.js';

/** One horizontally scrollable row of avatars, with the random-pick dice on the right. */
export default function AvatarPicker({ value, onChange, taken = new Set() }) {
  const row = useRef(null);

  // keep the chosen avatar centred in the row (also after rolling the dice)
  useEffect(() => {
    const r = row.current;
    const el = r && r.querySelector('[aria-checked="true"]');
    if (el) r.scrollTo({ left: el.offsetLeft - r.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [value.emoji]);

  return (
    <div className="pickerrow">
      <Avatar a={value} size={56} />
      <div className="emojiscroll" ref={row} role="radiogroup" aria-label="Choose your avatar">
        {EMOJIS.map((e) => (
          <button type="button" key={e} role="radio" aria-checked={value.emoji === e}
            className={'eb' + (value.emoji === e ? ' on' : '')} disabled={taken.has(e) && value.emoji !== e}
            title={taken.has(e) ? 'Already taken in this room' : undefined}
            onClick={() => onChange({ emoji: e })}>{e}</button>
        ))}
      </div>
      <button type="button" className="btn dice" onClick={() => onChange(randomAvatar(taken))}
        aria-label="Pick a random avatar" title="Random avatar">🎲</button>
    </div>
  );
}
