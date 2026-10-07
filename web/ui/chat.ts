import { live, send } from '../brain/link.ts';
import { brain } from '../brain/local-brain.ts';
import { byId } from '../core/dom.ts';

// The chat log and chat input.
const chatlog = byId('chatlog');
/** Appends a line to the chat log; html tags in text are stripped. */
export function chatLine(who: string, text: string, cls?: string) {
  const d = document.createElement('div');
  d.className = cls || '';
  const s = document.createElement('span');
  s.className = 'who';
  s.textContent = who ? `${who}: ` : '';
  d.appendChild(s);
  d.appendChild(document.createTextNode(text.replace(/<[^>]+>/g, '').trim()));
  const atEnd = chatlog.scrollHeight - chatlog.scrollTop - chatlog.clientHeight < 6;
  chatlog.appendChild(d);
  while (chatlog.children.length > 80) chatlog.firstChild!.remove();
  if (atEnd) chatlog.scrollTop = chatlog.scrollHeight;
}
byId<HTMLFormElement>('chatform').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = byId<HTMLInputElement>('chatin');
  const t = inp.value.trim();
  if (!t) return;
  inp.value = '';
  chatLine('you', t, '');
  if (live()) send({ type: 'chat', from: 'you', text: t });
  else brain.reply(t, 'you');
});
