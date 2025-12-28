import { apiInitializer } from "discourse/lib/api";
import I18n from "I18n";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      const rules = settings?.fields || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // helper for fields that are still strings (like options or mappings)
      const listToArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(/[|,]+/).map(s => s.trim()).filter(Boolean) : [];
      };

      setTimeout(() => {
        try {
          const fieldContainers = document.querySelectorAll(".custom-fields-section .field-wrapper");
          if (!fieldContainers.length) return;

          fieldContainers.forEach((container) => {
            const label = container.querySelector(".field-label");
            const input = container.querySelector("input");
            if (!label || !input) return;

            const labelText = label.textContent.trim() || "";
            const rule = rules.find(r => {
              // target_categories is now a native array
              const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
              return categoryMatch && r.field_label_match && labelText.includes(r.field_label_match);
            });

            if (rule) {
              container.style.display = "block";
              if (rule.is_dropdown && !container.querySelector(".custom-event-dropdown")) {
                const select = document.createElement("select");
                select.classList.add("custom-event-dropdown");
                const options = listToArr(rule.dropdown_options);
                const finalOptions = options.length ? options : ["Select...", "Yes", "No"];
                
                finalOptions.forEach(opt => {
                  const el = document.createElement("option");
                  const trimmed = opt.trim();
                  const [t, v] = trimmed.includes("|") ? trimmed.split("|") : [trimmed, trimmed];
                  el.textContent = t.trim(); el.value = v.trim();
                  if (input.value === el.value) el.selected = true;
                  select.appendChild(el);
                });

                select.addEventListener("change", (e) => {
                  input.value = e.target.value;
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                });
                input.style.display = "none";
                container.appendChild(select);
              }
            } else {
              container.style.display = "none";
            }
          });
        } catch (err) { console.error("[event customizer] error:", err); }
      }, 200);
    }
  });
});