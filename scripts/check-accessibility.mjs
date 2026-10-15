import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Behavior tests with DOM doubles. These do not replace browser or screen-reader QA.
const source = ts.transpileModule(fs.readFileSync('src/scripts/accessibility.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replace('export {};', '');

class Element {
  dataset = {}; attributes = {}; listeners = {}; disabled = false; hidden = true;
  textContent = ''; value = ''; focused = false; open = false;
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, event = {}) { this.listeners[name]?.forEach(fn => fn(event)); }
  getBoundingClientRect() { return { left:100, right:400, top:100, bottom:600 }; }
  click() { if (!this.disabled) this.emit('click'); }
  focus() { this.focused = true; }
  setAttribute(name, value) { this.attributes[name] = value; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  querySelector(selector) { return this.children?.[selector] || null; }
  querySelectorAll(selector) { return this.groups?.[selector] || []; }
}

function setup(saved = null, blocked = false) {
  const classes = new Set(); const properties = new Map(); const store = new Map();
  if (saved !== null) store.set('liranko-accessibility-v1', saved);
  const launcher = new Element(); const dialog = new Element(); const close = new Element();
  const reset = new Element(); const status = new Element(); const output = new Element();
  const decrease = new Element(); decrease.dataset.textStep = '-1';
  const increase = new Element(); increase.dataset.textStep = '1';
  const options = ['keyboard', 'motion', 'contrast', 'font', 'headings', 'links'].map(option => {
    const button = new Element(); button.dataset.accessibilityOption = option;
    button.children = { '.option-state': new Element(), span: Object.assign(new Element(), { textContent: option }) };
    return button;
  });
  dialog.children = { '.accessibility-status': status, '#accessibility-text-size': output, '.accessibility-close': close, '.accessibility-reset': reset,
    '[data-text-step="-1"]': decrease, '[data-text-step="1"]': increase };
  dialog.groups = { '[data-text-step]': [decrease, increase], '[data-accessibility-option]': options };
  const root = { style: { setProperty: (key,value) => properties.set(key,value) }, classList: {
    add: key => classes.add(key), toggle: (key,on) => on ? classes.add(key) : classes.delete(key),
  } };
  const body = { style: { overflow: 'auto' } };
  const bar = { getBoundingClientRect: () => ({ height: 92 }) };
  const header = { getBoundingClientRect: () => ({ height: 112 }) };
  const document = { documentElement: root, body, querySelector: selector => ({ '#accessibility-dialog': dialog, '.accessibility-launcher': launcher,
    '.mobile-contact': bar, '.header': header })[selector] || null };
  const localStorage = { getItem: key => { if(blocked) throw Error('blocked'); return store.get(key) || null; },
    setItem: (key,value) => { if(blocked) throw Error('blocked'); store.set(key,value); } };
  vm.runInNewContext(source, { document, localStorage });
  return { launcher, dialog, close, reset, status, output, decrease, increase, options, classes, properties, body, store };
}

const ui = setup();
assert.equal(ui.launcher.hidden, false);
assert.equal(ui.output.value, '100%');
assert.equal(ui.decrease.disabled, false);
assert.equal(ui.properties.get('--contact-height'), '92px');
assert.equal(ui.properties.get('--header-height'), '112px');
ui.launcher.click(); assert.equal(ui.dialog.open, true);
assert.equal(ui.launcher.attributes['aria-expanded'], 'true');
assert.equal(ui.close.focused, true); assert.equal(ui.body.style.overflow, 'hidden');

for (let i=0;i<8;i++) ui.increase.click();
assert.equal(ui.output.value, '150%');
assert.equal(ui.properties.get('--text-scale'), '1.5');
assert.ok(ui.classes.has('accessibility-large-text'), 'Enlarged text enables the mobile stacked contact layout');
assert.equal(ui.increase.disabled, true); assert.equal(ui.decrease.focused, true);
ui.decrease.click(); assert.equal(ui.output.value, '140%');
for (let i=0;i<8;i++) ui.decrease.click();
assert.equal(ui.output.value, '80%'); assert.equal(ui.increase.focused, true);
assert.equal(ui.decrease.disabled, true);
assert.equal(ui.properties.get('--text-scale'), '0.8');
ui.reset.click();
assert.ok(!ui.classes.has('accessibility-large-text'), 'Reset restores the regular contact layout');

for (const button of ui.options) {
  button.click(); assert.equal(button.attributes['aria-pressed'], 'true');
  assert.ok(ui.classes.has(`accessibility-${button.dataset.accessibilityOption}`));
  assert.equal(button.children['.option-state'].textContent, 'פעיל');
  button.click(); assert.equal(button.attributes['aria-pressed'], 'false');
  assert.ok(!ui.classes.has(`accessibility-${button.dataset.accessibilityOption}`));
  button.click();
}
ui.increase.click();
const restored = setup(ui.store.get('liranko-accessibility-v1'));
assert.equal(restored.output.value, '110%');
for(const button of restored.options) assert.equal(button.attributes['aria-pressed'], 'true');

ui.reset.click(); assert.equal(ui.output.value, '100%');
assert.equal(ui.properties.get('--text-scale'), '1');
for(const button of ui.options) {
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.ok(!ui.classes.has(`accessibility-${button.dataset.accessibilityOption}`));
}
assert.match(ui.status.textContent, /אופסו/);
ui.close.click(); assert.equal(ui.dialog.open, false);
assert.equal(ui.launcher.attributes['aria-expanded'], 'false');
assert.equal(ui.launcher.focused, true); assert.equal(ui.body.style.overflow, 'auto');
ui.launcher.click();
const inside = { target:ui.dialog, clientX:120, clientY:150 };
const outside = { target:ui.dialog, clientX:50, clientY:150 };
ui.dialog.emit('pointerdown', inside); ui.dialog.emit('click', inside);
assert.equal(ui.dialog.open, true, 'Dialog padding must not close the menu');
ui.dialog.emit('pointerdown', inside); ui.dialog.emit('click', outside);
assert.equal(ui.dialog.open, true, 'Dragging from the menu to the backdrop must not close it');
ui.dialog.emit('pointerdown', outside); ui.dialog.emit('click', inside);
assert.equal(ui.dialog.open, true, 'Ending inside the menu must not close it');
ui.dialog.emit('pointerdown', outside); ui.dialog.emit('click', outside);
assert.equal(ui.dialog.open, false, 'Clicking the backdrop closes the menu');
assert.equal(ui.launcher.attributes['aria-expanded'], 'false');
assert.equal(ui.launcher.focused, true);
assert.equal(ui.body.style.overflow, 'auto');

assert.equal(setup('{bad json').output.value, '100%');
assert.equal(setup(JSON.stringify({size:999,contrast:'true',links:true})).output.value, '150%');
assert.equal(setup(JSON.stringify({size:-999})).output.value, '80%');
assert.equal(setup(JSON.stringify({size:1.5})).output.value, '100%');
const migrated = setup(JSON.stringify({size:1,contrast:true,links:true,motion:false}));
for (const option of ['keyboard','font','headings']) assert.ok(!migrated.classes.has(`accessibility-${option}`));
const blocked = setup(null,true); blocked.increase.click();
assert.equal(blocked.output.value, '110%'); assert.match(blocked.status.textContent, /אינו מאפשר שמירה/);
for(const path of ['dist/index.html','dist/portfolio/index.html','dist/accessibility-draft/index.html']) {
  const html = fs.readFileSync(path,'utf8');
  assert.equal((html.match(/id="accessibility-dialog"/g)||[]).length,1);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-labelledby="accessibility-title"/);
  assert.match(html, /aria-describedby="accessibility-description"/);
  assert.equal((html.match(/data-accessibility-option=/g)||[]).length,6);
}
const css = fs.readFileSync('src/styles/global.css','utf8');
assert.match(css, /\.accessibility-links a\s*\{[^}]*text-decoration:underline!important/);
assert.match(css, /\.accessibility-motion[^}]*scroll-behavior:auto!important/);
assert.match(css, /\.accessibility-motion \*[^}]*animation:none!important/);
assert.match(css, /\.accessibility-contrast body[^}]*background:#000/);
assert.match(css, /font-size:calc\(18px \* var\(--text-scale\)\)/);
assert.match(css, /padding-bottom:calc\(var\(--contact-height/);
assert.match(css, /\.accessibility-keyboard[^}]*:focus\s*\{[^}]*outline:4px solid/);
assert.match(css, /\.accessibility-font[^}]*font-family:Tahoma,Verdana,Arial,sans-serif!important/);
assert.match(css, /\.accessibility-font[^}]*line-height:1\.85!important/);
assert.match(css, /\.accessibility-headings[^}]*outline:2px solid/);
assert.match(css, /\.accessibility-links :is\(a,button\)[^}]*box-shadow:inset/);
console.log('Accessibility behavior passed: all preferences, limits, persistence, reset, storage failures, focus wiring, ARIA markup and CSS effects. Native keyboard containment/Escape and layout require browser QA.');
