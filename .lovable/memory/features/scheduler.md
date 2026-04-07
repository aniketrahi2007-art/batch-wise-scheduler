---
name: Scheduler algorithm
description: MCF scheduling with merge groups, flexible days, teacher capacity, room conflict validation
type: feature
---
- Phase 1: MergeGroups assigned FIRST (multiple subjects per group, teacher codes)
- Phase 2: Regular demands with teacher sub-distribution splitting
- Uniformity: spreadPenalty (200) for same-subject overload per day
- Consecutive: bonus (-50) for adjacent slots within same session
- Flexible days: `classDaysPerWeek` on Batch - scheduler picks best N days dynamically, prefers already-used days
- Teacher capacity: pre-calculate total available slots, warn if demand exceeds capacity
- Room conflicts: post-generation validation catches double-bookings
- Teacher pairs: paired teachers can't teach at same time
- Max 5 hours/day per teacher, max 2 same-subject classes/day per batch
