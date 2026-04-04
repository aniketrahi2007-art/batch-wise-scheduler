import {
  Teacher, Batch, Room, TeacherAvailability, TeacherBatchMapping,
  SubjectDistribution, WeekConfig, GeneratedTimetable, TimetableEntry,
  BacklogItem, MergeRule, TeacherPair, DAYS, SLOTS, DayOfWeek, SlotId, Subject
} from '@/types/timetable';

interface SchedulerInput {
  teachers: Teacher[];
  batches: Batch[];
  rooms: Room[];
  availability: TeacherAvailability[];
  mappings: TeacherBatchMapping[];
  distributions: SubjectDistribution[];
  mergeRules: MergeRule[];
  teacherPairs: TeacherPair[];
  weekConfig: WeekConfig;
}

export function generateTimetable(input: SchedulerInput): GeneratedTimetable {
  const { teachers, batches, rooms, availability, mappings, distributions, mergeRules, teacherPairs, weekConfig } = input;
  const entries: TimetableEntry[] = [];
  const backlog: BacklogItem[] = [];
  const errors: string[] = [];

  const holidayDays = new Set(weekConfig.holidays.map(h => h.day));
  const globalActiveDays = DAYS.filter(d => !holidayDays.has(d));

  // Get batch-specific active days (intersection of batch scheduleDays and non-holiday days)
  const getBatchActiveDays = (batch: Batch): DayOfWeek[] => {
    const batchDays = batch.scheduleDays && batch.scheduleDays.length > 0 ? batch.scheduleDays : DAYS;
    return batchDays.filter(d => !holidayDays.has(d));
  };

  // Sort batches by priority (lower number = higher priority = scheduled first)
  const activeBatches = batches
    .filter(b => b.active && !b.locked)
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));

  const getTeacherSlots = (teacherId: string, day: DayOfWeek): SlotId[] => {
    const override = weekConfig.availabilityOverrides.find(
      a => a.teacherId === teacherId && a.day === day
    );
    if (override) return override.slots;
    const avail = availability.find(a => a.teacherId === teacherId && a.day === day);
    return avail ? avail.slots : [];
  };

  // Calculate classes needed per batch per subject using batch-specific days
  const classesNeeded: Map<string, Map<Subject, number>> = new Map();

  for (const batch of activeBatches) {
    const batchDays = getBatchActiveDays(batch);
    const batchDists = distributions.filter(d => d.batchId === batch.id && d.percentage > 0);
    const batchClasses = new Map<Subject, number>();
    const totalBatchSlots = batchDays.length * 3;
    for (const dist of batchDists) {
      const classes = Math.round((dist.percentage / 100) * totalBatchSlots);
      if (classes > 0) batchClasses.set(dist.subject, classes);
    }
    classesNeeded.set(batch.id, batchClasses);
  }

  const teacherSchedule: Map<string, Set<string>> = new Map();
  const roomSchedule: Map<string, Set<string>> = new Map();
  const batchSchedule: Map<string, Set<string>> = new Map();
  const batchSubjectCount: Map<string, Map<Subject, number>> = new Map();
  const batchDaySubjects: Map<string, Map<DayOfWeek, Subject[]>> = new Map();
  const teacherDayHours: Map<string, Map<DayOfWeek, number>> = new Map();

  const slotKey = (day: DayOfWeek, slot: SlotId) => `${day}-${slot}`;

  const pairedTeachers = new Map<string, Set<string>>();
  for (const pair of teacherPairs) {
    const [a, b] = pair.teacherIds;
    if (!pairedTeachers.has(a)) pairedTeachers.set(a, new Set());
    if (!pairedTeachers.has(b)) pairedTeachers.set(b, new Set());
    pairedTeachers.get(a)!.add(b);
    pairedTeachers.get(b)!.add(a);
  }

  const isPairedTeacherFree = (teacherId: string, day: DayOfWeek, slot: SlotId): boolean => {
    const partners = pairedTeachers.get(teacherId);
    if (!partners) return true;
    for (const partnerId of partners) {
      if (!isSlotFree(partnerId, teacherSchedule, day, slot)) return false;
    }
    return true;
  };

  const isSlotFree = (entityId: string, schedule: Map<string, Set<string>>, day: DayOfWeek, slot: SlotId): boolean => {
    const key = slotKey(day, slot);
    return !(schedule.get(entityId)?.has(key));
  };

  const assignSlot = (entityId: string, schedule: Map<string, Set<string>>, day: DayOfWeek, slot: SlotId) => {
    if (!schedule.has(entityId)) schedule.set(entityId, new Set());
    schedule.get(entityId)!.add(slotKey(day, slot));
  };

  const checkConsecutiveRule = (batchId: string, day: DayOfWeek, subject: Subject): boolean => {
    const daySubjects = batchDaySubjects.get(batchId)?.get(day) || [];
    const sameSubjectCount = daySubjects.filter(s => s === subject).length;
    if (sameSubjectCount >= 2) {
      const otherSubjects = new Set(daySubjects.filter(s => s !== subject));
      if (sameSubjectCount >= 3) return false;
      if (sameSubjectCount === 2 && otherSubjects.size > 1) return false;
    }
    return true;
  };

  // ========== PHASE 1: Schedule merged batches first ==========
  const mergedBatchSubjects = new Set<string>();

  for (const rule of mergeRules) {
    const mergeBatches = rule.batchIds
      .map(id => batches.find(b => b.id === id))
      .filter((b): b is Batch => !!b && b.active && !b.locked);
    if (mergeBatches.length < 2) continue;

    const teacher = teachers.find(t => t.id === rule.teacherId);
    if (!teacher || !teacher.active) continue;

    const session = mergeBatches[0].slotSession;
    const mergeSlots = SLOTS.filter(s => s.session === session);
    const roomId = mergeBatches[0].defaultRoom;

    // Use intersection of all merged batches' schedule days
    const commonDays = globalActiveDays.filter(d =>
      mergeBatches.every(mb => {
        const bDays = mb.scheduleDays && mb.scheduleDays.length > 0 ? mb.scheduleDays : DAYS;
        return bDays.includes(d);
      })
    );

    let maxNeeded = 0;
    for (const mb of mergeBatches) {
      const needed = classesNeeded.get(mb.id);
      const count = needed?.get(rule.subject) || 0;
      if (count > maxNeeded) maxNeeded = count;
    }

    let classesAssigned = 0;

    for (let round = 0; round < Math.ceil(maxNeeded / commonDays.length) + 1 && classesAssigned < maxNeeded; round++) {
      for (const day of commonDays) {
        if (classesAssigned >= maxNeeded) break;
        const teacherSlots = getTeacherSlots(teacher.id, day);

        for (const slot of mergeSlots) {
          if (classesAssigned >= maxNeeded) break;
          if (!teacherSlots.includes(slot.id)) continue;
          if (!isSlotFree(teacher.id, teacherSchedule, day, slot.id)) continue;
          if (!isPairedTeacherFree(teacher.id, day, slot.id)) continue;
          if (!isSlotFree(roomId, roomSchedule, day, slot.id)) continue;

          const allFree = mergeBatches.every(mb => isSlotFree(mb.id, batchSchedule, day, slot.id));
          if (!allFree) continue;

          if (!teacherDayHours.has(teacher.id)) teacherDayHours.set(teacher.id, new Map());
          const hours = teacherDayHours.get(teacher.id)!.get(day) || 0;
          if (hours >= 5) continue;

          for (const mb of mergeBatches) {
            entries.push({
              day, slot: slot.id, batchId: mb.id, teacherId: teacher.id,
              subject: rule.subject, room: roomId,
              merged: rule.batchIds.filter(id => id !== mb.id),
            });
            assignSlot(mb.id, batchSchedule, day, slot.id);
            if (!batchDaySubjects.has(mb.id)) batchDaySubjects.set(mb.id, new Map());
            if (!batchDaySubjects.get(mb.id)!.has(day)) batchDaySubjects.get(mb.id)!.set(day, []);
            batchDaySubjects.get(mb.id)!.get(day)!.push(rule.subject);
          }

          assignSlot(teacher.id, teacherSchedule, day, slot.id);
          assignSlot(roomId, roomSchedule, day, slot.id);
          teacherDayHours.get(teacher.id)!.set(day, hours + 1);
          classesAssigned++;
          break;
        }
      }
    }

    for (const mb of mergeBatches) {
      mergedBatchSubjects.add(`${mb.id}|${rule.subject}`);
    }

    if (classesAssigned < maxNeeded) {
      backlog.push({
        batchId: mergeBatches.map(b => b.id).join('+'),
        subject: rule.subject, classesShort: maxNeeded - classesAssigned,
        reason: `Merged class: insufficient slots`,
      });
    }
  }

  // ========== PHASE 2: Schedule remaining batch-subjects (sorted by priority) ==========
  for (const batch of activeBatches) {
    const needed = classesNeeded.get(batch.id);
    if (!needed) continue;

    const batchDays = getBatchActiveDays(batch);
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);
    const batchMappings = mappings.filter(m => m.batchId === batch.id);
    const assigned = new Map<Subject, number>();
    batch.subjects.forEach(s => assigned.set(s, 0));

    if (!batchDaySubjects.has(batch.id)) batchDaySubjects.set(batch.id, new Map());
    if (!batchSubjectCount.has(batch.id)) batchSubjectCount.set(batch.id, new Map());

    const subjectsToSchedule = [...(needed.entries())].sort((a, b) => b[1] - a[1]);

    for (const [subject, count] of subjectsToSchedule) {
      if (mergedBatchSubjects.has(`${batch.id}|${subject}`)) continue;

      const eligibleTeachers = batchMappings
        .filter(m => m.subject === subject)
        .map(m => teachers.find(t => t.id === m.teacherId))
        .filter((t): t is Teacher => !!t && t.active);

      if (eligibleTeachers.length === 0) {
        const fallbackTeachers = teachers.filter(t => t.active && t.subjects.includes(subject));
        if (fallbackTeachers.length === 0) {
          backlog.push({ batchId: batch.id, subject, classesShort: count, reason: `No teacher available for ${subject}` });
          continue;
        }
        eligibleTeachers.push(...fallbackTeachers);
      }

      let classesAssigned = 0;

      for (let round = 0; round < Math.ceil(count / batchDays.length) + 1 && classesAssigned < count; round++) {
        for (const day of batchDays) {
          if (classesAssigned >= count) break;
          if (!checkConsecutiveRule(batch.id, day, subject)) continue;

          const daySubjects = batchDaySubjects.get(batch.id)?.get(day) || [];
          const sameSubjectToday = daySubjects.filter(s => s === subject).length;
          if (sameSubjectToday >= 1 && round === 0) continue;

          for (const slot of batchSlots) {
            if (classesAssigned >= count) break;
            if (!isSlotFree(batch.id, batchSchedule, day, slot.id)) continue;

            let scheduled = false;
            for (const teacher of eligibleTeachers) {
              const teacherSlots = getTeacherSlots(teacher.id, day);
              if (!teacherSlots.includes(slot.id)) continue;
              if (!isSlotFree(teacher.id, teacherSchedule, day, slot.id)) continue;
              if (!isPairedTeacherFree(teacher.id, day, slot.id)) continue;

              if (!teacherDayHours.has(teacher.id)) teacherDayHours.set(teacher.id, new Map());
              const hours = teacherDayHours.get(teacher.id)!.get(day) || 0;
              if (hours >= 5) continue;

              const roomId = batch.defaultRoom;
              if (!isSlotFree(roomId, roomSchedule, day, slot.id)) continue;

              entries.push({ day, slot: slot.id, batchId: batch.id, teacherId: teacher.id, subject, room: roomId });
              assignSlot(batch.id, batchSchedule, day, slot.id);
              assignSlot(teacher.id, teacherSchedule, day, slot.id);
              assignSlot(roomId, roomSchedule, day, slot.id);
              teacherDayHours.get(teacher.id)!.set(day, hours + 1);
              if (!batchDaySubjects.get(batch.id)!.has(day)) batchDaySubjects.get(batch.id)!.set(day, []);
              batchDaySubjects.get(batch.id)!.get(day)!.push(subject);
              classesAssigned++;
              scheduled = true;
              break;
            }
            if (scheduled) break;
          }
        }
      }

      if (classesAssigned < count) {
        backlog.push({ batchId: batch.id, subject, classesShort: count - classesAssigned, reason: 'Insufficient slots/teachers available' });
      }
    }
  }

  return { weekConfig, entries, backlog, feasible: backlog.length === 0 && errors.length === 0, errors };
}
