/** Small helpers to drive forms the way a person does: find by label, type, submit. */
export function inputByLabel(root: HTMLElement, label: string): HTMLInputElement {
  const el = [...root.querySelectorAll('label')]
    .find((l) => l.textContent?.trim() === label)
    ?.parentElement?.querySelector('input');
  if (!el) throw new Error(`No input labelled "${label}"`);
  return el;
}

export function type(root: HTMLElement, label: string, value: string): void {
  const el = inputByLabel(root, label);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('blur'));
}

export function submit(root: HTMLElement): void {
  root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

export function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const el = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  if (!el) throw new Error(`No button "${text}"`);
  return el;
}
