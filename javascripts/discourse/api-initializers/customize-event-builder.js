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

      setTimeout(() => {
        try {
          // updated selector to match the calendar plugin's specific markup
          const fieldRows = document.querySelectorAll(".post-event-builder-modal .custom-field-row");
          const modalBody = document.querySelector(".post-event-builder-modal .modal-body");
          const firstSection = modalBody?.querySelector(".event-builder-section");

          if (!fieldRows.length) return;

          fieldRows.forEach((row) => {
            const label = row.querySelector(".field-label");
            const input = row.querySelector("input");
            if (!label || !input) return;

            const labelText = label.textContent.trim().toLowerCase();
            const rule = rules.find(r => {
              const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
              const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
              return categoryMatch && labelMatch;
            });

            if (rule) {
              row.style.display = "block";
              
              // logic to move the field to the top of the modal
              if (modalBody && firstSection) {
                modalBody.insertBefore(row, firstSection);
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
                });

                input.style.display = "none";
                row.appendChild(select);
              }
            } else {
              row.style.display = "none";
            }
          });
        } catch (err) { console.error("[event customizer] error:", err); }
      }, 300); // increased delay to ensure plugin finishes rendering
    }
  });
});