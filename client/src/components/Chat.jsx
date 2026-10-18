import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';
import Avatar from './Avatar.jsx';

export default function Chat({ messages, players = [], placeholder, disabled }) {
  const av = (name) => players.find((p) => p.name === name)?.avatar;
  const [text, setText] = useState('');
  const box = useRef(null);
  useEffect(() => { box.current && (box.current.scrollTop = box.current.scrollHeight); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    socket.emit('chat', { text: t }, () => {});
    setText('');
  };

  return (
    <div className="chat">
      <div className="msgs" ref={box} role="log" aria-live="polite">
        {messages.map((m) => {
          if (m.kind === 'system') return <div key={m.id} className="m system">{m.text}</div>;
          if (m.kind === 'correct') return <div key={m.id} className="m correct"><span aria-hidden="true">✓ </span>{m.text}</div>;
          if (m.kind === 'yours') return <div key={m.id} className="m yours"><span aria-hidden="true">✓ </span><b>Correct!</b> You guessed it</div>;
          if (m.kind === 'wrong') return <div key={m.id} className="m wrong"><span aria-hidden="true">✗ </span><Avatar a={av(m.name)} size={18} /> <b>{m.name}</b> {m.text}</div>;
          if (m.kind === 'vote') return <div key={m.id} className={'m votemsg ' + m.value}><span aria-hidden="true">{m.value === 'up' ? '👍' : '👎'} </span>{m.text}</div>;
          if (m.kind === 'close') return <div key={m.id} className="m close"><span aria-hidden="true">⚠ </span><b>{m.text}</b> is close!</div>;
          return (
            <div key={m.id} className={'m ' + (m.kind === 'private' ? 'private' : '')}>
              <Avatar a={av(m.name)} size={18} /> <b>{m.name}</b> {m.text}
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="chatform">
        <input value={text} maxLength={100} placeholder={placeholder} disabled={disabled} aria-label="Chat message"
          enterKeyHint="send" autoComplete="off" autoCorrect="off" autoCapitalize="none"
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            // on phones the keyboard can cover the chat: bring the whole box (input + Send) into view
            const form = e.target.closest('.chatform');
            setTimeout(() => form && form.scrollIntoView({ block: 'end', behavior: 'smooth' }), 300);
          }} />
        <button type="submit" className="btn primary sendbtn" disabled={disabled || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
