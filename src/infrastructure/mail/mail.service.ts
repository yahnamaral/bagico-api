import type {
  ClientPortalRole,
  OrganizationRole,
} from "@prisma/client";
import { AppError } from "../../shared/errors/AppError";
import { getResendClient, isProductionEnv } from "./resend-client";

const FROM_EMAIL = "BagiCo Suite <onboarding@resend.dev>";

export type SendClientPortalInviteEmailInput = {
  to: string;
  clientName: string;
  organizationName: string;
  invitedByName?: string;
  role: ClientPortalRole;
  inviteUrl: string;
  expiresAt: Date;
};

function formatRoleLabel(role: ClientPortalRole): string {
  switch (role) {
    case "CLIENT_ADMIN":
      return "Administrador";
    case "CLIENT_MANAGER":
      return "Gerente";
    case "CLIENT_STAFF":
      return "Colaborador";
  }
}

function formatExpiresAt(expiresAt: Date): string {
  return expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildInviteEmailHtml(input: SendClientPortalInviteEmailInput): string {
  const invitedByLine = input.invitedByName
    ? `<p><strong>${input.invitedByName}</strong> convidou você para acessar o portal.</p>`
    : `<p>Você foi convidado para acessar o portal.</p>`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="color: #111827;">BagiCo Suite / Client Pulse</h1>
      ${invitedByLine}
      <p>
        A agência <strong>${input.organizationName}</strong> convidou você para revisar e aprovar
        demandas do cliente <strong>${input.clientName}</strong> no portal.
      </p>
      <p>Seu perfil de acesso: <strong>${formatRoleLabel(input.role)}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${input.inviteUrl}"
           style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Acessar portal
        </a>
      </p>
      <p>Este convite expira em <strong>${formatExpiresAt(input.expiresAt)}</strong>.</p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>
    </div>
  `;
}

export type SendOrganizationInviteEmailInput = {
  to: string;
  organizationName: string;
  role: OrganizationRole;
  inviteUrl: string;
  expiresAt: Date;
};

function formatOrganizationRoleLabel(role: OrganizationRole): string {
  switch (role) {
    case "AGENCY_MANAGER":
      return "Gerente";
    case "AGENCY_MAKER":
      return "Maker";
    case "FREELANCER":
      return "Freelancer";
    default:
      return role;
  }
}

function buildOrganizationInviteEmailHtml(
  input: SendOrganizationInviteEmailInput,
): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="color: #111827;">BagiCo Suite</h1>
      <p>
        Você foi convidado para fazer parte da equipe da agência
        <strong>${input.organizationName}</strong>.
      </p>
      <p>Seu perfil de acesso: <strong>${formatOrganizationRoleLabel(input.role)}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${input.inviteUrl}"
           style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Aceitar convite
        </a>
      </p>
      <p>Este convite expira em <strong>${formatExpiresAt(input.expiresAt)}</strong>.</p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>
    </div>
  `;
}

export type SendInviteEmailResult = {
  sent: boolean;
  warning?: string;
};

export type SendGenericNotificationEmailInput = {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
};

function buildGenericNotificationEmailHtml(
  input: SendGenericNotificationEmailInput,
): string {
  const actionBlock = input.actionUrl
    ? `
      <p style="margin: 24px 0;">
        <a href="${input.actionUrl}"
           style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ${input.actionLabel ?? "Ver detalhes"}
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p><a href="${input.actionUrl}">${input.actionUrl}</a></p>
    `
    : "";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="color: #111827;">BagiCo Suite</h1>
      <h2 style="font-size: 18px; margin-bottom: 8px;">${input.title}</h2>
      <p>${input.message}</p>
      ${actionBlock}
    </div>
  `;
}

export class MailService {
  async sendClientPortalInviteEmail(
    input: SendClientPortalInviteEmailInput,
  ): Promise<SendInviteEmailResult> {
    const resend = getResendClient();

    if (!resend) {
      if (isProductionEnv()) {
        throw new AppError(
          "Email service is not configured",
          500,
          "EMAIL_NOT_CONFIGURED",
        );
      }

      console.warn(
        "[MailService] RESEND_API_KEY not configured. Invite email was not sent.",
      );

      return {
        sent: false,
        warning:
          "RESEND_API_KEY is not configured. Email was not sent. Check server logs for inviteUrl.",
      };
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: `Convite para o portal — ${input.organizationName}`,
      html: buildInviteEmailHtml(input),
    });

    if (error) {
      throw new AppError(
        "Failed to send invite email",
        502,
        "EMAIL_SEND_FAILED",
      );
    }

    return { sent: true };
  }

  async sendOrganizationInviteEmail(
    input: SendOrganizationInviteEmailInput,
  ): Promise<SendInviteEmailResult> {
    const resend = getResendClient();

    if (!resend) {
      if (isProductionEnv()) {
        throw new AppError(
          "Email service is not configured",
          500,
          "EMAIL_NOT_CONFIGURED",
        );
      }

      console.warn(
        "[MailService] RESEND_API_KEY not configured. Invite email was not sent.",
      );

      return {
        sent: false,
        warning:
          "RESEND_API_KEY is not configured. Email was not sent. Check server logs for inviteUrl.",
      };
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: `Convite para a equipe — ${input.organizationName}`,
      html: buildOrganizationInviteEmailHtml(input),
    });

    if (error) {
      throw new AppError(
        "Failed to send invite email",
        502,
        "EMAIL_SEND_FAILED",
      );
    }

    return { sent: true };
  }

  async sendGenericNotificationEmail(
    input: SendGenericNotificationEmailInput,
  ): Promise<SendInviteEmailResult> {
    const resend = getResendClient();

    if (!resend) {
      if (isProductionEnv()) {
        console.warn(
          "[MailService] RESEND_API_KEY not configured. Notification email skipped:",
          input.subject,
        );
        return {
          sent: false,
          warning: "RESEND_API_KEY is not configured.",
        };
      }

      console.warn(
        "[MailService] RESEND_API_KEY not configured. Notification email skipped:",
        input.subject,
      );

      return {
        sent: false,
        warning:
          "RESEND_API_KEY is not configured. Email was not sent.",
      };
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: buildGenericNotificationEmailHtml(input),
    });

    if (error) {
      throw new AppError(
        "Failed to send notification email",
        502,
        "EMAIL_SEND_FAILED",
      );
    }

    return { sent: true };
  }
}
