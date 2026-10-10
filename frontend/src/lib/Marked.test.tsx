import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Marked } from './Marked';

const marks = (container: HTMLElement) =>
  [...container.querySelectorAll('mark')].map((mark) => mark.textContent);

describe('Marked', () => {
  it('wraps each match in a mark, and the text reads exactly as it was written', () => {
    const { container } = render(
      <p>
        <Marked text="Boss rush, then the BOSS." words={['boss']} />
      </p>,
    );

    expect(container.textContent).toBe('Boss rush, then the BOSS.');
    expect(marks(container)).toEqual(['Boss', 'BOSS']);
  });

  it('marks nothing when there are no words to mark', () => {
    const { container } = render(
      <p>
        <Marked text="Started on the Switch 2." words={[]} />
      </p>,
    );

    expect(container.textContent).toBe('Started on the Switch 2.');
    expect(marks(container)).toEqual([]);
  });
});
