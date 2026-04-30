export type Role = "admin" | "member";
export type Status = "approved" | "banned";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: Role;
  status: Status;
  created_at: string;
  updated_at: string;
  banned_at: string | null;
  banned_by: string | null;
};
