import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "fallback_key");

export async function sendOTPEmail(email: string, otp: string, purpose: "signup" | "forgot_password") {
  const subject = purpose === "signup" ? "Verify your CodeHub account" : "Reset your CodeHub password";
  const title = purpose === "signup" ? "Welcome to CodeHub!" : "Password Reset Request";
  const message = purpose === "signup" 
    ? "Please use the following 6-digit verification code to complete your registration. This code expires in 5 minutes."
    : "We received a request to reset your password. Please use the following code to continue. This code expires in 5 minutes.";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; margin: 0; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 40px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; letter-spacing: 2px; margin-bottom: 30px; color: #fff; }
        .logo span { color: #22d3ee; }
        h1 { font-size: 24px; margin-bottom: 16px; color: #fff; }
        p { font-size: 16px; color: #a1a1aa; line-height: 1.5; margin-bottom: 30px; }
        .otp-container { background: linear-gradient(to right, rgba(99,102,241,0.1), rgba(6,182,212,0.1)); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .otp { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #22d3ee; margin: 0; }
        .footer { font-size: 12px; color: #52525b; margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CODE<span>HUB</span></div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="otp-container">
          <p class="otp">${otp}</p>
        </div>
        <p>If you did not request this email, you can safely ignore it.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} CodeHub. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Simulating email send:");
    console.log(`\n=== EMAIL TO: ${email} ===\nSubject: ${subject}\nOTP: ${otp}\n=============================\n`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: "CodeHub <noreply@codehub.dev>", // Requires verified domain on Resend
      to: [email],
      subject: subject,
      html: html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
