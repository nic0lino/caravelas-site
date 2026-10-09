import { asset } from '@/lib/asset';

// Desktop 152×67, mobile 89×39 (Figma 21:2750).
export function Logo({ className = 'h-[39px] w-[89px] md:h-[67px] md:w-[152px]' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset('/assets/logo.svg')} alt="CrossFit Caravelas" width={152} height={67} className={className} />;
}
