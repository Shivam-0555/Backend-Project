
require("dotenv").config();

const { sendEmail } = require("./utils/sendEmail");

async function testEmail() {
  try {
    const info = await sendEmail({
      to: "test@example.com",
      subject: "Mailtrap Test Email",
      text: "Testing Mailtrap SMTP connection.",
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Email sending failed:", error.message);
  }
}

testEmail();
