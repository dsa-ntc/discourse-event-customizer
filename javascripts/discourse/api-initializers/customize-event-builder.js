import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: aggressive lookup with an emergency fallback for your specific field
    const getRules = () => {
      try {
        const service = api.container.lookup("service:theme-settings");
        const rules = service?.fields || service?._fields || [];
        if (rules && rules.length > 0) return rules;
      } catch (e) {
        console.warn("theme settings service not ready; using emergency fallback.");
      }
      // fallback rule specifically for your "include cal" field
      return [{
        field_label_match: "include cal",
        is_dropdown: true,
        dropdown_options: "Yes|yes, No|no"
      }];
    };

    const activeRules = getRules();

    const injectDropdown = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target specific labels identified in the plugin hbs template
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        // check if this label matches our rules (or our fallback)
        const rule = activeRules.find(r => r.field_label_match && text.includes(r.field_label_match.toLowerCase()));

        if (rule?.is_dropdown) {
          label.dataset.processed = "true";
          const dropdown = document.createElement("select");
          dropdown.classList.add("custom-event-dropdown");

          // parse options from the rule
          const opts = (rule.dropdown_options || "Yes|yes, No|no").split(/[|,]+/).map(o => {
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
            // dispatch input so the plugin's hbs listener saves the data
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // force hide the native input and inject our select
          nativeInput.style.setProperty("display", "none", "important");
          label.after(dropdown);
        }
      });
    };

    // monitor the modal for custom fields
    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectDropdown();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectDropdown, 600);
  });
});