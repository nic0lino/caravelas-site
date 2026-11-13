/**
 * RFC 4180 CSV → grid of strings, the same shape the Sheets API returns (`string[][]`), so a sheet
 * exported as CSV (File → Download → CSV, one file per tab) goes through `parseSheet` unchanged.
 * Handles quoted fields with commas, quotes ("") and line breaks, CRLF/LF/CR line ends and a UTF-8 BOM.
 * Trailing empty cells are kept as the file has them; a final line break adds no row.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) endField();
    else if (c === '\r') {
      endRow();
      if (text[i + 1] === '\n') i++;
    } else if (c === '\n') endRow();
    else field += c;
  }
  if (quoted) throw new Error('CSV inválido: falta fechar aspas.');
  if (field !== '' || row.length > 0) endRow();
  return rows;
}
