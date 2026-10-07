// What gets said in the bar (mood lines are in moods.ts). Which line fits when is decided in code.

/** [regular index (REGULARS order), line], said in turn when no server is connected */
export const BANTER: [number, string][] = [
  [0, 'Did you see the game?'],
  [1, 'Don’t start, Gus.'],
  [2, 'Technically, a chicken is a dinosaur.'],
  [0, 'Technically, Otis, drink your drink.'],
  [1, 'Same again, love.'],
  [2, 'The first bar stool was patented in nineteen—'],
  [0, 'Nobody asked.'],
  [1, 'Leave him alone.'],
];

export const HEN = {
  opening: 'Evening.',
  serveRegular: (name: string) => [`There you go, ${name}.`, `${name}.`, `Same as always, ${name}.`],
  serve: ['Enjoy.', 'There you go.', 'Cheers.'],
  spill: ['Ah.', 'That one’s on me.', '...'],
  underTheFloor: '...are you under the floor?',
};

/** chickenbot's replies to the chat box (local brain only) */
export const CHAT = {
  orderTaken: (drink: string) => `One ${drink}. Coming up.`,
  orderWalkIn: (drink: string) => `One ${drink}. Grab a stool.`,
  barFull: 'Bar’s full. Give it a minute.',
  hello: ['Evening.', 'What’ll it be?'],
  wings: 'We don’t talk about that in here.',
  mood: (hud: string) => `Running ${hud.toLowerCase()}.`,
  musicOn: 'Fine. One song.',
  musicOff: 'Thank you.',
  dance: 'Once.',
  tab: 'No tabs.',
  other: ['Mm-hm.', 'Heard.', 'Tell it to the regulars.', 'I just pour.'],
};

export const PATRON = {
  usual: 'the usual,',
  impatient: '...any time now.',
};
export const WAITRESS = {
  takeOrder: 'What can I get you?',
};
