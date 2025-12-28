import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: use global settings variable directly
    const checkboxTargets = settings.fields || [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      if (!modal) return;

      const labels = modal.querySelectorAll(".custom-field-label");

      labels.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const labelText = label.textContent.trim().toLowerCase();
        const isMatch = checkboxTargets.some(target => 
          labelText.includes(target.toLowerCase().trim())
        );

        if (isMatch) {
          const nativeInput = label.closest(".event-field")?.querySelector("input.custom-field-input");
          if (!nativeInput) return;
          
          label.dataset.processed = "true";

          // 1. Create the container matching the plugin's class
          const checkboxContainer = document.createElement("label");
          checkboxContainer.className = "checkbox-label injected-custom-field";

          // 2. Create the checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = nativeInput.value === "yes"; // Sync string value

          // 3. Create the text span matching the plugin's "message" class
          const messageSpan = document.createElement("span");
          messageSpan.className = "message";
          messageSpan.textContent = label.textContent.trim();

          checkbox.addEventListener("change", (e) => {
            // Map state to strings for plugin compatibility
            nativeInput.value = e.target.checked ? "yes" : "no";
            // Dispatch 'input' to trigger the plugin's save logic
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // 4. Assemble and Inject
          checkboxContainer.appendChild(checkbox);
          checkboxContainer.appendChild(messageSpan);
          
          // Hide the original elements and inject our native-style row
          nativeInput.style.display = "none";
          label.style.display = "none";
          label.parentNode.appendChild(checkboxContainer);
        }
      });
    };

    // Poll to ensure injection occurs as the modal loads
    const interval = setInterval(injectCheckbox, 500);
    setTimeout(() => clearInterval(interval), 10000);
  });
});