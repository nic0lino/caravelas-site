import { describe, expect, it } from 'vitest';
import {
  clean,
  cleanMultiline,
  fold,
  isBlank,
  normalizeHeader,
  parseBool,
  parseDate,
  parseEmails,
  parseIcon,
  parseIntCell,
  parseKind,
  parsePhone,
  parsePrice,
  parseSide,
  parseTime,
  parseTimeRange,
  parseUrl,
  parseWeekday,
  stableId,
} from './values';

describe('text', () => {
  it('isBlank', () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('  \n ')).toBe(true);
    expect(isBlank(' x ')).toBe(false);
  });
  it('clean trims and collapses whitespace', () => {
    expect(clean('  Open   Box\n ')).toBe('Open Box');
  });
  it('cleanMultiline keeps paragraphs and inline marks', () => {
    expect(cleanMultiline('  **Feu**  \r\n\r\n\r\n  Coach  *L1*  ')).toBe('**Feu**\n\nCoach *L1*');
  });
  it('fold and normalizeHeader ignore case and accents', () => {
    expect(fold('  Sábado ')).toBe('sabado');
    expect(normalizeHeader('Destaque PT')).toBe('destaque_pt');
    expect(normalizeHeader('DESTAQUE-pt')).toBe('destaque_pt');
    expect(normalizeHeader('Ícone')).toBe('icone');
  });
});

describe('parseBool', () => {
  it.each([
    ['TRUE', true], ['verdadeiro', true], ['Sim', true], ['1', true], ['x', true],
    ['FALSE', false], ['FALSO', false], ['não', false], ['Nao', false], ['0', false],
  ])('%s -> %s', (input, expected) => {
    expect(parseBool(input)).toBe(expected);
  });
  it('blank or unknown -> null', () => {
    expect(parseBool('')).toBeNull();
    expect(parseBool('talvez')).toBeNull();
  });
});

describe('parseTime', () => {
  it.each([
    ['7:00', '07:00'], ['07:00', '07:00'], ['07h00', '07:00'], ['7h', '07:00'], ['7.30', '07:30'],
    ['7,30', '07:30'], ['19H30', '19:30'], ['7:00:00', '07:00'], [' 7 h 30 ', '07:30'], ['7', '07:00'],
    ['7:30 PM', '19:30'], ['12:00 am', '00:00'], ['12 pm', '12:00'],
  ])('%s -> %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });
  it.each(['', '24:00', '7:60', '7:5', 'sete', '13 pm', '7-30'])('rejects %j', (input) => {
    expect(parseTime(input)).toBeNull();
  });
});

describe('parseTimeRange', () => {
  it.each([
    ['07:00-21:00', { opens: '07:00', closes: '21:00' }],
    ['7h – 21h', { opens: '07:00', closes: '21:00' }],
    ['07:00 às 21:00', { opens: '07:00', closes: '21:00' }],
    ['9h a 12h30', { opens: '09:00', closes: '12:30' }],
  ])('%s', (input, expected) => {
    expect(parseTimeRange(input)).toEqual(expected);
  });
  it('blank or "Fechado" -> closed', () => {
    expect(parseTimeRange('')).toBe('closed');
    expect(parseTimeRange('Fechado')).toBe('closed');
  });
  it('invalid or reversed -> null', () => {
    expect(parseTimeRange('7h')).toBeNull();
    expect(parseTimeRange('21:00-07:00')).toBeNull();
    expect(parseTimeRange('manhã')).toBeNull();
  });
});

describe('parseDate', () => {
  it.each([
    ['09/10/2026', '2026-10-09'], ['9/10/26', '2026-10-09'], ['9-10-2026', '2026-10-09'],
    ['09.10.2026', '2026-10-09'], ['2026-10-09', '2026-10-09'], ['29/02/2028', '2028-02-29'],
  ])('%s -> %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });
  it.each(['', '31/02/2026', '29/02/2026', '13/13/2026', '2026/10/09', 'amanhã'])('rejects %j', (input) => {
    expect(parseDate(input)).toBeNull();
  });
});

describe('parsePrice', () => {
  it.each([
    ['€20', 20], ['20 €', 20], ['20,00', 20], ['20.00', 20], ['22,5', 22.5], ['EUR 22,50', 22.5],
    ['1.200,00', 1200], ['1,200.00', 1200], ['1.200', 1200], ['0', 0],
  ])('%s -> %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
  it.each(['', '-5', 'grátis', '20€ / mês'])('rejects %j', (input) => {
    expect(parsePrice(input)).toBeNull();
  });
});

describe('parseIntCell', () => {
  it('parses integers', () => {
    expect(parseIntCell(' 2 ')).toBe(2);
    expect(parseIntCell('3.0')).toBe(3);
    expect(parseIntCell('-1')).toBe(-1);
  });
  it('rejects blank and decimals', () => {
    expect(parseIntCell('')).toBeNull();
    expect(parseIntCell('1.5')).toBeNull();
  });
});

describe('enums', () => {
  it.each([
    ['Segunda', 'mon'], ['segunda-feira', 'mon'], ['Segunda Feira', 'mon'], ['Terça', 'tue'], ['TERCA', 'tue'],
    ['Quarta', 'wed'], ['Qui.', 'thu'], ['Sexta', 'fri'], ['Sábado', 'sat'], ['Sabado', 'sat'], ['Domingo', 'sun'],
    ['Monday', 'mon'],
  ])('weekday %s -> %s', (input, expected) => {
    expect(parseWeekday(input)).toBe(expected);
  });
  it('unknown weekday -> null', () => {
    expect(parseWeekday('Feriado')).toBeNull();
  });
  it('kind', () => {
    expect(parseKind('CrossFit')).toBe('crossfit');
    expect(parseKind('Open Box')).toBe('open_box');
    expect(parseKind('openbox')).toBe('open_box');
    expect(parseKind('Team WOD')).toBe('team_wod');
    expect(parseKind('Outro')).toBe('other');
    expect(parseKind('Yoga')).toBeNull();
  });
  it('icon', () => {
    expect(parseIcon('Bóia')).toBe('lifebuoy');
    expect(parseIcon('âncora')).toBe('anchor');
    expect(parseIcon('Navio')).toBe('ship');
    expect(parseIcon('estrela')).toBeNull();
  });
  it('side', () => {
    expect(parseSide('Esquerda')).toBe('left');
    expect(parseSide('direita')).toBe('right');
    expect(parseSide('')).toBeNull();
  });
});

describe('contact', () => {
  it.each([
    ['+351 912 849 143', '+351912849143'], ['00351912849143', '+351912849143'],
    ['912 849 143', '+351912849143'], ['(+351) 912-849-143', '+351912849143'],
  ])('phone %s', (input, expected) => {
    expect(parsePhone(input)).toBe(expected);
  });
  it('rejects bad phones', () => {
    expect(parsePhone('12345')).toBeNull();
    expect(parsePhone('')).toBeNull();
  });
  it('emails split on commas/semicolons, dedupe, report invalid', () => {
    expect(parseEmails('Feu.Ferreira@caravelas.fit; ana.lima@caravelas.fit, feu.ferreira@caravelas.fit, nope')).toEqual({
      emails: ['feu.ferreira@caravelas.fit', 'ana.lima@caravelas.fit'],
      invalid: ['nope'],
    });
  });
  it('urls get https when the scheme is missing', () => {
    expect(parseUrl('https://www.instagram.com/crossfitcaravelas')).toBe('https://www.instagram.com/crossfitcaravelas');
    expect(parseUrl('instagram.com/crossfitcaravelas')).toBe('https://instagram.com/crossfitcaravelas');
    expect(parseUrl('www.caravelas.fit')).toBe('https://www.caravelas.fit/');
    expect(parseUrl('javascript:alert(1)')).toBeNull();
    expect(parseUrl('não sei')).toBeNull();
    expect(parseUrl('')).toBeNull();
  });
});

describe('stableId', () => {
  it('same content -> same id, ignoring case/accents/spacing', () => {
    expect(stableId('horario', 'mon', '07:00', 'crossfit')).toBe(stableId('horario', 'MON', ' 07:00 ', 'CrossFit'));
  });
  it('different content -> different id', () => {
    expect(stableId('horario', 'mon', '07:00')).not.toBe(stableId('horario', 'mon', '08:00'));
    // the separator keeps ("ab","c") and ("a","bc") apart
    expect(stableId('x', 'ab', 'c')).not.toBe(stableId('x', 'a', 'bc'));
  });
  it('has the prefix', () => {
    expect(stableId('precos', 'Drop-In')).toMatch(/^precos-[0-9a-z]+$/);
  });
});
