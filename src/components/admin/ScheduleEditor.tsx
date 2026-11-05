'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { ScheduleSlot, Weekday } from '@/content/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const days = [['mon', 'Segunda'], ['tue', 'Terça'], ['wed', 'Quarta'], ['thu', 'Quinta'], ['fri', 'Sexta'], ['sat', 'Sábado'], ['sun', 'Domingo']] as const;
const kinds = [['crossfit', 'CrossFit'], ['open_box', 'Open Box'], ['team_wod', 'Team WOD'], ['other', 'Outra']] as const;
const kindLabel = Object.fromEntries(kinds) as Record<ScheduleSlot['kind'], string>;
type Selection = { day: Weekday; time: string };

export function ScheduleEditor({ slots, onChange }: { slots: ScheduleSlot[]; onChange: (slots: ScheduleSlot[]) => void }) {
  const [selected, setSelected] = useState<Selection>({ day: 'mon', time: slots[0]?.time || '07:00' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [mobileDay, setMobileDay] = useState<Weekday>('mon');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const visibleDays = days.filter(([day]) => day !== 'sun' || slots.some(slot => slot.day === 'sun'));
  const times = [...new Set(slots.map(slot => slot.time))].sort();
  const slotAt = (day: Weekday, time: string) => slots.find(slot => slot.day === day && slot.time === time);
  const selectedSlot = slotAt(selected.day, selected.time);
  const selectedEnabled = selectedSlot?.enabled !== false && !!selectedSlot;
  const selectedDayLabel = days.find(([day]) => day === selected.day)?.[1];

  function updateSlot(id: string, patch: Partial<ScheduleSlot>) {
    onChange(slots.map(slot => slot.id === id ? { ...slot, ...patch } : slot));
  }

  function toggle(day: Weekday, time: string, enabled: boolean) {
    setSelected({ day, time });
    setError('');
    const slot = slotAt(day, time);
    if (slot) updateSlot(slot.id, { enabled });
    else if (enabled) onChange([...slots, { id: crypto.randomUUID(), day, time, enabled: true, kind: 'crossfit' }]);
  }

  function addTime() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) { setError('Elige una hora válida.'); return; }
    if (times.includes(newTime)) { setError('Esa franja horaria ya existe.'); return; }
    onChange([...slots, { id: crypto.randomUUID(), day: 'mon', time: newTime, enabled: false, kind: 'crossfit' }]);
    setSelected({ day: 'mon', time: newTime });
    setEditorOpen(true);
    setMobileDay('mon');
    setNewTime('');
    setError('');
  }

  function cell(day: Weekday, time: string) {
    const slot = slotAt(day, time);
    const enabled = !!slot && slot.enabled !== false;
    const chosen = selected.day === day && selected.time === time;
    const name = enabled ? slot.name?.pt || kindLabel[slot.kind] : 'Vacío';
    return <button type="button" aria-label={`Editar ${days.find(([d]) => d === day)?.[1]} ${time}`} onClick={() => { setSelected({ day, time }); setEditorOpen(true); }} className={`group relative flex min-h-16 w-full cursor-pointer flex-col justify-center px-3 py-2 text-left text-sm text-white transition-[filter,box-shadow] duration-150 ease-out hover:z-10 hover:brightness-125 hover:shadow-[inset_0_0_0_2px_var(--yellow)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow motion-reduce:transition-none ${enabled ? slot.kind === 'crossfit' || slot.kind === 'team_wod' ? 'bg-[#304400]' : 'bg-[rgba(41,56,5,0.79)]' : 'bg-[#232e07]'} ${chosen ? 'ring-2 ring-inset ring-yellow' : ''}`}>
        <span className={`block w-full truncate pr-5 ${enabled ? 'font-semibold' : 'text-white/45'}`}>{name}</span>
        {enabled && slot.coach && <span className="block w-full truncate pr-5 text-xs text-white/65">{slot.coach}</span>}
        <Pencil aria-hidden="true" className="absolute right-2 top-2 size-3.5 translate-y-1 text-yellow opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transform-none motion-reduce:transition-none" />
    </button>;
  }

  return <Card>
    <CardHeader><CardTitle>Horarios de clases</CardTitle><CardDescription>Haz clic en una casilla para abrir sus opciones. Desde allí puedes mostrar u ocultar la clase y editar sus datos.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <div className="hidden overflow-x-auto rounded-xl border border-[#95be35]/50 md:block">
        <table className="w-full min-w-[850px] table-fixed border-collapse text-center">
          <thead className="bg-[#232e07] text-yellow"><tr><th scope="col" className="w-20 border-b border-r border-[#95be35]/50 p-3 text-sm">Hora</th>{visibleDays.map(([day, label]) => <th scope="col" key={day} className="border-b border-r border-[#95be35]/50 p-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{times.map(time => <tr key={time}><th scope="row" className="border-b border-r border-[#95be35]/50 bg-[#232e07] text-lime-400">{time}</th>{visibleDays.map(([day]) => <td key={day} className="border-b border-r border-[#95be35]/50 p-0">{cell(day, time)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2" role="group" aria-label="Día del horario">{visibleDays.map(([day, label]) => <Button key={day} type="button" size="sm" variant={mobileDay === day ? 'default' : 'outline'} onClick={() => setMobileDay(day)}>{label}</Button>)}</div>
        <div className="overflow-hidden rounded-xl border border-[#95be35]/50">{times.map(time => <div key={time} className="grid grid-cols-[68px_1fr] border-b border-[#95be35]/50 last:border-0"><span className="flex items-center justify-center bg-[#232e07] text-sm font-bold text-lime-400">{time}</span>{cell(mobileDay, time)}</div>)}</div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background/30 p-4"><Label className="space-y-2">Nueva franja horaria<Input type="time" value={newTime} onChange={event => setNewTime(event.target.value)} className="w-40 bg-background/50" /></Label><Button type="button" variant="outline" onClick={addTime}><Plus /> Añadir hora</Button>{error && <p role="alert" className="w-full text-sm text-yellow">{error}</p>}</div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="admin-theme border-border text-card-foreground sm:max-w-xl" style={{ minHeight: 'auto', background: 'var(--card)' }}><DialogHeader><DialogTitle>{selectedDayLabel} · {selected.time}</DialogTitle><DialogDescription>Edita esta casilla del horario semanal.</DialogDescription></DialogHeader>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-4"><Label htmlFor="selected-slot-switch" className="text-sm">{selectedEnabled ? 'Clase visible' : 'Casilla vacía'}</Label><Switch id="selected-slot-switch" checked={selectedEnabled} onCheckedChange={checked => toggle(selected.day, selected.time, checked)} aria-label={`${selectedEnabled ? 'Ocultar' : 'Mostrar'} clase seleccionada`} /></div>
        {selectedEnabled && selectedSlot ? <div className="grid gap-4"><div className="space-y-2"><Label>Tipo de clase</Label><Select value={selectedSlot.kind} onValueChange={value => updateSlot(selectedSlot.id, { kind: value as ScheduleSlot['kind'] })}><SelectTrigger className="w-full bg-background/50"><SelectValue /></SelectTrigger><SelectContent>{kinds.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><Label className="flex flex-col items-start gap-2">Nombre opcional<Input value={selectedSlot.name?.pt || ''} onChange={event => updateSlot(selectedSlot.id, { name: event.target.value ? { ...selectedSlot.name, pt: event.target.value } : undefined })} placeholder="Usar nombre del tipo" className="w-full bg-background/50" /></Label><Label className="flex flex-col items-start gap-2">Quién da la clase<Input value={selectedSlot.coach || ''} onChange={event => updateSlot(selectedSlot.id, { coach: event.target.value })} placeholder="Nombre del coach" className="w-full bg-background/50" /></Label></div> : <p className="text-sm text-muted-foreground">Activa esta casilla para definir el tipo de clase y quién la imparte.</p>}
        <div className="flex justify-end"><Button type="button" onClick={() => setEditorOpen(false)}>Listo</Button></div>
      </DialogContent></Dialog>
    </CardContent>
  </Card>;
}
