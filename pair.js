let generating = false;

async function startGeneratingSessions() {
  generating = true;

  while (generating) {
    try {
      const response = await fetch('/generate-session-id');
      const data = await response.json();
      console.log("New Session ID:", data.sessionId);

      // Display the session ID in the UI (optional)
      const output = document.getElementById("output");
      if (output) {
        output.innerText = "Session ID: " + data.sessionId;
      }
    } catch (error) {
      console.error("Error generating session ID:", error);
    }

    // Wait 3 seconds before the next request
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (!generating) {
        startGeneratingSessions();
      }
    });
  }
});
                    
