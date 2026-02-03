// Issue blocks
import { createIssue } from "./issues/createIssue";
import { getIssue } from "./issues/getIssue";
import { updateIssue } from "./issues/updateIssue";
import { transitionIssue } from "./issues/transitionIssue";
import { searchIssues } from "./issues/searchIssues";
import { addComment } from "./issues/addComment";
import { sendNotification } from "./issues/sendNotification";
import { assignIssue } from "./issues/assignIssue";
import { addWatchers } from "./issues/addWatchers";
import { linkIssues } from "./issues/linkIssues";
import { addExternalLink } from "./issues/addExternalLink";

// User blocks
import { getUserDetails } from "./users/getUserDetails";

// Project Management blocks
import { createVersion } from "./project-management/createVersion";
import { updateVersion } from "./project-management/updateVersion";

// Webhook blocks
import { issueCreated } from "./webhooks/issueCreated";
import { issueUpdated } from "./webhooks/issueUpdated";
import { commentCreated } from "./webhooks/commentCreated";
import { versionReleased } from "./webhooks/versionReleased";

// Service Desk blocks
import { createServiceDeskRequest } from "./service-desk/createServiceDeskRequest";
import { getSlaInformation } from "./service-desk/getSlaInformation";
import { addRequestParticipants } from "./service-desk/addRequestParticipants";
import { addInternalNote } from "./service-desk/addInternalNote";
import { addCustomerResponse } from "./service-desk/addCustomerResponse";
import { getApprovals } from "./service-desk/getApprovals";
import { respondToApproval } from "./service-desk/respondToApproval";

/**
 * Dictionary of all available blocks organized by category
 * Key: block identifier (for programmatic access)
 * Value: block definition
 */
export const blocks = {
  // Issue Management
  createIssue,
  getIssue,
  updateIssue,
  transitionIssue,
  searchIssues,
  addComment,
  assignIssue,
  addWatchers,
  linkIssues,
  addExternalLink,
  sendNotification,

  // User Management
  getUserDetails,

  // Project Management
  createVersion,
  updateVersion,

  // Webhook Events
  issueCreated,
  issueUpdated,
  commentCreated,
  versionReleased,

  // Service Desk Management
  createServiceDeskRequest,
  getSlaInformation,
  addRequestParticipants,
  addInternalNote,
  addCustomerResponse,
  getApprovals,
  respondToApproval,
} as const;

// Named exports for individual blocks (optional, for external imports)
export {
  createIssue,
  getUserDetails,
  getIssue,
  updateIssue,
  transitionIssue,
  searchIssues,
  addComment,
  sendNotification,
  assignIssue,
  addWatchers,
  linkIssues,
  addExternalLink,
  createVersion,
  updateVersion,
  issueCreated,
  issueUpdated,
  commentCreated,
  versionReleased,
  listServiceDesks,
  listRequestTypes,
  createServiceDeskRequest,
  getSlaInformation,
  addRequestParticipants,
  addInternalNote,
  addCustomerResponse,
  getApprovals,
  respondToApproval,
};
