import type { SiteConfig } from '@/content/schema';
import type { Lang } from '@/content/select';
import { strings } from '@/i18n';

import { langUrl, siteUrl } from './metadata';

const DAYS = {
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  saturday: ['Saturday'],
  sunday: ['Sunday'],
} as const;

export function jsonLd(config: SiteConfig, lang: Lang) {
  const hours = (Object.keys(DAYS) as (keyof typeof DAYS)[]).flatMap((k) => {
    const h = config.openingHours[k];
    return h ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS[k], opens: h.opens, closes: h.closes }] : [];
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'ExerciseGym',
    name: 'CrossFit Caravelas',
    description: strings(lang).siteDescription,
    url: langUrl(lang),
    image: `${siteUrl}/assets/og.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.address.street,
      postalCode: config.address.postalCode,
      addressLocality: config.address.city,
      addressCountry: 'PT',
    },
    openingHoursSpecification: hours,
    sameAs: [config.instagram, config.facebook].filter(Boolean),
    // geo: add latitude/longitude once the gym confirms coordinates
  };
}
