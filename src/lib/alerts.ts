export interface AlertNotifier {
  send(phone: string, message: string): Promise<boolean>;
}

class ConsoleNotifier implements AlertNotifier {
  async send(phone: string, message: string): Promise<boolean> {
    console.log(`[ALERT] To: ${phone}\n${message}`);
    return true;
  }
}

// Uncomment and configure when ready for Twilio:
// class TwilioNotifier implements AlertNotifier {
//   async send(phone: string, message: string): Promise<boolean> {
//     const accountSid = process.env.TWILIO_ACCOUNT_SID!;
//     const authToken = process.env.TWILIO_AUTH_TOKEN!;
//     const from = process.env.TWILIO_PHONE_NUMBER!;
//     const res = await fetch(
//       `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: new URLSearchParams({ To: phone, From: from, Body: message }),
//       }
//     );
//     return res.ok;
//   }
// }

export const notifier: AlertNotifier = new ConsoleNotifier();
