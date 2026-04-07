export type Subject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology' | 'English' | 'Hindi' | 'Sanskrit' | 'SST' | 'Science';

export type BatchCategory = 'Junior' | 'JEE' | 'NEET' | 'Droppers';

export type SlotId = 'M1' | 'M2' | 'M3' | 'E1' | 'E2' | 'E3';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface Teacher {
  id: string;
  name: string;
  code: string;
  subjects: Subject[];
  active: boolean;
}

export interface Batch {
  id: string;
  name: string;
  displayName: string;
  category: BatchCategory;
  subjects: Subject[];
  defaultRoom: string;
  slotSession: 'Morning' | 'Evening';
  scheduleDays: DayOfWeek[];
  classDaysPerWeek?: number; // if set, scheduler picks best N days dynamically
  priority: number;
  active: boolean;
  locked: boolean;
}

export interface Room {
  id: string;
  name: string;
  active: boolean;
}

export interface SlotTime {
  id: SlotId;
  label: string;
  start: string;
  end: string;
  session: 'Morning' | 'Evening';
}

export interface TeacherAvailability {
  teacherId: string;
  day: DayOfWeek;
  slots: SlotId[];
}

export interface TeacherBatchMapping {
  teacherId: string;
  batchId: string;
  subject: Subject;
}

export interface SubjectDistribution {
  batchId: string;
  subject: Subject;
  percentage: number;
}

export interface TimetableEntry {
  day: DayOfWeek;
  slot: SlotId;
  batchId: string;
  teacherId: string;
  subject: Subject;
  room: string;
  merged?: string[];
}

export interface WeekConfig {
  weekLabel: string;
  startDate: string;
  holidays: { day: DayOfWeek; label?: string }[];
  availabilityOverrides: TeacherAvailability[];
  roomOverrides: { roomId: string; day: DayOfWeek; available: boolean }[];
}

export interface GeneratedTimetable {
  weekConfig: WeekConfig;
  entries: TimetableEntry[];
  backlog: BacklogItem[];
  feasible: boolean;
  errors: string[];
}

export interface BacklogItem {
  batchId: string;
  subject: Subject;
  classesShort: number;
  reason: string;
}

// New merge group: select batches, then configure per-subject
export interface MergeSubjectConfig {
  subject: Subject;
  teacherId: string;
  classesPerWeek: number;
}

export interface MergeGroup {
  id: string;
  batchIds: string[];
  subjectConfig: MergeSubjectConfig[];
}

// Keep MergeRule for backward compat (migration)
export interface MergeRule {
  id: string;
  batchIds: string[];
  subject: Subject;
  teacherId: string;
  classesPerWeek?: number;
}

export interface TeacherPair {
  id: string;
  teacherIds: [string, string];
  label?: string;
}

export interface TeacherSubDistribution {
  batchId: string;
  subject: Subject;
  teacherId: string;
  percentage: number;
}

export const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SLOTS: SlotTime[] = [
  { id: 'M1', label: 'M1', start: '10:00', end: '11:20', session: 'Morning' },
  { id: 'M2', label: 'M2', start: '11:30', end: '12:50', session: 'Morning' },
  { id: 'M3', label: 'M3', start: '1:00', end: '2:20', session: 'Morning' },
  { id: 'E1', label: 'E1', start: '4:00', end: '5:15', session: 'Evening' },
  { id: 'E2', label: 'E2', start: '5:25', end: '6:40', session: 'Evening' },
  { id: 'E3', label: 'E3', start: '6:50', end: '8:05', session: 'Evening' },
];
