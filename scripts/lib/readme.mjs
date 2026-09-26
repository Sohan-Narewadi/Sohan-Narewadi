export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Template placeholder ${match} has no value`);
    return values[key];
  });
}
