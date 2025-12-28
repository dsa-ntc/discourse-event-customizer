import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: direct access to settings avoids the .get() typeerror
    const targetLabels = settings.fields || [];

    const injectCustomCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      if (!modal) return;

      const labels = modal.querySelectorAll(".custom-field-label");

      labels.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        const isMatch = targetLabels.some(t => text.includes(t.toLowerCase().trim()));

        if (isMatch) {
          const nativeInput = label.closest(".event-field")?.querySelector("input.custom-field-input");
          if (!nativeInput) return;
          
          label.dataset.processed = "true";

          // recreate the native structure with your custom container
          const container = document.createElement("div");
          container.className = "checkbox-container injected-field-wrapper";

          const checkboxLabel = document.createElement("label");
          checkboxLabel.className = "checkbox-label";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = nativeInput.value === "yes"; // discourse stores boolean as string

          const messageSpan = document.createElement("span");
          messageSpan.className = "message";
          messageSpan.textContent = label.textContent.trim();

          checkbox.addEventListener("change", (e) => {
            // sync binary state to plugin-required "yes"/"no" strings
            nativeInput.value = e.target.checked ? "yes" : "no";
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          checkboxLabel.appendChild(checkbox);
          checkboxLabel.appendChild(messageSpan);
          container.appendChild(checkboxLabel);
          
          // inject and highlight the native input for final verification
          label.parentNode.appendChild(container);
          nativeInput.style.border = "2px solid red"; 
          label.style.color = "orange";
        }
      });
    };

    const interval = setInterval(injectCustomCheckbox, 500);
    setTimeout(() => clearInterval(interval), 10000);
  });
});