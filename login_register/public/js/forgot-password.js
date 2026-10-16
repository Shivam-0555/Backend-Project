
const form = document.getElementById("forgotForm");
const message = document.getElementById("message");
const button = document.getElementById("sendOtpBtn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();

  button.disabled = true;
  message.textContent = "Sending OTP...";

  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    message.textContent = data.message || "Request completed.";

    if (response.ok) {
      sessionStorage.setItem("resetEmail", email);
      window.location.href = "/verify-otp.html";
    }
  } catch (error) {
    message.textContent = "Server se connect nahi ho pa raha.";
  } finally {
    button.disabled = false;
  }
});
