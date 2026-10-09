/** A legal page: a title and blocks of heading / paragraph / list. `**bold**` marks a bold lead-in. */
export type LegalBlock = { h: string } | { p: string } | { ul: string[] };
export interface LegalDoc {
  title: string;
  blocks: LegalBlock[];
}
