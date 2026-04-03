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

  // Get active days (exclude holidays)
  const holidayDays = new Set(weekConfig.holidays.map(h => h.day));
  const activeDays = DAYS.filter(d => !holidayDays.has(d));

  // Active batches (non-locked)
  const activeBatches = batches.filter(b => b.active && !b.locked);
  const lockedBatches = batches.filter(b => b.active && b.locked);

  // Build availability lookup
  const getTeacherSlots = (teacherId: string, day: DayOfWeek): SlotId[] => {
    // Check overrides first
    const override = weekConfig.availabilityOverrides.find(
      a => a.teacherId === teacherId && a.day === day
    );
    if (override) return override.slots;
    const avail = availability.find(a => a.teacherId === teacherId && a.day === day);
    return avail ? avail.slots : [];
  };

  // Calculate classes needed per batch per subject
  const totalSlots = activeDays.length * SLOTS.length;
  const classesNeeded: Map<string, Map<Subject, number>> = new Map();

  for (const batch of activeBatches) {
    const batchDists = distributions.filter(d => d.batchId === batch.id && d.percentage > 0);
    const batchClasses = new Map<Subject, number>();
    // Each batch has 3 slots per day (morning or evening)
    const totalBatchSlots = activeDays.length * 3;
    for (const dist of batchDists) {
      const classes = Math.round((dist.percentage / 100) * totalBatchSlots);
      if (classes > 0) batchClasses.set(dist.subject, classes);
    }
    classesNeeded.set(batch.id, batchClasses);
  }

  // Track assignments
  const teacherSchedule: Map<string, Set<string>> = new Map(); // teacherId -> Set<"day-slot">
  const roomSchedule: Map<string, Set<string>> = new Map(); // roomId -> Set<"day-slot">
  const batchSchedule: Map<string, Set<string>> = new Map(); // batchId -> Set<"day-slot">
  const batchSubjectCount: Map<string, Map<Subject, number>> = new Map();
  const batchDaySubjects: Map<string, Map<DayOfWeek, Subject[]>> = new Map();
  const teacherDayHours: Map<string, Map<DayOfWeek, number>> = new Map();

  const slotKey = (day: DayOfWeek, slot: SlotId) => `${day}-${slot}`;

  // Build teacher pair lookup: teacherId -> set of paired teacher IDs
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

  // Check consecutive rule
  const checkConsecutiveRule = (batchId: string, day: DayOfWeek, subject: Subject): boolean => {
    const daySubjects = batchDaySubjects.get(batchId)?.get(day) || [];
    const sameSubjectCount = daySubjects.filter(s => s === subject).length;
    if (sameSubjectCount >= 2) {
      // Already 2 of same subject, check if 3 consecutive would block others
      const otherSubjects = new Set(daySubjects.filter(s => s !== subject));
      if (sameSubjectCount >= 3) return false;
      if (sameSubjectCount === 2 && otherSubjects.size > 1) return false;
    }
    return true;
  };

  // ========== PHASE 1: Schedule merged batches first ==========
  // Merged batches share the same slot, teacher, and room
  const mergedBatchSubjects = new Set<string>(); // "batchId|subject" keys that are handled by merge

  for (const rule of mergeRules) {
    const mergeBatches = rule.batchIds
      .map(id => batches.find(b => b.id === id))
      .filter((b): b is Batch => !!b && b.active && !b.locked);
    if (mergeBatches.length < 2) continue;

    const teacher = teachers.find(t => t.id === rule.teacherId);
    if (!teacher || !teacher.active) continue;

    const session = mergeBatches[0].slotSession;
    const mergeSlots = SLOTS.filter(s => s.session === session);
    const roomId = mergeBatches[0].defaultRoom; // Use first batch's room

    // How many classes needed? Use the max needed among merged batches
    let maxNeeded = 0;
    for (const mb of mergeBatches) {
      const needed = classesNeeded.get(mb.id);
      const count = needed?.get(rule.subject) || 0;
      if (count > maxNeeded) maxNeeded = count;
    }

    let classesAssigned = 0;

    for (let round = 0; round < Math.ceil(maxNeeded / activeDays.length) + 1 && classesAssigned < maxNeeded; round++) {
      for (const day of activeDays) {
        if (classesAssigned >= maxNeeded) break;

        // Check teacher availability
        const teacherSlots = getTeacherSlots(teacher.id, day);

        for (const slot of mergeSlots) {
          if (classesAssigned >= maxNeeded) break;
          if (!teacherSlots.includes(slot.id)) continue;
          if (!isSlotFree(teacher.id, teacherSchedule, day, slot.id)) continue;
          if (!isSlotFree(roomId, roomSchedule, day, slot.id)) continue;

          // Check all merged batches are free in this slot
          const allFree = mergeBatches.every(mb => isSlotFree(mb.id, batchSchedule, day, slot.id));
          if (!allFree) continue;

          // Check teacher max hours
          if (!teacherDayHours.has(teacher.id)) teacherDayHours.set(teacher.id, new Map());
          const hours = teacherDayHours.get(teacher.id)!.get(day) || 0;
          if (hours >= 5) continue;

          // Assign merged class for all batches
          for (const mb of mergeBatches) {
            const entry: TimetableEntry = {
              day,
              slot: slot.id,
              batchId: mb.id,
              teacherId: teacher.id,
              subject: rule.subject,
              room: roomId,
              merged: rule.batchIds.filter(id => id !== mb.id),
            };
            entries.push(entry);
            assignSlot(mb.id, batchSchedule, day, slot.id);

            if (!batchDaySubjects.has(mb.id)) batchDaySubjects.set(mb.id, new Map());
            if (!batchDaySubjects.get(mb.id)!.has(day)) batchDaySubjects.get(mb.id)!.set(day, []);
            batchDaySubjects.get(mb.id)!.get(day)!.push(rule.subject);
          }

          assignSlot(teacher.id, teacherSchedule, day, slot.id);
          assignSlot(roomId, roomSchedule, day, slot.id);
          teacherDayHours.get(teacher.id)!.set(day, hours + 1);

          classesAssigned++;
          break; // One per day per round
        }
      }
    }

    // Mark these batch+subject combos as handled
    for (const mb of mergeBatches) {
      mergedBatchSubjects.add(`${mb.id}|${rule.subject}`);
    }

    if (classesAssigned < maxNeeded) {
      backlog.push({
        batchId: mergeBatches.map(b => b.id).join('+'),
        subject: rule.subject,
        classesShort: maxNeeded - classesAssigned,
        reason: `Merged class: insufficient slots`,
      });
    }
  }

  // ========== PHASE 2: Schedule remaining (non-merged) batch-subjects ==========
  const shuffledDays = [...activeDays];
  
  for (const batch of activeBatches) {
    const needed = classesNeeded.get(batch.id);
    if (!needed) continue;

    // Only use the batch's session slots
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);

    const batchMappings = mappings.filter(m => m.batchId === batch.id);
    const assigned = new Map<Subject, number>();
    batch.subjects.forEach(s => assigned.set(s, 0));

    if (!batchDaySubjects.has(batch.id)) batchDaySubjects.set(batch.id, new Map());
    if (!batchSubjectCount.has(batch.id)) batchSubjectCount.set(batch.id, new Map());

    // Sort subjects by need (highest first)
    const subjectsToSchedule = [...(needed.entries())]
      .sort((a, b) => b[1] - a[1]);

    for (const [subject, count] of subjectsToSchedule) {
      // Skip if handled by merge rule
      if (mergedBatchSubjects.has(`${batch.id}|${subject}`)) continue;
      // Find eligible teachers
      const eligibleTeachers = batchMappings
        .filter(m => m.subject === subject)
        .map(m => teachers.find(t => t.id === m.teacherId))
        .filter((t): t is Teacher => !!t && t.active);

      if (eligibleTeachers.length === 0) {
        // Try any teacher with that subject
        const fallbackTeachers = teachers.filter(t => t.active && t.subjects.includes(subject));
        if (fallbackTeachers.length === 0) {
          backlog.push({ batchId: batch.id, subject, classesShort: count, reason: `No teacher available for ${subject}` });
          continue;
        }
        eligibleTeachers.push(...fallbackTeachers);
      }

      let classesAssigned = 0;

      // Spread across days
      for (let round = 0; round < Math.ceil(count / activeDays.length) + 1 && classesAssigned < count; round++) {
        for (const day of shuffledDays) {
          if (classesAssigned >= count) break;

          // Check consecutive rule
          if (!checkConsecutiveRule(batch.id, day, subject)) continue;

          // Check distribution optimization (spread subjects across days)
          const daySubjects = batchDaySubjects.get(batch.id)?.get(day) || [];
          const sameSubjectToday = daySubjects.filter(s => s === subject).length;
          if (sameSubjectToday >= 1 && round === 0) continue; // First pass: max 1 per day

          for (const slot of batchSlots) {
            if (classesAssigned >= count) break;
            if (!isSlotFree(batch.id, batchSchedule, day, slot.id)) continue;

            // Try each teacher
            let scheduled = false;
            for (const teacher of eligibleTeachers) {
              const teacherSlots = getTeacherSlots(teacher.id, day);
              if (!teacherSlots.includes(slot.id)) continue;
              if (!isSlotFree(teacher.id, teacherSchedule, day, slot.id)) continue;

              // Check teacher max 6 hours per day
              if (!teacherDayHours.has(teacher.id)) teacherDayHours.set(teacher.id, new Map());
              const hours = teacherDayHours.get(teacher.id)!.get(day) || 0;
              if (hours >= 5) continue; // ~5 slots ≈ 6 hours

              // Check room
              const roomId = batch.defaultRoom;
              if (!isSlotFree(roomId, roomSchedule, day, slot.id)) continue;

              // Assign!
              const entry: TimetableEntry = {
                day,
                slot: slot.id,
                batchId: batch.id,
                teacherId: teacher.id,
                subject,
                room: roomId,
              };
              entries.push(entry);

              assignSlot(batch.id, batchSchedule, day, slot.id);
              assignSlot(teacher.id, teacherSchedule, day, slot.id);
              assignSlot(roomId, roomSchedule, day, slot.id);

              // Track
              teacherDayHours.get(teacher.id)!.set(day, hours + 1);
              if (!batchDaySubjects.get(batch.id)!.has(day)) {
                batchDaySubjects.get(batch.id)!.set(day, []);
              }
              batchDaySubjects.get(batch.id)!.get(day)!.push(subject);

              classesAssigned++;
              scheduled = true;
              break;
            }
            if (scheduled) break; // Move to next day after scheduling one per day
          }
        }
      }

      if (classesAssigned < count) {
        backlog.push({
          batchId: batch.id,
          subject,
          classesShort: count - classesAssigned,
          reason: 'Insufficient slots/teachers available',
        });
      }
    }
  }

  const feasible = backlog.length === 0 && errors.length === 0;

  return {
    weekConfig,
    entries,
    backlog,
    feasible,
    errors,
  };
}
