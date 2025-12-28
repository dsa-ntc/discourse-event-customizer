import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: use the global settings object directly
    const targetLabels = settings.fields || [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target every span to find the custom labels
      const labels = modal?.querySelectorAll("span, .custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        
        // match the label text against your list in settings
        const shouldTransform = targetLabels.some(t => 
          text.includes(t.toLowerCase().trim())
        );

        if (shouldTransform) {
          // find the input in the same container
          const nativeInput = label.parentElement.querySelector("input");
          if (!nativeInput || nativeInput.type === "checkbox") return;

          label.dataset.processed = "true";

          // create a standard checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.style.width = "20px";
          checkbox.style.height = "20px";
          checkbox.style.marginRight = "10px";
          
          // sync initial state: check if the string value is "yes"
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            // map checkbox state to "yes" or "no" strings for the plugin
            nativeInput.value = e.target.checked ? "yes" : "no";
            // trigger plugin save
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // injection: place the checkbox directly before the label
          label.parentNode.insertBefore(checkbox, label);
          
          // for debugging: make the native input bright red instead of hiding it
          nativeInput.style.border = "2px solid red";
          nativeInput.style.display = "block"; 
        }
      });
    };

    // run repeatedly every second while the modal is likely open
    const interval = setInterval(injectField, 1000);
    setTimeout(() => clearInterval(interval), 10000);
  });
});