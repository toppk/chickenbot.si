import { V3, headingTo, polar, rand } from '../core/util.js';
import { STATION_A } from '../scene/layout.js';
import { tables } from '../scene/bar.js';
import { glasses } from '../scene/glasses.js';
import { buildPerson } from '../scene/person-model.js';
import { walkTo } from './people.js';
import { makeOrder, orders } from './orders.js';
import { bubbleOrder } from './patrons.js';
import { say } from '../ui/bubbles.js';
import { send } from '../brain/link.js';

// June the waitress: takes table orders, delivers rounds and busses tables.
// waitress
const june = buildPerson({
  name: 'June',
  kind: 'waitress',
  jacket: 0x1e1e22,
  skin: 0xc89070,
  pants: 0x1e1e22,
  hair: 0x2a1408,
  ponytail: true,
  apron: true,
  tray: true,
});
export const STATION_SPOT = polar(STATION_A, 3.08);
june.pos.copy(STATION_SPOT);
june.heading = june.wantHeading = headingTo(-1, 0);
june.speed = 1.6;
june.state = 'idle';
june.tray = true;
export function juneTick() {
  const j = june;
  if (j.state !== 'idle') return;
  const ready = orders.find((o) => o.kind === 'table' && o.status === 'ready');
  if (ready && j.pos.distanceTo(STATION_SPOT) < 0.1) {
    j.state = 'pickup';
    j.wantHeading = headingTo(-1, 0);
    setTimeout(() => {
      ready.glasses.forEach((g, i) => {
        g.state = 'tray';
        g.owner = j;
        g.trayOff = new V3((i - 1) * 0.11, 0.04, 0.1 + (i % 2 ? 0.06 : -0.04));
      });
      j.carrying = true;
      ready.status = 'delivering';
      const tb = ready.who;
      walkTo(
        j,
        tb.pos.clone().add(new V3(Math.cos(tb.angle + Math.PI) * 0.95, 0, Math.sin(tb.angle + Math.PI) * 0.95)),
        () => {
          j.wantHeading = headingTo(tb.pos.x - j.pos.x, tb.pos.z - j.pos.z);
          setTimeout(() => {
            tb.group.forEach((p, i) => {
              const g = ready.glasses[i];
              if (!g) return;
              g.state = 'lift';
              g.from.copy(g.pos);
              g.to.copy(p.seat.place);
              g.t = 0;
              g.next = 'table';
              g.owner = p;
              p.glass = g;
              p.state = 'drinking';
              p.sipT = rand(1.5, 4);
            });
            tb.state = 'drinking';
            ready.status = 'done';
            j.carrying = false;
            send({ type: 'event', event: 'served', order: ready.id });
            walkTo(j, STATION_SPOT, () => {
              j.state = 'idle';
              j.wantHeading = headingTo(-1, 0);
            });
          }, 700);
        },
      );
    }, 500);
    return;
  }
  const waiting = tables.find((t) => t.state === 'waiting');
  if (waiting) {
    waiting.state = 'taking';
    j.state = 'taking';
    walkTo(
      j,
      waiting.pos
        .clone()
        .add(new V3(Math.cos(waiting.angle + Math.PI) * 0.95, 0, Math.sin(waiting.angle + Math.PI) * 0.95)),
      () => {
        j.wantHeading = headingTo(waiting.pos.x - j.pos.x, waiting.pos.z - j.pos.z);
        j.writing = true;
        say(j, 'What can I get you?', 1.8);
        waiting.group.forEach((p, i) => {
          setTimeout(() => bubbleOrder(p, p.drink), 500 + i * 500);
        });
        setTimeout(
          () => {
            j.writing = false;
            waiting.state = 'ordered';
            makeOrder(
              'table',
              waiting.group.map((p) => p.drink),
              waiting,
            );
            walkTo(j, STATION_SPOT, () => {
              j.state = 'idle';
              j.wantHeading = headingTo(-1, 0);
            });
          },
          900 + waiting.group.length * 500,
        );
      },
    );
    return;
  }
  const dirty = tables.find((t) => t.state === 'dirty');
  if (dirty) {
    dirty.state = 'bussing';
    j.state = 'bussing';
    walkTo(
      j,
      dirty.pos.clone().add(new V3(Math.cos(dirty.angle + Math.PI) * 0.95, 0, Math.sin(dirty.angle + Math.PI) * 0.95)),
      () => {
        j.carrying = true;
        const gs = glasses.filter((g) => g.state === 'table' && !g.owner && g.pos.distanceTo(dirty.pos) < 1.3);
        gs.forEach((g, i) => {
          g.state = 'tray';
          g.owner = j;
          g.trayOff = new V3((i - 1) * 0.11, 0.04, 0.1);
        });
        walkTo(j, STATION_SPOT, () => {
          gs.forEach((g) => {
            g.state = 'bus';
            g.t = 0.3;
          });
          j.carrying = false;
          dirty.state = 'free';
          j.state = 'idle';
          j.wantHeading = headingTo(-1, 0);
        });
      },
    );
    return;
  }
  if (j.pos.distanceTo(STATION_SPOT) > 0.1) {
    j.state = 'return';
    walkTo(j, STATION_SPOT, () => {
      j.state = 'idle';
      j.wantHeading = headingTo(-1, 0);
    });
  }
}
