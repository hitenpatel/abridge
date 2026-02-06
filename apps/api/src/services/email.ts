import { Resend } from "resend";
import { logger } from "../lib/logger";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
const FROM_EMAIL = process.env.FROM_EMAIL || "SchoolConnect <onboarding@resend.dev>";
const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

export interface StaffInvitationEmailData {
	recipientEmail: string;
	recipientName?: string;
	schoolName: string;
	role: string;
	invitationToken: string;
	expiresAt: Date;
}

export interface NotificationEmailData {
	recipientEmail: string;
	recipientName: string;
	subject: string;
	message: string;
	schoolName: string;
}

export interface ReceiptEmailData {
	recipientEmail: string;
	recipientName: string;
	receiptNumber: string;
	amount: number;
	schoolName: string;
	pdfUrl?: string;
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(data: StaffInvitationEmailData) {
	const invitationLink = `${WEB_URL}/register?token=${data.invitationToken}`;
	const expiryDate = data.expiresAt.toLocaleDateString("en-GB");

	try {
		const { data: emailData, error: emailError } = await resend.emails.send({
			from: FROM_EMAIL,
			to: [data.recipientEmail],
			subject: `Invitation to join ${data.schoolName} on SchoolConnect`,
			html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">SchoolConnect</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">You've been invited!</h2>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                ${data.recipientName ? `Hi ${data.recipientName},` : "Hello,"}
                            </p>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                You've been invited to join <strong>${data.schoolName}</strong> as a <strong>${data.role}</strong> on SchoolConnect.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                SchoolConnect is a modern platform for school-parent communication, making it easy to manage messaging, payments, attendance, and more.
                            </p>

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px;">
                                        <a href="${invitationLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${invitationLink}" style="color: #667eea; word-break: break-all;">${invitationLink}</a>
                            </p>

                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px;">
                                This invitation expires on <strong>${expiryDate}</strong>.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                © ${new Date().getFullYear()} SchoolConnect. All rights reserved.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
			`,
		});

		if (emailError) {
			logger.error("Resend API returned error for staff invitation", {
				error: emailError.message,
				recipient: data.recipientEmail,
				school: data.schoolName,
			});
			return { success: false, error: emailError };
		}

		logger.info("Staff invitation email sent", {
			messageId: emailData?.id,
			recipient: data.recipientEmail,
			school: data.schoolName,
		});

		return { success: true, messageId: emailData?.id };
	} catch (error) {
		logger.error("Failed to send staff invitation email", error as Error, {
			recipient: data.recipientEmail,
			school: data.schoolName,
		});
		return { success: false, error };
	}
}

/**
 * Send notification fallback email (when push notification fails)
 */
export async function sendNotificationEmail(data: NotificationEmailData) {
	try {
		const { data: emailData, error: emailError } = await resend.emails.send({
			from: FROM_EMAIL,
			to: [data.recipientEmail],
			subject: `${data.schoolName}: ${data.subject}`,
			html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333;">${data.subject}</h2>
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Hi ${data.recipientName},
                            </p>
                            <div style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                ${data.message}
                            </div>
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px;">
                                — ${data.schoolName}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                Sent via SchoolConnect
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
			`,
		});

		if (emailError) {
			logger.error("Resend API returned error for notification email", {
				error: emailError.message,
				recipient: data.recipientEmail,
			});
			return { success: false, error: emailError };
		}

		logger.info("Notification email sent", {
			messageId: emailData?.id,
			recipient: data.recipientEmail,
		});

		return { success: true, messageId: emailData?.id };
	} catch (error) {
		logger.error("Failed to send notification email", error as Error, {
			recipient: data.recipientEmail,
		});
		return { success: false, error };
	}
}

/**
 * Send payment receipt email
 */
export async function sendReceiptEmail(data: ReceiptEmailData) {
	try {
		const { data: emailData, error: emailError } = await resend.emails.send({
			from: FROM_EMAIL,
			to: [data.recipientEmail],
			subject: `Payment Receipt ${data.receiptNumber} - ${data.schoolName}`,
			html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333;">Payment Received</h2>
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Hi ${data.recipientName},
                            </p>
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Thank you for your payment of <strong>£${(data.amount / 100).toFixed(2)}</strong> to ${data.schoolName}.
                            </p>
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Receipt Number: <strong>${data.receiptNumber}</strong>
                            </p>
                            ${
															data.pdfUrl
																? `
                            <table cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px;">
                                        <a href="${data.pdfUrl}" style="display: inline-block; padding: 12px 30px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
                                            Download UC-Compliant Receipt
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            `
																: ""
														}
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px;">
                                This receipt can be used for Universal Credit childcare cost claims.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                © ${new Date().getFullYear()} ${data.schoolName} via SchoolConnect
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
			`,
		});

		if (emailError) {
			logger.error("Resend API returned error for receipt email", {
				error: emailError.message,
				recipient: data.recipientEmail,
				receiptNumber: data.receiptNumber,
			});
			return { success: false, error: emailError };
		}

		logger.info("Receipt email sent", {
			messageId: emailData?.id,
			recipient: data.recipientEmail,
			receiptNumber: data.receiptNumber,
		});

		return { success: true, messageId: emailData?.id };
	} catch (error) {
		logger.error("Failed to send receipt email", error as Error, {
			recipient: data.recipientEmail,
			receiptNumber: data.receiptNumber,
		});
		return { success: false, error };
	}
}
