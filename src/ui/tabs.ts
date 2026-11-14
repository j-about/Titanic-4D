import { el } from './dom.ts';

export interface TabDefinition<Id extends string> {
  readonly id: Id;
  readonly label: string;
  readonly panel: HTMLElement;
}

export interface Tabs<Id extends string> {
  readonly element: HTMLElement;
  select(id: Id): void;
}

/**
 * Creates a tabbed interface following the WAI-ARIA tabs pattern with automatic activation: the
 * arrow keys, Home and End move between tabs and show the matching panel.
 */
export function createTabs<Id extends string>(
  name: string,
  label: string,
  definitions: readonly TabDefinition<Id>[],
  onSelect: (id: Id) => void,
): Tabs<Id> {
  const buttons = definitions.map((definition) =>
    el('button', {
      type: 'button',
      role: 'tab',
      id: `${name}-tab-${definition.id}`,
      class: 'tabs__tab',
      'aria-controls': `${name}-panel-${definition.id}`,
      'aria-selected': 'false',
      tabindex: -1,
      text: definition.label,
    }),
  );
  const list = el('div', { role: 'tablist', class: 'tabs__list', 'aria-label': label }, buttons);
  definitions.forEach((definition, index) => {
    definition.panel.id = `${name}-panel-${definition.id}`;
    definition.panel.setAttribute('role', 'tabpanel');
    definition.panel.setAttribute('aria-labelledby', buttons[index]?.id ?? '');
    definition.panel.setAttribute('tabindex', '0');
    definition.panel.classList.add('tabs__panel');
  });

  const show = (id: Id): void => {
    definitions.forEach((definition, index) => {
      const selected = definition.id === id;
      const button = buttons[index];
      button?.setAttribute('aria-selected', String(selected));
      button?.setAttribute('tabindex', selected ? '0' : '-1');
      definition.panel.hidden = !selected;
    });
  };

  buttons.forEach((button, index) => {
    const definition = definitions[index];
    if (definition === undefined) {
      return;
    }
    button.addEventListener('click', () => {
      show(definition.id);
      onSelect(definition.id);
    });
    button.addEventListener('keydown', (event) => {
      const last = definitions.length - 1;
      const targets: Readonly<Record<string, number>> = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      };
      const target = targets[event.key];
      const next = target === undefined ? undefined : definitions[target];
      if (target === undefined || next === undefined) {
        return;
      }
      event.preventDefault();
      show(next.id);
      onSelect(next.id);
      buttons[target]?.focus();
    });
  });

  const element = el('div', { class: 'tabs' }, [
    list,
    ...definitions.map((definition) => definition.panel),
  ]);
  return { element, select: show };
}
