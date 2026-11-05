'use client';

import { useState } from 'react';
import { Plus, Save, Trash2, ExternalLink, RotateCcw } from 'lucide-react';
import type { SiteContent, PricePlan, Coach } from '@/content/schema';
import type { AdminEdits, Section } from '@/lib/admin-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScheduleEditor } from '@/components/admin/ScheduleEditor';
import { AnnouncementsEditor } from '@/components/admin/AnnouncementsEditor';
import { Logo } from '@/components/Logo';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

type Versions = Record<string, string>;
export function AdminPanel({ initialContent, initialVersions, email, demo = false }: { initialContent: SiteContent; initialVersions: Versions; email: string; demo?: boolean }) {
  const [content, setContent] = useState(initialContent);
  const [versions, setVersions] = useState(initialVersions);
  const [active, setActive] = useState<Section>('schedule');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState<Record<Section, boolean>>({ schedule: false, coaches: false, prices: false, config: false });

  function change<K extends keyof SiteContent>(section: Section, key: K, value: SiteContent[K]) {
    setContent(current => ({ ...current, [key]: value }));
    setDirty(current => ({ ...current, [section]: true }));
    setMessage('');
  }
  function config(value: Partial<SiteContent['config']>) { change('config', 'config', { ...content.config, ...value }); }
  function price(index: number, patch: Partial<PricePlan>) { change('prices', 'prices', content.prices.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function coach(index: number, patch: Partial<Coach>) { change('coaches', 'coaches', content.coaches.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function editFor(section: Section): AdminEdits {
    const version = versions[section];
    if (section === 'schedule') return { section, version, items: content.schedule.map(item => ({ id: item.id, day: item.day, time: item.time, kind: item.kind, enabled: item.enabled !== false, name: item.name?.pt || '', coach: item.coach || '' })) };
    if (section === 'prices') return { section, version, items: content.prices.map(item => ({ id: item.id, label: item.label.pt, priceEUR: item.priceEUR, featured: item.featured })) };
    if (section === 'coaches') return { section, version, items: content.coaches.map(item => ({ id: item.id, name: item.name, bio: item.bio.pt, instagram: item.instagram || '' })) };
    const c = content.config;
    return { section, version, data: { heroTitle: c.heroTitle.pt, marqueeEnabled: c.marqueeEnabled !== false, marquee: content.marquee.map(item => ({ id: item.id, highlight: item.highlight.pt, text: item.text?.pt || '', href: item.href || '', startsOn: item.startsOn || '', endsOn: item.endsOn || '' })), ctaLabel: c.ctaLabel.pt, ctaBadge: c.ctaBadge.pt, street: c.address.street, postalCode: c.address.postalCode, city: c.address.city, mapsHref: c.mapsHref, weekdaysOpen: c.openingHours.weekdays?.opens || null, weekdaysClose: c.openingHours.weekdays?.closes || null, saturdayOpen: c.openingHours.saturday?.opens || null, saturdayClose: c.openingHours.saturday?.closes || null, sundayOpen: c.openingHours.sunday?.opens || null, sundayClose: c.openingHours.sunday?.closes || null, emails: (c.emails || []).join(', '), whatsapp: c.whatsapp || '', instagram: c.instagram || '', facebook: c.facebook || '' } };
  }
  async function save() {
    if (demo) {
      setDirty(current => ({ ...current, [active]: false }));
      setMessage('Vista previa guardada solo en esta pantalla. No se modificó el sitio.');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const response = await fetch(`${base}/api/admin/content`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(editFor(active)) });
      const data = await response.json() as { content?: SiteContent; versions?: Versions; error?: string };
      if (!response.ok || !data.content || !data.versions) throw new Error(data.error || 'No se pudieron guardar los cambios.');
      setContent(current => ({
        ...data.content!,
        schedule: active !== 'schedule' && dirty.schedule ? current.schedule : data.content!.schedule,
        prices: active !== 'prices' && dirty.prices ? current.prices : data.content!.prices,
        coaches: active !== 'coaches' && dirty.coaches ? current.coaches : data.content!.coaches,
        config: active !== 'config' && dirty.config ? current.config : data.content!.config,
        marquee: active !== 'config' && dirty.config ? current.marquee : data.content!.marquee,
      }));
      setVersions(data.versions); setDirty(current => ({ ...current, [active]: false }));
      setMessage('Cambios guardados y publicados.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  }
  const field = (label: string, value: string, onChange: (value: string) => void, type = 'text') => <Label className="flex w-full flex-col items-start gap-2">{label}<Input type={type} value={value} onChange={event => onChange(event.target.value)} className="h-10 bg-background/50" /></Label>;
  function resetDemo() {
    setContent(initialContent);
    setDirty({ schedule: false, coaches: false, prices: false, config: false });
    setMessage('Vista previa reiniciada.');
  }

  return <div className="mx-auto max-w-7xl space-y-8">
    {demo && <div role="note" className="rounded-xl border border-yellow/40 bg-yellow/10 px-5 py-4 text-sm text-yellow"><strong className="mr-2">Prototipo interactivo.</strong>Puedes probar todos los campos. Los cambios de esta vista no se guardan ni afectan al sitio público.</div>}
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-5"><Logo className="h-auto w-[100px] shrink-0 sm:w-[130px]" /><h1 className="text-xl font-black uppercase tracking-tight text-yellow">Web Admin Dashboard</h1></div>
      <div className="flex items-center gap-3">{demo ? <Button variant="ghost" onClick={resetDemo}><RotateCcw /> Reiniciar</Button> : <Badge variant="secondary" className="max-w-44 truncate">{email}</Badge>}<Button variant="outline" asChild><a href={`${base}/`} target="_blank" rel="noopener noreferrer">Ver sitio <ExternalLink /></a></Button>{!demo && <form action={`${base}/api/admin/auth/logout`} method="post"><Button variant="ghost" type="submit">Salir</Button></form>}</div>
    </header>
    <Tabs value={active} onValueChange={value => { setActive(value as Section); setMessage(''); }} className="gap-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8"><TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted p-1 sm:w-[680px] sm:max-w-full sm:grid-cols-4"><TabsTrigger className="min-w-0 w-full" value="schedule">Horarios {dirty.schedule && '•'}</TabsTrigger><TabsTrigger className="min-w-0 w-full" value="coaches">Equipo {dirty.coaches && '•'}</TabsTrigger><TabsTrigger className="min-w-0 w-full" value="prices">Precios {dirty.prices && '•'}</TabsTrigger><TabsTrigger className="min-w-0 w-full" value="config">Datos generales {dirty.config && '•'}</TabsTrigger></TabsList><Button onClick={save} disabled={saving || !dirty[active]} size="lg" className="font-bold"><Save />{saving ? 'Guardando…' : demo ? 'Probar guardado' : 'Guardar cambios'}</Button></div>
      {message && <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.startsWith('Cambios') ? 'border-lime-400/50 bg-lime-400/10' : 'border-yellow/50 bg-yellow/10'}`}>{message}</p>}
      <TabsContent value="schedule"><ScheduleEditor slots={content.schedule} onChange={value => change('schedule', 'schedule', value)} /></TabsContent>
      <TabsContent value="coaches"><Card><CardHeader><CardTitle>Ferreira, Ana Lima y equipo</CardTitle><CardDescription>Edita el nombre, la biografía en portugués y el enlace de Instagram.</CardDescription></CardHeader><CardContent className="space-y-4">{content.coaches.map((item, index) => <div key={item.id} className="space-y-4 rounded-lg border border-border bg-background/30 p-5"><div className="flex items-end gap-3"> <div className="flex-1">{field('Nombre', item.name, value => coach(index, { name: value }))}</div><Button variant="ghost" size="icon" aria-label="Quitar persona" onClick={() => change('coaches', 'coaches', content.coaches.filter((_, i) => i !== index))}><Trash2 /></Button></div><div className="space-y-2"><Label>Biografía (portugués)</Label><Textarea rows={7} value={item.bio.pt} onChange={event => coach(index, { bio: { ...item.bio, pt: event.target.value } })} className="bg-background/50" /></div>{field('Instagram', item.instagram || '', value => coach(index, { instagram: value || undefined }), 'url')}</div>)}<Button variant="outline" onClick={() => change('coaches', 'coaches', [...content.coaches, { id: crypto.randomUUID(), name: '', bio: { pt: '' }, order: content.coaches.length + 1 }])}><Plus /> Añadir persona</Button></CardContent></Card></TabsContent>
      <TabsContent value="prices"><Card><CardHeader><CardTitle>Precios</CardTitle><CardDescription>Modifica los planes y sus importes en euros. El primer plan destacado conserva el estilo especial del sitio.</CardDescription></CardHeader><CardContent className="space-y-3">{content.prices.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border border-border bg-background/30 p-4 sm:grid-cols-[1fr_130px_130px_auto] sm:items-end">{field('Plan (portugués)', item.label.pt, value => price(index, { label: { ...item.label, pt: value } }))}{field('Precio (€)', String(item.priceEUR), value => price(index, { priceEUR: Number(value) }), 'number')}<label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={item.featured} onChange={event => price(index, { featured: event.target.checked })} className="accent-yellow" />Destacado</label><Button variant="ghost" size="icon" aria-label="Quitar plan" onClick={() => change('prices', 'prices', content.prices.filter((_, i) => i !== index))}><Trash2 /></Button></div>)}<Button variant="outline" onClick={() => change('prices', 'prices', [...content.prices, { id: crypto.randomUUID(), label: { pt: '' }, priceEUR: 1, featured: false, order: content.prices.length + 1 }])}><Plus /> Añadir plan</Button></CardContent></Card></TabsContent>
      <TabsContent value="config"><div className="grid gap-5 lg:grid-cols-2"><AnnouncementsEditor config={content.config} items={content.marquee} onConfig={config} onItems={items => change('config', 'marquee', items)} /><Card><CardHeader><CardTitle>Título y ubicación</CardTitle><CardDescription>Información principal que aparece en la web.</CardDescription></CardHeader><CardContent className="space-y-4">{field('Título principal (portugués)', content.config.heroTitle.pt, value => config({ heroTitle: { ...content.config.heroTitle, pt: value } }))}{field('Calle y número', content.config.address.street, value => config({ address: { ...content.config.address, street: value } }))}<div className="grid gap-4 sm:grid-cols-2">{field('Código postal', content.config.address.postalCode, value => config({ address: { ...content.config.address, postalCode: value } }))}{field('Ciudad', content.config.address.city, value => config({ address: { ...content.config.address, city: value } }))}</div>{field('Enlace de Google Maps', content.config.mapsHref, value => config({ mapsHref: value }), 'url')}</CardContent></Card><Card><CardHeader><CardTitle>Contacto</CardTitle><CardDescription>Datos que aparecen en el pie de página.</CardDescription></CardHeader><CardContent className="space-y-4">{field('Correos (separados por coma)', (content.config.emails || []).join(', '), value => config({ emails: value.split(',').map(v => v.trim()).filter(Boolean) }))}{field('WhatsApp (+351…)', content.config.whatsapp || '', value => config({ whatsapp: value }))}{field('Instagram', content.config.instagram || '', value => config({ instagram: value }), 'url')}{field('Facebook', content.config.facebook || '', value => config({ facebook: value }), 'url')}</CardContent></Card><Card className="lg:col-span-2"><CardHeader><CardTitle>Horario de apertura</CardTitle><CardDescription>Deja las dos horas vacías para marcar un día como cerrado.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">{(['weekdays', 'saturday', 'sunday'] as const).map((key, index) => <div key={key} className="space-y-3 rounded-lg border border-border bg-background/30 p-4"><p className="font-semibold">{['Lunes a viernes', 'Sábado', 'Domingo'][index]}</p>{field('Abre', content.config.openingHours[key]?.opens || '', value => config({ openingHours: { ...content.config.openingHours, [key]: value ? { opens: value, closes: content.config.openingHours[key]?.closes || value } : null } }), 'time')}{field('Cierra', content.config.openingHours[key]?.closes || '', value => config({ openingHours: { ...content.config.openingHours, [key]: value ? { opens: content.config.openingHours[key]?.opens || value, closes: value } : null } }), 'time')}</div>)}</CardContent></Card></div></TabsContent>
    </Tabs>
    <p className="text-xs text-muted-foreground">{demo ? 'Esta vista usa datos de ejemplo. Al salir o recargar se pierden los cambios de prueba.' : 'Los cambios en portugués se muestran como alternativa en los idiomas que no tengan traducción propia. Los datos se guardan en la base de datos del sitio.'}</p>
  </div>;
}
