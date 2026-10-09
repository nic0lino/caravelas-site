import { z } from 'zod';

// PT is required; every other language is optional and falls back en -> pt (see select.ts).
export const Localized = z.object({
  pt: z.string().min(1),
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  de: z.string().optional(),
  ru: z.string().optional(),
  uk: z.string().optional(),
});

export const Weekday = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/); // normalized "07:00"
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // normalized, Europe/Lisbon

export const MarqueeItem = z.object({
  id: z.string(),
  highlight: Localized, // bold part
  text: Localized.optional(), // light part
  href: z.string().url().optional(),
  startsOn: IsoDate.optional(), // inclusive
  endsOn: IsoDate.optional(), // inclusive
  order: z.number().int().default(0),
});

export const ClassKind = z.enum(['crossfit', 'open_box', 'team_wod', 'other']);

export const ScheduleSlot = z.object({
  id: z.string(),
  day: Weekday,
  time: Time,
  kind: ClassKind,
  name: Localized.optional(), // if absent, UI uses the default label for `kind`
  coach: z.string().optional(), // rendered as "Coach {coach}"; if absent, UI uses kind default
  note: Localized.optional(),
});

export const PricePlan = z.object({
  id: z.string(),
  label: Localized, // "Drop-In", "2 Aulas por semana"
  priceEUR: z.number().nonnegative(),
  featured: z.boolean().default(false), // outlined box (Drop-In in Figma)
  order: z.number().int().default(0),
});

export const Coach = z.object({
  id: z.string(),
  name: z.string().min(1),
  bio: Localized, // paragraphs separated by a blank line; FIRST paragraph renders bold
  instagram: z.string().url().optional(), // profile link; shown as a tag floating on the team photo
  photoSide: z.enum(['left', 'right']).optional(), // which person in the team photo (tag placement); default by order
  order: z.number().int().default(0),
});

export const FeatureIcon = z.enum(['lifebuoy', 'anchor', 'ship']);
export const Feature = z.object({
  id: z.string(),
  icon: FeatureIcon,
  title: Localized,
  text: Localized,
  order: z.number().int().default(0),
});

export const OpeningHours = z.object({
  weekdays: z.object({ opens: Time, closes: Time }).nullable(), // Mon–Fri
  saturday: z.object({ opens: Time, closes: Time }).nullable(),
  sunday: z.object({ opens: Time, closes: Time }).nullable(), // null = "Fechado"
});

export const SiteConfig = z.object({
  heroTitle: Localized,
  ctaLabel: Localized, // "Agende a aula experimental"
  ctaBadge: Localized, // "GRÁTIS"
  ctaHref: z.string().url(), // RegyBox trial booking link
  pricesUpdatedNote: Localized.optional(),
  pricesPromoNote: Localized.optional(),
  pricesPromoHref: z.string().url().optional(),
  address: z.object({ street: z.string(), postalCode: z.string(), city: z.string() }),
  mapsHref: z.string().url(),
  privacyHref: z.string().url().optional(), // Privacy Policy page
  cookiesHref: z.string().url().optional(), // Cookie Policy page
  openingHours: OpeningHours,
  emails: z.array(z.string().email()).optional(), // the Email button writes to all of them
  whatsapp: z.string().regex(/^\+\d{8,15}$/).optional(), // E.164
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  teamPhoto: z.string().optional(), // repo path or absolute URL
});

export const SiteContent = z.object({
  config: SiteConfig,
  marquee: z.array(MarqueeItem),
  features: z.array(Feature),
  schedule: z.array(ScheduleSlot),
  prices: z.array(PricePlan),
  coaches: z.array(Coach),
  meta: z.object({
    source: z.enum(['fixture', 'sheets']),
    fetchedAt: z.string(),
    warnings: z.array(z.string()), // human-readable, e.g. "horario linha 14: hora inválida '7.30'"
  }),
});
export type SiteContent = z.infer<typeof SiteContent>;
export type Localized = z.infer<typeof Localized>;
export type Weekday = z.infer<typeof Weekday>;
export type ClassKind = z.infer<typeof ClassKind>;
export type MarqueeItem = z.infer<typeof MarqueeItem>;
export type ScheduleSlot = z.infer<typeof ScheduleSlot>;
export type PricePlan = z.infer<typeof PricePlan>;
export type Coach = z.infer<typeof Coach>;
export type Feature = z.infer<typeof Feature>;
export type SiteConfig = z.infer<typeof SiteConfig>;
export type OpeningHours = z.infer<typeof OpeningHours>;
