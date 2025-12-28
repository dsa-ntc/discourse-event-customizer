import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // logic change: use a direct closure for rules to bypass the referenceerror
    const activeRules = (() => {
      try {
        const themeSettings = api.container.lookup("service:theme-settings");
        return themeSettings?.get("fields") || [];
      } catch (e) {
        return [];
      }
    })();

    const composer = api.container.lookup("controller:composer");
    const categoryId = composer?.get("model.category.id");

    const injectDropdown = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target the specific span from the plugin source you identified
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        // the input is the immediate next sibling in the template
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        const rule = activeRules.find(r => {
          const catMatch = !r.target_categories?.length || r.target_categories.includes(categoryId);
          const labelMatch = r.field_label_match && text.includes(r.field_label_match.toLowerCase());
          return catMatch && labelMatch;
        });

        if (rule?.is_dropdown) {
          label.dataset.processed = "true";
          const dropdown = document.createElement("select");
          dropdown.classList.add("custom-event-dropdown");

          // parse rules: label|value format
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
            // dispatch input event so the plugin's {{on "input"}} listener triggers
            nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          nativeInput.style.setProperty("display", "none", "important");
          label.after(dropdown);
        }
      });
    };

    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectDropdown();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectDropdown, 500);
  });
});