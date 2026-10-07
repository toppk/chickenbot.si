import { state } from '../core/state.ts';
import { pick, rand } from '../core/util.ts';
import { DOOR } from '../scene/layout.ts';
import { hen } from '../scene/hen-model.ts';
import { DRINKS } from '../content/drinks.ts';
import { people } from '../scene/person-model.ts';
import { orders } from '../sim/orders.ts';
import { regulars, spawnWalkup } from '../sim/patrons.ts';
import { setMood } from '../sim/hen-behaviour.ts';
import { MOODS, type MoodKey } from '../content/moods.ts';
import { say } from '../ui/bubbles.ts';
import { live } from './link.ts';
import { clock } from '../sim/world.ts';
import { BANTER, CHAT } from '../content/dialogue.ts';

// Local brain: drives mood, banter and chat replies when no server is connected.
export const brain = {
  t: 0,
  chatterT: rand(8, 14),
  override: 0,
  lastSpill: -99,
  lastRegular: -99,
  banter: 0,
  tick(dt: number) {
    if (live()) return;
    this.t -= dt;
    this.override -= dt;
    this.chatterT -= dt;
    if (this.t <= 0) {
      this.t = 1.5;
      if (this.override <= 0) {
        const q = orders.filter((o) => o.status === 'queued' || o.status === 'pouring').length,
          guests = people.filter((p) => p.kind === 'walkup' || p.kind === 'table').length;
        let m: MoodKey = 'content';
        if (clock - this.lastSpill < 10) m = 'grumpy';
        else if (q >= 4) m = 'frazzled';
        else if (guests === 0 && q === 0) m = 'sleepy';
        else if (clock - this.lastRegular < 14) m = 'cheery';
        if (m !== hen.mood) {
          setMood(m, 0.4 + Math.min(0.6, q * 0.12), 'local');
          if (Math.random() < 0.5) say(hen, pick(MOODS[m].lines), 2.4);
        }
      }
    }
    if (this.chatterT <= 0) {
      this.chatterT = rand(12, 22);
      if (Math.random() < 0.55) {
        const [i, t] = BANTER[this.banter % BANTER.length]!;
        this.banter++;
        say(regulars[i]!, t, 2.6);
      } else say(hen, pick(MOODS[hen.mood].lines), 2.4);
    }
  },
  reply(text: string, from: string) {
    const t = text.toLowerCase();
    let line: string,
      mood: MoodKey | null = null;
    const drink = /stout|guinness|porter/.test(t)
      ? 'stout'
      : /wine|red|merlot/.test(t)
        ? 'wine'
        : /whisk|bourbon|scotch|rye/.test(t)
          ? 'whiskey'
          : /beer|lager|pint|ale/.test(t)
            ? 'lager'
            : null;
    if (drink) {
      const mine = people.find((p) => p.name === from && p.stool);
      if (mine) {
        mine.drink = drink;
        if (mine.state !== 'waiting' && mine.state !== 'ordering') {
          if (mine.glass) {
            mine.glass.owner = null;
            mine.glass = null;
          }
          mine.state = 'ordering';
          mine.t = 0.3;
        }
        line = CHAT.orderTaken(DRINKS[drink].name);
      } else {
        const p = spawnWalkup(from, drink, true);
        line = p ? CHAT.orderWalkIn(DRINKS[drink].name) : CHAT.barFull;
      }
    } else if (/\b(hi|hey|hello|evening|yo)\b/.test(t)) line = pick(CHAT.hello);
    else if (/cute|love|good (bird|chicken|bot)|pretty|handsome/.test(t)) {
      mood = 'smitten';
      line = pick(MOODS.smitten.lines);
    } else if (/wing|nugget|fried|kfc|drumstick/.test(t)) {
      mood = 'grumpy';
      line = CHAT.wings;
    } else if (/how are you|how’s it|mood|feeling/.test(t)) line = CHAT.mood(MOODS[hen.mood].hud);
    else if (/music|song|jukebox/.test(t)) {
      state.music = !state.music;
      line = state.music ? CHAT.musicOn : CHAT.musicOff;
    } else if (/dance|spin/.test(t)) {
      hen.emote = 'spin';
      hen.emoteT = 1.6;
      line = CHAT.dance;
    } else if (/tab|pay|check|bill/.test(t)) line = CHAT.tab;
    else line = pick(CHAT.other);
    if (mood) {
      setMood(mood, 0.8, 'chat');
      this.override = 14;
    }
    hen.lookAt = { pos: DOOR };
    hen.lookT = 0.01;
    setTimeout(() => say(hen, line, 2.8), 500);
  },
};
