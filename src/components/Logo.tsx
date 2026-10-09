import { asset } from '@/lib/asset';

// Desktop 130×57 (Figma 152×67, trimmed with the slimmer bar), mobile 89×39 (Figma 21:2750).
export function Logo({ className = 'h-[39px] w-[89px] md:h-[57px] md:w-[130px]' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset('/assets/logo.svg')} alt="CrossFit Caravelas" width={152} height={67} className={className} />;
}
