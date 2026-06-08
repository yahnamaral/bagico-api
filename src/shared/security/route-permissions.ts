/**
 * Matriz interna de autorização por rota.
 * Todas as rotas privadas exigem requireAuth + requireOrganizationMember,
 * salvo quando indicado o contrário.
 */
export const ROUTE_PERMISSIONS = {
  auth: {
    "GET /me": { auth: true, org: false },
    "GET /me/permissions": { auth: true, org: true },
  },
  organizations: {
    "POST /organizations/sync": { auth: true, org: false },
    "GET /organizations/current": { auth: true, org: false },
  },
  members: {
    "GET /members": { permissions: ["view_members"] },
    "PATCH /members/:memberId/role": { permissions: ["manage_members"] },
    "DELETE /members/:memberId": { permissions: ["manage_members"] },
    "POST /members/invites": { permissions: ["manage_members"] },
    "GET /members/invites": { permissions: ["view_members"] },
    "POST /members/invites/:inviteId/resend": { permissions: ["manage_members"] },
    "POST /members/invites/:inviteId/revoke": { permissions: ["manage_members"] },
    "GET /members/invites/validate": { public: true },
    "POST /members/invites/accept": { auth: true, org: false },
  },
  clients: {
    "GET /clients": { permissions: ["view_clients"], features: ["clients"] },
    "POST /clients": { permissions: ["manage_clients"], features: ["clients"] },
    "GET /clients/:id": { permissions: ["view_clients"], features: ["clients"] },
    "PATCH /clients/:id": { permissions: ["manage_clients"], features: ["clients"] },
    "DELETE /clients/:id": { permissions: ["manage_clients"], features: ["clients"] },
  },
  projects: {
    "GET /projects": { permissions: ["view_projects"], features: ["projects"] },
    "POST /projects": { permissions: ["manage_projects"], features: ["projects"] },
    "GET /projects/:id": { permissions: ["view_projects"], features: ["projects"] },
    "PATCH /projects/:id": { permissions: ["manage_projects"], features: ["projects"] },
    "DELETE /projects/:id": { permissions: ["manage_projects"], features: ["projects"] },
  },
  boards: {
    "GET /boards": { permissions: ["view_boards"], features: ["kanban"] },
    "POST /boards": { permissions: ["manage_boards"], features: ["kanban"] },
    "GET /boards/:id": { permissions: ["view_boards"], features: ["kanban"] },
    "PATCH /boards/:id": { permissions: ["manage_boards"], features: ["kanban"] },
    "DELETE /boards/:id": { permissions: ["manage_boards"], features: ["kanban"] },
  },
  tasks: {
    "GET /tasks": { permissions: ["view_tasks"], features: ["kanban"] },
    "POST /tasks": { permissions: ["manage_tasks"], features: ["kanban"] },
    "POST /tasks/:id/request-approval": { permissions: ["manage_tasks"], features: ["kanban"] },
    "POST /tasks/:id/approve": { permissions: ["approve_tasks"], features: ["kanban"] },
    "POST /tasks/:id/request-changes": { permissions: ["approve_tasks"], features: ["kanban"] },
  },
  comments: {
    "GET /tasks/:taskId/comments": {
      permissionsAny: ["comment_tasks", "view_tasks"],
      features: ["kanban"],
    },
    "POST /tasks/:taskId/comments": { permissions: ["comment_tasks"], features: ["kanban"] },
  },
  files: {
    "GET /tasks/:taskId/files": { permissions: ["view_tasks"], features: ["kanban"] },
    "POST /tasks/:taskId/files": { permissions: ["manage_tasks"], features: ["kanban"] },
  },
  portal: {
    "GET /portal/*": { permissions: ["access_portal"], features: ["client_portal"] },
    "POST /portal/tasks/:id/approve": {
      permissions: ["approve_tasks"],
      features: ["client_portal"],
    },
    "POST /portal/tasks/:id/request-changes": {
      permissions: ["approve_tasks"],
      features: ["client_portal"],
    },
  },
  financial: {
    "GET /financial/*": {
      permissions: ["view_financial"],
      featuresAny: ["profit_hunter", "financial"],
    },
    "POST /financial/*": { permissions: ["manage_financial"] },
    "PATCH /financial/*": { permissions: ["manage_financial"] },
    "DELETE /financial/*": { permissions: ["manage_financial"] },
  },
  ai: {
    "POST /ai/*": { permissions: ["use_ai"], features: ["ai"] },
    "GET /ai/history": { permissions: ["use_ai"], features: ["ai"] },
  },
  billing: {
    "GET /billing/plans": { public: true },
    "GET /billing/current": { auth: true, org: true },
    "PATCH /billing/current-plan": { permissions: ["manage_billing"] },
  },
  notifications: {
    "GET /notifications": { auth: true, org: true, scope: "recipient-only" },
    "PATCH /notifications/:id/read": { auth: true, org: true, scope: "recipient-only" },
  },
  dashboard: {
    "GET /dashboard/summary": { auth: true, org: true },
  },
} as const;
