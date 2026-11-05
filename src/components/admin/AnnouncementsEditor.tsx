'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { MarqueeItem, SiteConfig } from '@/content/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const CTA_MAX = 33;

export function AnnouncementsEditor({ config, items, onConfig, onItems }: {
  config: SiteConfig;
  items: MarqueeItem[];
  onConfig: (patch: Partial<SiteConfig>) => void;
  onItems: (items: MarqueeItem[]) => void;
}) {
  const label = config.ctaLabel.pt;
  const badge = config.ctaBadge.pt;
  const used = `${label} ${badge}`.length;
  const update = (index: number, patch: Partial<MarqueeItem>) => onItems(items.map((item, i) => i === index ? { ...item, ...patch } : item));

  return <>
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div><CardTitle>Marquesina</CardTitle><CardDescription>Avisos especiales que se desplazan debajo de la portada.</CardDescription></div>
        <Label className="flex items-center gap-3 text-sm font-semibold">
          <span>{config.marqueeEnabled === false ? 'Inactiva' : 'Activa'}</span>
          <Switch checked={config.marqueeEnabled !== false} onCheckedChange={checked => onConfig({ marqueeEnabled: checked })} aria-label="Mostrar marquesina" />
        </Label>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => <div key={item.id} className="space-y-4 rounded-lg border border-border bg-background/30 p-4">
          <div className="flex items-center justify-between gap-3"><p className="font-bold text-yellow">Aviso {index + 1}</p><Button variant="ghost" size="icon" aria-label={`Quitar aviso ${index + 1}`} onClick={() => onItems(items.filter((_, i) => i !== index))}><Trash2 /></Button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Label className="flex flex-col items-start gap-2">Texto destacado<Input value={item.highlight.pt} onChange={event => update(index, { highlight: { ...item.highlight, pt: event.target.value } })} className="bg-background/50" /></Label>
            <Label className="flex flex-col items-start gap-2">Texto secundario<Input value={item.text?.pt || ''} onChange={event => update(index, { text: event.target.value ? { ...item.text, pt: event.target.value } : undefined })} className="bg-background/50" /></Label>
            <Label className="flex flex-col items-start gap-2">Mostrar desde (opcional)<Input type="date" value={item.startsOn || ''} onChange={event => update(index, { startsOn: event.target.value || undefined })} className="bg-background/50" /></Label>
            <Label className="flex flex-col items-start gap-2">Mostrar hasta (opcional)<Input type="date" value={item.endsOn || ''} onChange={event => update(index, { endsOn: event.target.value || undefined })} className="bg-background/50" /></Label>
            <Label className="flex flex-col items-start gap-2 md:col-span-2">Enlace al hacer clic (opcional)<Input type="url" value={item.href || ''} onChange={event => update(index, { href: event.target.value || undefined })} placeholder="https://" className="bg-background/50" /></Label>
          </div>
          <p className="rounded-md bg-yellow px-3 py-2 text-sm text-moss-950"><strong>{item.highlight.pt || 'Texto destacado'}</strong>{item.text?.pt && <> {item.text.pt}</>}</p>
        </div>)}
        <Button variant="outline" disabled={items.length >= 20} onClick={() => onItems([...items, { id: crypto.randomUUID(), highlight: { pt: 'Nuevo aviso' }, order: items.length + 1 }])}><Plus /> Añadir aviso</Button>
        {config.marqueeEnabled === false && <p className="text-sm text-muted-foreground">Los avisos quedan guardados mientras la marquesina está inactiva.</p>}
      </CardContent>
    </Card>
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Botón de reserva</CardTitle><CardDescription>El texto completo tiene un máximo de {CTA_MAX} caracteres para conservar el tamaño del botón.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Label className="flex flex-col items-start gap-2">Texto principal<Input value={label} maxLength={CTA_MAX - badge.length - 1} onChange={event => onConfig({ ctaLabel: { ...config.ctaLabel, pt: event.target.value } })} className="bg-background/50" /></Label>
          <Label className="flex flex-col items-start gap-2">Sello destacado<Input value={badge} maxLength={CTA_MAX - label.length - 1} onChange={event => onConfig({ ctaBadge: { ...config.ctaBadge, pt: event.target.value } })} className="bg-background/50" /></Label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Vista previa: <span className="font-bold text-foreground">{label} <span className="text-yellow">{badge}</span></span></p><p className="text-sm tabular-nums text-muted-foreground">{used}/{CTA_MAX} caracteres</p></div>
      </CardContent>
    </Card>
  </>;
}
