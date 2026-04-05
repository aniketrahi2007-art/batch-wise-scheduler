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

interface Demand {
  batchId: string;
  subject: Subject;
  classesNeeded: number;
  classesAssigned: number;
  teacherIds: string[];
}

export function generateTimetable(input: SchedulerInput): GeneratedTimetable {
  const { teachers, batches, rooms, availability, mappings, distributions, mergeRules, teacherPairs, weekConfig } = input;
  const entries: TimetableEntry[] = [];
  const backlog: BacklogItem[] = [];
  const errors: string[] = [];

  const holidayDays = new Set(weekConfig.holidays.map(h => h.day));
  const activeRooms = rooms.filter(r => r.active);

  const getBatchActiveDays = (batch: Batch): DayOfWeek[] => {
    const batchDays = batch.scheduleDays && batch.scheduleDays.length > 0 ? batch.scheduleDays : DAYS;
    return batchDays.filter(d => !holidayDays.has(d));
  };

  const activeBatches = batches.filter(b => b.active && !b.locked);
  const activeTeachers = teachers.filter(t => t.active);
  const teacherMap = new Map(activeTeachers.map(t => [t.id, t]));
  const batchMap = new Map(activeBatches.map(b => [b.id, b]));

  // ===== Availability lookup =====
  const getTeacherSlots = (teacherId: string, day: DayOfWeek): SlotId[] => {
    const override = weekConfig.availabilityOverrides.find(
      a => a.teacherId === teacherId && a.day === day
    );
    if (override) return override.slots;
    const avail = availability.find(a => a.teacherId === teacherId && a.day === day);
    return avail ? avail.slots : [];
  };

  // Pre-compute teacher availability as a Set for O(1) lookup
  const teacherAvailSet = new Map<string, Set<string>>();
  for (const t of activeTeachers) {
    const set = new Set<string>();
    for (const day of DAYS) {
      if (holidayDays.has(day)) continue;
      for (const slotId of getTeacherSlots(t.id, day)) {
        set.add(`${day}-${slotId}`);
      }
    }
    teacherAvailSet.set(t.id, set);
  }

  // ===== Schedule tracking =====
  const teacherSchedule = new Map<string, Set<string>>();
  const roomSchedule = new Map<string, Set<string>>();
  const batchSchedule = new Map<string, Set<string>>();
  const batchDaySubjects = new Map<string, Map<DayOfWeek, Subject[]>>();
  const teacherDayHours = new Map<string, Map<DayOfWeek, number>>();

  const sk = (day: DayOfWeek, slot: SlotId) => `${day}-${slot}`;

  const isFree = (id: string, schedule: Map<string, Set<string>>, day: DayOfWeek, slot: SlotId) =>
    !(schedule.get(id)?.has(sk(day, slot)));

  const assign = (id: string, schedule: Map<string, Set<string>>, day: DayOfWeek, slot: SlotId) => {
    if (!schedule.has(id)) schedule.set(id, new Set());
    schedule.get(id)!.add(sk(day, slot));
  };

  // ===== Teacher pairs =====
  const pairedTeachers = new Map<string, Set<string>>();
  for (const pair of teacherPairs) {
    const [a, b] = pair.teacherIds;
    if (!pairedTeachers.has(a)) pairedTeachers.set(a, new Set());
    if (!pairedTeachers.has(b)) pairedTeachers.set(b, new Set());
    pairedTeachers.get(a)!.add(b);
    pairedTeachers.get(b)!.add(a);
  }

  const isPairedFree = (teacherId: string, day: DayOfWeek, slot: SlotId): boolean => {
    const partners = pairedTeachers.get(teacherId);
    if (!partners) return true;
    for (const pid of partners) {
      if (!isFree(pid, teacherSchedule, day, slot)) return false;
    }
    return true;
  };

  const getSubjectsOnDay = (batchId: string, day: DayOfWeek): Subject[] => {
    return batchDaySubjects.get(batchId)?.get(day) || [];
  };

  const addSubjectToDay = (batchId: string, day: DayOfWeek, subject: Subject) => {
    if (!batchDaySubjects.has(batchId)) batchDaySubjects.set(batchId, new Map());
    if (!batchDaySubjects.get(batchId)!.has(day)) batchDaySubjects.get(batchId)!.set(day, []);
    batchDaySubjects.get(batchId)!.get(day)!.push(subject);
  };

  const addTeacherHour = (teacherId: string, day: DayOfWeek) => {
    if (!teacherDayHours.has(teacherId)) teacherDayHours.set(teacherId, new Map());
    const m = teacherDayHours.get(teacherId)!;
    m.set(day, (m.get(day) || 0) + 1);
  };

  const getTeacherHours = (teacherId: string, day: DayOfWeek): number => {
    return teacherDayHours.get(teacherId)?.get(day) || 0;
  };

  // ===== Find any available room for a given day+slot =====
  const findAvailableRoom = (day: DayOfWeek, slot: SlotId, preferredRoom: string): string | null => {
    // Try preferred room first
    if (isFree(preferredRoom, roomSchedule, day, slot)) return preferredRoom;
    // Try any other active room
    for (const room of activeRooms) {
      if (isFree(room.id, roomSchedule, day, slot)) return room.id;
    }
    return null;
  };

  // ===== Calculate classes needed =====
  const classesNeeded = new Map<string, Map<Subject, number>>();
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

  // ========== PHASE 1: Merged batches ==========
  const mergedBatchSubjects = new Set<string>();

  for (const rule of mergeRules) {
    const mergeBatches = rule.batchIds
      .map(id => batches.find(b => b.id === id))
      .filter((b): b is Batch => !!b && b.active && !b.locked);
    if (mergeBatches.length < 2) continue;

    const teacher = teacherMap.get(rule.teacherId);
    if (!teacher) continue;

    const session = mergeBatches[0].slotSession;
    const mergeSlots = SLOTS.filter(s => s.session === session);
    const preferredRoom = mergeBatches[0].defaultRoom;

    const commonDays = DAYS.filter(d =>
      !holidayDays.has(d) &&
      mergeBatches.every(mb => {
        const bDays = mb.scheduleDays?.length ? mb.scheduleDays : DAYS;
        return bDays.includes(d);
      })
    );

    // Use classesPerWeek if set, otherwise use max from distributions
    let maxNeeded: number;
    if (rule.classesPerWeek != null && rule.classesPerWeek > 0) {
      maxNeeded = rule.classesPerWeek;
    } else {
      maxNeeded = 0;
      for (const mb of mergeBatches) {
        const count = classesNeeded.get(mb.id)?.get(rule.subject) || 0;
        if (count > maxNeeded) maxNeeded = count;
      }
    }

    let classesAssigned = 0;

    for (let round = 0; round < 4 && classesAssigned < maxNeeded; round++) {
      for (const day of commonDays) {
        if (classesAssigned >= maxNeeded) break;
        const daySubCount = getSubjectsOnDay(mergeBatches[0].id, day).filter(s => s === rule.subject).length;
        if (daySubCount >= 2) continue;
        if (daySubCount >= 1 && round === 0) continue;

        const teacherSlots = getTeacherSlots(teacher.id, day);
        for (const slot of mergeSlots) {
          if (classesAssigned >= maxNeeded) break;
          if (!teacherSlots.includes(slot.id)) continue;
          if (!isFree(teacher.id, teacherSchedule, day, slot.id)) continue;
          if (!isPairedFree(teacher.id, day, slot.id)) continue;
          if (!mergeBatches.every(mb => isFree(mb.id, batchSchedule, day, slot.id))) continue;
          if (getTeacherHours(teacher.id, day) >= 5) continue;

          // Find available room (flexible)
          const roomId = findAvailableRoom(day, slot.id, preferredRoom);
          if (!roomId) continue;

          for (const mb of mergeBatches) {
            entries.push({
              day, slot: slot.id, batchId: mb.id, teacherId: teacher.id,
              subject: rule.subject, room: roomId,
              merged: rule.batchIds.filter(id => id !== mb.id),
            });
            assign(mb.id, batchSchedule, day, slot.id);
            addSubjectToDay(mb.id, day, rule.subject);
          }
          assign(teacher.id, teacherSchedule, day, slot.id);
          assign(roomId, roomSchedule, day, slot.id);
          addTeacherHour(teacher.id, day);
          classesAssigned++;
          break;
        }
      }
    }

    // Subtract merged classes from individual demands
    for (const mb of mergeBatches) {
      mergedBatchSubjects.add(`${mb.id}|${rule.subject}`);
      const batchNeeded = classesNeeded.get(mb.id);
      if (batchNeeded) {
        const origCount = batchNeeded.get(rule.subject) || 0;
        const remaining = Math.max(0, origCount - classesAssigned);
        if (remaining > 0) {
          batchNeeded.set(rule.subject, remaining);
          // Don't add to mergedBatchSubjects so remaining gets scheduled individually
          mergedBatchSubjects.delete(`${mb.id}|${rule.subject}`);
        }
      }
    }

    if (classesAssigned < maxNeeded) {
      backlog.push({
        batchId: mergeBatches.map(b => b.id).join('+'),
        subject: rule.subject, classesShort: maxNeeded - classesAssigned,
        reason: 'Merged class: insufficient slots',
      });
    }
  }

  // ========== PHASE 2: MCF (Most Constrained First) scheduling ==========
  const demands: Demand[] = [];
  for (const batch of activeBatches) {
    const needed = classesNeeded.get(batch.id);
    if (!needed) continue;
    for (const [subject, count] of needed.entries()) {
      if (mergedBatchSubjects.has(`${batch.id}|${subject}`)) continue;
      if (count <= 0) continue;

      const batchMappings = mappings.filter(m => m.batchId === batch.id && m.subject === subject);
      let teacherIds = batchMappings.map(m => m.teacherId).filter(id => teacherMap.has(id));
      if (teacherIds.length === 0) {
        teacherIds = activeTeachers.filter(t => t.subjects.includes(subject)).map(t => t.id);
      }
      if (teacherIds.length === 0) {
        backlog.push({ batchId: batch.id, subject, classesShort: count, reason: `No teacher for ${subject}` });
        continue;
      }

      demands.push({ batchId: batch.id, subject, classesNeeded: count, classesAssigned: 0, teacherIds });
    }
  }

  const scoreDemand = (d: Demand): number => {
    const batch = batchMap.get(d.batchId)!;
    const batchDays = getBatchActiveDays(batch);
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);
    let options = 0;

    for (const day of batchDays) {
      const sameSubToday = getSubjectsOnDay(d.batchId, day).filter(s => s === d.subject).length;
      if (sameSubToday >= 2) continue;

      for (const slot of batchSlots) {
        if (!isFree(d.batchId, batchSchedule, day, slot.id)) continue;

        for (const tid of d.teacherIds) {
          const avail = teacherAvailSet.get(tid);
          if (!avail?.has(sk(day, slot.id))) continue;
          if (!isFree(tid, teacherSchedule, day, slot.id)) continue;
          if (!isPairedFree(tid, day, slot.id)) continue;
          if (getTeacherHours(tid, day) >= 5) continue;
          // Check if ANY room is available
          if (!findAvailableRoom(day, slot.id, batch.defaultRoom)) continue;
          options++;
          break;
        }
      }
    }
    return options;
  };

  const findBestCandidate = (d: Demand): { day: DayOfWeek; slot: SlotId; teacherId: string; roomId: string } | null => {
    const batch = batchMap.get(d.batchId)!;
    const batchDays = getBatchActiveDays(batch);
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);
    let best: { day: DayOfWeek; slot: SlotId; teacherId: string; roomId: string; score: number } | null = null;

    for (const day of batchDays) {
      const sameSubToday = getSubjectsOnDay(d.batchId, day).filter(s => s === d.subject).length;
      if (sameSubToday >= 2) continue;
      const spreadPenalty = sameSubToday * 100;

      for (const slot of batchSlots) {
        if (!isFree(d.batchId, batchSchedule, day, slot.id)) continue;

        for (const tid of d.teacherIds) {
          const avail = teacherAvailSet.get(tid);
          if (!avail?.has(sk(day, slot.id))) continue;
          if (!isFree(tid, teacherSchedule, day, slot.id)) continue;
          if (!isPairedFree(tid, day, slot.id)) continue;
          if (getTeacherHours(tid, day) >= 5) continue;

          const roomId = findAvailableRoom(day, slot.id, batch.defaultRoom);
          if (!roomId) continue;

          const teacherTotalAvail = teacherAvailSet.get(tid)?.size || 0;
          const batchDayLoad = getSubjectsOnDay(d.batchId, day).length;
          // Prefer the batch's default room
          const roomPenalty = roomId === batch.defaultRoom ? 0 : 5;
          const score = spreadPenalty + teacherTotalAvail + batchDayLoad * 10 + roomPenalty;

          if (!best || score < best.score) {
            best = { day, slot: slot.id, teacherId: tid, roomId, score };
          }
          break;
        }
      }
    }
    return best;
  };

  const sortDemands = () => {
    const scores = demands.map((d, i) => ({
      idx: i,
      remaining: d.classesNeeded - d.classesAssigned,
      priority: batchMap.get(d.batchId)?.priority ?? 10,
      flexibility: scoreDemand(d),
    }));

    scores.sort((a, b) => {
      if (a.remaining <= 0 && b.remaining > 0) return 1;
      if (b.remaining <= 0 && a.remaining > 0) return -1;
      if (a.remaining <= 0 && b.remaining <= 0) return 0;
      if (a.flexibility !== b.flexibility) return a.flexibility - b.flexibility;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.remaining - a.remaining;
    });

    return scores.filter(s => s.remaining > 0);
  };

  let maxIterations = 5000;
  let progress = true;

  while (progress && maxIterations > 0) {
    progress = false;
    const sorted = sortDemands();
    if (sorted.length === 0) break;

    for (const { idx } of sorted) {
      maxIterations--;
      if (maxIterations <= 0) break;

      const demand = demands[idx];
      if (demand.classesAssigned >= demand.classesNeeded) continue;

      const candidate = findBestCandidate(demand);
      if (!candidate) continue;

      entries.push({
        day: candidate.day, slot: candidate.slot,
        batchId: demand.batchId, teacherId: candidate.teacherId,
        subject: demand.subject, room: candidate.roomId,
      });
      assign(demand.batchId, batchSchedule, candidate.day, candidate.slot);
      assign(candidate.teacherId, teacherSchedule, candidate.day, candidate.slot);
      assign(candidate.roomId, roomSchedule, candidate.day, candidate.slot);
      addSubjectToDay(demand.batchId, candidate.day, demand.subject);
      addTeacherHour(candidate.teacherId, candidate.day);
      demand.classesAssigned++;
      progress = true;
      break;
    }
  }

  for (const d of demands) {
    const short = d.classesNeeded - d.classesAssigned;
    if (short > 0) {
      backlog.push({
        batchId: d.batchId, subject: d.subject, classesShort: short,
        reason: 'Insufficient slots/teachers available',
      });
    }
  }

  return { weekConfig, entries, backlog, feasible: backlog.length === 0 && errors.length === 0, errors };
}
