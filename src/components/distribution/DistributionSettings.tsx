import { useTimetableStore } from '@/store/timetableStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DAYS, SLOTS, Subject, DayOfWeek, SlotId } from '@/types/timetable';

export function DistributionSettings() {
  const {
    batches, distributions, setDistribution, mappings, teachers,
    availability, weekConfig, teacherSubDistributions, setTeacherSubDistribution,
  } = useTimetableStore();
  const activeBatches = batches.filter(b => b.active);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const categories = [...new Set(activeBatches.map(b => b.category))];
  const filtered = filterCategory === 'all' ? activeBatches : activeBatches.filter(b => b.category === filterCategory);
  const activeTeachers = teachers.filter(t => t.active);

  const getBatchDists = (batchId: string) => distributions.filter(d => d.batchId === batchId);
  const getTotal = (batchId: string) => getBatchDists(batchId).reduce((sum, d) => sum + d.percentage, 0);

  // Get teachers mapped to a specific batch+subject
  const getTeachersForSubject = (batchId: string, subject: Subject) => {
    const mapped = mappings.filter(m => m.batchId === batchId && m.subject === subject);
    return mapped.map(m => activeTeachers.find(t => t.id === m.teacherId)).filter(Boolean) as typeof activeTeachers;
  };

  // Get teacher sub-distribution percentage
  const getTeacherSubPct = (batchId: string, subject: Subject, teacherId: string) => {
    const sub = teacherSubDistributions.find(
      d => d.batchId === batchId && d.subject === subject && d.teacherId === teacherId
    );
    return sub?.percentage ?? 0;
  };

  // Check if a teacher can fulfill their share of classes
  const holidayDays = new Set(weekConfig.holidays.map(h => h.day));
  const checkFeasibility = useMemo(() => {
    return (batchId: string, subject: Subject, teacherId: string, classesByTeacher: number): boolean => {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) return false;
      const batchDays = (batch.scheduleDays?.length ? batch.scheduleDays : DAYS).filter(d => !holidayDays.has(d));
      const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);

      let availableSlots = 0;
      for (const day of batchDays) {
        const override = weekConfig.availabilityOverrides.find(a => a.teacherId === teacherId && a.day === day);
        const avail = override || availability.find(a => a.teacherId === teacherId && a.day === day);
        if (!avail) continue;
        for (const slot of batchSlots) {
          if (avail.slots.includes(slot.id)) availableSlots++;
        }
      }
      return availableSlots >= classesByTeacher;
    };
  }, [batches, availability, weekConfig, holidayDays]);

  // Calculate classes needed for a subject in a batch
  const getClassesNeeded = (batchId: string, subject: Subject) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return 0;
    const dist = distributions.find(d => d.batchId === batchId && d.subject === subject);
    if (!dist || dist.percentage === 0) return 0;
    const batchDays = (batch.scheduleDays?.length ? batch.scheduleDays : DAYS).filter(d => !holidayDays.has(d));
    const totalSlots = batchDays.length * 3;
    return Math.round((dist.percentage / 100) * totalSlots);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Subject Distribution</h2>
            <p className="text-sm text-muted-foreground">Set % per subject. When 2+ teachers share a subject, set their split below.</p>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map(batch => {
            const dists = getBatchDists(batch.id);
            const total = getTotal(batch.id);
            const isValid = total === 100;
            return (
              <Card key={batch.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{batch.displayName}</span>
                    <Badge variant="secondary" className="text-xs">{batch.category}</Badge>
                  </div>
                  <Badge variant={isValid ? 'default' : 'destructive'} className="text-xs">
                    Total: {total}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {dists.map(d => {
                    const subTeachers = getTeachersForSubject(batch.id, d.subject);
                    const totalClasses = getClassesNeeded(batch.id, d.subject);
                    const hasMultipleTeachers = subTeachers.length >= 2;
                    const noTeacher = subTeachers.length === 0 && d.percentage > 0;

                    // Check sub-distribution totals
                    const subTotal = subTeachers.reduce((s, t) => s + getTeacherSubPct(batch.id, d.subject, t.id), 0);
                    const subDistInvalid = hasMultipleTeachers && subTotal !== 100 && d.percentage > 0;

                    return (
                      <div key={`${d.batchId}-${d.subject}`} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <label className="text-xs font-medium text-muted-foreground">{d.subject}</label>
                          {noTeacher && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>No teacher assigned</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} max={100} value={d.percentage}
                            onChange={e => setDistribution(d.batchId, d.subject, parseInt(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${d.percentage}%` }} />
                        </div>

                        {/* Teacher sub-distribution when 2+ teachers */}
                        {hasMultipleTeachers && d.percentage > 0 && (
                          <div className="mt-1 space-y-0.5 border-t border-border pt-1">
                            <span className="text-[10px] text-muted-foreground">Teacher split:</span>
                            {subDistInvalid && (
                              <span className="text-[10px] text-destructive ml-1">({subTotal}% ≠ 100%)</span>
                            )}
                            {subTeachers.map(teacher => {
                              const pct = getTeacherSubPct(batch.id, d.subject, teacher.id);
                              const teacherClasses = Math.round((pct / 100) * totalClasses);
                              const feasible = pct === 0 || checkFeasibility(batch.id, d.subject, teacher.id, teacherClasses);
                              return (
                                <div key={teacher.id} className="flex items-center gap-1">
                                  <span className={`text-[10px] w-8 truncate ${!feasible ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                    {teacher.code}
                                  </span>
                                  <Input
                                    type="number" min={0} max={100} value={pct}
                                    onChange={e => setTeacherSubDistribution(batch.id, d.subject, teacher.id, parseInt(e.target.value) || 0)}
                                    className={`h-6 text-xs w-14 ${!feasible ? 'border-destructive' : ''}`}
                                  />
                                  {!feasible && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-3 w-3 text-destructive" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Teacher needs {teacherClasses} slots but doesn't have enough availability
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Single teacher feasibility check */}
                        {subTeachers.length === 1 && d.percentage > 0 && (() => {
                          const feasible = checkFeasibility(batch.id, d.subject, subTeachers[0].id, totalClasses);
                          if (feasible) return null;
                          return (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 text-destructive">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="text-[10px]">{subTeachers[0].code}: can't fill {totalClasses} classes</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Teacher availability insufficient for required classes</TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
