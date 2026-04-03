import { useTimetableStore } from '@/store/timetableStore';
import { DAYS, SLOTS, DayOfWeek, SlotId } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-800 border-blue-200',
  Chemistry: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Maths: 'bg-amber-100 text-amber-800 border-amber-200',
  Biology: 'bg-green-100 text-green-800 border-green-200',
  English: 'bg-purple-100 text-purple-800 border-purple-200',
  Hindi: 'bg-rose-100 text-rose-800 border-rose-200',
  Sanskrit: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function TimetableView() {
  const { generatedTimetable, batches, teachers } = useTimetableStore();
  const [viewMode, setViewMode] = useState<'batch' | 'teacher'>('batch');
  const [selectedId, setSelectedId] = useState<string>('');

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

  const getEntries = (day: DayOfWeek, slot: SlotId) => {
    return entries.filter(e => {
      if (e.day !== day || e.slot !== slot) return false;
      if (viewMode === 'batch') return e.batchId === selectedId;
      return e.teacherId === selectedId;
    });
  };

  const items = viewMode === 'batch'
    ? batches.filter(b => b.active).map(b => ({ id: b.id, label: b.displayName }))
    : teachers.filter(t => t.active).map(t => ({ id: t.id, label: `${t.name} (${t.code})` }));

  if (!selectedId && items.length > 0) {
    setSelectedId(items[0].id);
  }

  const getTeacherCode = (id: string) => teachers.find(t => t.id === id)?.code || '?';
  const getBatchName = (id: string) => batches.find(b => b.id === id)?.displayName || '?';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {weekConfig.weekLabel}
            {feasible ? (
              <CheckCircle2 className="w-5 h-5 text-success inline ml-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning inline ml-2" />
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{entries.length} classes · {backlog.length} backlog</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v) => { setViewMode(v as any); setSelectedId(''); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="batch">By Batch</SelectItem>
              <SelectItem value="teacher">By Teacher</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {items.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0 min-w-[700px]" style={{ gridTemplateColumns: `100px repeat(${activeDays.length}, 1fr)` }}>
          <div className="grid-cell-header">Slot</div>
          {activeDays.map(d => <div key={d} className="grid-cell-header">{d}</div>)}

          {SLOTS.map(slot => (
            <>
              <div key={`label-${slot.id}`} className="grid-cell bg-muted font-medium text-xs">
                <div>
                  <div>{slot.id}</div>
                  <div className="text-muted-foreground text-[10px]">{slot.start}–{slot.end}</div>
                </div>
              </div>
              {activeDays.map(day => {
                const cellEntries = getEntries(day, slot.id);
                return (
                  <div key={`${slot.id}-${day}`} className={`grid-cell ${cellEntries.length > 0 ? '' : 'bg-card'}`}>
                    {cellEntries.map((e, i) => (
                      <div key={i} className={`rounded px-1.5 py-1 text-xs border ${SUBJECT_COLORS[e.subject] || 'bg-muted'}`}>
                        <div className="font-semibold">{e.subject}</div>
                        <div className="text-[10px] opacity-75">
                          {viewMode === 'batch' ? getTeacherCode(e.teacherId) : getBatchName(e.batchId)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Backlog */}
      {backlog.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Backlog ({backlog.length})
          </h3>
          <div className="space-y-1">
            {backlog.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">{getBatchName(b.batchId)}</Badge>
                <span>{b.subject} – {b.classesShort} classes short</span>
                <span className="text-muted-foreground text-xs">({b.reason})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stats */}
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
