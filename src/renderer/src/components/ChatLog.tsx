import { useEffect, useRef } from 'react';

import { CEO_AUTHOR_ID } from '@shared/tasks';

import type React from 'react';
import type { Figure } from '@shared/figures';
import type { ChatMessage } from '@shared/tasks';

interface ChatLogProps {
  messages: readonly ChatMessage[];
  figures: readonly Figure[];
  /** Collapsed shows only the last message. */
  isExpanded: boolean;
}

const YOU_LABEL = 'You';
const UNKNOWN_AUTHOR = 'Someone';
const EMPTY_TEXT = 'Ask the team anything. Mention @Name to pick who answers.';
const COLLAPSED_COUNT = 1;
const MESSAGE_CLASS = 'chat-log__message';
const CEO_MODIFIER = '--ceo';
const FIGURE_MODIFIER = '--figure';

function authorName(authorId: string, figures: readonly Figure[]): string {
  if (authorId === CEO_AUTHOR_ID) return YOU_LABEL;
  return figures.find((figure: Figure): boolean => figure.id === authorId)?.name ?? UNKNOWN_AUTHOR;
}

/** The HUD chat history, newest at the bottom, kept scrolled to the latest line. */
export function ChatLog({ messages, figures, isExpanded }: ChatLogProps): React.JSX.Element {
  const listRef = useRef<HTMLOListElement>(null);
  const shown = isExpanded ? messages : messages.slice(-COLLAPSED_COUNT);

  useEffect((): void => {
    const list = listRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [shown.length, isExpanded]);

  if (shown.length === 0) return <p className="chat-log__empty">{EMPTY_TEXT}</p>;
  return (
    <ol ref={listRef} className={`chat-log${isExpanded ? ' chat-log--expanded' : ''}`} aria-label="Chat history" aria-live="polite">
      {shown.map(
        (message: ChatMessage): React.JSX.Element => (
          <li key={message.id} className={`${MESSAGE_CLASS} ${MESSAGE_CLASS}${message.authorId === CEO_AUTHOR_ID ? CEO_MODIFIER : FIGURE_MODIFIER}`}>
            <span className="chat-log__author">{authorName(message.authorId, figures)}</span>
            <span className="chat-log__text">{message.text}</span>
          </li>
        ),
      )}
    </ol>
  );
}
