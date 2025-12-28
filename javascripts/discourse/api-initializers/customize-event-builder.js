import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      // retrieve automation rules from theme settings
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
        // target the flat div structure confirmed by your console check
        const eventFields = modal?.querySelectorAll(".event-field");
        
        if (!eventFields?.length) return;

        eventFields.forEach((field) => {
          // looking for labels inside the field or its immediate children
          const label = field.querySelector(".label") || field.querySelector(".event-field-label .label");
          const input = field.querySelector("input[type='text']");
          const controlContainer = field.querySelector(".event-field-control") || field;
          
          if (!label) return;

          const labelText = label.textContent.trim().toLowerCase();

          // hide the redundant plugin headers seen in image_9c1aa0.png
          if (labelText.includes("custom fields") || labelText.includes("allowed custom fields")) {
            field.classList.add("event-field-to-hide");
            field.style.setProperty("display", "none", "important");
            return;
          }

          // find matching rule for actual input fields
          const rule = rules.find(r => {
            const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
            const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
            return categoryMatch && labelMatch;
          });

          if (rule && input) {
            field.classList.add("transformed-custom-field");
            field.style.display = "flex";

            if (rule.is_dropdown && !field.querySelector(".custom-event-dropdown")) {
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
                // notify discourse of the value change
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });

              input.style.display = "none";
              controlContainer.appendChild(select);
            }
            
            // move the matched field to the very top of the modal body
            const modalBody = modal.querySelector(".modal-body");
            const topTarget = modalBody?.querySelector(".event-field");
            if (modalBody && topTarget && field.previousElementSibling) {
              modalBody.insertBefore(field, topTarget);
            }
          } else if (input && !rule) {
            // hide fields that do not have a corresponding theme rule
            field.style.display = "none";
          }
        });
      };

      // observer to handle dynamic loading of modal content
      const observer = new MutationObserver((mutations, obs) => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelectorAll(".event-field").length > 0) {
          transformFields();
          obs.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(transformFields, 600); // fallback for slower connections
    }
  });
});