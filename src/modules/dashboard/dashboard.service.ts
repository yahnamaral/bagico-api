import type { Organization, OrganizationMember } from "../../../generated/prisma/client";
import { getBillingPlan } from "../../shared/billing/plans";
import { planHasFeature } from "../../shared/billing/features";
import { AppError } from "../../shared/errors/AppError";
import type { Permission } from "../../shared/permissions/permissions";
import {
  getRolePermissions,
  roleHasPermission,
} from "../../shared/permissions/permissions";
import { ProfitHunterService } from "../financial/profit-hunter.service";
import { ProfitHunterRepository } from "../financial/profit-hunter.repository";
import { MemberCostRateRepository } from "../financial/member-cost-rate.repository";
import { RevenueContractRepository } from "../financial/revenue-contract.repository";
import { TimeEntryRepository } from "../time-tracking/time-entry.repository";
import type { DashboardRepository, DashboardPeriod } from "./dashboard.repository";
import type { DashboardSummaryQuery } from "./dashboard.schemas";

const DASHBOARD_VIEW_PERMISSIONS: Permission[] = [
  "view_clients",
  "view_projects",
  "view_tasks",
  "view_financial",
];

type DashboardAlert = {
  type: string;
  severity: "INFO" | "WARNING" | "DANGER";
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

type QuickAction = {
  label: string;
  href: string;
};

function getCurrentMonthPeriod(): DashboardPeriod {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { startDate, endDate };
}

function resolvePeriod(query: DashboardSummaryQuery): DashboardPeriod {
  if (query.startDate && query.endDate) {
    return { startDate: query.startDate, endDate: query.endDate };
  }

  if (query.startDate) {
    return { startDate: query.startDate, endDate: new Date() };
  }

  return getCurrentMonthPeriod();
}

function roundHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly timeEntryRepository: TimeEntryRepository,
    private readonly profitHunterService: ProfitHunterService,
  ) {}

  private ensureDashboardAccess(member: OrganizationMember) {
    const allowed = DASHBOARD_VIEW_PERMISSIONS.some((permission) =>
      roleHasPermission(member.role, permission),
    );

    if (!allowed) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private buildQuickActions(
    permissions: readonly Permission[],
    plan: Organization["plan"],
  ): QuickAction[] {
    const actions: QuickAction[] = [];

    if (permissions.includes("manage_clients") && planHasFeature(plan, "clients")) {
      actions.push({ label: "Novo cliente", href: "/clients" });
    }

    if (
      permissions.includes("manage_projects") &&
      planHasFeature(plan, "projects")
    ) {
      actions.push({ label: "Novo projeto", href: "/projects" });
    }

    if (permissions.includes("view_boards") && planHasFeature(plan, "kanban")) {
      actions.push({ label: "Abrir Kanban", href: "/boards" });
    }

    if (permissions.includes("view_tasks")) {
      actions.push({
        label: "Ver aprovações",
        href: "/portal/tasks",
      });
    }

    if (
      permissions.includes("view_financial") &&
      (planHasFeature(plan, "profit_hunter") ||
        planHasFeature(plan, "financial"))
    ) {
      actions.push({
        label: "Ver Profit Hunter",
        href: "/financial/profit-hunter",
      });
    }

    if (permissions.includes("use_ai") && planHasFeature(plan, "ai")) {
      actions.push({ label: "Ver BagiAI", href: "/ai" });
    }

    return actions;
  }

  private buildPlanLimitAlerts(
    plan: Organization["plan"],
    counts: {
      totalClients: number;
      totalProjects: number;
      totalMembers: number;
    },
  ): DashboardAlert[] {
    const limits = getBillingPlan(plan).limits;
    const alerts: DashboardAlert[] = [];
    const threshold = 0.8;

    if (limits.maxClients && counts.totalClients >= limits.maxClients * threshold) {
      alerts.push({
        type: "PLAN_LIMIT_WARNING",
        severity:
          counts.totalClients >= limits.maxClients ? "DANGER" : "WARNING",
        title: "Limite de clientes",
        message: `Você está usando ${counts.totalClients} de ${limits.maxClients} clientes do plano.`,
        actionLabel: "Ver planos",
        actionHref: "/settings/billing",
      });
    }

    if (
      limits.maxProjects &&
      counts.totalProjects >= limits.maxProjects * threshold
    ) {
      alerts.push({
        type: "PLAN_LIMIT_WARNING",
        severity:
          counts.totalProjects >= limits.maxProjects ? "DANGER" : "WARNING",
        title: "Limite de projetos",
        message: `Você está usando ${counts.totalProjects} de ${limits.maxProjects} projetos do plano.`,
        actionLabel: "Ver planos",
        actionHref: "/settings/billing",
      });
    }

    if (limits.maxUsers && counts.totalMembers >= limits.maxUsers * threshold) {
      alerts.push({
        type: "PLAN_LIMIT_WARNING",
        severity: counts.totalMembers >= limits.maxUsers ? "DANGER" : "WARNING",
        title: "Limite de usuários",
        message: `Você está usando ${counts.totalMembers} de ${limits.maxUsers} usuários do plano.`,
        actionLabel: "Ver planos",
        actionHref: "/settings/billing",
      });
    }

    return alerts;
  }

  async getSummary(
    organization: Organization,
    member: OrganizationMember,
    userId: string,
    query: DashboardSummaryQuery,
  ) {
    this.ensureDashboardAccess(member);

    const permissions = getRolePermissions(member.role);
    const period = resolvePeriod(query);
    const now = new Date();
    const organizationId = organization.id;

    const canViewClients = permissions.includes("view_clients");
    const canViewProjects = permissions.includes("view_projects");
    const canViewTasks = permissions.includes("view_tasks");
    const canViewFinancial = permissions.includes("view_financial");

    const hasTimeTracking = planHasFeature(organization.plan, "time_tracking");
    const hasFinancial =
      canViewFinancial &&
      (planHasFeature(organization.plan, "profit_hunter") ||
        planHasFeature(organization.plan, "financial"));

    const [
      totalClients,
      activeClients,
      totalProjects,
      activeProjects,
      openTasks,
      overdueTasksCount,
      pendingApprovals,
      approvedThisMonth,
      changesRequested,
      totalMembers,
    ] = await Promise.all([
      canViewClients
        ? this.repository.countClients(organizationId)
        : Promise.resolve(0),
      canViewClients
        ? this.repository.countActiveClients(organizationId)
        : Promise.resolve(0),
      canViewProjects
        ? this.repository.countProjects(organizationId)
        : Promise.resolve(0),
      canViewProjects
        ? this.repository.countActiveProjects(organizationId)
        : Promise.resolve(0),
      canViewTasks
        ? this.repository.countOpenTasks(organizationId)
        : Promise.resolve(0),
      canViewTasks
        ? this.repository.countOverdueTasks(organizationId, now)
        : Promise.resolve(0),
      canViewTasks
        ? this.repository.countPendingApprovals(organizationId)
        : Promise.resolve(0),
      canViewTasks
        ? this.repository.countApprovedInPeriod(organizationId, period)
        : Promise.resolve(0),
      canViewTasks
        ? this.repository.countChangesRequested(organizationId)
        : Promise.resolve(0),
      this.repository.countOrganizationMembers(organizationId),
    ]);

    const taskListsPromise = canViewTasks
      ? Promise.all([
          this.repository.findOverdueTasks(organizationId, now),
          this.repository.findDueSoonTasks(organizationId, now),
          this.repository.findPendingApprovalTasks(organizationId),
          this.repository.findRecentlyUpdatedTasks(organizationId),
        ])
      : Promise.resolve([[], [], [], []] as const);

    const timeTrackingPromise = hasTimeTracking
      ? Promise.all([
          this.repository.sumTrackedMinutesInPeriod(organizationId, period),
          this.timeEntryRepository.findRunningEntry(organizationId, userId),
          this.repository.topTrackedTasksInPeriod(organizationId, period),
        ])
      : Promise.resolve([{ _sum: { durationMinutes: null } }, null, []] as const);

    const financialPromise = hasFinancial
      ? this.profitHunterService.getOverview(organizationId, {
          startDate: period.startDate,
          endDate: period.endDate,
        })
      : Promise.resolve(null);

    const [[overdue, dueSoon, pendingApproval, recentlyUpdated], timeData, financialOverview] =
      await Promise.all([taskListsPromise, timeTrackingPromise, financialPromise]);

    const [trackedAggregate, runningTimer, topTrackedTasks] = timeData;
    const totalTrackedMinutes = hasTimeTracking
      ? trackedAggregate._sum.durationMinutes ?? 0
      : 0;
    const totalTrackedHours = roundHours(totalTrackedMinutes);

    const financial = hasFinancial && financialOverview
      ? {
          available: true,
          totalRevenue: financialOverview.totalRevenue,
          totalCost: financialOverview.totalCost,
          grossProfit: financialOverview.grossProfit,
          marginPercent: financialOverview.marginPercent,
          alerts: financialOverview.alerts.map((alert) => ({
            type: alert.code,
            clerkUserId: alert.clerkUserId,
            message: alert.message,
          })),
        }
      : {
          available: false,
          totalRevenue: null,
          totalCost: null,
          grossProfit: null,
          marginPercent: null,
          alerts: [],
        };

    const timeTracking = hasTimeTracking
      ? {
          available: true,
          totalMinutes: totalTrackedMinutes,
          totalHours: totalTrackedHours,
          runningTimer,
          topTrackedTasks,
        }
      : {
          available: false,
          totalMinutes: 0,
          totalHours: 0,
          runningTimer: null,
          topTrackedTasks: [],
        };

    const alerts: DashboardAlert[] = [];

    if (canViewTasks && overdueTasksCount > 0) {
      alerts.push({
        type: "OVERDUE_TASKS",
        severity: overdueTasksCount >= 5 ? "DANGER" : "WARNING",
        title: "Tarefas atrasadas",
        message: `${overdueTasksCount} tarefa(s) estão com prazo vencido.`,
        actionLabel: "Ver tarefas",
        actionHref: "/boards",
      });
    }

    if (canViewTasks && pendingApprovals > 0) {
      alerts.push({
        type: "PENDING_APPROVALS",
        severity: "WARNING",
        title: "Aprovações pendentes",
        message: `${pendingApprovals} tarefa(s) aguardam aprovação.`,
        actionLabel: "Ver aprovações",
        actionHref: "/portal/tasks",
      });
    }

    if (
      financial.available &&
      financial.marginPercent != null &&
      financial.marginPercent < 15
    ) {
      alerts.push({
        type: "LOW_MARGIN",
        severity: financial.marginPercent < 0 ? "DANGER" : "WARNING",
        title: "Margem baixa",
        message: `A margem do período está em ${financial.marginPercent}%.`,
        actionLabel: "Ver Profit Hunter",
        actionHref: "/financial/profit-hunter",
      });
    }

    if (financial.available) {
      for (const alert of financial.alerts) {
        if (alert.type === "MISSING_COST_RATE") {
          alerts.push({
            type: "MISSING_COST_RATES",
            severity: "WARNING",
            title: "Custo/hora ausente",
            message: alert.message,
            actionLabel: "Configurar custos",
            actionHref: "/financial/member-cost-rates",
          });
        }
      }
    }

    alerts.push(
      ...this.buildPlanLimitAlerts(organization.plan, {
        totalClients,
        totalProjects,
        totalMembers,
      }),
    );

    const quickActions = this.buildQuickActions(permissions, organization.plan);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
      },
      metrics: {
        totalClients,
        activeClients,
        totalProjects,
        activeProjects,
        openTasks,
        overdueTasks: overdueTasksCount,
        pendingApprovals,
        approvedThisMonth,
        changesRequested,
        totalTrackedMinutes: hasTimeTracking ? totalTrackedMinutes : 0,
        totalTrackedHours: hasTimeTracking ? totalTrackedHours : 0,
        totalRevenue: financial.available ? financial.totalRevenue : null,
        totalCost: financial.available ? financial.totalCost : null,
        grossProfit: financial.available ? financial.grossProfit : null,
        marginPercent: financial.available ? financial.marginPercent : null,
      },
      tasks: canViewTasks
        ? {
            overdue,
            dueSoon,
            pendingApproval,
            recentlyUpdated,
          }
        : {
            overdue: [],
            dueSoon: [],
            pendingApproval: [],
            recentlyUpdated: [],
          },
      financial,
      timeTracking,
      alerts,
      quickActions,
    };
  }
}
