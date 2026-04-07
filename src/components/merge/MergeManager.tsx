import { useState, useMemo } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Subject, MergeGroup, MergeSubjectConfig } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, Merge, AlertTriangle, Edit2 } from 'lucide-react';

export function MergeManager() {
  const { batches, teachers, mergeGroups, addMergeGroup, removeMergeGroup, updateMergeGroup, mappings } = useTimetableStore();
  const activeBatches = batches.filter(b => b.active);
  const activeTeachers = teachers.filter(t => t.active);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [subjectConfigs, setSubjectConfigs] = useState<MergeSubjectConfig[]>([]);

  const sessionConflict = useMemo(() => {
    if (selectedBatches.length < 2) return false;
    const sessions = selectedBatches.map(bid => activeBatches.find(b => b.id === bid)?.slotSession);
    return new Set(sessions).size > 1;
  }, [selectedBatches, activeBatches]);

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

  // Get eligible teachers for a subject (mapped to ALL selected batches)
  const getEligibleTeachers = (subject: Subject) => {
    return activeTeachers.filter(t => {
      if (!t.subjects.includes(subject)) return false;
      return selectedBatches.every(bid =>
        mappings.some(m => m.teacherId === t.id && m.batchId === bid && m.subject === subject)
      );
    });
  };

  const toggleBatch = (batchId: string) => {
    setSelectedBatches(prev => {
      const next = prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId];
      // Reset configs when batches change
      setSubjectConfigs([]);
      return next;
    });
  };

  // Initialize configs for all common subjects when batches are selected
  const initConfigs = () => {
    if (commonSubjects.length === 0) return;
    const configs: MergeSubjectConfig[] = commonSubjects.map(subject => {
      const eligible = getEligibleTeachers(subject);
      return {
        subject,
        teacherId: eligible.length > 0 ? eligible[0].id : '',
        classesPerWeek: 0,
      };
    });
    setSubjectConfigs(configs);
  };

  const updateConfig = (subject: Subject, field: keyof MergeSubjectConfig, value: any) => {
    setSubjectConfigs(prev => prev.map(c =>
      c.subject === subject ? { ...c, [field]: value } : c
    ));
  };

  const startEdit = (group: MergeGroup) => {
    setEditingId(group.id);
    setAdding(false);
    setSelectedBatches([...group.batchIds]);
    setSubjectConfigs([...group.subjectConfig]);
  };

  const handleSave = () => {
    const validConfigs = subjectConfigs.filter(c => c.teacherId && c.classesPerWeek > 0);
    if (selectedBatches.length < 2 || validConfigs.length === 0) return;

    const group: MergeGroup = {
      id: editingId || `mg-${Date.now()}`,
      batchIds: selectedBatches,
      subjectConfig: validConfigs,
    };

    if (editingId) {
      updateMergeGroup(editingId, group);
    } else {
      addMergeGroup(group);
    }
    resetForm();
  };

  const resetForm = () => {
    setSelectedBatches([]);
    setSubjectConfigs([]);
    setAdding(false);
    setEditingId(null);
  };

  const getBatchName = (id: string) => activeBatches.find(b => b.id === id)?.displayName || '?';
  const getTeacherCode = (id: string) => activeTeachers.find(t => t.id === id)?.code || '?';

  const isFormOpen = adding || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Batch Merging</h2>
          <p className="text-sm text-muted-foreground">
            Merge batches to share teacher, slot & room. {mergeGroups.length} groups configured.
          </p>
        </div>
        <Button onClick={() => { setAdding(true); setEditingId(null); resetForm(); setAdding(true); }} size="sm" disabled={isFormOpen}>
          <Plus className="w-4 h-4 mr-1" /> Add Merge Group
        </Button>
      </div>

      <Card className="p-3 bg-info/5 border-info/20">
        <p className="text-xs text-muted-foreground">
          <strong>How merge works:</strong> Select batches → configure subjects with teacher (by code) and classes/week.
          Merged classes are assigned FIRST to save slots for other batches.
        </p>
      </Card>

      {isFormOpen && (
        <Card className="p-4 space-y-4 border-primary/30">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? 'Edit Merge Group' : 'New Merge Group'}
          </h3>

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
                <AlertTriangle className="w-3 h-3" /> Different sessions — cannot merge.
              </p>
            )}
          </div>

          {/* Step 2: Configure subjects */}
          {selectedBatches.length >= 2 && !sessionConflict && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">2. Configure subjects for merge</label>
                {subjectConfigs.length === 0 && (
                  <Button size="sm" variant="outline" onClick={initConfigs} className="text-xs h-7">
                    Load All Common Subjects
                  </Button>
                )}
              </div>

              {commonSubjects.length === 0 && (
                <p className="text-xs text-muted-foreground">No common subjects between selected batches.</p>
              )}

              {subjectConfigs.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 text-[10px] font-medium text-muted-foreground uppercase">
                    <span>Subject</span>
                    <span>Teacher</span>
                    <span>Classes/wk</span>
                    <span></span>
                  </div>
                  {subjectConfigs.map(config => {
                    const eligible = getEligibleTeachers(config.subject);
                    return (
                      <div key={config.subject} className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 items-center">
                        <span className="text-sm font-medium">{config.subject}</span>
                        <Select value={config.teacherId} onValueChange={v => updateConfig(config.subject, 'teacherId', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligible.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.code} ({t.name})
                              </SelectItem>
                            ))}
                            {eligible.length === 0 && (
                              <SelectItem value="" disabled>No eligible teacher</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          max={18}
                          value={config.classesPerWeek}
                          onChange={e => updateConfig(config.subject, 'classesPerWeek', parseInt(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setSubjectConfigs(prev => prev.filter(c => c.subject !== config.subject))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={selectedBatches.length < 2 || subjectConfigs.filter(c => c.teacherId && c.classesPerWeek > 0).length === 0 || sessionConflict}
            >
              <Save className="w-3 h-3 mr-1" /> {editingId ? 'Update' : 'Create'} Group
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </Card>
      )}

      {mergeGroups.length === 0 && !isFormOpen && (
        <div className="text-center py-12 text-muted-foreground">
          <Merge className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No merge groups defined yet</p>
          <p className="text-xs mt-1">Merge batches that should share the same class for subjects</p>
        </div>
      )}

      <div className="space-y-3">
        {mergeGroups.map(group => (
          <Card key={group.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Merge className="w-4 h-4 text-info shrink-0" />
                {group.batchIds.map((bid, i) => (
                  <span key={bid}>
                    {i > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
                    <Badge variant="secondary" className="text-xs">{getBatchName(bid)}</Badge>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(group)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMergeGroup(group.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {group.subjectConfig.map(sc => (
                <div key={sc.subject} className="flex items-center gap-2 text-xs">
                  <Badge variant="default" className="text-xs">{sc.subject}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="font-mono text-xs">{getTeacherCode(sc.teacherId)}</Badge>
                  <span className="text-muted-foreground">·</span>
                  <span>{sc.classesPerWeek} classes/week</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
