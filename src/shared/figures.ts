export enum RoomKey {
  Lobby = 'lobby',
  ResearchAndDevelopment = 'rnd',
  Product = 'product',
  MeetingRoom = 'meeting',
  Marketing = 'marketing',
  Sales = 'sales',
  Finance = 'finance',
  Operations = 'ops',
}

export enum HairStyle {
  Short = 'short',
  Long = 'long',
  Spiky = 'spiky',
  Bun = 'bun',
  Cap = 'cap',
}

export enum Accessory {
  None = 'none',
  Glasses = 'glasses',
  Headphones = 'headphones',
  Tie = 'tie',
  Beard = 'beard',
}

export enum FigureState {
  Idle = 'idle',
  Working = 'working',
  Done = 'done',
  Error = 'error',
  Meeting = 'meeting',
}

/** Everything that decides how a figure is drawn. Colors are CSS hex strings. */
export interface FigureLook {
  hairStyle: HairStyle;
  hairColor: string;
  skinColor: string;
  topColor: string;
  pantsColor: string;
  accessory: Accessory;
  accessoryColor: string;
}

export interface Figure {
  id: string;
  name: string;
  job: string;
  room: RoomKey;
  /** Which desk in the room this figure sits at, in room desk order. */
  deskIndex: number;
  look: FigureLook;
  rolePrompt: string;
  state: FigureState;
  level: number;
  xp: number;
}

const SKIN_LIGHT = '#f5c9a2';
const SKIN_TAN = '#d9a072';
const SKIN_DEEP = '#8d5a3c';
const HAIR_BROWN = '#5a3a22';
const HAIR_BLACK = '#2b1b3d';
const HAIR_BLONDE = '#e0b04a';
const HAIR_RED = '#b8472d';
const HAIR_GREY = '#9a9ab0';
const PANTS_NAVY = '#26305a';
const PANTS_DARK = '#1f1a33';
const PANTS_KHAKI = '#7a6a4a';
const NO_ACCESSORY_COLOR = '#000000';

function look(partial: Omit<FigureLook, 'skinColor' | 'pantsColor' | 'accessoryColor'> & Partial<FigureLook>): FigureLook {
  return {
    skinColor: SKIN_LIGHT,
    pantsColor: PANTS_NAVY,
    accessoryColor: NO_ACCESSORY_COLOR,
    ...partial,
  };
}

function figure(id: string, name: string, job: string, room: RoomKey, deskIndex: number, figureLook: FigureLook, rolePrompt: string): Figure {
  return { id, name, job, room, deskIndex, look: figureLook, rolePrompt, state: FigureState.Idle, level: 1, xp: 0 };
}

export const DEFAULT_FIGURES: readonly Figure[] = [
  figure('frontend', 'Maya', 'Frontend dev', RoomKey.ResearchAndDevelopment, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BROWN, topColor: '#7b5cff', accessory: Accessory.Glasses, accessoryColor: '#1a1330' }), 'You are the frontend developer. You own the UI code, components, styling and client-side state.'),
  figure('backend', 'Tom', 'Backend dev', RoomKey.ResearchAndDevelopment, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BLACK, topColor: '#2f3e5c', accessory: Accessory.Headphones, accessoryColor: '#ff4d6d', skinColor: SKIN_TAN }), 'You are the backend developer. You own the API, services, database schema and integrations.'),
  figure('uiux', 'Noa', 'UI/UX designer', RoomKey.ResearchAndDevelopment, 2, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_RED, topColor: '#ff8ad4', accessory: Accessory.None }), 'You are the UI/UX designer. You own flows, layout, accessibility and visual consistency.'),
  figure('qa', 'Dan', 'QA engineer', RoomKey.ResearchAndDevelopment, 3, look({ hairStyle: HairStyle.Spiky, hairColor: HAIR_BLONDE, topColor: '#3f9a4a', accessory: Accessory.Glasses, accessoryColor: '#1a1330', pantsColor: PANTS_DARK }), 'You are the QA engineer. You own tests, coverage, regressions and release quality.'),
  figure('devops', 'Lior', 'DevOps', RoomKey.ResearchAndDevelopment, 4, look({ hairStyle: HairStyle.Cap, hairColor: HAIR_BROWN, topColor: '#ff8a3d', accessory: Accessory.Beard, accessoryColor: HAIR_BROWN, skinColor: SKIN_DEEP }), 'You are the DevOps engineer. You own CI, deployment, infrastructure and observability.'),
  figure('pm', 'Yael', 'Product manager', RoomKey.Product, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLACK, topColor: '#26305a', accessory: Accessory.None, pantsColor: PANTS_DARK }), 'You are the product manager. You own priorities, user stories, scope and the roadmap.'),
  figure('data', 'Omer', 'Data analyst', RoomKey.Product, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BROWN, topColor: '#2e8a8a', accessory: Accessory.Glasses, accessoryColor: '#1a1330', skinColor: SKIN_TAN }), 'You are the data analyst. You own metrics, analytics events, dashboards and experiments.'),
  figure('content', 'Shira', 'Content marketer', RoomKey.Marketing, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLONDE, topColor: '#ff6f91', accessory: Accessory.None }), 'You are the content marketer. You own copy, landing pages, blog posts and messaging.'),
  figure('growth', 'Eitan', 'Growth marketer', RoomKey.Marketing, 1, look({ hairStyle: HairStyle.Spiky, hairColor: HAIR_BLACK, topColor: '#ffd866', accessory: Accessory.None, pantsColor: PANTS_DARK, skinColor: SKIN_TAN }), 'You are the growth marketer. You own funnels, onboarding, SEO and acquisition experiments.'),
  figure('designer', 'Roni', 'Designer', RoomKey.Marketing, 2, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_BROWN, topColor: '#9b6bff', accessory: Accessory.Headphones, accessoryColor: '#ffd866' }), 'You are the brand designer. You own visual identity, marketing assets and illustrations.'),
  figure('sales', 'Adi', 'Sales rep', RoomKey.Sales, 0, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BROWN, topColor: '#f1ecff', accessory: Accessory.Tie, accessoryColor: '#3a7bd5', pantsColor: PANTS_DARK }), 'You are the sales rep. You own pricing pages, demos, objections and the sales pitch.'),
  figure('success', 'Gal', 'Customer success', RoomKey.Sales, 1, look({ hairStyle: HairStyle.Long, hairColor: HAIR_RED, topColor: '#3fbf7f', accessory: Accessory.None, pantsColor: PANTS_KHAKI }), 'You are customer success. You own onboarding docs, support flows and churn signals.'),
  figure('accountant', 'Miri', 'Accountant', RoomKey.Finance, 0, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_GREY, topColor: '#8a8aa8', accessory: Accessory.Glasses, accessoryColor: '#4a3b7a' }), 'You are the accountant. You own costs, billing code, invoices and financial reports.'),
  figure('fundraising', 'Yoav', 'Fundraising lead', RoomKey.Finance, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BLACK, topColor: '#1f2a4a', accessory: Accessory.Tie, accessoryColor: '#ffd866', pantsColor: PANTS_DARK, skinColor: SKIN_DEEP }), 'You are the fundraising lead. You own the pitch deck, investor updates and runway math.'),
  figure('office', 'Tal', 'Office manager', RoomKey.Operations, 0, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_BLONDE, topColor: '#ff9f5a', accessory: Accessory.None, pantsColor: PANTS_KHAKI }), 'You are the office manager. You own tooling, licenses, vendors and internal processes.'),
  figure('recruiter', 'Dana', 'Recruiter', RoomKey.Operations, 1, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLACK, topColor: '#4fc3c3', accessory: Accessory.None, skinColor: SKIN_TAN }), 'You are the recruiter. You own job descriptions, hiring plans and team structure.'),
];
