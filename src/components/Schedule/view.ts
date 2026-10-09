import type { ClassKind, ScheduleSlot, Weekday } from '@/content/schema';
import { localize, type Lang } from '@/content/select';
import type { UiStrings } from '@/i18n';

export interface CellView {
  id: string;
  kind: ClassKind;
  name: string;
  coachLine?: string; // kind default ("Livre") when there is no coach
  coach?: string;
  note?: string;
}

export function toCellView(slot: ScheduleSlot, lang: Lang, t: UiStrings): CellView {
  return {
    id: slot.id,
    kind: slot.kind,
    name: localize(slot.name, lang) ?? t.kinds[slot.kind],
    coach: slot.coach,
    coachLine: slot.coach ? undefined : slot.kind === 'open_box' ? t.schedule.free : undefined,
    note: localize(slot.note, lang),
  };
}

export interface ScheduleView {
  days: Weekday[];
  times: string[];
  cells: Record<string, Partial<Record<Weekday, CellView[]>>>;
  byDay: Record<Weekday, (CellView & { time: string })[]>;
  dayLabels: Record<Weekday, { long: string; short: string }>;
  labels: { time: string; today: string; sundayClosed: string; coach: string };
}

// Colour = importance. CrossFit (and Team WOD, its variant) is the main offer, so it gets the stronger #304400;
// Open Box is the secondary offer and recedes (#293805 @79%). Owner decision: swapped vs the Figma file.
export const kindClass: Record<ClassKind, string> = {
  crossfit: 'bg-[#304400] data-[hl=true]:bg-[#3e5600]',
  team_wod: 'bg-[#304400] data-[hl=true]:bg-[#3e5600]',
  open_box: 'bg-[rgba(41,56,5,0.79)] data-[hl=true]:bg-[rgba(58,79,8,0.9)]',
  other: 'bg-[rgba(41,56,5,0.79)] data-[hl=true]:bg-[rgba(58,79,8,0.9)]',
};
