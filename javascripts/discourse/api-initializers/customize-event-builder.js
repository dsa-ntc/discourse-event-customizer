import { apiInitializer } from "discourse/lib/api";

// updated to 1.24.0 based on your core source discovery
export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    // modal identifier used by the calendar plugin
    if (data?.name === "post-event-builder") {
      
      // logic fix: retrieve rules from the service to avoid the persistent referenceerror
      const rulesService = api.container.lookup("service:theme-settings");
      const rules = rulesService?.get("fields") || [];
      
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // helper: adopts the { name, value } object pattern found in the plugin source
      const parseOptions = (val) => {
        if (!val) return [];
        const rawList = typeof val === 'string' ? val.split(/[|,]+/) : val;
        return rawList.map(item => {
          const [name, value] = item.includes("|") ? item.split("|") : [item, item];
          return { name: name.trim(), value: value.trim() };
        }).filter(opt => opt.name);
      };

      const transformFields = () => {
        const modal = document.querySelector(".post-event-builder-modal");
        // target the specific labels identified in the hbs template
        const customLabels = modal?.querySelectorAll(".custom-field-label");
        
        if (!customLabels?.length) return;

        customLabels.forEach((labelSpan) => {
          const labelText = labelSpan.textContent.trim().toLowerCase();
          // the input is the immediate next sibling in the plugin template
          const input = labelSpan.nextElementSibling;
          
          if (!input || input.tagName !== "INPUT") return;

          const rule = rules.find(r => {
            const categoryMatch = !r.target_categories?.length || r.target_categories.includes(currentCategoryId);
            const labelMatch = r.field_label_match && labelText.includes(r.field_label_match.toLowerCase());
            return categoryMatch && labelMatch;
          });

          if (rule && rule.is_dropdown) {
            if (labelSpan.dataset.transformed === "true") return;
            labelSpan.dataset.transformed = "true";

            const select = document.createElement("select");
            select.classList.add("custom-event-dropdown");
            
            const options = parseOptions(rule.dropdown_options);
            const finalOptions = options.length ? options : [
              { name: "select...", value: "" },
              { name: "yes", value: "yes" },
              { name: "no", value: "no" }
            ];
            
            finalOptions.forEach(opt => {
              const el = document.createElement("option");
              el.textContent = opt.name;
              el.value = opt.value;
              if (input.value === el.value) el.selected = true;
              select.appendChild(el);
            });

            select.addEventListener("change", (e) => {
              input.value = e.target.value;
              // trigger 'input' so the hbs {{on "input"}} listener fires correctly
              input.dispatchEvent(new Event("input", { bubbles: true }));
            });

            input.style.setProperty("display", "none", "important");
            labelSpan.after(select);
          }
        });
      };

      // wait for the dynamic glimmer custom field component to finish rendering
      const observer = new MutationObserver(() => {
        const modal = document.querySelector(".post-event-builder-modal");
        if (modal?.querySelector(".custom-field-label")) {
          transformFields();
          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(transformFields, 800);
    }
  });
});