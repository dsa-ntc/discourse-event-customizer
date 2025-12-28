import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: use the global settings object directly
    const targetLabels = settings.fields || [];

    const injectCheckboxes = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        
        // match the label text against the global settings list
        const shouldTransform = targetLabels.some(t => text.includes(t.toLowerCase().trim()));

        if (shouldTransform) {
          const nativeInput = label.nextElementSibling;
          if (!nativeInput || nativeInput.tagName !== "INPUT") return;

          label.dataset.processed = "true";

          const wrapper = document.createElement("div");
          wrapper.classList.add("custom-checkbox-row");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          
          // sync state: checked if current string value is "yes"
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            // map state to strings for plugin compatibility
            nativeInput.value = e.target.checked ? "yes" : "no";
            // trigger plugin save
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          nativeInput.style.setProperty("display", "none", "important");
          
          label.after(wrapper);
          wrapper.appendChild(checkbox);
          wrapper.appendChild(label); 
        }
      });
    };

    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectCheckboxes();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectCheckboxes, 500);
  });
});