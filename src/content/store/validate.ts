import { EditableContent } from '../schema';
import type { Issue } from './guards';
import { InvalidContentError } from './types';

/** Parses with the contract schema; throws InvalidContentError with dotted paths the panel can show. */
export function validateContent(content: unknown): EditableContent {
  const r = EditableContent.safeParse(content);
  if (r.success) return r.data;
  const issues: Issue[] = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  throw new InvalidContentError(issues);
}
