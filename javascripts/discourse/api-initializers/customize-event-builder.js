import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // use the global settings object
    const targetLabels = settings.fields || [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target the green labels from your screenshot
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        
        // match the label text against your list in settings
        const shouldTransform = targetLabels.some(t => 
          text.includes(t.toLowerCase().trim())
        );

        if (shouldTransform) {
          // find the "optional" input field shown in the screenshot
          const nativeInput = label.closest(".event-field")?.querySelector("input.custom-field-input");
          
          if (!nativeInput) return;
          label.dataset.processed = "true";

          // create the checkbox element
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "injected-event-checkbox";
          
          // sync state: "yes" means checked
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            nativeInput.value = e.target.checked ? "yes" : "no";
            // trigger the plugin's save event
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // hide the "optional" input and put the checkbox right after the label
          nativeInput.style.setProperty("display", "none", "important");
          label.after(checkbox);
        }
      });
    };

    // run an interval to catch the fields as they load into the modal
    const checkInterval = setInterval(injectCheckbox, 500);
    setTimeout(() => clearInterval(checkInterval), 10000);
  });
});