/**
 * ============================================================================
 * EMAIL NOTIFICATION SERVICE (backend/services/emailService.js)
 * ============================================================================
 * Configurable SMTP delivery service using Nodemailer.
 *
 * NON-BLOCKING & RESILIENT:
 * - If SMTP settings are unconfigured, logs an informational note and safely
 *   skips email dispatch without failing the calling HTTP route.
 * - In-app notifications remain 100% functional regardless of SMTP availability.
 * - All send attempts are wrapped in try/catch so network/auth errors never
 *   crash the server or rollback database transactions.
 * ============================================================================
 */

const nodemailer = require("nodemailer");

/**
 * Returns whether SMTP configuration is present in environment variables.
 */
function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Creates and returns a Nodemailer transporter instance, or null if unconfigured.
 */
function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Dispatches an email notification if SMTP is configured.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - Optional rich HTML content
 * @returns {Promise<{ delivered: boolean, messageId?: string, reason?: string }>}
 */
async function sendEmailNotification({ to, subject, text, html }) {
  if (!to || !subject) {
    return { delivered: false, reason: "Missing recipient or subject." };
  }

  if (!isSmtpConfigured()) {
    // Informational log — graceful fallback
    return {
      delivered: false,
      reason: "SMTP settings not configured. In-app notification preserved.",
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { delivered: false, reason: "Transporter unavailable." };
  }

  const fromAddress = process.env.SMTP_FROM || `"Skill Exchange" <noreply@skillexchange.local>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`[EmailService] Failed to send email to ${to}:`, error.message);
    return { delivered: false, reason: error.message };
  }
}

/**
 * Triggers an email alert for a newly scheduled or updated session booking.
 */
async function notifyBookingEvent({ recipientEmail, recipientName, topic, scheduledAt, status, partnerName }) {
  if (!recipientEmail) return;

  const formattedDate = new Date(scheduledAt).toLocaleString();
  const subject = `Skill Exchange: Mentorship Session ${status.toUpperCase()} (${topic})`;
  const text = `Hello ${recipientName || "there"},\n\nYour session on "${topic}" with ${partnerName || "your learning partner"} is currently: ${status.toUpperCase()}.\nScheduled time: ${formattedDate}.\n\nLog in to your Skill Exchange dashboard to review details.\n\n— Skill Exchange Team`;

  return sendEmailNotification({ to: recipientEmail, subject, text });
}

/**
 * Triggers an email alert when a learner's requested skill becomes available.
 */
async function notifyCourseMatch({ learnerEmail, learnerName, skillName, teacherName }) {
  if (!learnerEmail) return;

  const subject = `Skill Exchange: A Mentor is Now Teaching "${skillName}"!`;
  const text = `Hello ${learnerName || "Learner"},\n\nGreat news! ${teacherName || "A mentor"} has listed "${skillName}" as a teachable skill on Skill Exchange, matching your requested topic.\n\nLog in to your dashboard to view their profile and book a session.\n\n— Skill Exchange Team`;

  return sendEmailNotification({ to: learnerEmail, subject, text });
}

/**
 * Triggers an email alert when a user receives a new peer chat message.
 */
async function notifyNewMessage({ recipientEmail, recipientName, senderName, previewText }) {
  if (!recipientEmail) return;

  const subject = `Skill Exchange: New message from ${senderName || "a peer"}`;
  const text = `Hello ${recipientName || "there"},\n\n${senderName || "A peer"} sent you a message on Skill Exchange:\n\n"${previewText || "..."}"\n\nLog in to your messages to reply.\n\n— Skill Exchange Team`;

  return sendEmailNotification({ to: recipientEmail, subject, text });
}

module.exports = {
  isSmtpConfigured,
  sendEmailNotification,
  notifyBookingEvent,
  notifyCourseMatch,
  notifyNewMessage,
};
