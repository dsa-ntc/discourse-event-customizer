import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // use the global settings object directly
    const checkboxTargets = settings.fields || [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target labels confirmed by the plugin's template
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        
        // match the label text against your list in settings
        const shouldTransform = checkboxTargets.some(t => 
          text.includes(t.toLowerCase().trim())
        );

        if (shouldTransform) {
          const nativeInput = label.nextElementSibling;
          if (!nativeInput || nativeInput.tagName !== "INPUT") return;

          label.dataset.processed = "true";

          const row = document.createElement("div");
          row.classList.add("custom-checkbox-row");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          
          // sync initial state: check if the string value is "yes"
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            // map checkbox state to boolean strings for plugin compatibility
            nativeInput.value = e.target.checked ? "yes" : "no";
            // trigger plugin's native save listener
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // hide the text input and show the checkbox
          nativeInput.style.setProperty("display", "none", "important");
          label.after(row);
          row.appendChild(checkbox);
          row.appendChild(label); 
        }
      });
    };

    // monitor the modal for custom field appearance
    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectCheckbox();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectCheckbox, 600);
  });
});