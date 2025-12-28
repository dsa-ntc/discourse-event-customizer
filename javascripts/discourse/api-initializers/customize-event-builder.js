import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    // modal identifier from the calendar plugin
    if (data?.name === "post-event-builder") {
      
      // logic fix: try multiple ways to get rules to stop the reference errors
      const getRules = () => {
        try {
          // try standard theme settings service first
          const service = api.container.lookup("service:theme-settings");
          if (service) return service.get("fields") || [];
          
          // fallback to site settings if theme service is restricted
          return settings?.fields || [];
        } catch (e) {
          return [];
        }
      };

      const rules = getRules();
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      const listToArr = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return typeof val === 'string' ? val.split(/[|,]+/).map(s => s.trim()).filter(Boolean) : [];
      };

      const transformFields = () => {
        const modal = document.querySelector(".post-event-builder-modal");
        // target the .event-field class confirmed by your inspector
        const eventFields = modal?.querySelectorAll(".event-field");
        
        if (!eventFields?.length) return;

        eventFields.forEach((field) => {
          // target labels and containers precisely
          const labelSpan = field.querySelector(".event-field-label .label") || field.querySelector(".label");
          const controlContainer = field.querySelector(".event-field-control");
          const input = field.querySelector("input[type='text']");
          
          if (!labelSpan) return;

          const labelText = labelSpan.textContent.trim().toLowerCase();

          // hide redundant header and description rows
          if (labelText.includes("custom fields") || labelText.includes("allowed custom fields")) {
            field.classList.add("event-field-to-hide");
            field.style.setProperty("display", "none", "important");
            return;
          }

          // match the label "include cal" to your rules
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
                // notify discourse that the input has changed
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });

              input.style.display = "none";
              controlContainer.appendChild(select);
            }
            
            // move the field to the top of the form body
            const modalBody = modal.querySelector(".modal-body form") || modal.querySelector("form");
            const firstField = modalBody?.querySelector(".event-field");
            if (modalBody && firstField && field !== firstField) {
              modalBody.insertBefore(field, firstField);
            }
          } else if (input && !rule) {
            // hide any custom field not defined in the theme rules
            field.style.display = "none";
          }
        });
      };

      // observer to handle dynamic loading of the form component
      const observer = new MutationObserver(() => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelectorAll(".event-field").length > 0) {
          transformFields();
          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(transformFields, 800);
    }
  });
});