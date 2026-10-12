const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Creating account...";

  const formData = new FormData(registerForm);

  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  };

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Registration failed.");
    }

    message.textContent = result.message;
    registerForm.reset();

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1000);
  } catch (error) {
    message.textContent = error.message;
  }
});