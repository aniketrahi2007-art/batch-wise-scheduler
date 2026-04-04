import { Teacher, Batch, Room, Subject, DAYS, DayOfWeek } from '@/types/timetable';

export const defaultTeachers: Teacher[] = [
  { id: 't1', name: 'Atul Sir', code: 'CKA', subjects: ['Chemistry'], active: true },
  { id: 't2', name: 'Rajeev Sir', code: 'MRK', subjects: ['Physics'], active: true },
  { id: 't3', name: 'Himanshu Sir', code: 'PHK', subjects: ['Physics'], active: true },
  { id: 't4', name: 'Vishal Sir', code: 'MVG', subjects: ['Maths'], active: true },
  { id: 't5', name: 'Aniket', code: 'CAR', subjects: ['Chemistry'], active: true },
  { id: 't6', name: 'Abodh Sir', code: 'PAK', subjects: ['Physics'], active: true },
  { id: 't7', name: 'Shruti Maam', code: 'BSA', subjects: ['Biology'], active: true },
  { id: 't8', name: 'Vijaya Maam', code: 'VM', subjects: ['English', 'Hindi', 'Sanskrit'], active: true },
  { id: 't9', name: 'Devesh Sir', code: 'MDK', subjects: ['Maths'], active: true },
  { id: 't10', name: 'Siddhart Sir', code: 'SSM', subjects: ['Biology'], active: true },
];

const allDays: DayOfWeek[] = [...DAYS];

export const defaultBatches: Batch[] = [
  // Junior - CBSE+ (evening batches)
  { id: 'b1', name: 'class-6', displayName: 'Class 6', category: 'Junior', subjects: ['Biology', 'English', 'Maths', 'SST', 'Science', 'Hindi', 'Sanskrit'], defaultRoom: 'R1', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b2', name: 'class-7', displayName: 'Class 7', category: 'Junior', subjects: ['Biology', 'English', 'Maths', 'SST', 'Science', 'Hindi', 'Sanskrit'], defaultRoom: 'R2', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b3', name: 'class-8-cbse', displayName: 'Class 8 (CBSE)', category: 'Junior', subjects: ['Biology', 'English', 'Maths', 'SST', 'Science', 'Hindi', 'Sanskrit'], defaultRoom: 'R3', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b4', name: 'aarambh', displayName: 'Aarambh (8)', category: 'Junior', subjects: ['Biology', 'Maths', 'SST', 'Science'], defaultRoom: 'R3', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b5', name: 'class-9-cbse', displayName: 'Class 9 (CBSE)', category: 'Junior', subjects: ['Biology', 'English', 'Maths', 'SST', 'Science', 'Hindi', 'Sanskrit'], defaultRoom: 'R4', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b6', name: 'arpan', displayName: 'Arpan (9)', category: 'Junior', subjects: ['Biology', 'Chemistry', 'Maths', 'Physics', 'Science'], defaultRoom: 'R4', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b7', name: 'aryabhatt', displayName: 'Aryabhatt', category: 'Junior', subjects: ['Biology', 'Chemistry', 'Maths', 'Physics'], defaultRoom: 'R5', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b8', name: 'class-10-cbse', displayName: 'Class 10 (CBSE)', category: 'Junior', subjects: ['Biology', 'English', 'Maths', 'SST', 'Science', 'Hindi', 'Sanskrit'], defaultRoom: 'R5', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b9', name: 'aarohan', displayName: 'Aarohan', category: 'Junior', subjects: ['Biology', 'Chemistry', 'Maths', 'Physics'], defaultRoom: 'R5', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  { id: 'b10', name: 'ramanujhan', displayName: 'Ramanujhan', category: 'Junior', subjects: ['Biology', 'Chemistry', 'Maths', 'Physics'], defaultRoom: 'R6', slotSession: 'Evening', scheduleDays: allDays, priority: 10, active: true, locked: false },
  // JEE (evening batches)
  { id: 'b11', name: 'samarpan-11a', displayName: 'Samarpan (11 ENGG-A)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R6', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  { id: 'b12', name: 'samarthya-11b', displayName: 'Samarthya (11B)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R7', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  { id: 'b13', name: 'kailasha', displayName: 'Kailasha (Class 11)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R1', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  { id: 'b14', name: 'r-batch-12', displayName: 'R-Batch (12 ENGG)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R1', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  { id: 'b15', name: 'udaan', displayName: 'Udaan', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R3', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  // NEET (evening batches)
  { id: 'b17', name: 'samriddhi', displayName: 'Samriddhi (11 NEET)', category: 'NEET', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R7', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  { id: 'b18', name: 'umang', displayName: 'Umang (12 NEET)', category: 'NEET', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R8', slotSession: 'Evening', scheduleDays: allDays, priority: 5, active: true, locked: false },
  // Droppers (morning batches)
  { id: 'b19', name: 'tejas', displayName: 'Tejas 2026 (Passout ENGG)', category: 'Droppers', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R1', slotSession: 'Morning', scheduleDays: allDays, priority: 1, active: true, locked: false },
  { id: 'b20', name: 'prayass', displayName: 'Prayass 2026 (Passout NEET)', category: 'Droppers', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R2', slotSession: 'Morning', scheduleDays: allDays, priority: 1, active: true, locked: false },
];

export const defaultRooms: Room[] = [
  { id: 'R1', name: 'Room 01', active: true },
  { id: 'R2', name: 'Room 02', active: true },
  { id: 'R3', name: 'Room 03', active: true },
  { id: 'R4', name: 'Room 04', active: true },
  { id: 'R5', name: 'Room 05', active: true },
  { id: 'R6', name: 'Room 06', active: true },
  { id: 'R7', name: 'Room 07', active: true },
  { id: 'R8', name: 'Room 08', active: true },
  { id: 'R9', name: 'Room 09', active: true },
];

// Distribution templates by category
export const categoryDistributions: Record<string, { subject: Subject; percentage: number }[]> = {
  'CBSE': [
    { subject: 'Biology', percentage: 11 },
    { subject: 'English', percentage: 11 },
    { subject: 'Maths', percentage: 33 },
    { subject: 'SST', percentage: 22 },
    { subject: 'Science', percentage: 22 },
  ],
  'SPA_JR_8': [
    { subject: 'Biology', percentage: 11 },
    { subject: 'Maths', percentage: 44 },
    { subject: 'SST', percentage: 11 },
    { subject: 'Science', percentage: 33 },
  ],
  'SPA_JR_9_10': [
    { subject: 'Biology', percentage: 22 },
    { subject: 'Chemistry', percentage: 11 },
    { subject: 'Maths', percentage: 44 },
    { subject: 'Physics', percentage: 11 },
    { subject: 'Science', percentage: 11 },
  ],
  'JEE': [
    { subject: 'Physics', percentage: 33 },
    { subject: 'Chemistry', percentage: 33 },
    { subject: 'Maths', percentage: 33 },
  ],
  'NEET': [
    { subject: 'Biology', percentage: 40 },
    { subject: 'Chemistry', percentage: 30 },
    { subject: 'Physics', percentage: 30 },
  ],
};

export const subjectsByCategory: Record<string, Subject[]> = {
  JEE: ['Physics', 'Chemistry', 'Maths'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
  Junior: ['Biology', 'Chemistry', 'Maths', 'Physics', 'English', 'Hindi', 'Sanskrit', 'SST', 'Science'],
  Droppers: ['Physics', 'Chemistry', 'Maths', 'Biology'],
};
