import { useTimetableStore } from '@/store/timetableStore';
import { Subject } from '@/types/timetable';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';

export function TeacherMappingMatrix() {
  const { teachers, batches, mappings, toggleMapping } = useTimetableStore();
  const activeTeachers = teachers.filter(t => t.active);
  const activeBatches = batches.filter(b => b.active);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<Subject | 'all'>('all');

  const categories = [...new Set(activeBatches.map(b => b.category))];

  const filteredBatches = activeBatches.filter(b => {
    if (filterCategory !== 'all' && b.category !== filterCategory) return false;
    return true;
  });

  // Build batch+subject rows
  const rows: { batchId: string; batchName: string; subject: Subject }[] = [];
  for (const batch of filteredBatches) {
    for (const subject of batch.subjects) {
      if (filterSubject !== 'all' && subject !== filterSubject) continue;
      rows.push({ batchId: batch.id, batchName: batch.displayName, subject });
    }
  }

  const hasMapping = (teacherId: string, batchId: string, subject: Subject) => {
    return mappings.some(m => m.teacherId === teacherId && m.batchId === batchId && m.subject === subject);
  };

  const canTeach = (teacherId: string, subject: Subject) => {
    const teacher = activeTeachers.find(t => t.id === teacherId);
    return teacher?.subjects.includes(subject) || false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Teacher-Batch Mapping</h2>
          <p className="text-sm text-muted-foreground">Click cells to assign teachers to batch-subjects</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'] as Subject[]).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="grid-cell-header text-left min-w-[180px]">Batch / Subject</th>
              {activeTeachers.map(t => (
                <th key={t.id} className="grid-cell-header min-w-[60px]">
                  <div className="text-center">
                    <div>{t.code}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.batchId}-${row.subject}-${i}`}>
                <td className="grid-cell bg-muted text-left font-medium">
                  <span>{row.batchName} – {row.subject}</span>
                </td>
                {activeTeachers.map(t => {
                  const mapped = hasMapping(t.id, row.batchId, row.subject);
                  const able = canTeach(t.id, row.subject);
                  return (
                    <td
                      key={t.id}
                      className={`grid-cell cursor-pointer transition-colors ${
                        mapped
                          ? 'bg-primary/15 text-primary'
                          : able
                            ? 'bg-card hover:bg-muted'
                            : 'bg-muted/50 text-muted-foreground/30'
                      }`}
                      onClick={() => able && toggleMapping(t.id, row.batchId, row.subject)}
                    >
                      {mapped && <Check className="w-4 h-4" />}
                      {!mapped && able && <span className="text-muted-foreground/40">·</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No batch-subject combinations match the filters</div>
      )}
    </div>
  );
}
