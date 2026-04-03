import { useTimetableStore } from '@/store/timetableStore';
import { DAYS, SLOTS, DayOfWeek, SlotId, SlotTime } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

// Color coding for batch headers (matching reference)
const BATCH_HEADER_COLORS: Record<string, string> = {
  JEE: 'bg-blue-500 text-primary-foreground',
  NEET: 'bg-emerald-600 text-primary-foreground',
  Junior: 'bg-gray-400 text-primary-foreground',
  Droppers: 'bg-orange-500 text-primary-foreground',
};

// Alternating pastel row per day
const DAY_ROW_COLORS: Record<string, string> = {
  Mon: 'bg-blue-50',
  Tue: 'bg-blue-50',
  Wed: 'bg-blue-50',
  Thu: 'bg-blue-50',
  Fri: 'bg-orange-50',
  Sat: 'bg-orange-50',
};

export function TimetableView() {
  const { generatedTimetable, batches, teachers } = useTimetableStore();

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
  const activeBatches = batches.filter(b => b.active).sort((a, b) => {
    // Sort: Droppers first (morning), then JEE, NEET, Junior
    const order = { Droppers: 0, JEE: 1, NEET: 2, Junior: 3 };
    return (order[a.category] ?? 4) - (order[b.category] ?? 4);
  });

  const getTeacherCode = (id: string) => teachers.find(t => t.id === id)?.code || '?';

  // Get batch's slots based on session
  const getBatchSlots = (session: 'Morning' | 'Evening'): SlotTime[] => {
    return SLOTS.filter(s => s.session === session);
  };

  // Get entry for a batch at a specific day+slot
  const getEntry = (batchId: string, day: DayOfWeek, slotId: SlotId) => {
    return entries.find(e => e.batchId === batchId && e.day === day && e.slot === slotId);
  };

  // Generate date labels for each day
  const getDateLabel = (day: DayOfWeek) => {
    const dayIndex = DAYS.indexOf(day);
    if (weekConfig.startDate) {
      const start = new Date(weekConfig.startDate);
      // Find the Monday of the week
      const date = new Date(start);
      date.setDate(date.getDate() + dayIndex);
      return `${date.getDate()}-${date.toLocaleString('en', { month: 'short' })}`;
    }
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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
      </div>

      {/* Main Grid - Horizontal layout matching reference */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse text-xs" style={{ minWidth: `${200 + activeBatches.length * 200}px` }}>
          {/* Row 1: Batch names with category colors */}
          <thead>
            <tr>
              <th className="border border-border bg-muted p-2 text-left font-bold min-w-[80px] sticky left-0 z-10" rowSpan={2}>BATCH</th>
              <th className="border border-border bg-muted p-2 text-left font-bold min-w-[60px] sticky left-[80px] z-10" rowSpan={2}>DATE | TIME</th>
              {activeBatches.map(batch => {
                const slots = getBatchSlots(batch.slotSession);
                const colorClass = BATCH_HEADER_COLORS[batch.category] || 'bg-muted';
                return (
                  <th
                    key={batch.id}
                    colSpan={slots.length}
                    className={`border border-border p-2 text-center font-bold ${colorClass}`}
                  >
                    <div className="text-xs font-bold">{batch.displayName}</div>
                  </th>
                );
              })}
            </tr>
            {/* Row 2: Time slots per batch */}
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
                  {/* Day header row - Room assignments */}
                  <tr key={`${day}-header`}>
                    <td className={`border border-border p-2 font-bold text-xs uppercase sticky left-0 z-10 ${dayColor}`} rowSpan={2}>
                      {day === 'Mon' ? 'MONDAY' : day === 'Tue' ? 'TUESDAY' : day === 'Wed' ? 'WEDNESDAY' : day === 'Thu' ? 'THURSDAY' : day === 'Fri' ? 'FRIDAY' : 'SATURDAY'}
                    </td>
                    <td className={`border border-border p-1 text-[10px] font-medium sticky left-[80px] z-10 ${dayColor}`}>
                      {dateLabel}
                    </td>
                    {activeBatches.map(batch => {
                      const slots = getBatchSlots(batch.slotSession);
                      // Show room spanning all slots for this batch
                      const batchEntries = entries.filter(e => e.batchId === batch.id && e.day === day);
                      const room = batchEntries.length > 0 ? batchEntries[0].room : batch.defaultRoom;
                      return slots.map((slot, i) => {
                        if (i === 0) {
                          return (
                            <td
                              key={`${batch.id}-${day}-room`}
                              colSpan={slots.length}
                              className={`border border-border p-1 text-center text-[10px] font-medium text-muted-foreground ${dayColor}`}
                            >
                              {room.replace('R', 'ROOM - 0')}
                            </td>
                          );
                        }
                        return null;
                      });
                    })}
                  </tr>
                  {/* Teacher codes row */}
                  <tr key={`${day}-teachers`}>
                    <td className={`border border-border p-1 text-[10px] sticky left-[80px] z-10 ${dayColor}`}></td>
                    {activeBatches.map(batch => {
                      const slots = getBatchSlots(batch.slotSession);
                      return slots.map(slot => {
                        const entry = getEntry(batch.id, day, slot.id);
                        return (
                          <td
                            key={`${batch.id}-${day}-${slot.id}`}
                            className={`border border-border p-1 text-center font-bold text-xs ${dayColor} ${entry ? '' : 'text-muted-foreground/30'}`}
                          >
                            {entry ? getTeacherCode(entry.teacherId) : ''}
                          </td>
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

      {/* Backlog */}
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
