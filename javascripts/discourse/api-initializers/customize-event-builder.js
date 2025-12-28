import { apiInitializer } from "discourse/lib/api";
import bootbox from "bootbox";
import I18n from "I18n";

export default apiInitializer("1.8.0", (api) => {
  api.onAppEvent("modal:show", (data) => {
    if (data.name === "post-event-builder") {
      // retrieve rules from settings or default to empty array
      const rules = settings.event_custom_field_rules || [];
      const composer = api.container.lookup("controller:composer");
      const currentCategoryId = composer?.get("model.category.id");

      // debugging: view rule data and category in browser console
      console.log("[event customizer] loaded rules:", rules);
      console.log("[event customizer] current category id:", currentCategoryId);

      setTimeout(() => {
        const fieldContainers = document.querySelectorAll(".custom-fields-section .field-wrapper");
        const createBtn = document.querySelector(".modal-footer .btn-primary");
        const cancelBtn = document.querySelector(".modal-footer .btn-danger, .modal-footer .cancel");
        const closeX = document.querySelector(".modal-header .close");

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
                if (result) {
                  api.container.lookup("service:modal").hide();
                }
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
            const catString = r.category_ids || "";
            const categoryList = catString.split("|").filter(Boolean).map(id => parseInt(id));
            return (categoryList.length === 0 || categoryList.includes(currentCategoryId)) && labelText.includes(r.field_label_match);
          });

          if (rule) {
            container.style.display = "block";
            if (rule.is_required) container.dataset.required = "true";

            // transform standard input into a dropdown
            if (rule.is_dropdown && !container.querySelector(".custom-event-dropdown")) {
              const select = document.createElement("select");
              select.classList.add("custom-event-dropdown");
              
              const options = rule.dropdown_options ? rule.dropdown_options.split("|") : ["Select...", "Yes", "No"];
              
              options.forEach(opt => {
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

                // apply tags automatically based on the user selection
                if (rule.tag_mappings) {
                  const validTags = Discourse.Site.currentProp("valid_tags") || [];
                  const mappings = rule.tag_mappings.split("|");
                  
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

                // append the styled metadata block to the topic text
                if (rule.auto_include_in_post) {
                  const content = `**${rule.field_label_match}:** ${val}`;
                  const injection = `\n\n<div class="event-metadata">\n${content}\n</div>`;
                  const currentReply = composer.get("model.reply");
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