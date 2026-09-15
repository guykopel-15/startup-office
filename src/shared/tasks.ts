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
/** Everything after the @ up to the end of the line; the figure name is matched against its start. */
const MENTION_PATTERN = /(?:^|\s)@(?<rest>.*)$/su;
const PUNCTUATION = /[\s.,;:!?'"]/u;
const LEADING_PUNCTUATION = /^[\s.,;:!?'"]+/u;
/** Letters and digits in any script, so Hebrew names and job titles route too. */
const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
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
  /** The ask with the @mention removed. */
  title: string;
}

interface Mention {
  figure: Figure;
  /** The ask with the mention cut out. */
  title: string;
}

function words(text: string): string[] {
  return text.toLowerCase().match(WORD_PATTERN) ?? [];
}

/** Whether `rest` (the text after an @) starts with `label` as a whole word, ignoring case. */
function startsWithLabel(rest: string, label: string): boolean {
  const head = rest.slice(0, label.length);
  const next = rest.slice(label.length, label.length + 1);
  return head.toLowerCase() === label.toLowerCase() && (next === '' || PUNCTUATION.test(next));
}

/** "@Maya, fix the header" or "@Ana Maria fix it": the longest figure name or id at the mention wins. */
function findMention(text: string, figures: readonly Figure[]): Mention | undefined {
  const match = MENTION_PATTERN.exec(text);
  const rest = match?.groups?.['rest'];
  if (match === null || match === undefined || rest === undefined) return undefined;
  const candidates = figures.flatMap((figure: Figure): { figure: Figure; label: string }[] => [
    { figure, label: figure.name },
    { figure, label: figure.id },
  ]);
  const hit = candidates.filter((candidate): boolean => startsWithLabel(rest, candidate.label)).sort((a, b): number => b.label.length - a.label.length)[0];
  if (hit === undefined) return undefined;
  const before = text.slice(0, match.index);
  const tail = rest.slice(hit.label.length).replace(LEADING_PUNCTUATION, '');
  return { figure: hit.figure, title: `${before} ${tail}`.replace(WHITESPACE, ' ').trim() };
}

/** Points scored by a figure for an ask: its id, job words and known keywords found in the text. */
function scoreFigure(figure: Figure, askWords: readonly string[]): number {
  const jobWords = new Set(words(figure.job));
  return askWords.reduce((score: number, word: string): number => {
    if (word === figure.id.toLowerCase() || jobWords.has(word)) return score + 1;
    return KEYWORD_FIGURE_IDS[word] === figure.id ? score + 1 : score;
  }, 0);
}

/** The best-scoring figure; on a tie the earlier figure on the floor wins. */
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
 * keywords match most words, then the product manager, then the first figure. An unknown
 * mention is left in the text and routed by keywords. Null with no figures or no text.
 */
export function routeTask(text: string, figures: readonly Figure[]): RoutedTask | null {
  if (figures.length === 0) return null;
  const mention = findMention(text, figures);
  const title = (mention?.title ?? text).replace(WHITESPACE, ' ').trim();
  if (title === '') return null;
  const assignee = mention?.figure ?? findByKeywords(title, figures) ?? figures.find((figure: Figure): boolean => figure.id === DEFAULT_ASSIGNEE_ID) ?? figures[0];
  return assignee === undefined ? null : { assigneeId: assignee.id, title };
}

export function mentionFor(figure: Figure): string {
  return `${MENTION_PREFIX}${figure.name}`;
}
