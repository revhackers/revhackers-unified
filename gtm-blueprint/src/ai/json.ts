export class JsonExtractionError extends Error {
  constructor(message: string, public readonly rawText: string) {
    super(message);
    this.name = 'JsonExtractionError';
  }
}

/**
 * Returns the first complete top-level JSON object in the text (string-aware brace matching),
 * ignoring code fences and any prose before or after it. If the object is truncated,
 * closes the open strings/arrays/objects in nesting order and tries to parse.
 */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) throw new JsonExtractionError('No JSON object found in model output', text);

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 0) { end = i; break; }
    }
  }

  const candidate = end !== -1 ? text.slice(start, end + 1) : text.slice(start);
  const parse = (s: string): unknown => JSON.parse(s.replace(/,(\s*[}\]])/g, '$1'));
  try {
    return parse(candidate);
  } catch (err: unknown) {
    if (end === -1) {
      // Truncated output: close what is open, in reverse nesting order.
      const repaired = candidate + (inString ? '"' : '') + stack.reverse().join('');
      try {
        return parse(repaired);
      } catch {
        /* fall through to the original error */
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new JsonExtractionError(`Failed to parse extracted JSON object: ${message}`, text);
  }
}
