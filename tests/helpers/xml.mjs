// Minimal well-formedness checker for generated SVG (no XML parser is built into Node).
const TAG = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const BAD_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

function checkText(s) {
  if (/[<>]/.test(s)) throw new Error(`Stray angle bracket near: ${s.slice(0, 40)}`);
  if (BAD_AMP.test(s)) throw new Error(`Raw ampersand in text near: ${s.slice(0, 40)}`);
}

export function assertWellFormed(svg) {
  const stack = [];
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(svg))) {
    checkText(svg.slice(last, m.index));
    last = TAG.lastIndex;
    if (m[0].startsWith('<!--') || m[0].startsWith('<?')) continue;
    const [, closing, name, attrs, selfClose] = m;
    if (BAD_AMP.test(attrs)) throw new Error(`Raw ampersand in attribute of <${name}>`);
    if (attrs.includes('<')) throw new Error(`Raw < in attribute of <${name}>`);
    if (closing) {
      const top = stack.pop();
      if (top !== name) throw new Error(`Mismatched </${name}>, expected </${top}>`);
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  checkText(svg.slice(last));
  if (stack.length) throw new Error(`Unclosed: ${stack.join(', ')}`);
}
