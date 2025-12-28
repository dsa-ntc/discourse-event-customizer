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

      const transformFields = () => {
        const modal = document.querySelector(".post-event-builder-modal");
        // Target the specific form rows used by the Discourse Post Event plugin
        const rows = modal?.querySelectorAll(".discourse-post-event-builder-form-row.custom-field");
        
        if (!rows?.length) return;

        rows.forEach((row) => {
          const label = row.querySelector(".label");
          const input = row.querySelector("input[type='text']");
          const valueContainer = row.querySelector(".value");
          
          if (!label || !input || !valueContainer) return;

          const labelText = label.textContent.trim().toLowerCase();
          const rule = rules.find(r => {
            const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
            const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
            return categoryMatch && labelMatch;
          });

          if (rule) {
            // Add the class your CSS expects
            row.classList.add("transformed-custom-field");
            row.style.display = "flex";

            if (rule.is_dropdown && !row.querySelector(".custom-event-dropdown")) {
              const select = document.createElement("select");
              select.classList.add("custom-event-dropdown");
              
              const options = listToArr(rule.dropdown_options);
              const finalOptions = options.length ? options : ["Select...", "Yes", "No"];
              
              finalOptions.forEach(opt => {
                const el = document.createElement("option");
                const [t, v] = opt.includes("|") ? opt.split("|") : [opt, opt];
                el.textContent = t.trim(); 
                el.value = v.trim();
                if (input.value === el.value) el.selected = true;
                select.appendChild(el);
              });

              select.addEventListener("change", (e) => {
                input.value = e.target.value;
                // Force Discourse to recognize the change
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });

              input.style.display = "none";
              valueContainer.appendChild(select);
            }
            
            // Move field to top of modal body
            const modalBody = modal.querySelector(".modal-body");
            const topRow = modalBody?.querySelector(".discourse-post-event-builder-form-row");
            if (modalBody && topRow && row.previousElementSibling) {
              modalBody.insertBefore(row, topRow);
            }
          } else {
            row.style.display = "none";
          }
        });
      };

      // Use an observer to catch the dynamic rendering
      const observer = new MutationObserver((mutations, obs) => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelectorAll(".custom-field").length > 0) {
          transformFields();
          obs.disconnect(); // Stop watching once fields are found
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      
      // Safety timeout in case observer fails
      setTimeout(transformFields, 500);
    }
  });
});