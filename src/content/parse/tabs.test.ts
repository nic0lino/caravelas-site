import { describe, expect, it } from 'vitest';
import { SiteContent } from '../schema';
import { instagramUrl, parseSheet, readTable, SheetError, type SheetTabs } from './tabs';

/** A small but messy sheet, typed the way staff would type it. */
function sampleSheet(): SheetTabs {
  return {
    config: [
      ['Chave', 'PT', 'EN', 'ES'],
      ['hero_titulo', 'Box de bem-estar'],
      ['cta_texto', 'Agende a aula experimental', 'Book your free trial class', 'Reserva tu clase de prueba'],
      ['cta_badge', 'GRÁTIS', 'FREE'],
      ['cta_link', 'regybox.pt/app/caravelas'],
      ['precos_atualizados', 'Preços atualizados em outubro de 2026'],
      ['morada_rua', 'R. Arco do Chafariz das Terras 13A'],
      ['morada_cp', '1200-607'],
      ['morada_cidade', 'Lisboa'],
      ['maps_link', 'https://maps.google.com/?q=CrossFit+Caravelas+Lisboa'],
      ['horario_seg_sex', '7h - 21h'],
      ['horario_sab', '09:00 às 12:00'],
      ['horario_dom', ''],
      ['email', 'Feu.Ferreira@caravelas.fit; ana.lima@caravelas.fit'],
      ['whatsapp', '912 849 143'],
      ['instagram', '@crossfitcaravelas'],
      ['facebook', 'facebook .com/x'], // invalid -> warning
      ['cor_favorita', 'verde'], // unknown key -> warning
    ],
    Marquesina: [
      ['Ativo', 'Destaque PT', 'Texto PT', 'Destaque EN', 'Texto EN', 'Link', 'Início', 'Fim', 'Ordem'],
      ['FALSE', 'Exemplo', 'linha cinzenta', '', '', '', '', '', ''], // example row: unchecked
      ['TRUE', 'Open Box', 'aos sábados', 'Open Box', 'on Saturdays', '', '', '', '2'],
      ['TRUE', 'Feriado', 'fechado dia 8', '', '', '', '01/12/2026', '08/12/26', '1'],
      [],
      ['TRUE', 'Torneio', '', '', '', '', '10/12/2026', '01/12/2026'], // fim < inicio -> skipped
    ],
    horario: [
      ['ativo', 'dia', 'hora', 'tipo', 'aula_pt', 'aula_en', 'coach', 'nota_pt', 'nota_en'],
      ['TRUE', 'Segunda', '7h', 'CrossFit', '', '', 'Ana Lima'],
      ['TRUE', 'segunda-feira', '07:00', 'crossfit', '', '', 'Ana Lima'], // same class typed twice -> duplicate
      ['TRUE', 'Sábado', '10.30', 'Open Box'],
      ['TRUE', 'Terça', '7.3O', 'CrossFit'], // letter O instead of zero -> skipped
      ['TRUE', 'Feriado', '18:00', 'Yoga'], // two errors -> skipped
      ['', 'Quarta', '19h', 'Team WOD', 'Team WOD', '', 'Feu Ferreira', 'Traz um par'], // blank ativo -> active
    ],
    precos: [
      ['ativo', 'plano_pt', 'plano_en', 'preco', 'destaque', 'ordem'],
      ['TRUE', 'Drop-In', 'Drop-In', '€20', 'TRUE', '1'],
      ['TRUE', '2 Aulas por semana', '2 classes per week', '60,00', 'FALSE', '2'],
      ['TRUE', 'Ilimitado', '', 'a combinar', 'FALSE', '3'], // bad price -> skipped
      ['TRUE', '3 Aulas por semana', '', '70 €', 'talvez', 'x'], // odd destaque + ordem -> warnings, kept
    ],
    equipa: [
      ['ativo', 'nome', 'bio_pt', 'bio_en', 'instagram', 'foto_lado', 'ordem'],
      ['TRUE', 'Feu Ferreira', '**Head coach**\r\n\r\nCrossFit *L2*.', '', '@feu_ferreira', 'Direita', '2'],
      ['TRUE', 'Ana Lima', 'Coach.\n\nMobilidade.', 'Coach.', 'https://www.instagram.com/_ana.lima_/', 'esquerda', '1'],
    ],
    destaques: [
      ['ativo', 'icone', 'titulo_pt', 'texto_pt', 'titulo_en', 'texto_en', 'ordem'],
      ['TRUE', 'Bóia', 'Para todos', 'Treinos adaptados.', 'For everyone', 'Scaled workouts.', '1'],
      ['TRUE', 'estrela', 'Brilho', 'Texto.'], // bad icon -> skipped
    ],
    'LEIA-ME': [['Instruções…']],
  };
}

const withMeta = (content: object) => ({
  ...content,
  meta: { source: 'sheets', fetchedAt: '2026-10-09T20:00:00.000Z', warnings: [] },
});

describe('readTable', () => {
  it('uses the first non-empty row as header and skips empty rows', () => {
    const { headers, rows } = readTable([[], ['', ''], ['Dia', 'Hora'], ['Segunda', '7h'], ['', ' '], ['Terça']]);
    expect([...headers]).toEqual(['dia', 'hora']);
    expect(rows.map((r) => [r.n, r.get('dia'), r.get('hora')])).toEqual([
      [4, 'Segunda', '7h'],
      [6, 'Terça', ''],
    ]);
  });
});

describe('parseSheet', () => {
  const { content, warnings } = parseSheet(sampleSheet());

  it('produces content that passes the contract (SiteContent)', () => {
    expect(() => SiteContent.parse(withMeta(content))).not.toThrow();
  });

  it('config: localized values, normalized contact, hours', () => {
    const c = content.config;
    expect(c.ctaLabel).toEqual({ pt: 'Agende a aula experimental', en: 'Book your free trial class', es: 'Reserva tu clase de prueba' });
    expect(c.ctaHref).toBe('https://regybox.pt/app/caravelas');
    expect(c.openingHours).toEqual({
      weekdays: { opens: '07:00', closes: '21:00' },
      saturday: { opens: '09:00', closes: '12:00' },
      sunday: null,
    });
    expect(c.whatsapp).toBe('+351912849143');
    expect(c.emails).toEqual(['feu.ferreira@caravelas.fit', 'ana.lima@caravelas.fit']);
    expect(c.instagram).toBe('https://www.instagram.com/crossfitcaravelas/');
    expect(c.facebook).toBeUndefined();
  });

  it('marquee: skips the unchecked example row and bad date ranges, parses dates', () => {
    expect(content.marquee.map((m) => m.highlight.pt)).toEqual(['Open Box', 'Feriado']);
    const feriado = content.marquee.find((m) => m.highlight.pt === 'Feriado')!;
    expect([feriado.startsOn, feriado.endsOn, feriado.order]).toEqual(['2026-12-01', '2026-12-08', 1]);
  });

  it('schedule: normalizes, dedupes, skips invalid rows', () => {
    expect(content.schedule.map((s) => [s.day, s.time, s.kind])).toEqual([
      ['mon', '07:00', 'crossfit'],
      ['sat', '10:30', 'open_box'],
      ['wed', '19:00', 'team_wod'],
    ]);
    expect(content.schedule[2]!.note).toEqual({ pt: 'Traz um par' });
  });

  it('prices and coaches', () => {
    expect(content.prices.map((p) => [p.label.pt, p.priceEUR, p.featured])).toEqual([
      ['Drop-In', 20, true],
      ['2 Aulas por semana', 60, false],
      ['3 Aulas por semana', 70, false],
    ]);
    const feu = content.coaches.find((c) => c.name === 'Feu Ferreira')!;
    expect(feu.bio.pt).toBe('**Head coach**\n\nCrossFit *L2*.');
    expect(feu.instagram).toBe('https://www.instagram.com/feu_ferreira/');
    expect(feu.photoSide).toBe('right');
  });

  it('features: bad icon skipped', () => {
    expect(content.features.map((f) => f.icon)).toEqual(['lifebuoy']);
  });

  it('ids are stable across row moves', () => {
    const moved = sampleSheet();
    const rows = moved.horario!;
    moved.horario = [rows[0]!, ...rows.slice(1).reverse()];
    const again = parseSheet(moved).content;
    const ids = (s: typeof content.schedule) => s.map((x) => x.id).sort();
    expect(ids(again.schedule)).toEqual(ids(content.schedule));
  });

  it('explains every skipped or ignored cell, with tab and row number', () => {
    expect(warnings).toEqual([
      "config linha 17: link inválido em 'facebook' 'facebook .com/x' (ignorado)",
      "config linha 18: chave desconhecida 'cor_favorita' (ignorada)",
      "marquesina linha 6: 'fim' é anterior a 'inicio' (linha ignorada)",
      'horario linha 3: repetida (igual à linha 2; ignorada)',
      "horario linha 5: hora inválida '7.3O' (linha ignorada)",
      "horario linha 6: dia inválido 'Feriado', tipo inválido 'Yoga' (linha ignorada)",
      "precos linha 4: preço inválido 'a combinar' (linha ignorada)",
      "precos linha 5: valor de 'destaque' não reconhecido 'talvez' (assumido não)",
      "precos linha 5: ordem inválida 'x' (usada a posição na folha)",
      "destaques linha 3: ícone inválido 'estrela' (linha ignorada)",
    ]);
  });
});

describe('parseSheet failures (keep serving the last good page)', () => {
  it('throws when a tab is missing', () => {
    const tabs = sampleSheet();
    delete tabs.precos;
    expect(() => parseSheet(tabs)).toThrow(SheetError);
    expect(() => parseSheet(tabs)).toThrow("falta o separador 'precos'");
  });

  it('throws listing every bad required config key', () => {
    const tabs = sampleSheet();
    tabs.config = tabs.config!.filter((r) => r[0] !== 'cta_link' && r[0] !== 'horario_sab');
    tabs.config.push(['maps_link', 'não sei']);
    try {
      parseSheet(tabs);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SheetError);
      expect((e as SheetError).problems).toEqual([
        "config 'cta_link': em falta",
        'config \'horario_sab\': em falta (deixe o valor vazio para "fechado")',
      ]);
    }
  });

  it('throws when no class is valid', () => {
    const tabs = sampleSheet();
    tabs.horario = [tabs.horario![0]!, ['TRUE', 'Feriado', '7h', 'CrossFit']];
    expect(() => parseSheet(tabs)).toThrow("não tem nenhuma aula válida");
  });
});

describe('instagramUrl', () => {
  it('accepts handles and URLs', () => {
    expect(instagramUrl('@_ana.lima_')).toBe('https://www.instagram.com/_ana.lima_/');
    expect(instagramUrl('feu_ferreira')).toBe('https://www.instagram.com/feu_ferreira/');
    expect(instagramUrl('instagram.com/feu_ferreira')).toBe('https://instagram.com/feu_ferreira');
    expect(instagramUrl('não tenho')).toBeNull();
  });
});
