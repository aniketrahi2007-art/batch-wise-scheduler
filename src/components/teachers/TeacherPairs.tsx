import { useState } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, Trash2, Plus } from 'lucide-react';

export function TeacherPairs() {
  const { teachers, teacherPairs, addTeacherPair, removeTeacherPair } = useTimetableStore();
  const [teacher1, setTeacher1] = useState('');
  const [teacher2, setTeacher2] = useState('');

  const activeTeachers = teachers.filter(t => t.active);

  const handleAdd = () => {
    if (!teacher1 || !teacher2 || teacher1 === teacher2) return;
    // Check if pair already exists
    const exists = (teacherPairs || []).some(
      p => p.teacherIds.includes(teacher1) && p.teacherIds.includes(teacher2)
    );
    if (exists) return;

    addTeacherPair({
      id: `pair-${Date.now()}`,
      teacherIds: [teacher1, teacher2],
    });
    setTeacher1('');
    setTeacher2('');
  };

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.name} (${t.code})` : id;
  };

  const pairs = teacherPairs || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Teacher Pairs (Cannot teach at same time)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Teacher 1</label>
            <Select value={teacher1} onValueChange={setTeacher1}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {activeTeachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Teacher 2</label>
            <Select value={teacher2} onValueChange={setTeacher2}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {activeTeachers.filter(t => t.id !== teacher1).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!teacher1 || !teacher2 || teacher1 === teacher2}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>

        {pairs.length === 0 && (
          <p className="text-xs text-muted-foreground">No teacher pairs configured. Paired teachers will never be scheduled at the same time.</p>
        )}

        <div className="space-y-2">
          {pairs.map(pair => (
            <div key={pair.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{getTeacherName(pair.teacherIds[0])}</Badge>
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{getTeacherName(pair.teacherIds[1])}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeTeacherPair(pair.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
