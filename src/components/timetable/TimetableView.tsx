import { useTimetableStore } from '@/store/timetableStore';
import { DAYS, SLOTS, DayOfWeek, SlotId, SlotTime } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { useMemo, useCallback } from 'react';

const BATCH_HEADER_COLORS: Record<string, string> = {
  JEE: 'bg-blue-500 text-primary-foreground',
  NEET: 'bg-emerald-600 text-primary-foreground',
  Junior: 'bg-gray-400 text-primary-foreground',
  Droppers: 'bg-orange-500 text-primary-foreground',
};

const BATCH_HEADER_PDF_COLORS: Record<string, string> = {
  JEE: '#3b82f6',
  NEET: '#059669',
  Junior: '#9ca3af',
  Droppers: '#f97316',
};

const DAY_ROW_COLORS: Record<string, string> = {
  Mon: 'bg-blue-50', Tue: 'bg-blue-50', Wed: 'bg-blue-50',
  Thu: 'bg-blue-50', Fri: 'bg-orange-50', Sat: 'bg-orange-50',
};

const DAY_ROW_PDF_COLORS: Record<string, string> = {
  Mon: '#eff6ff', Tue: '#eff6ff', Wed: '#eff6ff',
  Thu: '#eff6ff', Fri: '#fff7ed', Sat: '#fff7ed',
};

export function TimetableView() {
  const { generatedTimetable, batches, teachers } = useTimetableStore();

  const activeBatches = useMemo(() =>
    batches.filter(b => b.active).sort((a, b) => {
      const order = { Droppers: 0, JEE: 1, NEET: 2, Junior: 3 };
      return (order[a.category] ?? 4) - (order[b.category] ?? 4);
    }), [batches]);

  const getTeacherCode = useCallback((id: string) => teachers.find(t => t.id === id)?.code || '?', [teachers]);

  const getBatchSlots = (session: 'Morning' | 'Evening'): SlotTime[] => SLOTS.filter(s => s.session === session);

  const getEntry = useCallback((batchId: string, day: DayOfWeek, slotId: SlotId) => {
    return generatedTimetable?.entries.find(e => e.batchId === batchId && e.day === day && e.slot === slotId);
  }, [generatedTimetable]);

  const getDateLabel = useCallback((day: DayOfWeek) => {
    if (!generatedTimetable?.weekConfig.startDate) return '';
    const dayIndex = DAYS.indexOf(day);
    const start = new Date(generatedTimetable.weekConfig.startDate);
    const date = new Date(start);
    date.setDate(date.getDate() + dayIndex);
    return `${date.getDate()}-${date.toLocaleString('en', { month: 'short' })}`;
  }, [generatedTimetable]);

  const exportPDF = useCallback(() => {
    if (!generatedTimetable) return;
    const { entries, weekConfig } = generatedTimetable;
    const activeDays = DAYS.filter(d => !weekConfig.holidays.some(h => h.day === d));

    // Build SVG-based PDF content as printable HTML
    const colWidth = 140;
    const headerHeight = 60;
    const slotHeaderHeight = 30;
    const dayRowHeight = 50;
    const leftColWidth = 100;
    const dateColWidth = 70;
    const totalCols = activeBatches.reduce((sum, b) => sum + getBatchSlots(b.slotSession).length, 0);
    const tableWidth = leftColWidth + dateColWidth + totalCols * colWidth;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Timetable - ${weekConfig.weekLabel}</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
      table { border-collapse: collapse; width: 100%; font-size: 9px; }
      th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: center; }
      .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 10px; }
    </style></head><body>
    <div class="title">TIME TABLE : ${weekConfig.weekLabel.toUpperCase()}</div>
    <table>
    <thead>
    <tr><th rowspan="2" style="min-width:80px;background:#f3f4f6;">BATCH</th>
    <th rowspan="2" style="min-width:60px;background:#f3f4f6;">DATE</th>`;

    for (const batch of activeBatches) {
      const slots = getBatchSlots(batch.slotSession);
      const color = BATCH_HEADER_PDF_COLORS[batch.category] || '#9ca3af';
      html += `<th colspan="${slots.length}" style="background:${color};color:white;font-weight:bold;">${batch.displayName}</th>`;
    }
    html += `</tr><tr>`;
    for (const batch of activeBatches) {
      const slots = getBatchSlots(batch.slotSession);
      for (const slot of slots) {
        html += `<th style="background:#f3f4f6;font-size:8px;">${slot.start}<br>${slot.end}</th>`;
      }
    }
    html += `</tr></thead><tbody>`;

    for (const day of activeDays) {
      const dateLabel = (() => {
        if (!weekConfig.startDate) return '';
        const dayIndex = DAYS.indexOf(day);
        const start = new Date(weekConfig.startDate);
        const date = new Date(start);
        date.setDate(date.getDate() + dayIndex);
        return `${date.getDate()}-${date.toLocaleString('en', { month: 'short' })}`;
      })();
      const dayColor = DAY_ROW_PDF_COLORS[day] || '#fff';
      const dayName = day === 'Mon' ? 'MONDAY' : day === 'Tue' ? 'TUESDAY' : day === 'Wed' ? 'WEDNESDAY' : day === 'Thu' ? 'THURSDAY' : day === 'Fri' ? 'FRIDAY' : 'SATURDAY';

      // Room row
      html += `<tr><td rowspan="2" style="background:${dayColor};font-weight:bold;">${dayName}</td>`;
      html += `<td style="background:${dayColor};font-size:8px;">${dateLabel}</td>`;
      for (const batch of activeBatches) {
        const slots = getBatchSlots(batch.slotSession);
        const batchEntries = entries.filter(e => e.batchId === batch.id && e.day === day);
        const room = batchEntries.length > 0 ? batchEntries[0].room : batch.defaultRoom;
        html += `<td colspan="${slots.length}" style="background:${dayColor};font-size:8px;color:#666;">${room.replace('R', 'ROOM-0')}</td>`;
      }
      html += `</tr>`;

      // Teacher row
      html += `<tr><td style="background:${dayColor};"></td>`;
      for (const batch of activeBatches) {
        const slots = getBatchSlots(batch.slotSession);
        for (const slot of slots) {
          const entry = entries.find(e => e.batchId === batch.id && e.day === day && e.slot === slot.id);
          html += `<td style="background:${dayColor};font-weight:bold;">${entry ? getTeacherCode(entry.teacherId) : ''}</td>`;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [generatedTimetable, activeBatches, getTeacherCode]);

  if (!generatedTimetable) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No timetable generated yet</p>
        <p className="text-sm mt-1">Go to Generate tab to create one</p>
      </div>
    );
  }

  const { entries, backlog, feasible, weekConfig } = generatedTimetable;
  const activeDays = DAYS.filter(d => !weekConfig.holidays.some(h => h.day === d));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            TIME TABLE : {weekConfig.weekLabel.toUpperCase()}
            {feasible ? (
              <CheckCircle2 className="w-5 h-5 text-success inline ml-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning inline ml-2" />
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{entries.length} classes · {backlog.length} backlog</p>
        </div>
        <Button onClick={exportPDF} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-1" /> Export PDF
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse text-xs" style={{ minWidth: `${200 + activeBatches.length * 200}px` }}>
          <thead>
            <tr>
              <th className="border border-border bg-muted p-2 text-left font-bold min-w-[80px] sticky left-0 z-10" rowSpan={2}>BATCH</th>
              <th className="border border-border bg-muted p-2 text-left font-bold min-w-[60px] sticky left-[80px] z-10" rowSpan={2}>DATE | TIME</th>
              {activeBatches.map(batch => {
                const slots = getBatchSlots(batch.slotSession);
                const colorClass = BATCH_HEADER_COLORS[batch.category] || 'bg-muted';
                return (
                  <th key={batch.id} colSpan={slots.length} className={`border border-border p-2 text-center font-bold ${colorClass}`}>
                    <div className="text-xs font-bold">{batch.displayName}</div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {activeBatches.map(batch => {
                const slots = getBatchSlots(batch.slotSession);
                return slots.map(slot => (
                  <th key={`${batch.id}-${slot.id}`} className="border border-border bg-muted p-1 text-center text-[10px] font-medium">
                    <div>{slot.start}</div>
                    <div>{slot.end}</div>
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody>
            {activeDays.map(day => {
              const dateLabel = getDateLabel(day);
              const dayColor = DAY_ROW_COLORS[day] || '';
              return (
                <>
                  <tr key={`${day}-header`}>
                    <td className={`border border-border p-2 font-bold text-xs uppercase sticky left-0 z-10 ${dayColor}`} rowSpan={2}>
                      {day === 'Mon' ? 'MONDAY' : day === 'Tue' ? 'TUESDAY' : day === 'Wed' ? 'WEDNESDAY' : day === 'Thu' ? 'THURSDAY' : day === 'Fri' ? 'FRIDAY' : 'SATURDAY'}
                    </td>
                    <td className={`border border-border p-1 text-[10px] font-medium sticky left-[80px] z-10 ${dayColor}`}>{dateLabel}</td>
                    {activeBatches.map(batch => {
                      const slots = getBatchSlots(batch.slotSession);
                      const batchEntries = entries.filter(e => e.batchId === batch.id && e.day === day);
                      const room = batchEntries.length > 0 ? batchEntries[0].room : batch.defaultRoom;
                      return (
                        <td key={`${batch.id}-${day}-room`} colSpan={slots.length} className={`border border-border p-1 text-center text-[10px] font-medium text-muted-foreground ${dayColor}`}>
                          {room.replace('R', 'ROOM - 0')}
                        </td>
                      );
                    })}
                  </tr>
                  <tr key={`${day}-teachers`}>
                    <td className={`border border-border p-1 text-[10px] sticky left-[80px] z-10 ${dayColor}`}></td>
                    {activeBatches.map(batch => {
                      const slots = getBatchSlots(batch.slotSession);
                      return slots.map(slot => {
                        const entry = getEntry(batch.id, day, slot.id);
                        const isMerged = entry?.merged && entry.merged.length > 0;
                        return (
                          <td key={`${batch.id}-${day}-${slot.id}`} className={`border border-border p-1 text-center font-bold text-xs ${dayColor} ${entry ? '' : 'text-muted-foreground/30'} ${isMerged ? 'ring-1 ring-inset ring-info/40 bg-info/5' : ''}`}>
                            {entry ? (
                              <div>
                                <span>{getTeacherCode(entry.teacherId)}</span>
                                {isMerged && <span className="text-[8px] text-info block">M</span>}
                              </div>
                            ) : ''}
                          </td>
                        );
                        );
                      });
                    })}
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {backlog.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Backlog ({backlog.length})
          </h3>
          <div className="space-y-1">
            {backlog.map((b, i) => {
              const batchName = batches.find(bt => bt.id === b.batchId)?.displayName || '?';
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">{batchName}</Badge>
                  <span>{b.subject} – {b.classesShort} classes short</span>
                  <span className="text-muted-foreground text-xs">({b.reason})</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="text-2xl font-bold text-foreground">{entries.length}</div>
          <div className="text-xs text-muted-foreground">Classes Scheduled</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-foreground">{new Set(entries.map(e => e.teacherId)).size}</div>
          <div className="text-xs text-muted-foreground">Teachers Used</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-foreground">{new Set(entries.map(e => e.room)).size}</div>
          <div className="text-xs text-muted-foreground">Rooms Used</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-warning">{backlog.length}</div>
          <div className="text-xs text-muted-foreground">Backlog Items</div>
        </div>
      </div>
    </div>
  );
}
