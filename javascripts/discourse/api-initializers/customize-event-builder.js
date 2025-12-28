import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      // retrieve automation rules from settings
      const rules = settings?.fields || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // helper to convert strings or arrays into usable lists
      const listToArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(/[|,]+/).map(s => s.trim()).filter(Boolean) : [];
      };

      const transformFields = () => {
        const modal = document.querySelector(".post-event-builder-modal");
        // target the specific rows used by the calendar plugin
        const rows = modal?.querySelectorAll(".discourse-post-event-builder-form-row.custom-field");
        
        if (!rows?.length) return;

        rows.forEach((row) => {
          const label = row.querySelector(".label");
          const input = row.querySelector("input[type='text']");
          const valueContainer = row.querySelector(".value");
          
          if (!label || !input || !valueContainer) return;

          const labelText = label.textContent.trim().toLowerCase();
          
          // find matching rule based on label text and category
          const rule = rules.find(r => {
            const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
            const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
            return categoryMatch && labelMatch;
          });

          if (rule) {
            // mark the row as transformed for css styling
            row.classList.add("transformed-custom-field");
            row.style.display = "flex";

            if (rule.is_dropdown && !row.querySelector(".custom-event-dropdown")) {
              const select = document.createElement("select");
              select.classList.add("custom-event-dropdown");
              
              const options = listToArr(rule.dropdown_options);
              const finalOptions = options.length ? options : ["select...", "yes", "no"];
              
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
                // notify discourse that the input value changed
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });

              // hide native input and append our dropdown
              input.style.display = "none";
              valueContainer.appendChild(select);
            }
            
            // move the custom field row to the top of the modal
            const modalBody = modal.querySelector(".modal-body");
            const topRow = modalBody?.querySelector(".discourse-post-event-builder-form-row");
            if (modalBody && topRow && row.previousElementSibling) {
              modalBody.insertBefore(row, topRow);
            }
          } else {
            // hide fields that do not have a corresponding rule
            row.style.display = "none";
          }
        });
      };

      // watch for dynamic changes in the modal body
      const observer = new MutationObserver((mutations, obs) => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelectorAll(".custom-field").length > 0) {
          transformFields();
          obs.disconnect();
        }
      });

      // begin observing to catch the fields as they render
      observer.observe(document.body, { childList: true, subtree: true });
      
      // fallback timeout to ensure execution
      setTimeout(transformFields, 500);
    }
  });
});