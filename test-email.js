const { Resend } = require("resend");

const resend = new Resend("re_KYm18ze2_HG2SNcE5QkUz5xSQzcsF2TNP");

async function run() {
  console.log("Sending test email...");
  const { data, error } = await resend.emails.send({
    from: "CodeHub <onboarding@resend.dev>",
    to: ["test-user-xyz@gmail.com"], // Trying a random unverified email
    subject: "Test from Resend",
    html: "<p>Hello</p>"
  });

  if (error) {
    console.error("Resend Error:");
    console.error(error);
  } else {
    console.log("Success:", data);
  }
}

run();
