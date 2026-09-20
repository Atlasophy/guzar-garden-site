import fs from 'node:fs';

/**
 * Extracts the <style> block from a legacy page and scopes every selector under
 * a theme class, so the emerald landing design and the cream menu design can
 * live in one application without fighting over `:root`, `.btn` and `.nav`.
 *
 * Usage: node .tmp/scope-css.mjs <source.html> <out.css> <theme-class>
 */
const [, , sourcePath, outPath, themeClass] = process.argv;

const html = fs.readFileSync(sourcePath, 'utf8');
const start = html.indexOf('<style>');
const end = html.indexOf('</style>', start);
if (start === -1 || end === -1) throw new Error('no <style> block');
const css = html.slice(start + '<style>'.length, end);

const scope = `body.${themeClass}`;

function scopeSelector(selector) {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('from') || trimmed.startsWith('to') || /^\d/.test(trimmed)) {
    return trimmed; // keyframe stop
  }
  if (trimmed === ':root') return scope;
  if (trimmed === 'html' || trimmed.startsWith('html ') || trimmed.startsWith('html.')) {
    return trimmed;
  }
  if (trimmed === 'body') return scope;
  if (trimmed.startsWith('body')) return scope + trimmed.slice(4);
  return `${scope} ${trimmed}`;
}

/** Split a selector list on commas that are not inside brackets or parens. */
function splitSelectors(list) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * Walk the stylesheet at one nesting level. `insideKeyframes` stops the stops
 * of an animation (`from`, `to`, `50%`) being treated as selectors.
 */
function transform(source, insideKeyframes = false) {
  let out = '';
  let i = 0;

  while (i < source.length) {
    // comments pass through untouched
    if (source.startsWith('/*', i)) {
      const close = source.indexOf('*/', i + 2);
      const stop = close === -1 ? source.length : close + 2;
      out += source.slice(i, stop);
      i = stop;
      continue;
    }

    // whitespace between rules
    if (/\s/.test(source[i])) {
      out += source[i];
      i += 1;
      continue;
    }

    // find the end of this rule's prelude
    let j = i;
    let depth = 0;
    while (j < source.length) {
      const ch = source[j];
      if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth -= 1;
      else if (ch === '{' && depth === 0) break;
      else if (ch === ';' && depth === 0) break;
      j += 1;
    }

    if (j >= source.length) {
      out += source.slice(i);
      break;
    }

    const prelude = source.slice(i, j);

    if (source[j] === ';') {
      // a statement such as @charset or @import — pass through
      out += prelude + ';';
      i = j + 1;
      continue;
    }

    // find the matching close brace
    let k = j + 1;
    let braces = 1;
    while (k < source.length && braces > 0) {
      if (source.startsWith('/*', k)) {
        const close = source.indexOf('*/', k + 2);
        k = close === -1 ? source.length : close + 2;
        continue;
      }
      if (source[k] === '{') braces += 1;
      else if (source[k] === '}') braces -= 1;
      k += 1;
    }

    const body = source.slice(j + 1, k - 1);
    const preludeTrimmed = prelude.trim();

    if (preludeTrimmed.startsWith('@keyframes') || preludeTrimmed.startsWith('@-webkit-keyframes')) {
      out += `${prelude}{${transform(body, true)}}`;
    } else if (preludeTrimmed.startsWith('@media') || preludeTrimmed.startsWith('@supports')) {
      out += `${prelude}{${transform(body, insideKeyframes)}}`;
    } else if (preludeTrimmed.startsWith('@')) {
      out += `${prelude}{${body}}`;
    } else if (insideKeyframes) {
      out += `${prelude}{${body}}`;
    } else {
      const scoped = splitSelectors(prelude)
        .map((selector) => {
          const leading = selector.match(/^\s*/)?.[0] ?? '';
          return leading + scopeSelector(selector);
        })
        .join(',');
      out += `${scoped}{${body}}`;
    }

    i = k;
  }

  return out;
}

const scoped = transform(css);

const header = `/*
 * MIGRATED from the <style> block of ${sourcePath.split(/[\\/]/).pop()}.
 *
 * Every declaration is the original one. The only change is scoping: each
 * selector is prefixed with \`${scope}\` (and \`:root\` became that same
 * selector) so the emerald landing design and the cream menu design can share
 * one application without overwriting each other's \`--green\`, \`.btn\` and
 * \`.nav\`. Asset URLs were rewritten from \`assets/…\` to \`/assets/…\`, since a
 * stylesheet in the bundle no longer sits next to the HTML file.
 *
 * Edit this file, not the copy under legacy/ — that one is kept only as the
 * reference for what shipped.
 */

`;

fs.writeFileSync(
  outPath,
  header + scoped.replace(/url\("assets\//g, 'url("/assets/').trimStart() + '\n',
  'utf8',
);
console.log(`${outPath}: ${scoped.length} bytes scoped under ${scope}`);
