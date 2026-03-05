export interface User {
  id: string;
  email: string;
  full_name: string;
  role:
    | "system_admin"
    | "school_admin"
    | "teacher"
    | "bursar"
    | "nurse"
    | "librarian";
  school_id: string;
  is_active: boolean;
}

export interface School {
  id: string;
  name: string;
  type: "ECCE" | "Primary" | "Secondary" | "Combined";
  address: string;
  country: string;
  region: string;
  contact_email: string;
  phone: string;
}

// I need to create crud functionalities for class management in a school
export interface Class {
  id: string;
  school_id: string;
  name: string;
  level: string;
  teacher_id: string;
  year: number;
  term: "Term1" | "Term2" | "Term3";
}

export interface Student {
  id: string;
  school_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  lin?: string;
  photo_url?: string;
  home_address?: string;
  guardian_contact?: Record<string, unknown>;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  level: string;
  is_compulsory: boolean;
  papers: number;
}

export interface Assessment {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  assessment_type:
    | "CA"
    | "Exam"
    | "Project"
    | "Observation"
    | "Paper1"
    | "Paper2"
    | "Paper3"
    | "Paper4";
  max_marks: number;
  date: string;
  term: "Term1" | "Term2" | "Term3";
  year: number;
}

export interface Mark {
  id: string;
  assessment_id: string;
  student_id: string;
  marks_obtained: number;
  graded_code?: number;
  grade?: string;
  teacher_comment?: string;
  entered_by: string;
  entered_at: string;
}

export interface OfflineMark {
  id: string;
  assessment_id: string;
  student_id: string;
  marks_obtained: number;
  teacher_comment?: string;
  status: "pending" | "syncing" | "synced" | "conflict";
  created_at: number;
  updated_at: number;
}

export interface ReportCard {
  id: string;
  student_id: string;
  class_id: string;
  term: "Term1" | "Term2" | "Term3";
  year: number;
  pdf_url?: string;
  status: "generated" | "pending" | "failed";
  generated_at?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  tokens: TokenPair;
  user: User;
}