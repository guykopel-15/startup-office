import { THEME_COLORS } from './theme';

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

/** Everything that decides how a figure is drawn. Colors are CSS `#rrggbb` strings. */
export interface FigureLook {
  hairStyle: HairStyle;
  hairColor: string;
  skinColor: string;
  topColor: string;
  pantsColor: string;
  accessory: Accessory;
  accessoryColor: string;
  /** Only used by the cap hair style. */
  hatColor: string;
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
  experiencePoints: number;
}

export const STARTING_LEVEL = 1;
export const STARTING_EXPERIENCE = 0;
export const NAME_MAX_LENGTH = 24;
export const JOB_MAX_LENGTH = 32;

export const SKIN_LIGHT = '#f5c9a2';
const SKIN_TAN = '#d9a072';
const SKIN_DEEP = '#8d5a3c';
export const HAIR_BROWN = '#5a3a22';
const HAIR_BLACK = '#2b1b3d';
const HAIR_BLONDE = '#e0b04a';
const HAIR_RED = '#b8472d';
const HAIR_GREY = '#9a9ab0';
export const PANTS_NAVY = '#26305a';
const PANTS_DARK = '#1f1a33';
const PANTS_KHAKI = '#7a6a4a';
export const TOP_PURPLE = '#7b5cff';
const TOP_SLATE = '#2f3e5c';
const TOP_PINK = '#ff8ad4';
const TOP_GREEN = '#3f9a4a';
const TOP_ORANGE = '#ff8a3d';
const TOP_NAVY = PANTS_NAVY;
const TOP_TEAL = '#2e8a8a';
const TOP_ROSE = '#ff6f91';
const TOP_YELLOW = THEME_COLORS.accent;
const TOP_VIOLET = '#9b6bff';
const TOP_WHITE = THEME_COLORS.text;
const TOP_MINT = '#3fbf7f';
const TOP_GREY = '#8a8aa8';
const TOP_MIDNIGHT = '#1f2a4a';
const TOP_AMBER = '#ff9f5a';
const TOP_CYAN = '#4fc3c3';
export const GLASSES_FRAME = THEME_COLORS.background;
const GLASSES_FRAME_PURPLE = THEME_COLORS.border;
const HEADPHONES_RED = '#ff4d6d';
const TIE_BLUE = '#3a7bd5';
export const HAT_BLUE = TIE_BLUE;
const NO_ACCESSORY_COLOR = '#000000';

type LookInput = Pick<FigureLook, 'hairStyle' | 'hairColor' | 'topColor' | 'accessory'> & Partial<FigureLook>;

function look(partial: LookInput): FigureLook {
  return {
    skinColor: SKIN_LIGHT,
    pantsColor: PANTS_NAVY,
    accessoryColor: NO_ACCESSORY_COLOR,
    hatColor: HAT_BLUE,
    ...partial,
  };
}

/** The look a new figure starts with in the Add figure dialog. */
export const DEFAULT_LOOK: FigureLook = {
  hairStyle: HairStyle.Short,
  hairColor: HAIR_BROWN,
  skinColor: SKIN_LIGHT,
  topColor: TOP_PURPLE,
  pantsColor: PANTS_NAVY,
  accessory: Accessory.None,
  accessoryColor: GLASSES_FRAME,
  hatColor: HAT_BLUE,
};

/** Trims and validates the text a figure is created with. */
export function isValidFigureText(name: string, job: string): boolean {
  const trimmedName = name.trim();
  const trimmedJob = job.trim();
  return trimmedName.length > 0 && trimmedName.length <= NAME_MAX_LENGTH && trimmedJob.length > 0 && trimmedJob.length <= JOB_MAX_LENGTH;
}

function figure(id: string, name: string, job: string, room: RoomKey, deskIndex: number, figureLook: FigureLook, rolePrompt: string): Figure {
  return { id, name, job, room, deskIndex, look: figureLook, rolePrompt, state: FigureState.Idle, level: STARTING_LEVEL, experiencePoints: STARTING_EXPERIENCE };
}

export const DEFAULT_FIGURES: readonly Figure[] = [
  figure('frontend', 'Maya', 'Frontend dev', RoomKey.ResearchAndDevelopment, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BROWN, topColor: TOP_PURPLE, accessory: Accessory.Glasses, accessoryColor: GLASSES_FRAME }), 'You are the frontend developer. You own the UI code, components, styling and client-side state.'),
  figure('backend', 'Tom', 'Backend dev', RoomKey.ResearchAndDevelopment, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BLACK, topColor: TOP_SLATE, accessory: Accessory.Headphones, accessoryColor: HEADPHONES_RED, skinColor: SKIN_TAN }), 'You are the backend developer. You own the API, services, database schema and integrations.'),
  figure('uiux', 'Noa', 'UI/UX designer', RoomKey.ResearchAndDevelopment, 2, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_RED, topColor: TOP_PINK, accessory: Accessory.None }), 'You are the UI/UX designer. You own flows, layout, accessibility and visual consistency.'),
  figure('qa', 'Dan', 'QA engineer', RoomKey.ResearchAndDevelopment, 3, look({ hairStyle: HairStyle.Spiky, hairColor: HAIR_BLONDE, topColor: TOP_GREEN, accessory: Accessory.Glasses, accessoryColor: GLASSES_FRAME, pantsColor: PANTS_DARK }), 'You are the QA engineer. You own tests, coverage, regressions and release quality.'),
  figure('devops', 'Lior', 'DevOps', RoomKey.ResearchAndDevelopment, 4, look({ hairStyle: HairStyle.Cap, hairColor: HAIR_BROWN, topColor: TOP_ORANGE, accessory: Accessory.Beard, accessoryColor: HAIR_BROWN, skinColor: SKIN_DEEP }), 'You are the DevOps engineer. You own CI, deployment, infrastructure and observability.'),
  figure('pm', 'Yael', 'Product manager', RoomKey.Product, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLACK, topColor: TOP_NAVY, accessory: Accessory.None, pantsColor: PANTS_DARK }), 'You are the product manager. You own priorities, user stories, scope and the roadmap.'),
  figure('data', 'Omer', 'Data analyst', RoomKey.Product, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BROWN, topColor: TOP_TEAL, accessory: Accessory.Glasses, accessoryColor: GLASSES_FRAME, skinColor: SKIN_TAN }), 'You are the data analyst. You own metrics, analytics events, dashboards and experiments.'),
  figure('content', 'Shira', 'Content marketer', RoomKey.Marketing, 0, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLONDE, topColor: TOP_ROSE, accessory: Accessory.None }), 'You are the content marketer. You own copy, landing pages, blog posts and messaging.'),
  figure('growth', 'Eitan', 'Growth marketer', RoomKey.Marketing, 1, look({ hairStyle: HairStyle.Spiky, hairColor: HAIR_BLACK, topColor: TOP_YELLOW, accessory: Accessory.None, pantsColor: PANTS_DARK, skinColor: SKIN_TAN }), 'You are the growth marketer. You own funnels, onboarding, SEO and acquisition experiments.'),
  figure('designer', 'Roni', 'Designer', RoomKey.Marketing, 2, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_BROWN, topColor: TOP_VIOLET, accessory: Accessory.Headphones, accessoryColor: TOP_YELLOW }), 'You are the brand designer. You own visual identity, marketing assets and illustrations.'),
  figure('sales', 'Adi', 'Sales rep', RoomKey.Sales, 0, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BROWN, topColor: TOP_WHITE, accessory: Accessory.Tie, accessoryColor: TIE_BLUE, pantsColor: PANTS_DARK }), 'You are the sales rep. You own pricing pages, demos, objections and the sales pitch.'),
  figure('success', 'Gal', 'Customer success', RoomKey.Sales, 1, look({ hairStyle: HairStyle.Long, hairColor: HAIR_RED, topColor: TOP_MINT, accessory: Accessory.None, pantsColor: PANTS_KHAKI }), 'You are customer success. You own onboarding docs, support flows and churn signals.'),
  figure('accountant', 'Miri', 'Accountant', RoomKey.Finance, 0, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_GREY, topColor: TOP_GREY, accessory: Accessory.Glasses, accessoryColor: GLASSES_FRAME_PURPLE }), 'You are the accountant. You own costs, billing code, invoices and financial reports.'),
  figure('fundraising', 'Yoav', 'Fundraising lead', RoomKey.Finance, 1, look({ hairStyle: HairStyle.Short, hairColor: HAIR_BLACK, topColor: TOP_MIDNIGHT, accessory: Accessory.Tie, accessoryColor: TOP_YELLOW, pantsColor: PANTS_DARK, skinColor: SKIN_DEEP }), 'You are the fundraising lead. You own the pitch deck, investor updates and runway math.'),
  figure('office', 'Tal', 'Office manager', RoomKey.Operations, 0, look({ hairStyle: HairStyle.Bun, hairColor: HAIR_BLONDE, topColor: TOP_AMBER, accessory: Accessory.None, pantsColor: PANTS_KHAKI }), 'You are the office manager. You own tooling, licenses, vendors and internal processes.'),
  figure('recruiter', 'Dana', 'Recruiter', RoomKey.Operations, 1, look({ hairStyle: HairStyle.Long, hairColor: HAIR_BLACK, topColor: TOP_CYAN, accessory: Accessory.None, skinColor: SKIN_TAN }), 'You are the recruiter. You own job descriptions, hiring plans and team structure.'),
];
