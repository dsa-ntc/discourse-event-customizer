import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // ensure settings.fields is treated as an array even if empty
    const checkboxTargets = Array.isArray(settings?.fields) ? settings.fields : [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target all spans within the custom field area
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        
        // match the label text against your list in settings
        const shouldTransform = checkboxTargets.some(t => 
          text.includes(String(t).toLowerCase().trim())
        );

        if (shouldTransform) {
          // find the input: it's either a sibling or inside a nearby wrapper
          const nativeInput = label.parentElement.querySelector("input:not([type='checkbox'])");
          
          if (!nativeInput) return;

          label.dataset.processed = "true";

          const row = document.createElement("div");
          row.classList.add("custom-checkbox-row");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.classList.add("event-builder-checkbox");
          
          // sync initial state: Discourse plugin uses "yes" as a string
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            nativeInput.value = e.target.checked ? "yes" : "no";
            // dispatch input event so Glimmer/Ember picks up the change
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // style the wrapper and inject
          nativeInput.style.display = "none";
          label.parentNode.insertBefore(row, label);
          row.appendChild(checkbox);
          row.appendChild(label); 
        }
      });
    };

    // immediate attempt plus a mutation observer for late-loading fields
    const observer = new MutationObserver(injectCheckbox);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // fallback timeouts
    setTimeout(injectCheckbox, 300);
    setTimeout(injectCheckbox, 1000);
  });
});