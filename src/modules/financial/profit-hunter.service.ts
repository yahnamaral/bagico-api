import { AppError } from "../../shared/errors/AppError";
import {
  buildFinancialSummary,
  calculateContractRevenueMvp,
  calculateTimeEntryCost,
  type DateRangeFilter,
  roundMoney,
} from "./financial.helpers";
import type { MemberCostRateRepository } from "./member-cost-rate.repository";
import { serializeRevenueContract } from "./revenue-contract.repository";
import type { RevenueContractRepository } from "./revenue-contract.repository";
import type { ProfitHunterRepository } from "./profit-hunter.repository";
import type {
  ProfitHunterDateRangeQuery,
  ProfitHunterProjectsQuery,
} from "./profit-hunter.schemas";

type EntryCostRow = {
  taskId: string;
  clientId: string;
  projectId: string;
  clerkUserId: string;
  durationMinutes: number;
  cost: number;
  missingCostRate: boolean;
};

export class ProfitHunterService {
  constructor(
    private readonly repository: ProfitHunterRepository,
    private readonly costRateRepository: MemberCostRateRepository,
    private readonly contractRepository: RevenueContractRepository,
  ) {}

  private toDateRange(query: ProfitHunterDateRangeQuery): DateRangeFilter {
    return {
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  private async buildEntryCosts(
    organizationId: string,
    range: DateRangeFilter,
  ) {
    const [entries, rates] = await Promise.all([
      this.repository.findStoppedTimeEntries(organizationId, range),
      this.costRateRepository.findAllActive(organizationId),
    ]);

    const rows: EntryCostRow[] = entries.map((entry) => {
      const { cost, missingCostRate } = calculateTimeEntryCost(entry, rates);

      return {
        taskId: entry.taskId,
        clientId: entry.clientId,
        projectId: entry.projectId,
        clerkUserId: entry.clerkUserId,
        durationMinutes: entry.durationMinutes ?? 0,
        cost,
        missingCostRate,
      };
    });

    const missingCostRates = [
      ...new Set(
        rows.filter((row) => row.missingCostRate).map((row) => row.clerkUserId),
      ),
    ];

    return { rows, missingCostRates, trackedMinutes: rows.reduce((s, r) => s + r.durationMinutes, 0) };
  }

  private calculateClientRevenueMvp(
    contracts: Awaited<ReturnType<RevenueContractRepository["findActiveContracts"]>>,
    range: DateRangeFilter,
    clientId: string,
    clientTrackedHours: number,
  ) {
    return contracts
      .filter((contract) => contract.clientId === clientId)
      .reduce((sum, contract) => {
        if (contract.projectId && contract.type !== "RECURRING") {
          return sum;
        }

        const hours =
          contract.type === "HOURLY" ? clientTrackedHours : 0;

        return sum + calculateContractRevenueMvp(contract, range, hours);
      }, 0);
  }

  private calculateProjectRevenueMvp(
    contracts: Awaited<ReturnType<RevenueContractRepository["findActiveContracts"]>>,
    range: DateRangeFilter,
    projectId: string,
    projectTrackedHours: number,
  ) {
    return contracts
      .filter(
        (contract) =>
          contract.projectId === projectId ||
          (contract.clientId &&
            !contract.projectId &&
            contract.type === "RECURRING"),
      )
      .reduce((sum, contract) => {
        if (contract.projectId !== projectId) {
          return sum;
        }

        const hours =
          contract.type === "HOURLY" ? projectTrackedHours : 0;

        return sum + calculateContractRevenueMvp(contract, range, hours);
      }, 0);
  }

  async getOverview(organizationId: string, query: ProfitHunterDateRangeQuery) {
    const range = this.toDateRange(query);
    const { rows, missingCostRates, trackedMinutes } =
      await this.buildEntryCosts(organizationId, range);

    const contracts =
      await this.contractRepository.findActiveContracts(organizationId);

    const totalCost = roundMoney(rows.reduce((sum, row) => sum + row.cost, 0));
    const trackedHours = roundMoney(trackedMinutes / 60);

    const totalRevenue = roundMoney(
      contracts.reduce((sum, contract) => {
        const contractHours =
          contract.type === "HOURLY"
            ? rows
                .filter((row) =>
                  contract.projectId
                    ? row.projectId === contract.projectId
                    : row.clientId === contract.clientId,
                )
                .reduce((h, row) => h + row.durationMinutes / 60, 0)
            : 0;

        return sum + calculateContractRevenueMvp(contract, range, contractHours);
      }, 0),
    );

    const grossProfit = roundMoney(totalRevenue - totalCost);
    const marginPercent =
      totalRevenue > 0
        ? roundMoney((grossProfit / totalRevenue) * 100)
        : null;

    const [clientsCount, projectsCount] = await Promise.all([
      this.repository.countClients(organizationId),
      this.repository.countProjects(organizationId),
    ]);

    const alerts = missingCostRates.map((clerkUserId) => ({
      code: "MISSING_COST_RATE" as const,
      clerkUserId,
      message: `Custo/hora não configurado para o usuário ${clerkUserId}.`,
    }));

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      marginPercent,
      trackedHours,
      trackedMinutes,
      clientsCount,
      projectsCount,
      alerts,
    };
  }

  async listClients(organizationId: string, query: ProfitHunterDateRangeQuery) {
    const range = this.toDateRange(query);
    const [clients, { rows }, contracts] = await Promise.all([
      this.repository.findClients(organizationId),
      this.buildEntryCosts(organizationId, range),
      this.contractRepository.findActiveContracts(organizationId),
    ]);

    return clients.map((client) => {
      const clientRows = rows.filter((row) => row.clientId === client.id);
      const trackedMinutes = clientRows.reduce(
        (sum, row) => sum + row.durationMinutes,
        0,
      );
      const cost = roundMoney(clientRows.reduce((sum, row) => sum + row.cost, 0));
      const trackedHours = roundMoney(trackedMinutes / 60);
      const revenue = roundMoney(
        this.calculateClientRevenueMvp(
          contracts,
          range,
          client.id,
          trackedHours,
        ),
      );
      const summary = buildFinancialSummary(revenue, cost, trackedMinutes);
      const projectsCount = new Set(clientRows.map((row) => row.projectId)).size;

      return {
        clientId: client.id,
        clientName: client.name,
        revenue: summary.revenue,
        cost: summary.cost,
        profit: summary.profit,
        marginPercent: summary.marginPercent,
        trackedMinutes: summary.trackedMinutes,
        trackedHours: summary.trackedHours,
        projectsCount,
        status: summary.status,
      };
    });
  }

  async getClientDetail(
    organizationId: string,
    clientId: string,
    query: ProfitHunterDateRangeQuery,
  ) {
    const client = await this.repository.findClient(organizationId, clientId);

    if (!client) {
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
    }

    const range = this.toDateRange(query);
    const [{ rows, missingCostRates }, contracts, projects] = await Promise.all([
      this.buildEntryCosts(organizationId, range),
      this.contractRepository.findByClient(organizationId, clientId),
      this.repository.findProjects(organizationId, clientId),
    ]);

    const clientRows = rows.filter((row) => row.clientId === clientId);
    const trackedMinutes = clientRows.reduce(
      (sum, row) => sum + row.durationMinutes,
      0,
    );
    const cost = roundMoney(clientRows.reduce((sum, row) => sum + row.cost, 0));
    const trackedHours = roundMoney(trackedMinutes / 60);
    const revenue = roundMoney(
      contracts.reduce((sum, contract) => {
        const hours = contract.type === "HOURLY" ? trackedHours : 0;
        return sum + calculateContractRevenueMvp(contract, range, hours);
      }, 0),
    );
    const summary = buildFinancialSummary(revenue, cost, trackedMinutes);

    return {
      client,
      revenue: summary.revenue,
      cost: summary.cost,
      profit: summary.profit,
      marginPercent: summary.marginPercent,
      trackedHours: summary.trackedHours,
      projects: projects.map((project) => {
        const projectRows = clientRows.filter(
          (row) => row.projectId === project.id,
        );
        const projectMinutes = projectRows.reduce(
          (sum, row) => sum + row.durationMinutes,
          0,
        );
        const projectCost = roundMoney(
          projectRows.reduce((sum, row) => sum + row.cost, 0),
        );
        const projectHours = roundMoney(projectMinutes / 60);
        const projectRevenue = roundMoney(
          contracts
            .filter((contract) => contract.projectId === project.id)
            .reduce((sum, contract) => {
              const hours = contract.type === "HOURLY" ? projectHours : 0;
              return sum + calculateContractRevenueMvp(contract, range, hours);
            }, 0),
        );
        const projectSummary = buildFinancialSummary(
          projectRevenue,
          projectCost,
          projectMinutes,
        );

        return {
          projectId: project.id,
          projectName: project.name,
          revenue: projectSummary.revenue,
          cost: projectSummary.cost,
          profit: projectSummary.profit,
          marginPercent: projectSummary.marginPercent,
          trackedHours: projectSummary.trackedHours,
          tasksCount: project._count.tasks,
          status: projectSummary.status,
        };
      }),
      contracts: contracts.map(serializeRevenueContract),
      missingCostRates: [
        ...new Set(
          clientRows
            .filter((row) => row.missingCostRate)
            .map((row) => row.clerkUserId),
        ),
      ],
    };
  }

  async listProjects(
    organizationId: string,
    query: ProfitHunterProjectsQuery,
  ) {
    const range = this.toDateRange(query);
    const [{ rows }, contracts, projects] = await Promise.all([
      this.buildEntryCosts(organizationId, range),
      this.contractRepository.findActiveContracts(organizationId),
      this.repository.findProjects(organizationId, query.clientId),
    ]);

    return projects.map((project) => {
      const projectRows = rows.filter((row) => row.projectId === project.id);
      const trackedMinutes = projectRows.reduce(
        (sum, row) => sum + row.durationMinutes,
        0,
      );
      const cost = roundMoney(
        projectRows.reduce((sum, row) => sum + row.cost, 0),
      );
      const trackedHours = roundMoney(trackedMinutes / 60);
      const revenue = roundMoney(
        this.calculateProjectRevenueMvp(
          contracts,
          range,
          project.id,
          trackedHours,
        ),
      );
      const summary = buildFinancialSummary(revenue, cost, trackedMinutes);

      return {
        projectId: project.id,
        projectName: project.name,
        client: project.client,
        revenue: summary.revenue,
        cost: summary.cost,
        profit: summary.profit,
        marginPercent: summary.marginPercent,
        trackedMinutes: summary.trackedMinutes,
        trackedHours: summary.trackedHours,
        tasksCount: project._count.tasks,
        status: summary.status,
      };
    });
  }

  async getProjectDetail(
    organizationId: string,
    projectId: string,
    query: ProfitHunterDateRangeQuery,
  ) {
    const project = await this.repository.findProject(organizationId, projectId);

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    const range = this.toDateRange(query);
    const [{ rows, missingCostRates }, contracts] = await Promise.all([
      this.buildEntryCosts(organizationId, range),
      this.contractRepository.findByProject(organizationId, projectId),
    ]);

    const projectRows = rows.filter((row) => row.projectId === projectId);
    const trackedMinutes = projectRows.reduce(
      (sum, row) => sum + row.durationMinutes,
      0,
    );
    const cost = roundMoney(projectRows.reduce((sum, row) => sum + row.cost, 0));
    const trackedHours = roundMoney(trackedMinutes / 60);
    const revenue = roundMoney(
      contracts.reduce((sum, contract) => {
        const hours = contract.type === "HOURLY" ? trackedHours : 0;
        return sum + calculateContractRevenueMvp(contract, range, hours);
      }, 0),
    );
    const summary = buildFinancialSummary(revenue, cost, trackedMinutes);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
      },
      client: project.client,
      revenue: summary.revenue,
      cost: summary.cost,
      profit: summary.profit,
      marginPercent: summary.marginPercent,
      trackedHours: summary.trackedHours,
      tasks: project.tasks.map((task) => {
        const taskRows = projectRows.filter((row) => row.taskId === task.id);
        const taskMinutes = taskRows.reduce(
          (sum, row) => sum + row.durationMinutes,
          0,
        );
        const taskCost = roundMoney(
          taskRows.reduce((sum, row) => sum + row.cost, 0),
        );

        return {
          ...task,
          trackedMinutes: taskMinutes,
          trackedHours: roundMoney(taskMinutes / 60),
          cost: taskCost,
        };
      }),
      contracts: contracts.map(serializeRevenueContract),
      missingCostRates: [
        ...new Set(
          projectRows
            .filter((row) => row.missingCostRate)
            .map((row) => row.clerkUserId),
        ),
      ],
    };
  }
}
