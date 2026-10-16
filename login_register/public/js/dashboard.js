
const statusText = document.getElementById("status");
const profile = document.getElementById("profile");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const nameInput = document.getElementById("nameInput");
const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const saveButton = document.getElementById("saveButton");
const logoutButton = document.getElementById("logoutButton");

// Load logged-in user's profile
async function loadDashboard() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
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
    nameInput.value = result.user.name;

    statusText.hidden = true;
    profile.hidden = false;
  } catch (error) {
    statusText.textContent = error.message;
  }
}

// Update profile name
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  profileMessage.textContent = "";
  saveButton.disabled = true;

  try {
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: nameInput.value
      })
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Profile update failed.");
    }

    userName.textContent = result.user.name;
    nameInput.value = result.user.name;

    profileMessage.textContent = result.message;
  } catch (error) {
    profileMessage.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

// Logout
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Logout failed.");
    }

    window.location.replace("/login.html");
  } catch (error) {
    profileMessage.textContent = error.message;
    logoutButton.disabled = false;
  }
});

loadDashboard();


const passwordForm = document.getElementById("passwordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const passwordButton = document.getElementById("passwordButton");
const passwordMessage = document.getElementById("passwordMessage");

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  passwordButton.disabled = true;
  passwordMessage.textContent = "";

  try {
    const response = await fetch("/api/auth/change-password", {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword: currentPasswordInput.value,
        newPassword: newPasswordInput.value
      })
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Password change failed.");
    }

    passwordMessage.textContent = result.message;
    passwordForm.reset();

    // Session has been destroyed; return to login.
    window.setTimeout(() => {
      window.location.replace("/login.html");
    }, 1500);
  } catch (error) {
    passwordMessage.textContent = error.message;
  } finally {
    passwordButton.disabled = false;
  }
});
