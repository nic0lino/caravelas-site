import type { CellView } from './view';

// Name 12px (CrossFit/Team Wod Black, Open Box Regular) + coach line 8px (Light label + Regular name). Figma 1:1255.
export function CellText({ cell, coachLabel, large = false }: { cell: CellView; coachLabel: string; large?: boolean }) {
  return (
    <>
      <span className={`block leading-none text-white ${large ? 'text-base' : 'text-xs'} ${cell.kind === 'open_box' ? 'font-normal' : 'font-black'}`}>{cell.name}</span>
      <span className={`block leading-none text-white ${large ? 'mt-1.5 text-xs' : 'mt-1.5 text-[8px]'}`}>
        {cell.coach ? (<><span className="font-light">{coachLabel}</span> <span className="font-normal">{cell.coach}</span></>) : <span className="font-light">{cell.coachLine}</span>}
      </span>
      {cell.note && <span className={`mt-1 block font-light italic leading-none text-white/80 ${large ? 'text-xs' : 'text-[8px]'}`}>{cell.note}</span>}
    </>
  );
}
