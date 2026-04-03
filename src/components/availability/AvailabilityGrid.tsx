import { useTimetableStore } from '@/store/timetableStore';
import { DAYS, SLOTS } from '@/types/timetable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

export function AvailabilityGrid() {
  const { teachers, availability, toggleSlotAvailability } = useTimetableStore();
  const activeTeachers = teachers.filter(t => t.active);
  const [selectedTeacher, setSelectedTeacher] = useState(activeTeachers[0]?.id || '');

  const isAvailable = (teacherId: string, day: string, slotId: string) => {
    const a = availability.find(av => av.teacherId === teacherId && av.day === day);
    return a ? a.slots.includes(slotId as any) : false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Teacher Availability</h2>
          <p className="text-sm text-muted-foreground">Click cells to toggle. Default: all available.</p>
        </div>
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select teacher" /></SelectTrigger>
          <SelectContent>
            {activeTeachers.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTeacher && (
        <div className="overflow-x-auto">
          <div className="inline-grid gap-0" style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)` }}>
            {/* Header */}
            <div className="grid-cell-header">Slot</div>
            {DAYS.map(d => <div key={d} className="grid-cell-header">{d}</div>)}

            {/* Rows */}
            {SLOTS.map(slot => (
              <>
                <div key={`label-${slot.id}`} className="grid-cell bg-muted font-medium text-xs">
                  <div>
                    <div>{slot.id}</div>
                    <div className="text-muted-foreground">{slot.start}–{slot.end}</div>
                  </div>
                </div>
                {DAYS.map(day => {
                  const avail = isAvailable(selectedTeacher, day, slot.id);
                  return (
                    <div
                      key={`${slot.id}-${day}`}
                      className={`grid-cell cursor-pointer transition-colors ${avail ? 'bg-success/15 hover:bg-success/25 text-success' : 'bg-destructive/10 hover:bg-destructive/20 text-destructive'}`}
                      onClick={() => toggleSlotAvailability(selectedTeacher, day, slot.id)}
                    >
                      {avail ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* All teachers overview */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">All Teachers Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 bg-muted font-semibold">Teacher</th>
                {DAYS.map(d => <th key={d} className="p-2 bg-muted font-semibold text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {activeTeachers.map(t => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-2 font-medium">{t.code}</td>
                  {DAYS.map(day => {
                    const a = availability.find(av => av.teacherId === t.id && av.day === day);
                    const count = a ? a.slots.length : 0;
                    return (
                      <td key={day} className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${count === 6 ? 'bg-success/15 text-success' : count === 0 ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning'}`}>
                          {count}/6
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
