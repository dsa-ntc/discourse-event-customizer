import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      const rules = settings?.fields || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      const listToArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(/[|,]+/).map(s => s.trim()).filter(Boolean) : [];
      };

      // Poll specifically for the unique class the plugin uses for its form rows
      let attempts = 0;
      const interval = setInterval(() => {
        const modal = document.querySelector(".post-event-builder-modal");
        const customRows = modal?.querySelectorAll(".discourse-post-event-builder-form-row.custom-field");
        
        if (customRows?.length || attempts > 30) {
          clearInterval(interval);
          if (!customRows?.length) return;

          const modalBody = modal.querySelector(".modal-body");
          const topTarget = modalBody?.querySelector(".discourse-post-event-builder-form-row");

          customRows.forEach((row) => {
            const label = row.querySelector(".label");
            const input = row.querySelector("input[type='text']");
            if (!label || !input) return;

            const labelText = label.textContent.trim().toLowerCase();
            const rule = rules.find(r => {
              const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
              const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
              return categoryMatch && labelMatch;
            });

            if (rule) {
              row.classList.add("transformed-custom-field");
              
              // Move field to the very top
              if (modalBody && topTarget) {
                modalBody.insertBefore(row, topTarget);
              }

              if (rule.is_dropdown && !row.querySelector(".custom-event-dropdown")) {
                const select = document.createElement("select");
                select.classList.add("custom-event-dropdown");
                const options = listToArr(rule.dropdown_options);
                const finalOptions = options.length ? options : ["Select...", "Yes", "No"];
                
                finalOptions.forEach(opt => {
                  const el = document.createElement("option");
                  const [t, v] = opt.includes("|") ? opt.split("|") : [opt, opt];
                  el.textContent = t.trim(); el.value = v.trim();
                  if (input.value === el.value) el.selected = true;
                  select.appendChild(el);
                });

                select.addEventListener("change", (e) => {
                  input.value = e.target.value;
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.dispatchEvent(new Event("change", { bubbles: true }));
                });

                input.style.display = "none";
                row.querySelector(".value").appendChild(select);
              }
            } else {
              row.style.display = "none";
            }
          });
        }
        attempts++;
      }, 150);
    }
  });
});