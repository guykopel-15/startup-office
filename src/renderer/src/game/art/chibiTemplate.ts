import { Accessory, HairStyle } from '@shared/figures';

/**
 * Pixel rows for the chibi figure. Tokens map to palette colors in composeFigure:
 * D outline, H hair, h hair highlight, S skin, s skin shade, E eye, W eye light,
 * R blush, M mouth, T top, t top shade, P pants, B shoes, A accessory, . transparent.
 */
export const FIGURE_WIDTH = 18;
export const FIGURE_HEIGHT = 26;

export const BASE_ROWS: readonly string[] = [
  '......DDDDDD......',
  '....DDhhhhhhDD....',
  '...DhhhhhhhhhhD...',
  '..DhhhhhhhhhhhhD..',
  '..DhhHHHHHHHHhhD..',
  '.DHHSSSSSSSSSSHHD.',
  '.DHSSSSSSSSSSSSHD.',
  '.DSSSSSSSSSSSSSSD.',
  '.DSSEEWSSSSEEWSSD.',
  '.DSSEEESSSSEEESSD.',
  '.DSRREESSSSEERRSD.',
  '.DSRRSSSMMSSSRRSD.',
  '..DSSSSSSSSSSSSD..',
  '...DsSSSSSSSSsD...',
  '....DDDSSSSDDD....',
  '...DTTTTSSTTTTD...',
  '..DTTTTTTTTTTTTD..',
  '.DSDTTTTTTTTTTDSD.',
  '.DSDTTTTTTTTTTDSD.',
  '.DSDttTTTTTTttDSD.',
  '..DDTTTTTTTTTTDD..',
  '...DPPPPPPPPPPD...',
  '...DPPPPDDPPPPD...',
  '...DPPPDDDDPPPD...',
  '...DBBBD..DBBBD...',
  '...DDDDD..DDDDD...',
];

/** Eye rows 8..10 with the eyes shut. */
export const BLINK_EYE_ROWS: Readonly<Record<number, string>> = {
  8: '.DSSSSSSSSSSSSSSD.',
  9: '.DSSDDDSSSSDDDSSD.',
  10: '.DSRRSSSSSSSSRRSD.',
};

export interface Overlay {
  offsetY: number;
  rows: readonly string[];
}

const SPIKY_HAIR: Overlay = {
  offsetY: 0,
  rows: ['..D..DD..DD..D....', '.DhDDhhDDhhDDhD...', '.DhhhhhhhhhhhhhD..', '.DhhhhhhhhhhhhhD..', '..DhhHHHHHHHHhhD..'],
};

const LONG_HAIR: Overlay = {
  offsetY: 5,
  rows: ['DHH............HHD', 'DHH............HHD', 'DHH............HHD', 'DHH............HHD', 'DHH............HHD', 'DHH............HHD', 'DHH............HHD', 'DHh............hHD', '.DD............DD.'],
};

const BUN_HAIR: Overlay = {
  offsetY: 0,
  rows: ['.......DDDD.......', '......DhhhhD......', '.....DhhhhhhD.....', '....DDhhhhhhDD....'],
};

const CAP_HAIR: Overlay = {
  offsetY: 0,
  rows: ['.....DDDDDDDD.....', '....DAAAAAAAAD....', '...DAAAAAAAAAAD...', '..DAAAAAAAAAAAAD..', '..DAAAAAAAAAAAAD..', '.DDDDDDDDDDDDDDDD.', '.DAAAAAAAAAAAAAAD.'],
};

const GLASSES: Overlay = {
  offsetY: 7,
  rows: ['...AAAAA..AAAAA...', '...A...A..A...A...', '...A...AAAA...A...', '...A...A..A...A...', '...AAAAA..AAAAA...'],
};

const HEADPHONES: Overlay = {
  offsetY: 2,
  rows: ['..DDDDDDDDDDDDDD..', '.DAD..........DAD.', 'DAAD..........DAAD', 'DAAD..........DAAD', 'DAAD..........DAAD', 'DAAD..........DAAD', 'DAAD..........DAAD', '.DD............DD.'],
};

const TIE: Overlay = {
  offsetY: 15,
  rows: ['.......DAAD.......', '........AA........', '........AA........', '........AA........', '.......DAAD.......', '........DD........'],
};

const BEARD: Overlay = {
  offsetY: 11,
  rows: ['.DSAASSSMMSSSAASD.', '..DAAAASSSSAAAAD..', '...DAAAAAAAAAAD...'],
};

export const HAIR_OVERLAYS: Readonly<Record<HairStyle, Overlay | null>> = {
  [HairStyle.Short]: null,
  [HairStyle.Spiky]: SPIKY_HAIR,
  [HairStyle.Long]: LONG_HAIR,
  [HairStyle.Bun]: BUN_HAIR,
  [HairStyle.Cap]: CAP_HAIR,
};

export const ACCESSORY_OVERLAYS: Readonly<Record<Accessory, Overlay | null>> = {
  [Accessory.None]: null,
  [Accessory.Glasses]: GLASSES,
  [Accessory.Headphones]: HEADPHONES,
  [Accessory.Tie]: TIE,
  [Accessory.Beard]: BEARD,
};
