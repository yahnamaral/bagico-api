import { MailService } from "../../infrastructure/mail/mail.service";
import { NotificationEmailService } from "./notification-email.service";
import { NotificationEventsService } from "./notification-events.service";
import { NotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const notificationEmailService = new NotificationEmailService(new MailService());

export const notificationEvents = new NotificationEventsService(
  notificationService,
  notificationEmailService,
  notificationRepository,
);
