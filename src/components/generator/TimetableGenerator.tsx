import { useTimetableStore } from '@/store/timetableStore';
import { generateTimetable } from '@/lib/scheduler';
import { DAYS, SLOTS, DayOfWeek } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function TimetableGenerator() {
  const store = useTimetableStore();
  const { weekConfig, setWeekConfig, setGeneratedTimetable, setActiveTab } = store;
  const [generating, setGenerating] = useState(false);

  const toggleHoliday = (day: DayOfWeek) => {
    const exists = weekConfig.holidays.find(h => h.day === day);
    if (exists) {
      setWeekConfig({ holidays: weekConfig.holidays.filter(h => h.day !== day) });
    } else {
      setWeekConfig({ holidays: [...weekConfig.holidays, { day }] });
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      try {
        const result = generateTimetable({
          teachers: store.teachers,
          batches: store.batches,
          rooms: store.rooms,
          availability: store.availability,
          mappings: store.mappings,
          distributions: store.distributions,
          teacherSubDistributions: store.teacherSubDistributions || [],
          mergeRules: store.mergeRules,
          teacherPairs: store.teacherPairs || [],
          weekConfig: store.weekConfig,
        });
        setGeneratedTimetable(result);
        if (result.feasible) {
          toast.success(`Timetable generated! ${result.entries.length} classes scheduled.`);
        } else {
          toast.warning(`Generated with ${result.backlog.length} backlog items.`);
        }
        setActiveTab('view');
      } catch (err) {
        toast.error('Generation failed: ' + (err as Error).message);
      }
      setGenerating(false);
    }, 300);
  };

  const unmappedBatches = store.batches.filter(b => {
    if (!b.active || b.locked) return false;
    return !store.mappings.some(m => m.batchId === b.id);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Generate Timetable</h2>
        <p className="text-sm text-muted-foreground">Configure week settings and generate</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Week Label</label>
            <Input value={weekConfig.weekLabel} onChange={e => setWeekConfig({ weekLabel: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Start Date</label>
            <Input type="date" value={weekConfig.startDate} onChange={e => setWeekConfig({ startDate: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Holidays</label>
          <div className="flex gap-3">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={weekConfig.holidays.some(h => h.day === day)}
                  onCheckedChange={() => toggleHoliday(day)}
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Pre-flight checks */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Pre-flight Check</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {store.teachers.filter(t => t.active).length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            <span>{store.teachers.filter(t => t.active).length} active teachers</span>
          </div>
          <div className="flex items-center gap-2">
            {store.batches.filter(b => b.active).length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            <span>{store.batches.filter(b => b.active && !b.locked).length} schedulable batches ({store.batches.filter(b => b.locked).length} locked)</span>
          </div>
          <div className="flex items-center gap-2">
            {store.mappings.length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-warning" />
            )}
            <span>{store.mappings.length} teacher-batch mappings</span>
          </div>
          {unmappedBatches.length > 0 && (
            <div className="flex items-start gap-2 text-warning">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div>
                <span>Unmapped batches: </span>
                {unmappedBatches.map(b => (
                  <Badge key={b.id} variant="outline" className="text-xs mr-1">{b.displayName}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Button onClick={handleGenerate} size="lg" className="w-full" disabled={generating}>
        <Play className="w-5 h-5 mr-2" />
        {generating ? 'Generating...' : 'Generate Timetable'}
      </Button>
    </div>
  );
}
