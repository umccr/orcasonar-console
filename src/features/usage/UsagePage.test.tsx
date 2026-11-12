import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { answer, json, pathOf, requests } from '@/test/fetch-mock';
import { renderPage } from '@/test/render';
import { UsagePage } from './UsagePage';

const USAGE = {
  from: '2026-10-29T12:00:00.000Z',
  to: '2026-11-05T12:00:00.000Z',
  totals: { people: 2, questions: 12, costUsd: 0.2 },
  callers: [
    {
      id: 'sub-1',
      email: 'a.reader@umccr.org',
      questions: 9,
      answered: 7,
      notCovered: 1,
      failed: 1,
      costUsd: 0.15,
      inputTokens: 40_000,
      outputTokens: 3_000,
      lastAt: '2026-11-05T11:00:00.000Z',
    },
    {
      id: 'sub-2',
      email: 'b.reader@umccr.org',
      questions: 3,
      answered: 3,
      notCovered: 0,
      failed: 0,
      costUsd: 0.05,
      inputTokens: 15_000,
      outputTokens: 1_200,
      lastAt: '2026-11-01T11:00:00.000Z',
    },
  ],
};

describe('Usage', () => {
  it('shows the window’s totals and each reader, linked to their conversations', async () => {
    answer((request) => (pathOf(request).startsWith('/audit/usage') ? json(USAGE) : json({}, 404)));
    renderPage(<UsagePage />);

    const link = await screen.findByRole('link', { name: 'a.reader@umccr.org' });
    expect(link).toHaveAttribute('href', '/audit?caller=a.reader%40umccr.org');
    expect(screen.getByRole('link', { name: 'b.reader@umccr.org' })).toBeInTheDocument();
    expect(screen.getByText('US$0.20')).toBeInTheDocument();
    // 10 of the 12 questions were answered.
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('$0.1500')).toBeInTheDocument();
  });

  it('asks for the week up to when the page opened', async () => {
    answer(() => json(USAGE));
    renderPage(<UsagePage />);
    await screen.findByText('a.reader@umccr.org');

    const url = new URL(requests[0]?.url ?? '');
    const from = Date.parse(url.searchParams.get('from') ?? '');
    const to = Date.parse(url.searchParams.get('to') ?? '');
    expect(to - from).toBe(7 * 86_400_000);
  });

  it('filters readers by email', async () => {
    answer(() => json(USAGE));
    const { user } = renderPage(<UsagePage />);
    await screen.findByText('a.reader@umccr.org');

    await user.type(screen.getByRole('textbox', { name: 'Filter readers by email' }), 'b.reader');
    expect(screen.queryByText('a.reader@umccr.org')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 readers')).toBeInTheDocument();
  });

  it('tells a reader outside the audit group that the page is not for them', async () => {
    answer(() =>
      json({ error: { code: 'forbidden', message: 'The audit log is for the admin group.' } }, 403)
    );
    renderPage(<UsagePage />);

    expect(await screen.findByText('The audit pages are for the admin group')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Chat' })).toHaveAttribute('href', '/chat');
  });
});
