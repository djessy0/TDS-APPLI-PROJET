export type Entity = 'Siège' | 'MR-MGA' | 'MR-TTA';
export type Role = 'admin' | 'user' | 'secretary';

export interface TDSValidation {
  id: number;
  entity: Entity;
  week_str: string;
  mr_chef_validated: boolean;
  dt_chef_validated: boolean;
  mr_validation_date?: string;
  dt_validation_date?: string;
  mr_signature?: string;
  dt_signature?: string;
}

export interface User {
  id: number;
  trigram: string;
  firstname: string;
  lastname: string;
  role: Role;
  entity: Entity;
  professional_num?: string;
  mobile_num?: string;
  email?: string;
  address?: string;
  comment?: string;
  first_login: boolean;
  olaf_link?: string;
  birth_date?: string;
  corps?: string;
  profil?: string;
  licence_num?: string;
  ae_issue_date?: string;
  ae_expiry_date?: string;
  he_expiry_date?: string;
  he_training_date?: string;
  safety_badge_num?: string;
  safety_badge_expiry_date?: string;
  zcp_expiry_date?: string;
  english_test_date?: string;
  english_level?: string;
  english_next_test_date?: string;
  display_order: number;
  off_day?: string;
  tlt_day?: string;
  logId?: number;
}

export type Status = 
  | 'SEC' | 'OFF' | 'CA' | 'FOR' | 'RIT' | 'MIS' | 'TLT' | 'ABS' | 'PER'
  | 'TRV' | 'ASE' | 'PRE' | 'AE'
  | 'Q' | 'S' | 'W' | 'A' | 'F' | 'C' | 'I' | 'M';

export interface TDSEntry {
  id: number;
  user_id: number;
  trigram: string;
  date: string;
  status: any;
  comment?: string;
  is_sandbox: boolean;
  border_color?: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved_chef' | 'approved_dt' | 'rejected';
  type: string;
}

export interface MarqueeMessage {
  id: number;
  content: string;
  start_date: string;
  end_date: string;
  entities: string; // Comma-separated list or 'All'
  admin_only?: number;
}

export interface ConnectionLog {
  id: number;
  trigram: string;
  login_time: string;
  logout_time?: string;
  duration?: number; // in seconds
  ip_address?: string;
  action?: string;
}
