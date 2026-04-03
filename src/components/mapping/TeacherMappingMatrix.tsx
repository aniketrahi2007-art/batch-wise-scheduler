import { useTimetableStore } from '@/store/timetableStore';
import { Subject } from '@/types/timetable';
import { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const ALL_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit', 'SST', 'Science'];

export function TeacherMappingMatrix() {
  const { teachers, batches, mappings, toggleMapping } = useTimetableStore();
  const activeTeachers = teachers.filter(t => t.active);
  const activeBatches = batches.filter(b => b.active);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<Subject | 'all'>('all');
  const [filterBatch, setFilterBatch] = useState<string>('all');

  const categories = [...new Set(activeBatches.map(b => b.category))];

  // Build rows: batch + subject combos
  const rows = useMemo(() => {
    const result: { batchId: string; batchName: string; subject: Subject; category: string }[] = [];
    for (const batch of activeBatches) {
      if (filterCategory !== 'all' && batch.category !== filterCategory) continue;
      if (filterBatch !== 'all' && batch.id !== filterBatch) continue;
      for (const subject of batch.subjects) {
        if (filterSubject !== 'all' && subject !== filterSubject) continue;
        result.push({ batchId: batch.id, batchName: batch.displayName, subject, category: batch.category });
      }
    }
    return result;
  }, [activeBatches, filterCategory, filterSubject, filterBatch]);

  // Fast lookup set
  const mappingSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      set.add(`${m.teacherId}|${m.batchId}|${m.subject}`);
    }
    return set;
  }, [mappings]);

  const hasMapping = useCallback((teacherId: string, batchId: string, subject: Subject) => {
    return mappingSet.has(`${teacherId}|${batchId}|${subject}`);
  }, [mappingSet]);

  const canTeach = useCallback((teacherId: string, subject: Subject) => {
    return activeTeachers.find(t => t.id === teacherId)?.subjects.includes(subject) || false;
  }, [activeTeachers]);

  // Check if a row has at least one teacher assigned
  const rowHasAssignment = useCallback((batchId: string, subject: Subject) => {
    return activeTeachers.some(t => hasMapping(t.id, batchId, subject));
  }, [activeTeachers, hasMapping]);

  // Select all in column (assign teacher to all visible rows where they can teach)
  const toggleColumn = useCallback((teacherId: string) => {
    const teacher = activeTeachers.find(t => t.id === teacherId);
    if (!teacher) return;
    // Check if all assignable rows are already mapped
    const assignableRows = rows.filter(r => canTeach(teacherId, r.subject));
    const allMapped = assignableRows.every(r => hasMapping(teacherId, r.batchId, r.subject));
    
    for (const row of assignableRows) {
      const isMapped = hasMapping(teacherId, row.batchId, row.subject);
      if (allMapped && isMapped) {
        toggleMapping(teacherId, row.batchId, row.subject);
      } else if (!allMapped && !isMapped) {
        toggleMapping(teacherId, row.batchId, row.subject);
      }
    }
  }, [activeTeachers, rows, canTeach, hasMapping, toggleMapping]);

  // Count assignments per teacher column
  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of activeTeachers) {
      counts[t.id] = rows.filter(r => hasMapping(t.id, r.batchId, r.subject)).length;
    }
    return counts;
  }, [activeTeachers, rows, hasMapping]);

  // Unassigned rows count
  const unassignedCount = useMemo(() => {
    return rows.filter(r => !rowHasAssignment(r.batchId, r.subject)).length;
  }, [rows, rowHasAssignment]);

  const filteredBatches = filterCategory === 'all'
    ? activeBatches
    : activeBatches.filter(b => b.category === filterCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Teacher–Batch Mapping</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} rows · {mappings.length} assignments
            {unassignedCount > 0 && (
              <span className="text-destructive ml-2">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {unassignedCount} unassigned
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setFilterBatch('all'); }}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBatch} onValueChange={setFilterBatch}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v as any)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {ALL_SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-auto border rounded-lg max-h-[60vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-primary text-primary-foreground p-2 text-left min-w-[200px] border-r border-primary-foreground/20 sticky left-0 z-20">
                Batch ↓ / Teacher →
              </th>
              {activeTeachers.map(t => (
                <th key={t.id} className="bg-primary text-primary-foreground p-1.5 text-center min-w-[56px] border-r border-primary-foreground/20">
                  <div
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => toggleColumn(t.id)}
                    title={`${t.name} — Click to select/deselect all`}
                  >
                    <div className="font-bold">{t.code}</div>
                    <div className="text-[9px] opacity-70 font-normal">{columnCounts[t.id] || 0}</div>
                  </div>
                </th>
              ))}
              <th className="bg-primary text-primary-foreground p-1.5 text-center min-w-[32px]">
                <span className="text-[9px] opacity-70">⚠</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const hasAssignment = rowHasAssignment(row.batchId, row.subject);
              // Show batch separator
              const prevRow = i > 0 ? rows[i - 1] : null;
              const isNewBatch = !prevRow || prevRow.batchId !== row.batchId;

              return (
                <tr
                  key={`${row.batchId}-${row.subject}`}
                  className={`${!hasAssignment ? 'bg-destructive/5' : i % 2 === 0 ? 'bg-card' : 'bg-muted/30'} ${isNewBatch ? 'border-t-2 border-border' : ''}`}
                >
                  <td className={`p-2 text-left font-medium border-r border-border sticky left-0 z-[5] ${!hasAssignment ? 'bg-destructive/5' : i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                    <span className="text-foreground">{row.batchName}</span>
                    <span className="text-muted-foreground"> – </span>
                    <span className="text-foreground">{row.subject}</span>
                  </td>
                  {activeTeachers.map(t => {
                    const mapped = hasMapping(t.id, row.batchId, row.subject);
                    const able = canTeach(t.id, row.subject);
                    return (
                      <td
                        key={t.id}
                        className={`p-0 text-center border-r border-border ${!able ? 'bg-muted/60' : ''}`}
                      >
                        {able ? (
                          <label className="flex items-center justify-center w-full h-full p-2 cursor-pointer hover:bg-primary/5">
                            <Checkbox
                              checked={mapped}
                              onCheckedChange={() => toggleMapping(t.id, row.batchId, row.subject)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </label>
                        ) : (
                          <span className="text-muted-foreground/20">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-1 text-center">
                    {!hasAssignment && <AlertTriangle className="w-3.5 h-3.5 text-destructive mx-auto" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No batch-subject combinations match the filters</div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/10 border border-destructive/30" /> Unassigned row</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/60 border" /> Teacher can't teach this subject</span>
        <span>Click teacher code header to select/deselect entire column</span>
      </div>
    </div>
  );
}
