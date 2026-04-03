import { useState, useMemo } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Subject, MergeRule } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, Merge, AlertTriangle } from 'lucide-react';

const ALL_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit', 'SST', 'Science'];

export function MergeManager() {
  const { batches, teachers, mergeRules, addMergeRule, removeMergeRule, mappings } = useTimetableStore();
  const activeBatches = batches.filter(b => b.active);
  const activeTeachers = teachers.filter(t => t.active);

  const [adding, setAdding] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  // Get common subjects among selected batches
  const commonSubjects = useMemo(() => {
    if (selectedBatches.length < 2) return [];
    const first = activeBatches.find(b => b.id === selectedBatches[0]);
    if (!first) return [];
    return first.subjects.filter(s =>
      selectedBatches.every(bid => {
        const batch = activeBatches.find(b => b.id === bid);
        return batch?.subjects.includes(s);
      })
    );
  }, [selectedBatches, activeBatches]);

  // Get eligible teachers for selected subject (must be mapped to ALL selected batches for that subject)
  const eligibleTeachers = useMemo(() => {
    if (!selectedSubject || selectedBatches.length < 2) return [];
    return activeTeachers.filter(t => {
      if (!t.subjects.includes(selectedSubject as Subject)) return false;
      // Check if mapped to all selected batches
      return selectedBatches.every(bid =>
        mappings.some(m => m.teacherId === t.id && m.batchId === bid && m.subject === selectedSubject)
      );
    });
  }, [selectedSubject, selectedBatches, activeTeachers, mappings]);

  // Check for same session among selected batches
  const sessionConflict = useMemo(() => {
    if (selectedBatches.length < 2) return false;
    const sessions = selectedBatches.map(bid => activeBatches.find(b => b.id === bid)?.slotSession);
    return new Set(sessions).size > 1;
  }, [selectedBatches, activeBatches]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatches(prev =>
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    );
    setSelectedSubject('');
    setSelectedTeacher('');
  };

  const handleAdd = () => {
    if (selectedBatches.length < 2 || !selectedSubject || !selectedTeacher) return;
    addMergeRule({
      id: `merge-${Date.now()}`,
      batchIds: selectedBatches,
      subject: selectedSubject as Subject,
      teacherId: selectedTeacher,
    });
    setSelectedBatches([]);
    setSelectedSubject('');
    setSelectedTeacher('');
    setAdding(false);
  };

  const getBatchName = (id: string) => activeBatches.find(b => b.id === id)?.displayName || '?';
  const getTeacherLabel = (id: string) => {
    const t = activeTeachers.find(t => t.id === id);
    return t ? `${t.name} (${t.code})` : '?';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Batch Merging</h2>
          <p className="text-sm text-muted-foreground">
            Merge batches to share the same teacher, slot & room for a subject. {mergeRules.length} rules configured.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} size="sm" disabled={adding}>
          <Plus className="w-4 h-4 mr-1" /> Add Merge Rule
        </Button>
      </div>

      {/* Info */}
      <Card className="p-3 bg-info/5 border-info/20">
        <p className="text-xs text-muted-foreground">
          <strong>How merge works:</strong> Merged batches share the same slot, teacher, and room for the specified subject.
          The scheduler will schedule them together as a single class. Requirements: same session (Morning/Evening), same teacher mapped to all batches, same room.
        </p>
      </Card>

      {/* Add new rule */}
      {adding && (
        <Card className="p-4 space-y-4 border-primary/30">
          <h3 className="text-sm font-semibold text-foreground">New Merge Rule</h3>

          {/* Step 1: Select batches */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">1. Select batches to merge (min 2)</label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-auto">
              {activeBatches.map(b => (
                <label key={b.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 text-xs">
                  <Checkbox
                    checked={selectedBatches.includes(b.id)}
                    onCheckedChange={() => toggleBatch(b.id)}
                  />
                  <div>
                    <div className="font-medium">{b.displayName}</div>
                    <div className="text-muted-foreground text-[10px]">{b.slotSession} · {b.defaultRoom}</div>
                  </div>
                </label>
              ))}
            </div>
            {sessionConflict && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Selected batches have different sessions — they cannot be merged.
              </p>
            )}
          </div>

          {/* Step 2: Select subject */}
          {selectedBatches.length >= 2 && !sessionConflict && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">2. Subject</label>
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v as Subject); setSelectedTeacher(''); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Pick subject" /></SelectTrigger>
                <SelectContent>
                  {commonSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  {commonSubjects.length === 0 && <SelectItem value="" disabled>No common subjects</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Select teacher */}
          {selectedSubject && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">3. Teacher (must be mapped to all selected batches)</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Pick teacher" /></SelectTrigger>
                <SelectContent>
                  {eligibleTeachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                  {eligibleTeachers.length === 0 && <SelectItem value="" disabled>No eligible teachers (check mappings)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={selectedBatches.length < 2 || !selectedSubject || !selectedTeacher || sessionConflict}
            >
              <Save className="w-3 h-3 mr-1" /> Create Rule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setSelectedBatches([]); setSelectedSubject(''); setSelectedTeacher(''); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Existing rules */}
      {mergeRules.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <Merge className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No merge rules defined yet</p>
          <p className="text-xs mt-1">Merge batches that should share the same class for a subject</p>
        </div>
      )}

      <div className="space-y-2">
        {mergeRules.map(rule => (
          <Card key={rule.id} className="p-3 flex items-center gap-3">
            <Merge className="w-4 h-4 text-info shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {rule.batchIds.map((bid, i) => (
                  <span key={bid}>
                    {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
                    <Badge variant="secondary" className="text-xs">{getBatchName(bid)}</Badge>
                  </span>
                ))}
                <span className="text-muted-foreground">→</span>
                <Badge variant="default" className="text-xs">{rule.subject}</Badge>
                <span className="text-muted-foreground">by</span>
                <Badge variant="outline" className="text-xs font-mono">{getTeacherLabel(rule.teacherId)}</Badge>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMergeRule(rule.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
