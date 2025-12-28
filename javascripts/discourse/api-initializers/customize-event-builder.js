import { apiInitializer } from "discourse/lib/api";
import bootbox from "bootbox";
import I18n from "I18n";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data?.name === "post-event-builder") {
      // safely retrieve rules from settings
      const rules = settings?.event_custom_field_rules || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // debugging: view rule data in console
      console.log("[event customizer] rules:", rules);

      setTimeout(() => {
        const fieldContainers = document.querySelectorAll(".custom-fields-section .field-wrapper");
        const createBtn = document.querySelector(".modal-footer .btn-primary");
        const cancelBtn = document.querySelector(".modal-footer .cancel, .modal-footer .btn-danger");
        const closeX = document.querySelector(".modal-header .close");

        if (!fieldContainers.length) return;

        // helper to safely turn settings strings or arrays into usable arrays
        const listToArr = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          return typeof val === 'string' ? val.split("|").filter(Boolean) : [];
        };

        // validation logic to ensure required fields are filled before creation
        const checkValidation = () => {
          let allValid = true;
          fieldContainers.forEach(container => {
            const dropdown = container.querySelector(".custom-event-dropdown");
            if (container.dataset.required === "true" && dropdown && (dropdown.value === "" || dropdown.value === "Select...")) {
              allValid = false;
            }
          });
          if (createBtn) createBtn.disabled = !allValid;
        };

        // confirmation dialog logic to prevent data loss on accidental close
        const handleCancel = (e) => {
          let hasData = false;
          fieldContainers.forEach(container => {
            const dropdown = container.querySelector(".custom-event-dropdown");
            if (dropdown && dropdown.value !== "" && dropdown.value !== "Select...") hasData = true;
          });

          if (hasData) {
            e.preventDefault();
            e.stopPropagation();
            bootbox.confirm(
              "You have unsaved selections in your custom fields. Are you sure you want to close without saving?",
              (result) => {
                if (result) api.container.lookup("service:modal").hide();
              }
            );
          }
        };

        [cancelBtn, closeX].forEach(el => el?.addEventListener("click", handleCancel, true));

        fieldContainers.forEach((container) => {
          const label = container.querySelector(".field-label");
          const input = container.querySelector("input");
          const labelText = label?.textContent.trim() || "";

          // match the current field to the rules defined in settings
          const rule = rules.find(r => {
            const categoryList = listToArr(r.category_ids).map(id => parseInt(id));
            const categoryMatch = categoryList.length === 0 || categoryList.includes(currentCategoryId);
            return categoryMatch && labelText.includes(r.field_label_match);
          });

          if (rule) {
            container.style.display = "block";
            if (rule.is_required) container.dataset.required = "true";

            // transform standard input into a dropdown
            if (rule.is_dropdown && !container.querySelector(".custom-event-dropdown")) {
              const select = document.createElement("select");
              select.classList.add("custom-event-dropdown");
              
              const options = listToArr(rule.dropdown_options);
              const finalOptions = options.length ? options : ["Select...", "Yes", "No"];
              
              finalOptions.forEach(opt => {
                const el = document.createElement("option");
                const trimmed = opt.trim();
                const [t, v] = trimmed.includes("|") ? trimmed.split("|") : [trimmed, trimmed];
                el.textContent = t.trim(); el.value = v.trim();
                if (input.value === el.value) el.selected = true;
                select.appendChild(el);
              });

              select.addEventListener("change", (e) => {
                input.value = e.target.value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                checkValidation();
              });

              input.style.display = "none";
              container.appendChild(select);
            }

            if (createBtn) {
              createBtn.addEventListener("click", () => {
                const val = input.value;
                if (!val || val === "Select...") return;

                // apply tags automatically based on user selection
                if (rule.tag_mappings) {
                  const validTags = Discourse.Site.currentProp("valid_tags") || [];
                  const mappings = listToArr(rule.tag_mappings);
                  
                  mappings.forEach(m => {
                    const parts = m.split("|");
                    if (parts.length === 2) {
                      const [optVal, tagName] = parts;
                      const cleanTag = tagName.trim();
                      if (optVal.trim() === val) {
                        // notify if the mapped tag is missing from the site
                        if (!validTags.includes(cleanTag)) {
                          bootbox.alert(`<b>warning:</b> the tag <code>${cleanTag}</code> does not exist on this site.`);
                        }
                        const currentTags = composer.get("model.tags") || [];
                        if (!currentTags.includes(cleanTag)) {
                          currentTags.push(cleanTag);
                          composer.set("model.tags", currentTags);
                        }
                      }
                    }
                  });
                }

                // append styled metadata block to the topic text
                if (rule.auto_include_in_post) {
                  const content = `**${rule.field_label_match}:** ${val}`;
                  const injection = `\n\n<div class="event-metadata">\n${content}\n</div>`;
                  const currentReply = composer.get("model.reply") || "";
                  if (!currentReply.includes(content)) {
                    composer.set("model.reply", currentReply + injection);
                  }
                }
              }, { once: true });
            }
          } else {
            // hide fields that don't apply to this category
            container.style.display = "none";
          }
        });

        checkValidation();
      }, 200);
    }
  });
});