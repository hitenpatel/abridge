import Twilio from "twilio";

const client = process.env.TWILIO_ACCOUNT_SID
	? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
	: null;

const fromNumber = process.env.TWILIO_FROM_NUMBER;

export async function sendSms(to: string, body: string): Promise<boolean> {
	if (!client || !fromNumber) {
		console.warn("Twilio not configured, skipping SMS");
		return false;
	}

	try {
		await client.messages.create({
			to,
			from: fromNumber,
			body,
		});
		return true;
	} catch (err) {
		console.error("SMS send failed:", err);
		return false;
	}
}
