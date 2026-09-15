import type { Figure } from './figures';

/** A quest: something the CEO asked a figure to do. */
export enum TaskStatus {
  Backlog = 'backlog',
  Active = 'active',
  Review = 'review',
  Done = 'done',
  Failed = 'failed',
}

export interface Task {
  id: string;
  floorId: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  /** The claude run doing the work; null until it is queued. */
  runId: string | null;
  createdAt: string;
}

/** One line in the HUD chat: the CEO's ask or a figure's reply. */
export interface ChatMessage {
  id: string;
  floorId: string;
  /** `CEO_AUTHOR_ID` or a figure id. */
  authorId: string;
  text: string;
  createdAt: string;
}

export const CEO_AUTHOR_ID = 'ceo';
export const MAX_TASK_LENGTH = 500;
/** The figure that catches asks nobody else matches, when it is on the floor. */
export const DEFAULT_ASSIGNEE_ID = 'pm';
const MENTION_PREFIX = '@';
const MENTION_PATTERN = /(^|\s)@([\w-]+)/;
const WORD_PATTERN = /[a-z0-9]+/g;
const WHITESPACE = /\s+/g;

/** Words in an ask that point at one of the default figures, beyond its job title. */
const KEYWORD_FIGURE_IDS: Readonly<Record<string, string>> = {
  ui: 'frontend', css: 'frontend', react: 'frontend', component: 'frontend', page: 'frontend', screen: 'frontend',
  api: 'backend', server: 'backend', database: 'backend', db: 'backend', endpoint: 'backend', migration: 'backend',
  design: 'uiux', figma: 'uiux', ux: 'uiux', layout: 'uiux',
  test: 'qa', tests: 'qa', testing: 'qa', bug: 'qa', bugs: 'qa', regression: 'qa', coverage: 'qa',
  deploy: 'devops', ci: 'devops', docker: 'devops', pipeline: 'devops', build: 'devops', release: 'devops',
  roadmap: 'pm', spec: 'pm', prd: 'pm', feature: 'pm', priority: 'pm', scope: 'pm',
  metrics: 'data', analytics: 'data', sql: 'data', dashboard: 'data', numbers: 'data',
  blog: 'content', copy: 'content', post: 'content', newsletter: 'content', readme: 'content', docs: 'content',
  seo: 'growth', ads: 'growth', campaign: 'growth', funnel: 'growth', launch: 'growth',
  logo: 'designer', brand: 'designer', icon: 'designer', banner: 'designer',
  customer: 'sales', demo: 'sales', lead: 'sales', pricing: 'sales', deal: 'sales',
  onboarding: 'success', support: 'success', churn: 'success', feedback: 'success',
  budget: 'accountant', invoice: 'accountant', cost: 'accountant', costs: 'accountant', expenses: 'accountant',
  investor: 'fundraising', investors: 'fundraising', pitch: 'fundraising', deck: 'fundraising', funding: 'fundraising',
  hire: 'recruiter', hiring: 'recruiter', candidate: 'recruiter', interview: 'recruiter', recruit: 'recruiter',
  supplies: 'office', vendor: 'office', calendar: 'office', event: 'office',
};

export interface RoutedTask {
  assigneeId: string;
  /** The ask with any @mention removed. */
  title: string;
}

function words(text: string): string[] {
  return text.toLowerCase().match(WORD_PATTERN) ?? [];
}

function findMentioned(text: string, figures: readonly Figure[]): Figure | undefined {
  const mention = MENTION_PATTERN.exec(text)?.[2]?.toLowerCase();
  if (mention === undefined) return undefined;
  return figures.find((figure: Figure): boolean => figure.id.toLowerCase() === mention || figure.name.toLowerCase() === mention);
}

/** Points scored by a figure for an ask: its id, job words and known keywords found in the text. */
function scoreFigure(figure: Figure, askWords: readonly string[]): number {
  const jobWords = new Set(words(figure.job));
  return askWords.reduce((score: number, word: string): number => {
    if (word === figure.id.toLowerCase() || jobWords.has(word)) return score + 1;
    return KEYWORD_FIGURE_IDS[word] === figure.id ? score + 1 : score;
  }, 0);
}

function findByKeywords(text: string, figures: readonly Figure[]): Figure | undefined {
  const askWords = words(text);
  let best: { figure: Figure; score: number } | undefined;
  figures.forEach((figure: Figure): void => {
    const score = scoreFigure(figure, askWords);
    if (score > 0 && (best === undefined || score > best.score)) best = { figure, score };
  });
  return best?.figure;
}

/**
 * Who should take an ask: an @name or @id mention wins, then the figure whose job or known
 * keywords match most words, then the product manager, then the first figure. Null with no figures.
 */
export function routeTask(text: string, figures: readonly Figure[]): RoutedTask | null {
  const title = text.replace(MENTION_PATTERN, ' ').replace(WHITESPACE, ' ').trim();
  if (title === '' || figures.length === 0) return null;
  const assignee = findMentioned(text, figures) ?? findByKeywords(title, figures) ?? figures.find((figure: Figure): boolean => figure.id === DEFAULT_ASSIGNEE_ID) ?? figures[0];
  return assignee === undefined ? null : { assigneeId: assignee.id, title };
}

export function mentionFor(figure: Figure): string {
  return `${MENTION_PREFIX}${figure.name}`;
}
