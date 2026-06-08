import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { clerkClient } from "./clerkAuth";

const DEFAULT_CLERK_ORG_ROLE = "org:member";

const MEMBERSHIP_ALREADY_EXISTS_CODES = new Set([
  "already_a_member_in_organization",
  "duplicate_record",
  "form_identifier_exists",
]);

function isMembershipAlreadyExistsError(error: unknown): boolean {
  if (!isClerkAPIResponseError(error)) {
    return false;
  }

  if (error.status === 409) {
    return true;
  }

  return error.errors.some((entry) => {
    const code = entry.code?.toLowerCase() ?? "";
    const message = entry.message?.toLowerCase() ?? "";

    return (
      MEMBERSHIP_ALREADY_EXISTS_CODES.has(code) ||
      code.includes("already") ||
      message.includes("already a member")
    );
  });
}

export type EnsureClerkOrganizationMembershipResult = {
  synced: boolean;
  alreadyMember: boolean;
};

export async function ensureClerkOrganizationMembership(
  clerkOrgId: string,
  clerkUserId: string,
): Promise<EnsureClerkOrganizationMembershipResult> {
  const existingMemberships =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
      userId: [clerkUserId],
      limit: 1,
    });

  if (existingMemberships.data.length > 0) {
    return { synced: true, alreadyMember: true };
  }

  try {
    await clerkClient.organizations.createOrganizationMembership({
      organizationId: clerkOrgId,
      userId: clerkUserId,
      role: DEFAULT_CLERK_ORG_ROLE,
    });

    return { synced: true, alreadyMember: false };
  } catch (error) {
    if (isMembershipAlreadyExistsError(error)) {
      return { synced: true, alreadyMember: true };
    }

    throw error;
  }
}
