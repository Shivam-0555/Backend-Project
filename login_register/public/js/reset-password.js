const form = document.getElementById("resetPasswordForm");
const message = document.getElementById("message");
const button = document.getElementById("resetBtn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = sessionStorage.getItem("resetEmail");
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!email) {
    message.textContent = "Please start password recovery again.";
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    message.textContent = "Password must be 8–72 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  button.disabled = true;
  message.textContent = "Resetting password...";

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, newPassword })
    });

    const data = await response.json();
    message.textContent = data.message;

    if (response.ok) {
      sessionStorage.removeItem("resetEmail");
      form.reset();
      window.location.href = "/login.html";
    }
  } catch (error) {
    message.textContent = "Could not connect to the server.";
  } finally {
    button.disabled = false;
  }
});