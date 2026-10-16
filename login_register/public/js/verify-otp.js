const form = document.getElementById("verifyOtpForm");
const message = document.getElementById("message");
const button = document.getElementById("verifyBtn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = sessionStorage.getItem("resetEmail");
  const otp = document.getElementById("otp").value.trim();

  if (!email) {
    message.textContent = "Please request an OTP first.";
    return;
  }

  button.disabled = true;
  message.textContent = "Verifying OTP...";

  try {
    const response = await fetch("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, otp })
    });

    const data = await response.json();
    message.textContent = data.message;

    if (response.ok) {
      window.location.href = "/reset-password.html";
    }
  } catch (error) {
    message.textContent = "Could not connect to the server.";
  } finally {
    button.disabled = false;
  }
});