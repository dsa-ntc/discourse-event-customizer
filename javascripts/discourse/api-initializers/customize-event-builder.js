import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      // retrieve rules from theme settings
      const rules = settings?.fields || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // helper to convert strings/arrays into usable lists
      const listToArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(/[|,]+/).map(s => s.trim()).filter(Boolean) : [];
      };

      const transformFields = () => {
        const modal = document.querySelector(".post-event-builder-modal");
        // target the flat div structure seen in the inspector
        const eventFields = modal?.querySelectorAll(".event-field");
        
        if (!eventFields?.length) return;

        eventFields.forEach((field) => {
          const label = field.querySelector(".label");
          const input = field.querySelector("input[type='text']");
          const controlContainer = field.querySelector(".event-field-control");
          
          if (!label) return;

          const labelText = label.textContent.trim().toLowerCase();

          // identify if this specific row is a header we want to hide
          if (labelText.includes("custom fields") || labelText.includes("allowed custom fields")) {
            field.classList.add("event-field-to-hide");
            return;
          }

          // find matching rule for actual input fields
          const rule = rules.find(r => {
            const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
            const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
            return categoryMatch && labelMatch;
          });

          if (rule && input && controlContainer) {
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
                // force discourse to recognize the selection
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });

              input.style.display = "none";
              controlContainer.appendChild(select);
            }
            
            // move the matched field to the top of the form
            const form = modal.querySelector("form");
            const topField = form?.querySelector(".event-field");
            if (form && topField && field.previousElementSibling) {
              form.insertBefore(field, topField);
            }
          } else if (field.querySelector("input[type='text']") && !rule) {
            // hide custom fields that aren't explicitly defined in rules
            field.style.display = "none";
          }
        });
      };

      // observer to catch the dynamic modal content
      const observer = new MutationObserver((mutations, obs) => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelectorAll(".event-field").length > 0) {
          transformFields();
          obs.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(transformFields, 600); // slightly longer fallback delay
    }
  });
});