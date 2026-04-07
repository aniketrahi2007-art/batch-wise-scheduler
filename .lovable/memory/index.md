# Project Memory

## Core
Timetable scheduler for coaching institute. Zustand + localStorage + Cloud sync.
Batches have Morning/Evening sessions, schedule days, priority. Max 2 same-subject classes/day.
Teacher pairs can't teach at same time. Flexible room assignment (fallback to any available).
MergeGroups (not MergeRules) - multi-subject per group, assigned FIRST.

## Memories
- [Scheduler algorithm](mem://features/scheduler) — MCF algorithm, merge groups, flexible days, teacher capacity, room validation
- [Data persistence](mem://features/persistence) — Cloud sync via shared_config table, debounced 2s save, load on mount
