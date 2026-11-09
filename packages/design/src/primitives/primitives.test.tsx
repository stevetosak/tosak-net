import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button.tsx';
import { ChapterButton, ChapterList, PauseButton } from './Chapters.tsx';
import { Container } from './Container.tsx';
import { Cell, Grid } from './Grid.tsx';
import { Heading } from './Heading.tsx';
import { Readout } from './Readout.tsx';

const html = renderToStaticMarkup;

describe('Button', () => {
  it('is a link when it has an href', () => {
    expect(html(<Button href="/docs">Read</Button>)).toMatch(
      /^<a [^>]*href="\/docs"[^>]*>Read<\/a>$/,
    );
  });

  it('is a button of type button, which can be disabled, when it has none', () => {
    const out = html(<Button disabled>Run</Button>);
    expect(out).toMatch(/^<button type="button"/);
    expect(out).toContain('disabled=""');
  });
});

describe('Heading', () => {
  it('keeps its level apart from its look', () => {
    expect(
      html(
        <Heading level={2} size="specimen">
          Next
        </Heading>,
      ),
    ).toMatch(/^<h2 [^>]*>Next<\/h2>$/);
  });

  it('sets the measure in characters only when asked', () => {
    expect(html(<Heading level={1}>A</Heading>)).not.toContain('style');
    expect(
      html(
        <Heading level={2} measure={20}>
          A
        </Heading>,
      ),
    ).toContain('max-width:20ch');
  });
});

describe('Grid and Cell', () => {
  it('place a cell by its first column and span, through custom properties', () => {
    const out = html(
      <Grid rowGap="space-lg" align="end">
        <Cell start={8} span={5}>
          x
        </Cell>
      </Grid>,
    );
    expect(out).toContain('--grid-row-gap:var(--space-lg)');
    expect(out).toContain('align-items:end');
    expect(out).toContain('--cell-start:8;--cell-span:5');
  });
});

describe('Container', () => {
  it('renders the element it is given', () => {
    expect(html(<Container as="section">x</Container>)).toMatch(/^<section /);
  });
});

describe('Readout', () => {
  it('announces the status and hides the clock from screen readers', () => {
    const out = html(<Readout status="Idle" statusId="model-status" time="0:00" />);
    expect(out).toContain('id="model-status" role="status">Idle</p>');
    expect(out).toMatch(/aria-hidden="true">0:00<\/span>/);
  });
});

describe('Chapters', () => {
  it('group the buttons for screen readers', () => {
    const out = html(<ChapterList aria-label="Chapters of the model" count={6} />);
    expect(out).toContain('role="group"');
    expect(out).toContain('--chapter-count:6');
  });

  it('mark the chapter that plays and the ones that have played', () => {
    expect(
      html(
        <ChapterButton n={2} current>
          A release
        </ChapterButton>,
      ),
    ).toContain('aria-current="true"');
    expect(
      html(
        <ChapterButton n={1} done>
          The order
        </ChapterButton>,
      ),
    ).toContain('data-state="done"');
    const idle = html(<ChapterButton n={3}>A job fails</ChapterButton>);
    expect(idle).not.toContain('aria-current');
    expect(idle).not.toContain('data-state');
    expect(idle).toMatch(/<span [^>]*>3<\/span> A job fails<\/button>$/);
  });

  it('name the pause button by what a press does next', () => {
    expect(html(<PauseButton paused={false} subject="the model" />)).toMatch(
      /aria-label="Pause the model"[^>]*>Pause</,
    );
    expect(html(<PauseButton paused subject="the model" />)).toMatch(
      /aria-label="Play the model"[^>]*>Play</,
    );
  });
});
