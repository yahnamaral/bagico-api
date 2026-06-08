import { OrganizationRole } from "./roles";

export const PERMISSIONS = [
  "manage_members",
  "view_members",
  "manage_clients",
  "view_clients",
  "manage_projects",
  "view_projects",
  "manage_boards",
  "view_boards",
  "manage_tasks",
  "view_tasks",
  "comment_tasks",
  "approve_tasks",
  "track_time",
  "view_time_entries",
  "view_financial",
  "manage_financial",
  "use_ai",
  "access_portal",
  "manage_portal",
  "manage_billing",
  "manage_settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS;

const AGENCY_MANAGER_PERMISSIONS: readonly Permission[] = [
  "manage_members",
  "view_members",
  "manage_clients",
  "view_clients",
  "manage_projects",
  "view_projects",
  "manage_boards",
  "view_boards",
  "manage_tasks",
  "view_tasks",
  "comment_tasks",
  "approve_tasks",
  "track_time",
  "view_time_entries",
  "use_ai",
  "access_portal",
  "manage_portal",
];

const AGENCY_MAKER_PERMISSIONS: readonly Permission[] = [
  "view_clients",
  "view_projects",
  "view_boards",
  "manage_tasks",
  "view_tasks",
  "comment_tasks",
  "track_time",
  "view_time_entries",
];

const FREELANCER_PERMISSIONS: readonly Permission[] = [
  "view_tasks",
  "comment_tasks",
  "track_time",
];

const CLIENT_ADMIN_PERMISSIONS: readonly Permission[] = [
  "access_portal",
  "manage_portal",
  "approve_tasks",
  "view_tasks",
  "comment_tasks",
];

const CLIENT_MANAGER_PERMISSIONS: readonly Permission[] = [
  "access_portal",
  "comment_tasks",
  "approve_tasks",
  "view_tasks",
];

const CLIENT_STAFF_PERMISSIONS: readonly Permission[] = [
  "access_portal",
  "view_tasks",
  "comment_tasks",
];

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly Permission[]> = {
  [OrganizationRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [OrganizationRole.AGENCY_OWNER]: ALL_PERMISSIONS,
  [OrganizationRole.AGENCY_MANAGER]: AGENCY_MANAGER_PERMISSIONS,
  [OrganizationRole.AGENCY_MAKER]: AGENCY_MAKER_PERMISSIONS,
  [OrganizationRole.FREELANCER]: FREELANCER_PERMISSIONS,
  [OrganizationRole.CLIENT_ADMIN]: CLIENT_ADMIN_PERMISSIONS,
  [OrganizationRole.CLIENT_MANAGER]: CLIENT_MANAGER_PERMISSIONS,
  [OrganizationRole.CLIENT_STAFF]: CLIENT_STAFF_PERMISSIONS,
};

export function getRolePermissions(role: OrganizationRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(
  role: OrganizationRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
