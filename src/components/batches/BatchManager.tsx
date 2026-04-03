import { useState } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Batch, BatchCategory, Subject } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, Lock, Sun, Moon, Edit2 } from 'lucide-react';

const ALL_SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit', 'SST', 'Science'];
const CATEGORIES: BatchCategory[] = ['Junior', 'JEE', 'NEET', 'Droppers'];

export function BatchManager() {
  const { batches, rooms, addBatch, updateBatch, removeBatch } = useTimetableStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: '', category: 'Junior' as BatchCategory,
    subjects: [] as Subject[], defaultRoom: 'R1', slotSession: 'Evening' as 'Morning' | 'Evening',
  });

  const resetForm = () => setForm({ displayName: '', category: 'Junior', subjects: [], defaultRoom: 'R1', slotSession: 'Evening' });

  const startEdit = (b: Batch) => {
    setEditing(b.id);
    setAdding(false);
    setForm({
      displayName: b.displayName,
      category: b.category,
      subjects: [...b.subjects],
      defaultRoom: b.defaultRoom,
      slotSession: b.slotSession,
    });
  };

  const handleSave = (id: string) => {
    updateBatch(id, {
      displayName: form.displayName,
      name: form.displayName.toLowerCase().replace(/\s+/g, '-'),
      category: form.category,
      subjects: form.subjects,
      defaultRoom: form.defaultRoom,
      slotSession: form.slotSession,
    });
    setEditing(null);
    resetForm();
  };

  const handleAdd = () => {
    if (!form.displayName) return;
    addBatch({
      id: `b-${Date.now()}`,
      name: form.displayName.toLowerCase().replace(/\s+/g, '-'),
      displayName: form.displayName,
      category: form.category,
      subjects: form.subjects,
      defaultRoom: form.defaultRoom,
      slotSession: form.slotSession,
      active: true,
      locked: false,
    });
    resetForm();
    setAdding(false);
  };

  const toggleSubject = (s: Subject) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s],
    }));
  };

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    batches: batches.filter(b => b.category === cat),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Batches</h2>
          <p className="text-sm text-muted-foreground">{batches.length} batches across {CATEGORIES.length} categories</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); resetForm(); }} size="sm" disabled={adding}>
          <Plus className="w-4 h-4 mr-1" /> Add Batch
        </Button>
      </div>

      {adding && (
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Display Name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as BatchCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.defaultRoom} onValueChange={(v) => setForm(f => ({ ...f, defaultRoom: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.slotSession} onValueChange={(v) => setForm(f => ({ ...f, slotSession: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning</SelectItem>
                <SelectItem value="Evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SUBJECTS.map(s => (
              <Badge key={s} variant={form.subjects.includes(s) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleSubject(s)}>{s}</Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
          </div>
        </Card>
      )}

      {grouped.map(g => g.batches.length > 0 && (
        <div key={g.category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{g.category}</h3>
          <div className="space-y-1.5">
            {g.batches.map(b => (
              <Card key={b.id} className={`p-3 flex items-center gap-3 ${!b.active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{b.displayName}</span>
                    <Badge variant="secondary" className="text-xs">{b.defaultRoom}</Badge>
                    {b.slotSession === 'Morning' ? <Sun className="w-3 h-3 text-warning" /> : <Moon className="w-3 h-3 text-info" />}
                    {b.locked && <Lock className="w-3 h-3 text-warning" />}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {b.subjects.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
                <Switch checked={b.active} onCheckedChange={(v) => updateBatch(b.id, { active: v })} />
                <Button size="icon" variant={b.locked ? 'default' : 'ghost'} onClick={() => updateBatch(b.id, { locked: !b.locked })} title={b.locked ? 'Unlock' : 'Lock'}>
                  <Lock className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeBatch(b.id)}><Trash2 className="w-4 h-4" /></Button>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
