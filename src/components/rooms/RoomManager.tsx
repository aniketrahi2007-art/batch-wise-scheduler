import { useState } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, X } from 'lucide-react';

export function RoomManager() {
  const { rooms, addRoom, updateRoom, removeRoom } = useTimetableStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name) return;
    addRoom({ id: `R-${Date.now()}`, name, active: true });
    setName('');
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rooms</h2>
          <p className="text-sm text-muted-foreground">{rooms.filter(r => r.active).length} active rooms</p>
        </div>
        <Button onClick={() => setAdding(true)} size="sm" disabled={adding}>
          <Plus className="w-4 h-4 mr-1" /> Add Room
        </Button>
      </div>

      {adding && (
        <Card className="p-4 flex gap-3 items-center border-primary/30">
          <Input placeholder="Room Name" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={handleAdd}><Save className="w-3 h-3 mr-1" /> Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {rooms.map(r => (
          <Card key={r.id} className={`p-3 flex items-center justify-between ${!r.active ? 'opacity-50' : ''}`}>
            <span className="font-medium text-foreground">{r.name}</span>
            <div className="flex items-center gap-2">
              <Switch checked={r.active} onCheckedChange={(v) => updateRoom(r.id, { active: v })} />
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeRoom(r.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
