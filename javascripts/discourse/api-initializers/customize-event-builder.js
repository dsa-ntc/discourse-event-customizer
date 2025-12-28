import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("1.24.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name !== "post-event-builder") return;

    // fix: bypass .get() typeerror by using direct property access
    const settingsService = api.container.lookup("service:theme-settings");
    const rawRules = settingsService?.fields || settingsService?._fields || [];

    // parse strings like "include cal : checkbox"
    const rules = rawRules.map(ruleString => {
      const parts = ruleString.split(":").map(s => s.trim());
      return { 
        label: parts[0]?.toLowerCase(), 
        type: parts[1]?.toLowerCase(), 
        options: parts[2] // only used for dropdowns
      };
    });

    const injectField = () => {
      const modal = document.querySelector(".post-event-builder-modal");
      // target specific labels identified in the plugin hbs template
      const labels = modal?.querySelectorAll(".custom-field-label");

      labels?.forEach((label) => {
        if (label.dataset.processed === "true") return;

        const labelText = label.textContent.trim().toLowerCase();
        const nativeInput = label.nextElementSibling;

        if (!nativeInput || nativeInput.tagName !== "INPUT") return;

        const rule = rules.find(r => labelText.includes(r.label));

        if (rule) {
          label.dataset.processed = "true";
          nativeInput.style.setProperty("display", "none", "important");

          if (rule.type === "checkbox") {
            const checkWrap = document.createElement("label");
            checkWrap.classList.add("custom-event-checkbox-wrap");
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            // checkboxes are boolean: "yes" if checked, "no" if not
            checkbox.checked = nativeInput.value === "yes";
            
            checkbox.addEventListener("change", (e) => {
              nativeInput.value = e.target.checked ? "yes" : "no";
              // trigger hbs {{on "input"}} listener to save
              nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
            });
            
            label.after(checkWrap);
            checkWrap.appendChild(checkbox);
          } 
          else if (rule.type === "dropdown") {
            const select = document.createElement("select");
            select.classList.add("custom-event-dropdown");
            
            // default dropdown options if none provided in string
            const opts = (rule.options || "Yes|yes, No|no").split(/[|,]+/).map(o => {
              const [n, v] = o.includes("|") ? o.split("|") : [o, o];
              return { name: n.trim(), value: v.trim() };
            });

            opts.forEach(o => {
              const opt = document.createElement("option");
              opt.textContent = o.name;
              opt.value = o.value;
              if (nativeInput.value === o.value) opt.selected = true;
              select.appendChild(opt);
            });

            select.addEventListener("change", (e) => {
              nativeInput.value = e.target.value;
              nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
            });

            label.after(select);
          }
        }
      });
    };

    // monitor for the appearance of custom field labels
    const observer = new MutationObserver(() => {
      if (document.querySelector(".custom-field-label")) {
        injectField();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectField, 600);
  });
});