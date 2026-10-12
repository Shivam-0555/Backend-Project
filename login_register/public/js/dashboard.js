
const statusText = document.getElementById("status");
const profile = document.getElementById("profile");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

async function loadDashboard() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load dashboard.");
    }

    userName.textContent = result.user.name;
    userEmail.textContent = result.user.email;

    statusText.hidden = true;
    profile.hidden = false;
  } catch (error) {
    statusText.hidden = false;
    statusText.textContent = error.message;
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Logout failed. Please try again.");
    }

    window.location.replace("/login.html");
  } catch (error) {
    statusText.hidden = false;
    statusText.textContent = error.message;
    logoutButton.disabled = false;
  }
});

loadDashboard();
