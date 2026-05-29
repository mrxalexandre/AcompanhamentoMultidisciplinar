export type Role = 'admin' | 'professor' | 'psychologist' | 'psychopedagogue' | 'speech_therapist' | 'parent';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: Role;
    studentId?: string; // Optional for parents
    canExportCsv?: boolean;
    canViewDashboard?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface Student {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
}

export interface ProfessorRecord {
    id: string;
    studentId: string;
    professorId: string;
    discipline: string;
    concentration: string;
    focus: string;
    wait: string;
    organization: string;
    conclusion: string;
    mood: string;
    additionalObservations: string;
    createdAt: number;
}

export interface ProfessionalRecord {
    id: string;
    studentId: string;
    professionalId: string;
    professionalRole: string;
    text: string;
    createdAt: number;
}

export interface Message {
    id: string;
    studentId: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: number;
    isRead?: boolean;
}
