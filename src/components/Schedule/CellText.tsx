import type { CellView } from './view';

// Name 14px (CrossFit/Team Wod Black, Open Box Regular) + coach line 12px (Light label + Regular name); 16/14 in the mobile list.
export function CellText({ cell, coachLabel, large = false }: { cell: CellView; coachLabel: string; large?: boolean }) {
  return (
    <>
      <span className={`block leading-none text-white ${large ? 'text-base' : 'text-sm'} ${cell.kind === 'open_box' ? 'font-normal' : 'font-black'}`}>{cell.name}</span>
      <span className={`block leading-none text-white ${large ? 'mt-1.5 text-sm' : 'mt-1.5 text-xs'}`}>
        {cell.coach ? (<><span className="font-light">{coachLabel}</span> <span className="font-normal">{cell.coach}</span></>) : <span className="font-light">{cell.coachLine}</span>}
      </span>
      {cell.note && <span className={`mt-1 block font-light italic leading-none text-white/80 text-xs`}>{cell.note}</span>}
    </>
  );
}
