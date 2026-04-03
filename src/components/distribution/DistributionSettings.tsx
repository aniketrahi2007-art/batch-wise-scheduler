import { useTimetableStore } from '@/store/timetableStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DistributionSettings() {
  const { batches, distributions, setDistribution } = useTimetableStore();
  const activeBatches = batches.filter(b => b.active);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const categories = [...new Set(activeBatches.map(b => b.category))];

  const filtered = filterCategory === 'all' ? activeBatches : activeBatches.filter(b => b.category === filterCategory);

  const getBatchDists = (batchId: string) => distributions.filter(d => d.batchId === batchId);

  const getTotal = (batchId: string) => {
    return getBatchDists(batchId).reduce((sum, d) => sum + d.percentage, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Subject Distribution</h2>
          <p className="text-sm text-muted-foreground">Set percentage allocation per subject per batch. Must total 100%.</p>
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
                {dists.map(d => (
                  <div key={`${d.batchId}-${d.subject}`} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{d.subject}</label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={d.percentage}
                        onChange={e => setDistribution(d.batchId, d.subject, parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${d.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
