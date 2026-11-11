import type { EditableContent } from '../schema';

/** A problem with a field. `path` is dotted ("prices.2.priceEUR") so the panel can point at the input. */
export interface Issue {
  path: string;
  message: string; // Portuguese, shown to the gym staff
}

export interface CheckResult {
  errors: Issue[]; // block publishing
  warnings: Issue[]; // shown, never blocking
}

const DAY_PT: Record<string, string> = {
  mon: 'segunda', tue: 'terça', wed: 'quarta', thu: 'quinta', fri: 'sexta', sat: 'sábado', sun: 'domingo',
};

/**
 * Business rules on top of the zod schema (ADMIN.md §6). The schema says what is well-formed;
 * these say what is sensible to put on the live site. `today` is YYYY-MM-DD in Europe/Lisbon
 * (`lisbonToday().isoDate` from select.ts).
 */
export function checkContent(c: EditableContent, today: string): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  if (c.schedule.length === 0) errors.push({ path: 'schedule', message: 'O horário não tem nenhuma aula.' });
  const seen = new Map<string, number>();
  c.schedule.forEach((s, i) => {
    const key = `${s.day} ${s.time}`;
    if (seen.has(key)) {
      errors.push({ path: `schedule.${i}`, message: `Há duas aulas à mesma hora: ${DAY_PT[s.day]} ${s.time}.` });
    } else seen.set(key, i);
    if (s.kind === 'other' && !s.name) {
      errors.push({ path: `schedule.${i}.name`, message: `A aula de ${DAY_PT[s.day]} ${s.time} é "Outra" e precisa de nome.` });
    }
  });

  if (c.prices.length === 0) errors.push({ path: 'prices', message: 'Não há nenhum plano de preços.' });
  c.prices.forEach((p, i) => {
    if (!(p.priceEUR > 0)) errors.push({ path: `prices.${i}.priceEUR`, message: `O preço de "${p.label.pt}" tem de ser maior que 0 €.` });
  });

  const hours = c.config.openingHours;
  (['weekdays', 'saturday', 'sunday'] as const).forEach((k) => {
    const h = hours[k];
    if (h && h.opens >= h.closes) {
      errors.push({ path: `config.openingHours.${k}`, message: `Horário de abertura: ${h.opens} tem de ser antes de ${h.closes}.` });
    }
  });

  c.marquee.forEach((m, i) => {
    if (m.startsOn && m.endsOn && m.endsOn < m.startsOn) {
      errors.push({ path: `marquee.${i}.endsOn`, message: `O aviso "${m.highlight.pt}" acaba antes de começar.` });
    } else if (m.endsOn && m.endsOn < today) {
      warnings.push({ path: `marquee.${i}.endsOn`, message: `O aviso "${m.highlight.pt}" já expirou (${m.endsOn}) e não aparece no site.` });
    }
  });

  return { errors, warnings };
}
