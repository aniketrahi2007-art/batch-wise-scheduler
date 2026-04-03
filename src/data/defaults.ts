import { Teacher, Batch, Room, Subject } from '@/types/timetable';

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

export const defaultBatches: Batch[] = [
  // Junior
  { id: 'b1', name: 'class-6', displayName: 'Class 6', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R1', active: true, locked: false },
  { id: 'b2', name: 'class-7', displayName: 'Class 7', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R2', active: true, locked: false },
  { id: 'b3', name: 'class-8-cbse', displayName: 'Class 8 (CBSE)', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R3', active: true, locked: false },
  { id: 'b4', name: 'aarambh', displayName: 'Class 8 (Aarambh)', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R3', active: true, locked: false },
  { id: 'b5', name: 'class-9-cbse', displayName: 'Class 9 (CBSE)', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R4', active: true, locked: false },
  { id: 'b6', name: 'arpan', displayName: 'Class 9 (Arpan)', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R4', active: true, locked: false },
  { id: 'b7', name: 'aryabhatt', displayName: 'Aryabhatt', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology'], defaultRoom: 'R5', active: true, locked: false },
  { id: 'b8', name: 'class-10-cbse', displayName: 'Class 10 (CBSE)', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'], defaultRoom: 'R5', active: true, locked: false },
  { id: 'b9', name: 'aarohan', displayName: 'Aarohan', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology'], defaultRoom: 'R5', active: true, locked: false },
  { id: 'b10', name: 'ramanujhan', displayName: 'Ramanujhan', category: 'Junior', subjects: ['Physics', 'Chemistry', 'Maths', 'Biology'], defaultRoom: 'R6', active: true, locked: false },
  // JEE
  { id: 'b11', name: 'samarpan-11a', displayName: '11A (Samarpan)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R6', active: true, locked: false },
  { id: 'b12', name: 'samarthya-11b', displayName: '11B (Samarthya)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R7', active: true, locked: false },
  { id: 'b13', name: 'kailasha', displayName: 'Kailasha', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R7', active: true, locked: false },
  { id: 'b14', name: 'r-batch-11', displayName: 'R-batch (11)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R8', active: true, locked: false },
  { id: 'b15', name: 'udaan', displayName: 'Udaan (12)', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R8', active: true, locked: false },
  { id: 'b16', name: 'r-batch-12', displayName: '12 R-batch', category: 'JEE', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R8', active: true, locked: false },
  // NEET
  { id: 'b17', name: 'samriddhi', displayName: 'Samriddhi (11)', category: 'NEET', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R9', active: true, locked: false },
  { id: 'b18', name: 'umang', displayName: 'Umang (12)', category: 'NEET', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R9', active: true, locked: false },
  // Droppers
  { id: 'b19', name: 'tejas', displayName: 'Tejas (JEE)', category: 'Droppers', subjects: ['Physics', 'Chemistry', 'Maths'], defaultRoom: 'R1', active: true, locked: false },
  { id: 'b20', name: 'prayass', displayName: 'Prayass (NEET)', category: 'Droppers', subjects: ['Physics', 'Chemistry', 'Biology'], defaultRoom: 'R2', active: true, locked: false },
];

export const defaultRooms: Room[] = [
  { id: 'R1', name: 'Room 1', active: true },
  { id: 'R2', name: 'Room 2', active: true },
  { id: 'R3', name: 'Room 3', active: true },
  { id: 'R4', name: 'Room 4', active: true },
  { id: 'R5', name: 'Room 5', active: true },
  { id: 'R6', name: 'Room 6', active: true },
  { id: 'R7', name: 'Room 7', active: true },
  { id: 'R8', name: 'Room 8', active: true },
  { id: 'R9', name: 'Room 9', active: true },
];

export const subjectsByCategory: Record<string, Subject[]> = {
  JEE: ['Physics', 'Chemistry', 'Maths'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
  Junior: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Hindi', 'Sanskrit'],
  Droppers: ['Physics', 'Chemistry', 'Maths', 'Biology'], // depends on JEE/NEET
};
