import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: direct property access to bypass the "get is not defined" error
    const activeRules = (() => {
      try {
        const themeSettings = api.container.lookup("service:theme-settings");
        // direct access to the fields property instead of using .get()
        return themeSettings?.fields || themeSettings?._fields || [];
      } catch (e) {
        return [];
      }
    })();

    const composer = api.container.lookup("controller:composer");
    const categoryId = composer?.model?.category?.id;

    const injectDropdown = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target the specific label spans confirmed by the plugin source
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const text = label.textContent.trim().toLowerCase();
        // the input is the immediate next sibling as defined in the hbs
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        // find a rule where the label match (e.g., "include cal") exists
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
            // critical: dispatch input so the plugin hbs listener triggers
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
    setTimeout(injectDropdown, 600);
  });
});