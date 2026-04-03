import { useState } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Teacher, Subject } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const ALL_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'];

export function TeacherManager() {
  const { teachers, addTeacher, updateTeacher, removeTeacher } = useTimetableStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', subjects: [] as Subject[] });

  const handleAdd = () => {
    if (!form.name || !form.code || form.subjects.length === 0) return;
    addTeacher({
      id: `t-${Date.now()}`,
      name: form.name,
      code: form.code.toUpperCase(),
      subjects: form.subjects,
      active: true,
    });
    setForm({ name: '', code: '', subjects: [] });
    setAdding(false);
  };

  const handleSave = (id: string) => {
    updateTeacher(id, form);
    setEditing(null);
    setForm({ name: '', code: '', subjects: [] });
  };

  const startEdit = (t: Teacher) => {
    setEditing(t.id);
    setForm({ name: t.name, code: t.code, subjects: [...t.subjects] });
  };

  const toggleSubject = (s: Subject) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Teachers</h2>
          <p className="text-sm text-muted-foreground">{teachers.length} teachers configured</p>
        </div>
        <Button onClick={() => setAdding(true)} size="sm" disabled={adding}>
          <Plus className="w-4 h-4 mr-1" /> Add Teacher
        </Button>
      </div>

      {adding && (
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SUBJECTS.map(s => (
              <Badge
                key={s}
                variant={form.subjects.includes(s) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleSubject(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm({ name: '', code: '', subjects: [] }); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {teachers.map(t => (
          <Card key={t.id} className={`p-3 flex items-center gap-3 ${!t.active ? 'opacity-50' : ''}`}>
            {editing === t.id ? (
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SUBJECTS.map(s => (
                    <Badge key={s} variant={form.subjects.includes(s) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleSubject(s)}>{s}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => handleSave(t.id)}><Save className="w-3 h-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <Badge variant="secondary" className="font-mono text-xs">{t.code}</Badge>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {t.subjects.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <Switch checked={t.active} onCheckedChange={(v) => updateTeacher(t.id, { active: v })} />
                <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Edit2 className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeTeacher(t.id)}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
