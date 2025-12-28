import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    // identify the calendar modal
    if (data?.name !== "post-event-builder") return;

    // reach directly into the container to find theme settings
    // using direct property access to bypass the .get() TypeError
    const themeSettings = api.container.lookup("service:theme-settings");
    const rules = themeSettings?.fields || themeSettings?._fields || [];

    const injectDropdown = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target specific labels identified in the plugin hbs template
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        // the input is the immediate next sibling as defined in the hbs
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        // find a rule matching the current label text (e.g., "include cal")
        const rule = rules.find(r => r.field_label_match && text.includes(r.field_label_match.toLowerCase()));

        if (rule?.is_dropdown) {
          label.dataset.processed = "true";
          const dropdown = document.createElement("select");
          dropdown.classList.add("custom-event-dropdown");

          // parse options: label|value format
          const opts = (rule.dropdown_options || "").split(/[|,]+/).map(o => {
            const [n, v] = o.includes("|") ? o.split("|") : [o, o];
            return { name: n.trim(), value: v.trim() };
          });

          opts.forEach(o => {
            const opt = document.createElement("option");
            opt.textContent = o.name;
            opt.value = o.value;
            if (nativeInput.value === o.value) opt.selected = true;
            dropdown.appendChild(opt);
          });

          dropdown.addEventListener("change", (e) => {
            nativeInput.value = e.target.value;
            // dispatch event so the plugin's hbs listener saves the choice
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          nativeInput.style.setProperty("display", "none", "important");
          label.after(dropdown);
        }
      });
    };

    // observe the modal for the appearance of custom field labels
    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectDropdown();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    // fallback to ensure injection triggers
    setTimeout(injectDropdown, 500);
  });
});