import { HomePage } from '@/components/HomePage';

// Must be a literal for Next's static analysis; keep in sync with REVALIDATE_SECONDS (300).
export const revalidate = 300;

export default function Page() {
  return <HomePage lang="pt" />;
}
