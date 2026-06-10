export type UserRole = 'user' | 'admin' | 'moderator' | 'counselor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  university?: string;
  academicYear?: string;
  avatarUrl?: string;
  role: string;
}
