import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: use direct property access to bypass the .get() TypeError
    const themeSettings = api.container.lookup("service:theme-settings");
    const checkboxTargetLabels = themeSettings?.fields || themeSettings?._fields || [];

    const injectCheckbox = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target the specific label spans confirmed by the plugin source
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const labelText = label.textContent.trim().toLowerCase();
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        // check if this label matches any string in your settings list
        const shouldTransform = checkboxTargetLabels.some(matchStr => 
          labelText.includes(matchStr.trim().toLowerCase())
        );

        if (shouldTransform) {
          label.dataset.processed = "true";
          
          const checkboxContainer = document.createElement("label");
          checkboxContainer.classList.add("custom-event-checkbox-wrap");

          const checkbox = document.createElement("input");
          checkbox.setAttribute("type", "checkbox");
          checkbox.classList.add("custom-event-checkbox");

          // checkbox is checked if the hidden input value is "yes"
          checkbox.checked = nativeInput.value === "yes";

          checkbox.addEventListener("change", (e) => {
            // map checkbox state to boolean "yes"/"no" strings
            nativeInput.value = e.target.checked ? "yes" : "no";
            // trigger plugin save
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          nativeInput.style.setProperty("display", "none", "important");
          label.after(checkboxContainer);
          checkboxContainer.appendChild(checkbox);
        }
      });
    };

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