import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { answer, json, pathOf, requests, sse } from '@/test/fetch-mock';
import { renderPage } from '@/test/render';
import { ChatPage } from './ChatPage';

const CONVERSATION = `c_${'c'.repeat(32)}`;
const streamed = (text: string) =>
  sse([
    { event: 'meta', data: { exchangeId: `x_${'e'.repeat(32)}`, conversationId: CONVERSATION } },
    { event: 'delta', data: { text } },
    {
      event: 'citations',
      data: [
        {
          ref: 1,
          id: 'platform:onboarding',
          title: 'Onboarding a repository',
          url: 'https://docs.umccr.org/platform/onboarding/',
          site: 'platform',
          snippet: 'Register the site.',
          score: 0.82,
        },
      ],
    },
    { event: 'done', data: { usage: { inputTokens: 4920, outputTokens: 388 }, costUsd: 0.0213 } },
  ]);

describe('Chat', () => {
  it('streams an answer with its sources, tokens and cost, and follows up in the same conversation', async () => {
    answer(() => streamed('Add one entry to the site registry [1].'));
    const { user } = renderPage(<ChatPage />, '/chat');

    const question = screen.getByRole('textbox', { name: 'Your question' });
    await user.type(question, 'How do I add a site?{Enter}');

    expect(await screen.findByText(/Add one entry to the site registry/)).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText(/4,920 in \/ 388 out tokens · US\$0\.0213/)).toBeInTheDocument();
    expect(screen.getByText('Onboarding a repository')).toBeInTheDocument();
    expect(await requests[0]?.json()).toEqual({ query: 'How do I add a site?', mode: 'ask' });

    await user.type(question, 'And then?{Enter}');
    await screen.findAllByText(/Add one entry to the site registry/);
    const followUp = requests.findLast((request) => pathOf(request) === '/chat');
    expect(await followUp?.json()).toEqual({
      query: 'And then?',
      mode: 'ask',
      conversationId: CONVERSATION,
    });
  });

  it('says when today’s allowance is used, and when it comes back', async () => {
    answer(() =>
      json(
        { error: { code: 'over-budget', message: 'Today’s allowance is used.', retryAfter: 600 } },
        429
      )
    );
    const { user } = renderPage(<ChatPage />, '/chat');

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'One more?{Enter}');
    expect(await screen.findByText("You've used today's allowance")).toBeInTheDocument();
    expect(
      screen.getByText('It resets at midnight Melbourne time (in 10 min).')
    ).toBeInTheDocument();
  });

  it('reopens a conversation from history, to carry on', async () => {
    answer((request) =>
      pathOf(request) === `/chat/history/${CONVERSATION}`
        ? json({
            conversationId: CONVERSATION,
            exchanges: [
              {
                exchangeId: `x_${'f'.repeat(32)}`,
                at: '2026-11-05T03:30:00.000Z',
                question: 'How do I add a site?',
                answer: 'Add one entry to the site registry.',
                citations: [],
              },
            ],
          })
        : streamed('Then push your docs.')
    );
    const { user } = renderPage(<ChatPage />, `/chat?conversation=${CONVERSATION}`);

    expect(await screen.findByText('Add one entry to the site registry.')).toBeInTheDocument();
    expect(screen.getByText('From history')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'And then?{Enter}');
    expect(await screen.findByText('Then push your docs.')).toBeInTheDocument();
    const followUp = requests.findLast((request) => pathOf(request) === '/chat');
    expect(await followUp?.json()).toMatchObject({ conversationId: CONVERSATION });
  });
});
