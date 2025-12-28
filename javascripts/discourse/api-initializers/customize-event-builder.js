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

      // We use a recurring check to ensure the plugin has finished building the modal
      let attempts = 0;
      const transformInterval = setInterval(() => {
        attempts++;
        const modal = document.querySelector(".post-event-builder-modal");
        // Looking specifically for the custom field container used by the plugin
        const customFieldWrappers = modal?.querySelectorAll(".discourse-post-event-builder-form-row.custom-field");
        
        if (customFieldWrappers?.length || attempts > 20) {
          clearInterval(transformInterval);
          
          if (!customFieldWrappers?.length) return;

          const modalBody = modal.querySelector(".modal-body");
          const firstSection = modalBody?.querySelector(".discourse-post-event-builder-form-row");

          customFieldWrappers.forEach((wrapper) => {
            const label = wrapper.querySelector(".label");
            const input = wrapper.querySelector("input[type='text']");
            if (!label || !input) return;

            const labelText = label.textContent.trim().toLowerCase();
            const rule = rules.find(r => {
              const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
              const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
              return categoryMatch && labelMatch;
            });

            if (rule) {
              wrapper.style.display = "flex";
              
              // Move the field to the top of the modal body
              if (modalBody && firstSection) {
                modalBody.insertBefore(wrapper, firstSection);
              }

              if (rule.is_dropdown && !wrapper.querySelector(".custom-event-dropdown")) {
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
                  // Critical: tell Discourse the value changed
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.dispatchEvent(new Event("change", { bubbles: true }));
                });

                input.style.display = "none";
                wrapper.appendChild(select);
              }
            } else {
              // Hide any fields that don't have an explicit rule
              wrapper.style.display = "none";
            }
          });
        }
      }, 100);
    }
  });
});