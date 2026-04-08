import {
  Teacher, Batch, Room, TeacherAvailability, TeacherBatchMapping,
  SubjectDistribution, WeekConfig, GeneratedTimetable, TimetableEntry,
  BacklogItem, MergeGroup, TeacherPair, TeacherSubDistribution,
  DAYS, SLOTS, DayOfWeek, SlotId, Subject
} from '@/types/timetable';

interface SchedulerInput {
  teachers: Teacher[];
  batches: Batch[];
  rooms: Room[];
  availability: TeacherAvailability[];
  mappings: TeacherBatchMapping[];
  distributions: SubjectDistribution[];
  teacherSubDistributions: TeacherSubDistribution[];
  mergeGroups: MergeGroup[];
  teacherPairs: TeacherPair[];
  weekConfig: WeekConfig;
}

interface Demand {
  batchId: string;
  subject: Subject;
  classesNeeded: number;
  classesAssigned: number;
  teacherId: string;
}

export function generateTimetable(input: SchedulerInput): GeneratedTimetable {
  const { teachers, batches, rooms, availability, mappings, distributions,
    teacherSubDistributions, mergeGroups, teacherPairs, weekConfig } = input;
  const entries: TimetableEntry[] = [];
  const backlog: BacklogItem[] = [];
  const errors: string[] = [];

  const holidayDays = new Set(weekConfig.holidays.map(h => h.day));
  const activeRooms = rooms.filter(r => r.active);
  const activeBatches = batches.filter(b => b.active && !b.locked);
  const activeTeachers = teachers.filter(t => t.active);
  const teacherMap = new Map(activeTeachers.map(t => [t.id, t]));
  const batchMap = new Map(activeBatches.map(b => [b.id, b]));

  // For flexible-day batches, track which days are used
  const batchUsedDays = new Map<string, Set<DayOfWeek>>();

  const getBatchCandidateDays = (batch: Batch): DayOfWeek[] => {
    const batchDays = batch.scheduleDays?.length ? batch.scheduleDays : DAYS;
    return batchDays.filter(d => !holidayDays.has(d));
  };

  // Availability lookup
  const getTeacherSlots = (teacherId: string, day: DayOfWeek): SlotId[] => {
    const override = weekConfig.availabilityOverrides.find(a => a.teacherId === teacherId && a.day === day);
    if (override) return override.slots;
    const avail = availability.find(a => a.teacherId === teacherId && a.day === day);
    return avail ? avail.slots : [];
  };

  const teacherAvailSet = new Map<string, Set<string>>();
  const teacherTotalSlots = new Map<string, number>();
  for (const t of activeTeachers) {
    const set = new Set<string>();
    for (const day of DAYS) {
      if (holidayDays.has(day)) continue;
      for (const slotId of getTeacherSlots(t.id, day)) set.add(`${day}-${slotId}`);
    }
    teacherAvailSet.set(t.id, set);
    teacherTotalSlots.set(t.id, set.size);
  }

  // Schedule tracking
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

  // Teacher pairs
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

  const getSubjectsOnDay = (batchId: string, day: DayOfWeek): Subject[] =>
    batchDaySubjects.get(batchId)?.get(day) || [];

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

  const getTeacherHours = (teacherId: string, day: DayOfWeek): number =>
    teacherDayHours.get(teacherId)?.get(day) || 0;

  const markBatchDay = (batchId: string, day: DayOfWeek) => {
    if (!batchUsedDays.has(batchId)) batchUsedDays.set(batchId, new Set());
    batchUsedDays.get(batchId)!.add(day);
  };

  const findAvailableRoom = (day: DayOfWeek, slot: SlotId, preferredRoom: string): string | null => {
    if (isFree(preferredRoom, roomSchedule, day, slot)) return preferredRoom;
    for (const room of activeRooms) {
      if (room.id !== preferredRoom && isFree(room.id, roomSchedule, day, slot)) return room.id;
    }
    return null;
  };

  const getBatchSlotsOnDay = (batchId: string, day: DayOfWeek): SlotId[] => {
    const set = batchSchedule.get(batchId);
    if (!set) return [];
    const slots: SlotId[] = [];
    for (const s of SLOTS) {
      if (set.has(sk(day, s.id))) slots.push(s.id);
    }
    return slots;
  };

  const getTeacherSlotsOnDay = (teacherId: string, day: DayOfWeek): SlotId[] => {
    const set = teacherSchedule.get(teacherId);
    if (!set) return [];
    const slots: SlotId[] = [];
    for (const s of SLOTS) {
      if (set.has(sk(day, s.id))) slots.push(s.id);
    }
    return slots;
  };

  const slotOrder: Record<SlotId, number> = { M1: 0, M2: 1, M3: 2, E1: 3, E2: 4, E3: 5 };

  // ========== Calculate classes needed ==========
  const classesNeeded = new Map<string, Map<Subject, number>>();
  for (const batch of activeBatches) {
    const batchDays = getBatchCandidateDays(batch);
    const effectiveDays = batch.classDaysPerWeek
      ? Math.min(batch.classDaysPerWeek, batchDays.length)
      : batchDays.length;
    const batchDists = distributions.filter(d => d.batchId === batch.id && d.percentage > 0);
    const batchClasses = new Map<Subject, number>();
    const totalBatchSlots = effectiveDays * 3;
    for (const dist of batchDists) {
      const classes = Math.round((dist.percentage / 100) * totalBatchSlots);
      if (classes > 0) batchClasses.set(dist.subject, classes);
    }
    classesNeeded.set(batch.id, batchClasses);
  }

  // ========== TEACHER CAPACITY CALCULATION ==========
  // Calculate total demand per teacher and cap if over capacity
  const teacherDemandTotal = new Map<string, number>();

  // First pass: sum up all demands per teacher (including merge)
  for (const group of mergeGroups) {
    for (const sc of group.subjectConfig) {
      if (sc.classesPerWeek > 0 && sc.teacherId) {
        teacherDemandTotal.set(sc.teacherId, (teacherDemandTotal.get(sc.teacherId) || 0) + sc.classesPerWeek);
      }
    }
  }

  // Non-merge demands
  const mergedBatchSubjectsPreCalc = new Set<string>();
  for (const group of mergeGroups) {
    for (const sc of group.subjectConfig) {
      for (const bid of group.batchIds) {
        mergedBatchSubjectsPreCalc.add(`${bid}|${sc.subject}`);
      }
    }
  }

  for (const batch of activeBatches) {
    const needed = classesNeeded.get(batch.id);
    if (!needed) continue;
    for (const [subject, count] of needed.entries()) {
      if (mergedBatchSubjectsPreCalc.has(`${batch.id}|${subject}`)) continue;
      const batchMappings = mappings.filter(m => m.batchId === batch.id && m.subject === subject);
      const teacherIds = batchMappings.map(m => m.teacherId).filter(id => teacherMap.has(id));
      if (teacherIds.length === 0) continue;

      if (teacherIds.length >= 2) {
        const subDists = teacherIds.map(tid => {
          const sd = teacherSubDistributions.find(
            d => d.batchId === batch.id && d.subject === subject && d.teacherId === tid
          );
          return { teacherId: tid, pct: sd?.percentage ?? 0 };
        });
        const totalPct = subDists.reduce((s, d) => s + d.pct, 0);
        if (totalPct > 0) {
          let assigned = 0;
          for (let i = 0; i < subDists.length; i++) {
            const sd = subDists[i];
            const share = i === subDists.length - 1 ? count - assigned : Math.round((sd.pct / totalPct) * count);
            if (share > 0) {
              teacherDemandTotal.set(sd.teacherId, (teacherDemandTotal.get(sd.teacherId) || 0) + share);
              assigned += share;
            }
          }
        } else {
          let assigned = 0;
          for (let i = 0; i < teacherIds.length; i++) {
            const share = i === teacherIds.length - 1 ? count - assigned : Math.round(count / teacherIds.length);
            if (share > 0) {
              teacherDemandTotal.set(teacherIds[i], (teacherDemandTotal.get(teacherIds[i]) || 0) + share);
              assigned += share;
            }
          }
        }
      } else {
        teacherDemandTotal.set(teacherIds[0], (teacherDemandTotal.get(teacherIds[0]) || 0) + count);
      }
    }
  }

  // Log teacher capacity warnings
  for (const [tid, demand] of teacherDemandTotal.entries()) {
    const capacity = teacherTotalSlots.get(tid) || 0;
    const teacher = teacherMap.get(tid);
    if (demand > capacity && teacher) {
      errors.push(`${teacher.code}: demand ${demand} exceeds capacity ${capacity} slots`);
    }
  }

  // ========== PHASE 1: Merged batches (assigned FIRST) ==========
  const mergedBatchSubjects = new Set<string>();

  for (const group of mergeGroups) {
    const mergeBatches = group.batchIds
      .map(id => batches.find(b => b.id === id))
      .filter((b): b is Batch => !!b && b.active && !b.locked);
    if (mergeBatches.length < 2) continue;

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

    for (const sc of group.subjectConfig) {
      if (!sc.teacherId || sc.classesPerWeek <= 0) continue;
      const teacher = teacherMap.get(sc.teacherId);
      if (!teacher) continue;

      let classesAssigned = 0;
      const maxNeeded = sc.classesPerWeek;

      for (let round = 0; round < 4 && classesAssigned < maxNeeded; round++) {
        for (const day of commonDays) {
          if (classesAssigned >= maxNeeded) break;
          const daySubCount = getSubjectsOnDay(mergeBatches[0].id, day).filter(s => s === sc.subject).length;
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

            const roomId = findAvailableRoom(day, slot.id, preferredRoom);
            if (!roomId) continue;

            for (const mb of mergeBatches) {
              entries.push({
                day, slot: slot.id, batchId: mb.id, teacherId: teacher.id,
                subject: sc.subject, room: roomId,
                merged: group.batchIds.filter(id => id !== mb.id),
              });
              assign(mb.id, batchSchedule, day, slot.id);
              addSubjectToDay(mb.id, day, sc.subject);
              markBatchDay(mb.id, day);
            }
            assign(teacher.id, teacherSchedule, day, slot.id);
            assign(roomId, roomSchedule, day, slot.id);
            addTeacherHour(teacher.id, day);
            classesAssigned++;
            break;
          }
        }
      }

      for (const mb of mergeBatches) {
        mergedBatchSubjects.add(`${mb.id}|${sc.subject}`);
        const batchNeeded = classesNeeded.get(mb.id);
        if (batchNeeded) {
          const origCount = batchNeeded.get(sc.subject) || 0;
          const remaining = Math.max(0, origCount - classesAssigned);
          if (remaining > 0) {
            batchNeeded.set(sc.subject, remaining);
            mergedBatchSubjects.delete(`${mb.id}|${sc.subject}`);
          }
        }
      }

      if (classesAssigned < maxNeeded) {
        backlog.push({
          batchId: mergeBatches.map(b => b.id).join('+'),
          subject: sc.subject, classesShort: maxNeeded - classesAssigned,
          reason: 'Merged class: insufficient slots',
        });
      }
    }
  }

  // ========== PHASE 2: Build demands with teacher sub-distributions ==========
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

      if (teacherIds.length >= 2) {
        const subDists = teacherIds.map(tid => {
          const sd = teacherSubDistributions.find(
            d => d.batchId === batch.id && d.subject === subject && d.teacherId === tid
          );
          return { teacherId: tid, pct: sd?.percentage ?? 0 };
        });
        const totalPct = subDists.reduce((s, d) => s + d.pct, 0);

        if (totalPct > 0) {
          let assigned = 0;
          for (let i = 0; i < subDists.length; i++) {
            const sd = subDists[i];
            const share = i === subDists.length - 1 ? count - assigned : Math.round((sd.pct / totalPct) * count);
            if (share > 0) {
              demands.push({ batchId: batch.id, subject, classesNeeded: share, classesAssigned: 0, teacherId: sd.teacherId });
              assigned += share;
            }
          }
        } else {
          let assigned = 0;
          for (let i = 0; i < teacherIds.length; i++) {
            const share = i === teacherIds.length - 1 ? count - assigned : Math.round(count / teacherIds.length);
            if (share > 0) {
              demands.push({ batchId: batch.id, subject, classesNeeded: share, classesAssigned: 0, teacherId: teacherIds[i] });
              assigned += share;
            }
          }
        }
      } else {
        demands.push({ batchId: batch.id, subject, classesNeeded: count, classesAssigned: 0, teacherId: teacherIds[0] });
      }
    }
  }

  // ========== Scoring & placement ==========
  const isDayAllowedForBatch = (batch: Batch, day: DayOfWeek): boolean => {
    if (!batch.classDaysPerWeek) return true;
    const usedDays = batchUsedDays.get(batch.id);
    if (!usedDays) return true;
    if (usedDays.has(day)) return true; // already using this day
    return usedDays.size < batch.classDaysPerWeek; // can add new day?
  };

  const scoreDemand = (d: Demand): number => {
    const batch = batchMap.get(d.batchId)!;
    const batchDays = getBatchCandidateDays(batch);
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);
    let options = 0;

    for (const day of batchDays) {
      if (!isDayAllowedForBatch(batch, day)) continue;
      const sameSubToday = getSubjectsOnDay(d.batchId, day).filter(s => s === d.subject).length;
      if (sameSubToday >= 2) continue;

      for (const slot of batchSlots) {
        if (!isFree(d.batchId, batchSchedule, day, slot.id)) continue;
        const avail = teacherAvailSet.get(d.teacherId);
        if (!avail?.has(sk(day, slot.id))) continue;
        if (!isFree(d.teacherId, teacherSchedule, day, slot.id)) continue;
        if (!isPairedFree(d.teacherId, day, slot.id)) continue;
        if (getTeacherHours(d.teacherId, day) >= 5) continue;
        if (!findAvailableRoom(day, slot.id, batch.defaultRoom)) continue;
        options++;
      }
    }
    return options;
  };

  const findBestCandidate = (d: Demand): { day: DayOfWeek; slot: SlotId; roomId: string } | null => {
    const batch = batchMap.get(d.batchId)!;
    const batchDays = getBatchCandidateDays(batch);
    const batchSlots = SLOTS.filter(s => s.session === batch.slotSession);
    let best: { day: DayOfWeek; slot: SlotId; roomId: string; score: number } | null = null;

    const subjectCountsPerDay = new Map<DayOfWeek, number>();
    for (const day of batchDays) {
      subjectCountsPerDay.set(day, getSubjectsOnDay(d.batchId, day).length);
    }

    for (const day of batchDays) {
      if (!isDayAllowedForBatch(batch, day)) continue;

      const sameSubToday = getSubjectsOnDay(d.batchId, day).filter(s => s === d.subject).length;
      if (sameSubToday >= 2) continue;

      const dayLoad = subjectCountsPerDay.get(day) || 0;
      const spreadPenalty = sameSubToday * 200;

      // For flexible-day batches, prefer days already in use
      const usedDays = batchUsedDays.get(d.batchId);
      const isNewDay = usedDays && !usedDays.has(day);
      const newDayPenalty = isNewDay ? 100 : 0;

      for (const slot of batchSlots) {
        if (!isFree(d.batchId, batchSchedule, day, slot.id)) continue;
        const avail = teacherAvailSet.get(d.teacherId);
        if (!avail?.has(sk(day, slot.id))) continue;
        if (!isFree(d.teacherId, teacherSchedule, day, slot.id)) continue;
        if (!isPairedFree(d.teacherId, day, slot.id)) continue;
        if (getTeacherHours(d.teacherId, day) >= 5) continue;

        const roomId = findAvailableRoom(day, slot.id, batch.defaultRoom);
        if (!roomId) continue;

        // Consecutive slot bonus (batch-level: prefer filling adjacent slots in batch)
        const usedSlots = getBatchSlotsOnDay(d.batchId, day);
        let consecutiveBonus = 0;
        const thisOrder = slotOrder[slot.id];
        if (usedSlots.length > 0) {
          const isAdjacent = usedSlots.some(us => Math.abs(slotOrder[us] - thisOrder) === 1);
          consecutiveBonus = isAdjacent ? -50 : 30;
        }

        // Teacher consecutive bonus: if teacher already has a class on this day,
        // strongly prefer the adjacent slot so their classes are back-to-back
        const teacherSlotsToday = getTeacherSlotsOnDay(d.teacherId, day);
        let teacherConsecBonus = 0;
        if (teacherSlotsToday.length > 0) {
          const isTeacherAdjacent = teacherSlotsToday.some(ts => Math.abs(slotOrder[ts] - thisOrder) === 1);
          teacherConsecBonus = isTeacherAdjacent ? -80 : 60; // strong preference for adjacent
        }

        const uniformityScore = dayLoad * 20;
        const roomPenalty = roomId === batch.defaultRoom ? 0 : 5;
        const teacherTotalAvail = teacherAvailSet.get(d.teacherId)?.size || 0;
        const score = spreadPenalty + uniformityScore + consecutiveBonus + teacherConsecBonus + newDayPenalty + teacherTotalAvail + roomPenalty;

        if (!best || score < best.score) {
          best = { day, slot: slot.id, roomId, score };
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
        batchId: demand.batchId, teacherId: demand.teacherId,
        subject: demand.subject, room: candidate.roomId,
      });
      assign(demand.batchId, batchSchedule, candidate.day, candidate.slot);
      assign(demand.teacherId, teacherSchedule, candidate.day, candidate.slot);
      assign(candidate.roomId, roomSchedule, candidate.day, candidate.slot);
      addSubjectToDay(demand.batchId, candidate.day, demand.subject);
      addTeacherHour(demand.teacherId, candidate.day);
      markBatchDay(demand.batchId, candidate.day);
      demand.classesAssigned++;
      progress = true;
      break;
    }
  }

  // Build backlog
  for (const d of demands) {
    const short = d.classesNeeded - d.classesAssigned;
    if (short > 0) {
      const tName = teacherMap.get(d.teacherId)?.code || d.teacherId;
      backlog.push({
        batchId: d.batchId, subject: d.subject, classesShort: short,
        reason: `Insufficient slots for ${tName}`,
      });
    }
  }

  // ========== POST-GENERATION: Room conflict validation ==========
  const roomSlotMap = new Map<string, string[]>();
  for (const entry of entries) {
    const key = `${entry.day}-${entry.slot}-${entry.room}`;
    if (!roomSlotMap.has(key)) roomSlotMap.set(key, []);
    // Only count non-merged entries as conflicts (merged entries share room)
    const batchEntry = `${entry.batchId}`;
    const existing = roomSlotMap.get(key)!;
    // Check if this is a merged group
    const isMerged = entry.merged && entry.merged.length > 0;
    if (!isMerged) {
      if (existing.length > 0) {
        // Check if existing entries are from same merge group
        const conflict = existing.some(existBid => {
          const existEntry = entries.find(e => e.batchId === existBid && e.day === entry.day && e.slot === entry.slot && e.room === entry.room);
          if (!existEntry) return true;
          // If existing entry is merged with current, no conflict
          return !existEntry.merged?.includes(entry.batchId) && !entry.merged?.includes(existBid);
        });
        if (conflict) {
          errors.push(`Room conflict: ${entry.room} on ${entry.day} ${entry.slot} - multiple batches assigned`);
        }
      }
    }
    existing.push(batchEntry);
  }

  return { weekConfig, entries, backlog, feasible: backlog.length === 0 && errors.length === 0, errors };
}
