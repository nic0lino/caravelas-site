import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads plain rows and keeps empty cells', () => {
    expect(parseCsv('a,b,c\n1,,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('handles quotes, escaped quotes, commas and line breaks inside a field', () => {
    const csv = 'nome,bio_pt\r\n"Ana Lima","Formada pela UniBH.\r\n\r\nDiz: ""viver a vida"", sempre."\r\n';
    expect(parseCsv(csv)).toEqual([
      ['nome', 'bio_pt'],
      ['Ana Lima', 'Formada pela UniBH.\r\n\r\nDiz: "viver a vida", sempre.'],
    ]);
  });

  it('strips a UTF-8 BOM and accepts a last line without a line break', () => {
    expect(parseCsv('﻿chave,pt\nhero_titulo,Box de bem-estar')).toEqual([
      ['chave', 'pt'],
      ['hero_titulo', 'Box de bem-estar'],
    ]);
  });

  it('keeps blank lines as rows (the sheet parser skips them) and supports another delimiter', () => {
    expect(parseCsv('a;b\n\nc;d\n', ';')).toEqual([['a', 'b'], [''], ['c', 'd']]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => parseCsv('a,"b\n')).toThrow();
  });
});
