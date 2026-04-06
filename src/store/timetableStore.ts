import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Teacher, Batch, Room, TeacherAvailability, TeacherBatchMapping,
  SubjectDistribution, WeekConfig, GeneratedTimetable, MergeRule, TeacherPair,
  TeacherSubDistribution, DAYS, SLOTS, DayOfWeek, SlotId, Subject
} from '@/types/timetable';
import { defaultTeachers, defaultBatches, defaultRooms, categoryDistributions } from '@/data/defaults';

interface TimetableStore {
  teachers: Teacher[];
  batches: Batch[];
  rooms: Room[];
  availability: TeacherAvailability[];
  mappings: TeacherBatchMapping[];
  distributions: SubjectDistribution[];
  teacherSubDistributions: TeacherSubDistribution[];
  mergeRules: MergeRule[];
  teacherPairs: TeacherPair[];
  weekConfig: WeekConfig;
  generatedTimetable: GeneratedTimetable | null;
  activeTab: string;

  setActiveTab: (tab: string) => void;

  addTeacher: (t: Teacher) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  removeTeacher: (id: string) => void;

  addBatch: (b: Batch) => void;
  updateBatch: (id: string, b: Partial<Batch>) => void;
  removeBatch: (id: string) => void;

  addRoom: (r: Room) => void;
  updateRoom: (id: string, r: Partial<Room>) => void;
  removeRoom: (id: string) => void;

  setAvailability: (a: TeacherAvailability[]) => void;
  toggleSlotAvailability: (teacherId: string, day: DayOfWeek, slot: SlotId) => void;

  toggleMapping: (teacherId: string, batchId: string, subject: Subject) => void;
  setMappings: (m: TeacherBatchMapping[]) => void;

  setDistribution: (batchId: string, subject: Subject, percentage: number) => void;
  setTeacherSubDistribution: (batchId: string, subject: Subject, teacherId: string, percentage: number) => void;

  addMergeRule: (rule: MergeRule) => void;
  removeMergeRule: (id: string) => void;
  updateMergeRule: (id: string, data: Partial<MergeRule>) => void;

  addTeacherPair: (pair: TeacherPair) => void;
  removeTeacherPair: (id: string) => void;

  setWeekConfig: (w: Partial<WeekConfig>) => void;
  setGeneratedTimetable: (t: GeneratedTimetable | null) => void;
}

function initAvailability(teachers: Teacher[]): TeacherAvailability[] {
  const result: TeacherAvailability[] = [];
  for (const t of teachers) {
    for (const day of DAYS) {
      result.push({ teacherId: t.id, day, slots: SLOTS.map(s => s.id) });
    }
  }
  return result;
}

function initDistributions(batches: Batch[]): SubjectDistribution[] {
  const result: SubjectDistribution[] = [];
  for (const b of batches) {
    let template = categoryDistributions[b.category];
    if (!template) {
      const pct = Math.floor(100 / b.subjects.length);
      const remainder = 100 - pct * b.subjects.length;
      template = b.subjects.map((s, i) => ({
        subject: s,
        percentage: pct + (i === b.subjects.length - 1 ? remainder : 0),
      }));
    }
    for (const s of b.subjects) {
      const tmpl = template.find(t => t.subject === s);
      result.push({ batchId: b.id, subject: s, percentage: tmpl ? tmpl.percentage : 0 });
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
      teacherSubDistributions: [],
      mergeRules: [],
      teacherPairs: [],
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
        teacherSubDistributions: s.teacherSubDistributions.filter(d => d.teacherId !== id),
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
        if (data.subjects) {
          const existing = s.distributions.filter(d => d.batchId === id);
          const kept = existing.filter(d => batch.subjects.includes(d.subject));
          const newSubjects = batch.subjects.filter(sub => !existing.find(d => d.subject === sub));
          const newDists = newSubjects.map(sub => ({ batchId: id, subject: sub, percentage: 0 }));
          const otherDists = s.distributions.filter(d => d.batchId !== id);
          // Also clean up teacher sub-distributions for removed subjects
          const cleanedSubDists = s.teacherSubDistributions.filter(
            d => d.batchId !== id || batch.subjects.includes(d.subject)
          );
          return { batches: updated, distributions: [...otherDists, ...kept, ...newDists], teacherSubDistributions: cleanedSubDists };
        }
        return { batches: updated };
      }),
      removeBatch: (id) => set(s => ({
        batches: s.batches.filter(b => b.id !== id),
        mappings: s.mappings.filter(m => m.batchId !== id),
        distributions: s.distributions.filter(d => d.batchId !== id),
        teacherSubDistributions: s.teacherSubDistributions.filter(d => d.batchId !== id),
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
            return { ...a, slots: hasSlot ? a.slots.filter(sl => sl !== slot) : [...a.slots, slot] };
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
          return {
            mappings: s.mappings.filter(m => m !== exists),
            teacherSubDistributions: s.teacherSubDistributions.filter(
              d => !(d.batchId === batchId && d.subject === subject && d.teacherId === teacherId)
            ),
          };
        }
        return { mappings: [...s.mappings, { teacherId, batchId, subject }] };
      }),
      setMappings: (m) => set({ mappings: m }),

      setDistribution: (batchId, subject, percentage) => set(s => ({
        distributions: s.distributions.map(d =>
          d.batchId === batchId && d.subject === subject ? { ...d, percentage } : d
        ),
      })),

      setTeacherSubDistribution: (batchId, subject, teacherId, percentage) => set(s => {
        const exists = s.teacherSubDistributions.find(
          d => d.batchId === batchId && d.subject === subject && d.teacherId === teacherId
        );
        if (exists) {
          return {
            teacherSubDistributions: s.teacherSubDistributions.map(d =>
              d.batchId === batchId && d.subject === subject && d.teacherId === teacherId
                ? { ...d, percentage } : d
            ),
          };
        }
        return {
          teacherSubDistributions: [...s.teacherSubDistributions, { batchId, subject, teacherId, percentage }],
        };
      }),

      addMergeRule: (rule) => set(s => ({ mergeRules: [...s.mergeRules, rule] })),
      removeMergeRule: (id) => set(s => ({ mergeRules: s.mergeRules.filter(r => r.id !== id) })),
      updateMergeRule: (id, data) => set(s => ({
        mergeRules: s.mergeRules.map(r => r.id === id ? { ...r, ...data } : r),
      })),

      addTeacherPair: (pair) => set(s => ({ teacherPairs: [...s.teacherPairs, pair] })),
      removeTeacherPair: (id) => set(s => ({ teacherPairs: s.teacherPairs.filter(p => p.id !== id) })),

      setWeekConfig: (w) => set(s => ({ weekConfig: { ...s.weekConfig, ...w } })),
      setGeneratedTimetable: (t) => set({ generatedTimetable: t }),
    }),
    { name: 'timetable-store', version: 3 }
  )
);
