export {};
const options = ['keyboard', 'motion', 'contrast', 'font', 'headings', 'links'] as const;
type Option = typeof options[number];
type Preferences = { size: number } & Record<Option, boolean>;
const defaults: Preferences = { size: 0, contrast: false, links: false, motion: false, keyboard: false, font: false, headings: false };
const key = 'liranko-accessibility-v1';
const root = document.documentElement;
const dialog = document.querySelector<HTMLDialogElement>('#accessibility-dialog');
const launcher = document.querySelector<HTMLButtonElement>('.accessibility-launcher');
const status = dialog?.querySelector<HTMLElement>('.accessibility-status');
let preferences = { ...defaults };
let previousOverflow = '';

try {
  const saved = JSON.parse(localStorage.getItem(key) || 'null');
  if (saved && typeof saved === 'object') {
    preferences = {
      size: Number.isInteger(saved.size) ? Math.min(5, Math.max(-2, saved.size)) : 0,
      contrast: saved.contrast === true, links: saved.links === true, motion: saved.motion === true,
      keyboard: saved.keyboard === true, font: saved.font === true, headings: saved.headings === true,
    };
  }
} catch { /* Missing, malformed or blocked storage leaves usable defaults. */ }

function render() {
  root.style.setProperty('--text-scale', String(1 + preferences.size / 10));
  root.classList.toggle('accessibility-large-text', preferences.size > 1);
  options.forEach(option => root.classList.toggle(`accessibility-${option}`, preferences[option]));
  const output = dialog?.querySelector<HTMLOutputElement>('#accessibility-text-size');
  if (output) output.value = `${100 + preferences.size * 10}%`;
  dialog?.querySelectorAll<HTMLButtonElement>('[data-text-step]').forEach(button => {
    button.disabled = Number(button.dataset.textStep) < 0 ? preferences.size === -2 : preferences.size === 5;
  });
  dialog?.querySelectorAll<HTMLButtonElement>('[data-accessibility-option]').forEach(button => {
    const option = button.dataset.accessibilityOption as Option;
    button.setAttribute('aria-pressed', String(preferences[option]));
    const state = button.querySelector('.option-state');
    if (state) state.textContent = preferences[option] ? 'פעיל' : 'כבוי';
  });
}

function save(message: string) {
  render();
  try { localStorage.setItem(key, JSON.stringify(preferences)); }
  catch { message += ' ההגדרות יחולו בעמוד זה בלבד; הדפדפן אינו מאפשר שמירה.'; }
  if (status) status.textContent = message;
}

if (dialog && launcher) {
  root.classList.add('accessibility-ready');
  render();
  launcher.hidden = false;
  launcher.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    launcher.setAttribute('aria-expanded', 'true');
    dialog.querySelector<HTMLButtonElement>('.accessibility-close')?.focus();
  });
  dialog.querySelector('.accessibility-close')?.addEventListener('click', () => dialog.close());
  let startedOnBackdrop = false;
  function isBackdrop(event: MouseEvent) {
    if (event.target !== dialog) return false;
    const bounds = dialog!.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  dialog.addEventListener('pointerdown', event => { startedOnBackdrop = isBackdrop(event); });
  dialog.addEventListener('click', event => {
    const shouldClose = startedOnBackdrop && isBackdrop(event);
    startedOnBackdrop = false;
    if (shouldClose) dialog.close();
  });
  // Keep Tab inside the controls, including at the browser chrome boundary.
  // Escape continues to use the native dialog cancel behavior.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')]
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    startedOnBackdrop = false;
    document.body.style.overflow = previousOverflow;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus({ preventScroll: true });
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-text-step]').forEach(button => button.addEventListener('click', () => {
    preferences.size = Math.min(5, Math.max(-2, preferences.size + Number(button.dataset.textStep)));
    save(`גודל הטקסט: ${100 + preferences.size * 10} אחוזים.`);
    // Keep focus on a usable control when the selected step reaches its limit.
    if (button.disabled) dialog.querySelector<HTMLButtonElement>(`[data-text-step="${preferences.size === 5 ? '-1' : '1'}"]`)?.focus();
  }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-accessibility-option]').forEach(button => button.addEventListener('click', () => {
    const option = button.dataset.accessibilityOption as Option;
    preferences[option] = !preferences[option];
    save(`${button.querySelector('span')?.textContent}: ${preferences[option] ? 'פעיל' : 'כבוי'}.`);
  }));
  dialog.querySelector('.accessibility-reset')?.addEventListener('click', () => {
    preferences = { ...defaults };
    save('ההעדפות אופסו. העדפת המכשיר להפחתת תנועה עדיין מכובדת.');
  });
}

// Measure the actual bar after wrapping, text enlargement and safe-area changes.
const bar = document.querySelector<HTMLElement>('.mobile-contact');
function measureBar() {
  const height = bar?.getBoundingClientRect().height || 0;
  root.style.setProperty('--contact-height', `${height}px`);
}
if (bar && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureBar).observe(bar);
measureBar();
const header = document.querySelector<HTMLElement>('.header');
function measureHeader() {
  root.style.setProperty('--header-height', `${header?.getBoundingClientRect().height || 0}px`);
}
if (header && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureHeader).observe(header);
measureHeader();
