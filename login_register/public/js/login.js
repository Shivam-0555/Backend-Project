const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Logging in...";

  const formData = new FormData(loginForm);

  const data = {
    email: formData.get("email"),
    password: formData.get("password")
  };

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed.");
    }

    // Server has created the session and sent its cookie.
    window.location.href = "/dashboard.html";
  } catch (error) {
    message.textContent = error.message;
  }
});