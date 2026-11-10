import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Markdown } from './markdown';

const renderMarkdown = (text: string, onCite = vi.fn()) => {
  const view = render(
    <TooltipProvider>
      <Markdown
        text={text}
        onCite={onCite}
        sources={[
          { ref: 1, id: 'platform:onboarding', title: 'Onboarding', url: 'https://x', score: 0.8 },
        ]}
      />
    </TooltipProvider>
  );
  return { ...view, onCite };
};

describe('an answer’s Markdown', () => {
  it('turns [n] into a chip that cites the source', async () => {
    const { container, onCite } = renderMarkdown('Add one entry to the registry [1].');
    const chip = container.querySelector('[data-cite="1"]');
    expect(chip).not.toBeNull();
    (chip as HTMLButtonElement).click();
    await vi.waitFor(() => expect(onCite).toHaveBeenCalledWith(1));
  });

  it('leaves [n] in code as it is', () => {
    const { container } = renderMarkdown('Use `items[1]` here.');
    expect(container.querySelector('[data-cite]')).toBeNull();
    expect(screen.getByText('items[1]').tagName).toBe('CODE');
  });

  it('never inserts HTML from an answer', () => {
    const { container } = renderMarkdown(
      'Hi <img src=x onerror="alert(1)"> <script>alert(2)</script>'
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('opens links in a new tab, without telling the page where from', () => {
    renderMarkdown('See [the guide](https://docs.umccr.org/platform/).');
    const link = screen.getByRole('link', { name: 'the guide' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
