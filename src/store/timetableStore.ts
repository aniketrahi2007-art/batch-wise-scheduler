import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Teacher, Batch, Room, TeacherAvailability, TeacherBatchMapping,
  SubjectDistribution, WeekConfig, GeneratedTimetable, MergeRule, TeacherPair,
  DAYS, SLOTS, DayOfWeek, SlotId, Subject
} from '@/types/timetable';
import { defaultTeachers, defaultBatches, defaultRooms, categoryDistributions } from '@/data/defaults';

interface TimetableStore {
  // Master data
  teachers: Teacher[];
  batches: Batch[];
  rooms: Room[];

  // Availability (persistent defaults)
  availability: TeacherAvailability[];

  // Mappings
  mappings: TeacherBatchMapping[];

  // Distribution
  distributions: SubjectDistribution[];

  // Merge rules
  mergeRules: MergeRule[];
  teacherPairs: TeacherPair[];

  // Week config
  weekConfig: WeekConfig;

  // Generated
  generatedTimetable: GeneratedTimetable | null;

  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Teacher actions
  addTeacher: (t: Teacher) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  removeTeacher: (id: string) => void;

  // Batch actions
  addBatch: (b: Batch) => void;
  updateBatch: (id: string, b: Partial<Batch>) => void;
  removeBatch: (id: string) => void;

  // Room actions
  addRoom: (r: Room) => void;
  updateRoom: (id: string, r: Partial<Room>) => void;
  removeRoom: (id: string) => void;

  // Availability
  setAvailability: (a: TeacherAvailability[]) => void;
  toggleSlotAvailability: (teacherId: string, day: DayOfWeek, slot: SlotId) => void;

  // Mapping
  toggleMapping: (teacherId: string, batchId: string, subject: Subject) => void;
  setMappings: (m: TeacherBatchMapping[]) => void;

  // Distribution
  setDistribution: (batchId: string, subject: Subject, percentage: number) => void;

  // Merge
  addMergeRule: (rule: MergeRule) => void;
  removeMergeRule: (id: string) => void;

  // Teacher pairs
  addTeacherPair: (pair: TeacherPair) => void;
  removeTeacherPair: (id: string) => void;

  // Week
  setWeekConfig: (w: Partial<WeekConfig>) => void;

  // Generate
  setGeneratedTimetable: (t: GeneratedTimetable | null) => void;
}

// Initialize availability: all teachers available in all slots
function initAvailability(teachers: Teacher[]): TeacherAvailability[] {
  const result: TeacherAvailability[] = [];
  for (const t of teachers) {
    for (const day of DAYS) {
      result.push({
        teacherId: t.id,
        day,
        slots: SLOTS.map(s => s.id),
      });
    }
  }
  return result;
}

// Initialize distributions using category templates where available
function initDistributions(batches: Batch[]): SubjectDistribution[] {
  const result: SubjectDistribution[] = [];
  for (const b of batches) {
    // Try to find a category distribution template
    let template = categoryDistributions[b.category];
    if (!template) {
      // Fallback: equal split
      const pct = Math.floor(100 / b.subjects.length);
      const remainder = 100 - pct * b.subjects.length;
      template = b.subjects.map((s, i) => ({
        subject: s,
        percentage: pct + (i === b.subjects.length - 1 ? remainder : 0),
      }));
    }
    // Only include subjects that the batch actually has
    for (const s of b.subjects) {
      const tmpl = template.find(t => t.subject === s);
      result.push({
        batchId: b.id,
        subject: s,
        percentage: tmpl ? tmpl.percentage : 0,
      });
    }
  }
  return result;
}

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      teachers: defaultTeachers,
      batches: defaultBatches,
      rooms: defaultRooms,
      availability: initAvailability(defaultTeachers),
      mappings: [],
      distributions: initDistributions(defaultBatches),
      mergeRules: [],
      weekConfig: {
        weekLabel: 'Week 1',
        startDate: new Date().toISOString().split('T')[0],
        holidays: [],
        availabilityOverrides: [],
        roomOverrides: [],
      },
      generatedTimetable: null,
      activeTab: 'teachers',

      setActiveTab: (tab) => set({ activeTab: tab }),

      addTeacher: (t) => set(s => ({
        teachers: [...s.teachers, t],
        availability: [...s.availability, ...DAYS.map(day => ({
          teacherId: t.id, day, slots: SLOTS.map(sl => sl.id),
        }))],
      })),
      updateTeacher: (id, data) => set(s => ({
        teachers: s.teachers.map(t => t.id === id ? { ...t, ...data } : t),
      })),
      removeTeacher: (id) => set(s => ({
        teachers: s.teachers.filter(t => t.id !== id),
        availability: s.availability.filter(a => a.teacherId !== id),
        mappings: s.mappings.filter(m => m.teacherId !== id),
      })),

      addBatch: (b) => set(s => {
        const pct = Math.floor(100 / b.subjects.length);
        const rem = 100 - pct * b.subjects.length;
        const newDists = b.subjects.map((sub, i) => ({
          batchId: b.id, subject: sub,
          percentage: pct + (i === b.subjects.length - 1 ? rem : 0),
        }));
        return { batches: [...s.batches, b], distributions: [...s.distributions, ...newDists] };
      }),
      updateBatch: (id, data) => set(s => {
        const updated = s.batches.map(b => b.id === id ? { ...b, ...data } : b);
        const batch = updated.find(b => b.id === id)!;
        // Sync distributions when subjects change
        if (data.subjects) {
          const existing = s.distributions.filter(d => d.batchId === id);
          const kept = existing.filter(d => batch.subjects.includes(d.subject));
          const newSubjects = batch.subjects.filter(sub => !existing.find(d => d.subject === sub));
          const newDists = newSubjects.map(sub => ({ batchId: id, subject: sub, percentage: 0 }));
          const otherDists = s.distributions.filter(d => d.batchId !== id);
          return { batches: updated, distributions: [...otherDists, ...kept, ...newDists] };
        }
        return { batches: updated };
      }),
      removeBatch: (id) => set(s => ({
        batches: s.batches.filter(b => b.id !== id),
        mappings: s.mappings.filter(m => m.batchId !== id),
        distributions: s.distributions.filter(d => d.batchId !== id),
      })),

      addRoom: (r) => set(s => ({ rooms: [...s.rooms, r] })),
      updateRoom: (id, data) => set(s => ({
        rooms: s.rooms.map(r => r.id === id ? { ...r, ...data } : r),
      })),
      removeRoom: (id) => set(s => ({ rooms: s.rooms.filter(r => r.id !== id) })),

      setAvailability: (a) => set({ availability: a }),
      toggleSlotAvailability: (teacherId, day, slot) => set(s => {
        const avail = s.availability.map(a => {
          if (a.teacherId === teacherId && a.day === day) {
            const hasSlot = a.slots.includes(slot);
            return {
              ...a,
              slots: hasSlot ? a.slots.filter(sl => sl !== slot) : [...a.slots, slot],
            };
          }
          return a;
        });
        return { availability: avail };
      }),

      toggleMapping: (teacherId, batchId, subject) => set(s => {
        const exists = s.mappings.find(
          m => m.teacherId === teacherId && m.batchId === batchId && m.subject === subject
        );
        if (exists) {
          return { mappings: s.mappings.filter(m => m !== exists) };
        }
        return { mappings: [...s.mappings, { teacherId, batchId, subject }] };
      }),
      setMappings: (m) => set({ mappings: m }),

      setDistribution: (batchId, subject, percentage) => set(s => ({
        distributions: s.distributions.map(d =>
          d.batchId === batchId && d.subject === subject ? { ...d, percentage } : d
        ),
      })),

      addMergeRule: (rule) => set(s => ({ mergeRules: [...s.mergeRules, rule] })),
      removeMergeRule: (id) => set(s => ({ mergeRules: s.mergeRules.filter(r => r.id !== id) })),

      setWeekConfig: (w) => set(s => ({ weekConfig: { ...s.weekConfig, ...w } })),
      setGeneratedTimetable: (t) => set({ generatedTimetable: t }),
    }),
    { name: 'timetable-store', version: 2 }
  )
);
