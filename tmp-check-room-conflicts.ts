import fs from 'node:fs';
import { generateTimetable } from './src/lib/scheduler';

const cfg = JSON.parse(fs.readFileSync('/tmp/shared-config.json', 'utf8'));
const result = generateTimetable({
  teachers: cfg.teachers ?? [],
  batches: cfg.batches ?? [],
  rooms: cfg.rooms ?? [],
  availability: cfg.availability ?? [],
  mappings: cfg.mappings ?? [],
  distributions: cfg.distributions ?? [],
  teacherSubDistributions: cfg.teacherSubDistributions ?? [],
  mergeGroups: cfg.mergeGroups ?? [],
  teacherPairs: cfg.teacherPairs ?? [],
  weekConfig: {
    weekLabel: 'Week 1',
    startDate: new Date().toISOString().split('T')[0],
    holidays: [],
    availabilityOverrides: [],
    roomOverrides: [],
  },
});

const byKey = new Map<string, any[]>();
for (const e of result.entries) {
  const key = `${e.day}-${e.slot}-${e.room}`;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key)!.push(e);
}
const conflicts: Array<{ key: string; entries: any[] }> = [];
for (const [key, entries] of byKey.entries()) {
  const groups = new Set(entries.map(e => e.merged?.length ? [e.batchId, ...e.merged].sort().join(',') : e.batchId));
  if (groups.size > 1) conflicts.push({ key, entries });
}
console.log(JSON.stringify({ entryCount: result.entries.length, backlog: result.backlog.length, errors: result.errors, conflictCount: conflicts.length, conflicts: conflicts.slice(0, 30) }, null, 2));
