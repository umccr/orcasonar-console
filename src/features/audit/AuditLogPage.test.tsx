import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { answer, json, pathOf, requests } from '@/test/fetch-mock';
import { renderPage } from '@/test/render';
import { AuditLogPage } from './AuditLogPage';

const C1 = `c_${'1'.repeat(32)}`;
const C2 = `c_${'2'.repeat(32)}`;
const conversation = (conversationId: string, firstQuestion: string) => ({
  conversationId,
  caller: { id: 'sub-1', email: 'a.reader@umccr.org', clientId: 'docs-app' },
  startedAt: '2026-11-05T03:30:00.000Z',
  lastAt: '2026-11-05T03:36:00.000Z',
  firstQuestion,
  questions: 3,
  answered: 2,
  notCovered: 0,
  failed: 1,
  sites: ['platform'],
  inputTokens: 14_820,
  outputTokens: 1_164,
  guardrailInterventions: 1,
  costUsd: 0.0341,
});

const USAGE = {
  from: '2026-10-29T12:00:00.000Z',
  to: '2026-11-05T12:00:00.000Z',
  totals: { people: 1, questions: 6, costUsd: 0.07 },
  callers: [],
};

const api = (request: Request) => {
  const path = pathOf(request);
  if (path.startsWith('/audit/usage')) {
    return json(USAGE);
  }
  if (path.startsWith('/audit/conversations?')) {
    const cursor = new URL(request.url).searchParams.get('cursor');
    return cursor === null
      ? json({
          ...USAGE,
          total: 2,
          items: [conversation(C1, 'How do I add a site?')],
          nextCursor: 'page-2',
        })
      : json({ ...USAGE, total: 2, items: [conversation(C2, 'Where are BCL Convert outputs?')] });
  }
  if (path === `/audit/conversations/${C1}`) {
    return json({
      conversationId: C1,
      exchanges: [
        {
          exchangeId: `x_${'a'.repeat(32)}`,
          at: '2026-11-05T03:30:00.000Z',
          caller: { id: 'sub-1', email: 'a.reader@umccr.org', clientId: 'docs-app' },
          outcome: 'answered',
          question: 'How do I add a site?',
          answer: 'Add one entry to the site registry [1].',
          sources: [
            {
              ref: 1,
              id: 'platform:onboarding',
              title: 'Onboarding a repository',
              url: 'https://docs.umccr.org/platform/onboarding/',
              site: 'platform',
              score: 0.82,
            },
          ],
          modelId: 'au.anthropic.claude-sonnet-5',
          usage: { inputTokens: 4920, outputTokens: 388 },
          costUsd: 0.0118,
          guardrail: 'none',
          latencyMs: 6200,
        },
      ],
    });
  }
  return json({ error: { code: 'not-found', message: 'No such endpoint.' } }, 404);
};

describe('the audit log', () => {
  it('lists conversations with their totals, and pages on by cursor in the same window', async () => {
    answer(api);
    const { user } = renderPage(<AuditLogPage />, '/audit');

    expect(await screen.findByText('How do I add a site?')).toBeInTheDocument();
    expect(screen.getByText('2 conversations')).toBeInTheDocument();
    expect(screen.getByText('2 answered')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('$0.0341')).toBeInTheDocument();

    const first = requests.find((request) => pathOf(request).startsWith('/audit/conversations?'));
    expect(new URL(first?.url ?? '').searchParams.get('from')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Where are BCL Convert outputs?')).toBeInTheDocument();
    const next = new URL(
      requests.findLast((request) => pathOf(request).includes('cursor='))?.url ?? ''
    );
    expect(next.searchParams.get('cursor')).toBe('page-2');
    expect(next.searchParams.get('from')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('opens a conversation from its row, with each answer and its sources', async () => {
    answer(api);
    const { user, router } = renderPage(<AuditLogPage />, '/audit');

    await user.click(await screen.findByText('How do I add a site?'));
    expect(router.state.location.search).toContain(`conversation=${C1}`);
    expect(await screen.findByText(/Add one entry to the site registry/)).toBeInTheDocument();
    expect(screen.getAllByText('Onboarding a repository').length).toBeGreaterThan(0);
    expect(screen.getByText('4,920 in / 388 out tokens')).toBeInTheDocument();
  });
});
