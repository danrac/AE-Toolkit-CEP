(function () {
    var store = window.AEToolkitTemplates, cs = new CSInterface(), state = store.defaultState(), selectedTemplateId = state.templates[0].id, selectedCompPresetId = state.compPresets[0].id, templateDraft, compPresetDraft, sourceDiscovery = null;
    var folderLabels = { afterEffects: "AE Projects", assets: "Assets", toGfx: "Graphic In", outputs: "Graphic Out", styleFrames: "Style Frames" };
    function byId(id) { return document.getElementById(id); }
    function status(message, error) { var target = byId("status"); target.textContent = message; target.style.color = error ? "#ff9d9d" : "#91d0a4"; }
    function callHost(name, argument, callback) { var setup = "", root = cs.getExtensionPath(); if (root) setup = "AEToolkitHostDirectory = new Folder(" + JSON.stringify(root + "/host") + ").fsName;"; cs.evalScript(setup + name + "(" + JSON.stringify(argument || "") + ")", callback); }
    function save(onSaved) { callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result === "OK") { if (onSaved) onSaved(); } else status(result || "Could not save project templates.", true); }); }
    function templateById(id) { return state.templates.filter(function (template) { return template.id === id; })[0]; }
    function projectById(id) { return state.projects.filter(function (project) { return project.id === id; })[0]; }
    function activeProject() { return projectById(state.activeProjectId) || state.projects[0]; }
    function pathLabel(project, key) {
        var template = templateById(project.templateId), custom = template && (template.customFolders || []).filter(function (entry) { return entry.id === key; })[0];
        if (custom) return custom.label;
        var path = template && template.folders && template.folders[key];
        if (path) return String(path).replace(/\\/g, "/").replace(/\/+$/g, "").split("/").pop();
        return folderLabels[key] || key;
    }
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    function startTemplateDraft(template) {
        template = template || { id: "", name: "", folders: {}, customFolders: [] };
        templateDraft = { id: template.id || "", name: template.name || "", folders: copy(template.folders || {}), customFolders: copy(template.customFolders || []), namingFields: store.namingFields(template) };
    }
    function renderTemplateSelect() { var select = byId("project-template"); select.innerHTML = ""; state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.appendChild(option); }); }
    function renderTemplates() {
        var list = byId("template-list"); list.innerHTML = "";
        state.templates.forEach(function (template) { var item = document.createElement("button"), title = document.createElement("strong"), detail = document.createElement("small"); item.className = "list-item"; title.textContent = template.name; detail.textContent = template.id; item.appendChild(title); item.appendChild(detail); item.onclick = function () { selectedTemplateId = template.id; startTemplateDraft(template); renderTemplateForm(); }; list.appendChild(item); });
        renderTemplateSelect();
    }
    var namingValues = {}, namingContext = "";
    function activeNamingFields() { return store.namingFields(activeProject() && templateById(activeProject().templateId)); }
    function namingFormat() { var preset = presetFor("comp"); return preset ? store.compFormatCode(preset) : byId("comp-width").value + "x" + byId("comp-height").value; }
    function renderCompNamePreview() {
        try { byId("comp-name-preview").textContent = store.formatNaming(activeNamingFields(), namingValues[namingContext] || {}, namingFormat()); }
        catch (error) { byId("comp-name-preview").textContent = error.message; }
    }
    function renderCompNamingFields() {
        var project = activeProject(); namingContext = project ? project.id + ":" + project.templateId : "default";
        var values = namingValues[namingContext] || (namingValues[namingContext] = {}), grid = byId("comp-naming-fields"); clearChildren(grid);
        activeNamingFields().forEach(function (field) {
            if (field.type === "format") return;
            var label = document.createElement("label"), input = document.createElement("input"); label.textContent = field.label;
            input.type = field.type === "version" ? "number" : "text"; if (field.type === "version") { input.min = "0"; input.step = "1"; }
            input.value = Object.prototype.hasOwnProperty.call(values, field.id) ? values[field.id] : field.value;
            input.placeholder = field.label;
            input.oninput = function () { values[field.id] = input.value; renderCompNamePreview(); };
            label.appendChild(input); grid.appendChild(label);
        });
        renderCompNamePreview();
    }
    function namingPresets() { return [{ id: "default", name: "Default", namingFields: store.namingFields({}) }].concat(state.namingPresets || []); }
    function renderNamingPresets() {
        var select = byId("naming-preset"); clearChildren(select);
        var custom = document.createElement("option"); custom.value = ""; custom.textContent = "Custom"; select.appendChild(custom);
        var match = "";
        namingPresets().forEach(function (preset) { var option = document.createElement("option"); option.value = preset.id; option.textContent = preset.name; select.appendChild(option); if (JSON.stringify(preset.namingFields) === JSON.stringify(templateDraft.namingFields)) match = preset.id; });
        select.value = match; byId("remove-naming-preset").disabled = !match || match === "default";
    }
    function namingDialog(title, populate, commit) {
        var dialog = byId("naming-dialog"), fields = byId("naming-dialog-fields"); clearChildren(fields); byId("naming-dialog-title").textContent = title; byId("naming-dialog-error").textContent = "";
        populate(fields);
        byId("naming-dialog-form").onsubmit = function (event) { event.preventDefault(); try { commit(); dialog.close(); } catch (error) { byId("naming-dialog-error").textContent = error.message; } };
        byId("naming-dialog-cancel").onclick = function () { dialog.close(); };
        dialog.showModal();
    }
    function editNamingField(index) {
        var original = templateDraft.namingFields[index], field = copy(original || { id: "field" + Date.now(), label: "", type: "text", value: "", prefix: "v", digits: 2 });
        namingDialog(original ? "Module preferences" : "Add module", function (container) {
            function input(labelText, key, type) { var label = document.createElement("label"), control = document.createElement("input"); label.textContent = labelText; control.type = type || "text"; control.value = field[key]; if (key === "digits") { control.min = "1"; control.max = "6"; } control.oninput = function () { field[key] = key === "digits" ? Number(control.value) : control.value; }; label.appendChild(control); container.appendChild(label); return label; }
            input("Name", "label");
            var label = document.createElement("label"), select = document.createElement("select"); label.textContent = "Type";
            [["text", "Text"], ["version", "Version"], ["format", "Comp format"]].forEach(function (pair) { var option = document.createElement("option"); option.value = pair[0]; option.textContent = pair[1]; select.appendChild(option); });
            select.value = field.type; label.appendChild(select); container.appendChild(label);
            var defaultField = input("Default", "value"), prefix = input("Prefix", "prefix"), digits = input("Digits", "digits", "number");
            function update() { defaultField.hidden = field.type === "format"; prefix.hidden = digits.hidden = field.type !== "version"; defaultField.lastChild.type = field.type === "version" ? "number" : "text"; if (field.type === "version") { defaultField.lastChild.min = "0"; defaultField.lastChild.step = "1"; } }
            select.onchange = function () { field.type = select.value; if (field.type === "version" && !/^\d+$/.test(field.value)) field.value = "1"; defaultField.lastChild.value = field.value; update(); }; update();
        }, function () { var fields = copy(templateDraft.namingFields); if (original) fields[index] = field; else fields.push(field); templateDraft.namingFields = store.namingFields({ namingFields: fields }); renderNamingOrder(); });
    }
    function renderNamingOrder() {
        var container = byId("naming-order"); clearChildren(container); renderNamingPresets();
        function move(from, to) { if (to < 0 || to >= templateDraft.namingFields.length) return; var field = templateDraft.namingFields.splice(from, 1)[0]; templateDraft.namingFields.splice(to, 0, field); renderNamingOrder(); container.children[to].focus(); }
        templateDraft.namingFields.forEach(function (field, index) {
            var row = document.createElement("div"), name = document.createElement("span"); row.className = "naming-row"; row.draggable = true; row.tabIndex = 0; row.title = "Drag to reorder; Alt + Up/Down with keyboard"; name.textContent = field.label; row.appendChild(name);
            row.ondragstart = function (event) { event.dataTransfer.setData("text/plain", String(index)); };
            row.ondragover = function (event) { event.preventDefault(); };
            row.ondrop = function (event) { event.preventDefault(); var from = Number(event.dataTransfer.getData("text/plain")); if (isFinite(from) && from >= 0 && from < templateDraft.namingFields.length) move(from, index); };
            row.onkeydown = function (event) { if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) { event.preventDefault(); move(index, index + (event.key === "ArrowUp" ? -1 : 1)); } };
            [["Edit", '<path d="m4 16 11-11 4 4-11 11H4zM13 7l4 4"/>'], ["Remove", '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 10v7m4-7v7"/>']].forEach(function (action) {
                var button = document.createElement("button"); button.className = "tool-icon"; button.title = action[0] + " " + field.label; button.setAttribute("aria-label", button.title); button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + action[1] + '</svg>';
                button.disabled = action[0] === "Remove" && templateDraft.namingFields.length === 1;
                button.onclick = function () { if (action[0] === "Edit") editNamingField(index); else { templateDraft.namingFields.splice(index, 1); renderNamingOrder(); } }; row.appendChild(button);
            }); container.appendChild(row);
        });
        try { byId("naming-preview").textContent = store.previewNaming(store.namingFields(templateDraft)); } catch (error) { byId("naming-preview").textContent = error.message; }
    }
    function renderTemplateForm() {
        var template = templateDraft || templateById(selectedTemplateId) || { id: "", name: "", folders: {}, customFolders: [] }; byId("template-name").value = template.name; byId("template-name").oninput = function () { templateDraft.name = byId("template-name").value; }; byId("template-form-title").textContent = template.id ? "Edit template" : "New template";
        renderNamingOrder();
        var grid = byId("template-folders"); grid.innerHTML = "";
        store.FOLDER_KEYS.forEach(function (key) { var label = document.createElement("label"); label.textContent = folderLabels[key]; if (key === "styleFrames") label.className = "full-row"; var input = document.createElement("input"); input.dataset.key = key; input.value = template.folders[key] || ""; input.placeholder = "Relative folder"; input.oninput = function () { templateDraft.folders[key] = input.value; }; label.appendChild(input); grid.appendChild(label); });
        template.customFolders.forEach(function (entry, index) { var row = document.createElement("div"), labelField = document.createElement("label"), pathField = document.createElement("label"), labelInput = document.createElement("input"), pathInput = document.createElement("input"), remove = document.createElement("button"); row.className = "custom-location"; labelField.textContent = "Custom name"; labelInput.value = entry.label; labelInput.oninput = function () { templateDraft.customFolders[index].label = labelInput.value; }; labelField.appendChild(labelInput); pathField.textContent = "Relative folder"; pathInput.value = entry.path; pathInput.oninput = function () { templateDraft.customFolders[index].path = pathInput.value; }; pathField.appendChild(pathInput); remove.textContent = "Remove"; remove.onclick = function () { templateDraft.customFolders.splice(index, 1); renderTemplateForm(); }; row.appendChild(labelField); row.appendChild(pathField); row.appendChild(remove); grid.appendChild(row); });
    }
    function renderProjects() {
        var list = byId("project-list"); list.innerHTML = "";
        state.projects.forEach(function (project) { var paths = store.resolveProjectPaths(state, project.id), item = document.createElement("div"), title = document.createElement("strong"), root = document.createElement("small"), pathsList = document.createElement("div"); item.className = "list-item"; title.textContent = project.name + (project.id === state.activeProjectId ? " · Active" : ""); root.textContent = project.root; pathsList.className = "resolved-paths"; Object.keys(paths).forEach(function (key) { if (!paths[key]) return; var row = document.createElement("div"), label = document.createElement("strong"), value = document.createElement("span"), reveal = document.createElement("button"); row.className = "resolved-path"; label.textContent = pathLabel(project, key); value.textContent = paths[key]; reveal.textContent = "Reveal"; reveal.onclick = function () { callHost("aetoolkitCepRevealFolder", paths[key], function (result) { status(result === "OK" ? "Opened " + paths[key] : result, result !== "OK"); }); }; row.appendChild(label); row.appendChild(value); row.appendChild(reveal); pathsList.appendChild(row); }); item.appendChild(title); item.appendChild(root); item.appendChild(pathsList); list.appendChild(item); });
    }
    function clearChildren(target) { while (target.firstChild) target.removeChild(target.firstChild); }
    function projectActionButton(target, label, handler) { var button = document.createElement("button"); button.textContent = label; button.title = label; button.onclick = handler; target.appendChild(button); }
    function showHostResult(result, successMessage) { if (result === "CANCELLED") status("No changes made."); else if (result && result.indexOf("ERROR:") === 0) status(result, true); else status(successMessage || result || "Done."); }
    function compPresets() { return store.compPresets(state); }
    function compPresetById(id) { return compPresets().filter(function (preset) { return preset.id === id; })[0]; }
    function presetFor(prefix) { return compPresetById(byId(prefix + "-preset").value); }
    function compOptions() { var width = byId("comp-width").value, height = byId("comp-height").value, preset = presetFor("comp"); return { namingFields: activeNamingFields(), namingValues: namingValues[namingContext] || {}, width: width, height: height, fps: byId("comp-fps").value, duration: byId("comp-duration").value, format: preset ? store.compFormatCode(preset) : width + "x" + height, guideAssets: preset && preset.assets || {}, addGuides: byId("comp-add-guides").checked }; }
    function coverOptions() { var preset = presetFor("cover"); return { width: byId("cover-width").value, height: byId("cover-height").value, fps: byId("cover-fps").value, duration: byId("cover-duration").value, format: preset ? store.compFormatCode(preset) : byId("cover-width").value + "x" + byId("cover-height").value, topLine: byId("cover-top-line").value, bottomLine: byId("cover-bottom-line").value, date: byId("cover-date").value, spot: byId("cover-spot").value }; }
    function checkerOptions() { return { width: byId("checker-width").value, height: byId("checker-height").value, frame: byId("checker-frame").value }; }
    function renderFormatSelect(prefix) { var select = byId(prefix + "-preset"), selected = select.value; select.innerHTML = ""; compPresets().forEach(function (preset) { var option = document.createElement("option"); option.value = preset.id; option.textContent = preset.name + " · " + preset.width + " × " + preset.height; select.appendChild(option); }); var custom = document.createElement("option"); custom.value = "custom"; custom.textContent = "Custom"; select.appendChild(custom); select.value = selected ? (compPresetById(selected) ? selected : "custom") : (compPresets().length ? compPresets()[0].id : "custom"); }
    function renderFormatSelects() { renderFormatSelect("comp"); renderFormatSelect("modify"); renderFormatSelect("cover"); renderFormatSelect("checker"); }
    function wireFormatPreset(prefix) { byId(prefix + "-preset").onchange = function () { var preset = presetFor(prefix); if (preset) { byId(prefix + "-width").value = preset.width; byId(prefix + "-height").value = preset.height; } }; }
    function startCompPresetDraft(preset) { preset = preset || { id: "", name: "", width: "", height: "", assets: { matte: "", chartOne: "" } }; compPresetDraft = { id: preset.id || "", name: preset.name || "", formatCode: preset.id ? store.compFormatCode(preset) : "", width: preset.width || "", height: preset.height || "", assets: copy(preset.assets || {}) }; }
    function renderCompPresetForm() { var select = byId("saved-comp-preset"); select.innerHTML = ""; compPresets().forEach(function (preset) { var option = document.createElement("option"); option.value = preset.id; option.textContent = preset.name + " · " + preset.width + " × " + preset.height; select.appendChild(option); }); if (compPresetDraft.id) select.value = compPresetDraft.id; byId("saved-comp-preset-name").value = compPresetDraft.name; byId("saved-comp-preset-code").value = compPresetDraft.formatCode; byId("saved-comp-preset-width").value = compPresetDraft.width; byId("saved-comp-preset-height").value = compPresetDraft.height; select.value = compPresetDraft.id || ""; byId("remove-comp-preset").disabled = !compPresetDraft.id; renderFormatAssets(); }
    function renderFormatAssets() {
        var list = byId("format-assets"); clearChildren(list);
        Object.keys(compPresetDraft.assets).forEach(function (key) {
            var row = document.createElement("div"), type = document.createElement("select"), path = document.createElement("input"), browse = document.createElement("button"), remove = document.createElement("button");
            row.className = "format-asset-row";
            ["matte", "guide"].forEach(function (value) { var option = document.createElement("option"); option.value = value; option.textContent = value === "matte" ? "Matte" : "Guide"; type.appendChild(option); });
            type.value = key.indexOf("matte") === 0 ? "matte" : "guide"; type.setAttribute("aria-label", "Asset type");
            path.value = compPresetDraft.assets[key]; path.readOnly = true; path.placeholder = "Choose file"; path.title = path.value; path.setAttribute("aria-label", "Guide file");
            type.onchange = function () { var next = this.value + "_" + Date.now().toString(36), assets = {}; while (Object.prototype.hasOwnProperty.call(compPresetDraft.assets, next)) next += "a"; Object.keys(compPresetDraft.assets).forEach(function (id) { assets[id === key ? next : id] = compPresetDraft.assets[id]; }); compPresetDraft.assets = assets; renderFormatAssets(); };
            browse.textContent = "…"; browse.title = "Choose file"; browse.setAttribute("aria-label", "Choose guide file"); browse.onclick = function () { var draft = compPresetDraft; callHost("aetoolkitCepChooseGuideAsset", "", function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); else if (result && draft === compPresetDraft && Object.prototype.hasOwnProperty.call(draft.assets, key)) { draft.assets[key] = result; renderFormatAssets(); } }); };
            remove.textContent = "×"; remove.title = "Remove asset"; remove.setAttribute("aria-label", "Remove asset"); remove.onclick = function () { delete compPresetDraft.assets[key]; renderFormatAssets(); };
            row.appendChild(type); row.appendChild(path); row.appendChild(browse); row.appendChild(remove); list.appendChild(row);
        });
    }
    function renderSourceDiscovery() {
        var list = byId("source-project-records"), importButton = byId("source-import-projects"); clearChildren(list);
        if (!sourceDiscovery) { importButton.disabled = true; return; }
        (sourceDiscovery.records || []).forEach(function (record) { var row = document.createElement("label"), check = document.createElement("input"), detail = document.createElement("div"), name = document.createElement("strong"), path = document.createElement("small"); row.className = "source-record"; check.type = "checkbox"; check.value = record.path; check.checked = record.exists; check.disabled = !record.exists; name.textContent = record.exists ? "Found" : "Missing"; path.textContent = record.path; detail.appendChild(name); detail.appendChild(path); row.appendChild(check); row.appendChild(detail); list.appendChild(row); });
        (sourceDiscovery.notices || []).forEach(function (notice) { var note = document.createElement("small"); note.textContent = notice; list.appendChild(note); });
        importButton.disabled = !(sourceDiscovery.records || []).some(function (record) { return record.exists; });
    }
    function renderActiveProject() {
        renderCompNamingFields();
        var select = byId("active-project"), project = activeProject(), revealActions = byId("reveal-actions"), importActions = byId("import-actions"), ids = ["open-project-file", "reveal-project-root", "remove-project", "choose-render-subfolder"];
        clearChildren(select); state.projects.forEach(function (entry) { var option = document.createElement("option"); option.value = entry.id; option.textContent = entry.name; select.appendChild(option); });
        if (project) { if (state.activeProjectId !== project.id) state.activeProjectId = project.id; select.value = project.id; }
        select.disabled = !project;
        for (var i = 0; i < ids.length; i++) byId(ids[i]).disabled = !project;
        byId("render-subfolder").disabled = !project;
        document.querySelectorAll("[data-render-mode]").forEach(function (button) { button.disabled = !project; });
        clearChildren(revealActions); clearChildren(importActions);
        if (!project) return;
        var paths = store.resolveProjectPaths(state, project.id), importKeys = ["afterEffects", "assets", "toGfx", "outputs"];
        Object.keys(paths).forEach(function (key) {
            if (!paths[key]) return;
            projectActionButton(revealActions, pathLabel(project, key), function () { callHost("aetoolkitCepRevealFolder", paths[key], function (result) { showHostResult(result, "Opened " + paths[key]); }); });
        });
        importKeys.forEach(function (key) {
            if (!paths[key]) return;
            projectActionButton(importActions, pathLabel(project, key), function () { callHost("aetoolkitCepImportFromFolder", paths[key], function (result) { showHostResult(result); }); });
        });
    }
    function load() { callHost("aetoolkitCepLoadState", "", function (result) { try { if (result) state = JSON.parse(result); if (!state.compPresets || !state.compPresets.length) state.compPresets = store.defaultCompPresets(); if (!state.activeProjectId) state.activeProjectId = state.projects[0] && state.projects[0].id || ""; selectedTemplateId = state.templates[0] && state.templates[0].id; selectedCompPresetId = compPresets()[0].id; startTemplateDraft(templateById(selectedTemplateId)); startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); status("Ready."); } catch (error) { startTemplateDraft(templateById(selectedTemplateId)); startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); status("Using the default template: " + error.message, true); } }); }
    document.querySelectorAll(".tab").forEach(function (tab) { tab.onclick = function () { document.querySelectorAll(".tab, .view").forEach(function (entry) { entry.classList.remove("active"); }); document.querySelectorAll(".tab").forEach(function (button) { button.setAttribute("aria-pressed", button === tab ? "true" : "false"); }); tab.classList.add("active"); document.querySelector("h1").textContent = tab.getAttribute("aria-label"); byId(tab.dataset.view).classList.add("active"); }; });
    byId("add-naming-field").onclick = function () { editNamingField(-1); };
    byId("naming-preset").onchange = function () { var id = this.value, preset = namingPresets().filter(function (entry) { return entry.id === id; })[0]; if (preset) { templateDraft.namingFields = copy(preset.namingFields); renderNamingOrder(); } };
    byId("add-naming-preset").onclick = function () {
        var name;
        namingDialog("Save naming preset", function (container) { var label = document.createElement("label"); label.textContent = "Preset name"; name = document.createElement("input"); name.required = true; label.appendChild(name); container.appendChild(label); }, function () {
            var title = name.value.trim(); if (!title) throw new Error("Enter a preset name.");
            if (namingPresets().some(function (preset) { return preset.name.toLowerCase() === title.toLowerCase(); })) throw new Error("A preset with that name already exists.");
            var previous = copy(state); state.namingPresets = state.namingPresets || []; state.namingPresets.push({ id: "preset" + Date.now(), name: title, namingFields: store.namingFields(templateDraft) });
            callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result !== "OK") { state = previous; status(result || "Could not save preset.", true); } else status("Naming preset saved."); renderNamingPresets(); });
        });
    };
    byId("remove-naming-preset").onclick = function () { var id = byId("naming-preset").value; if (!id || id === "default") return; var previous = copy(state); state.namingPresets = (state.namingPresets || []).filter(function (preset) { return preset.id !== id; }); callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result !== "OK") { state = previous; status(result || "Could not remove preset.", true); } else status("Naming preset removed. Template fields preserved."); renderNamingPresets(); }); };

    ["comp-preset", "comp-width", "comp-height"].forEach(function (id) { byId(id).addEventListener("change", renderCompNamePreview); byId(id).addEventListener("input", renderCompNamePreview); });
    byId("new-template").onclick = function () { selectedTemplateId = ""; startTemplateDraft(); renderTemplateForm(); };
    byId("add-custom-folder").onclick = function () { templateDraft.customFolders.push({ label: "", path: "" }); renderTemplateForm(); };
    byId("save-template").onclick = function () { try { var saved = store.upsertTemplate(state, templateDraft), savedTemplate = saved.templates[saved.templates.length - 1]; for (var i = 0; i < saved.templates.length; i++) if (saved.templates[i].id === templateDraft.id || !templateDraft.id && saved.templates[i].name === templateDraft.name) savedTemplate = saved.templates[i]; state = saved; selectedTemplateId = savedTemplate.id; startTemplateDraft(savedTemplate); save(function () { renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); status("Template saved."); }); } catch (error) { status(error.message, true); } };
    byId("choose-project-root").onclick = function () { callHost("aetoolkitCepChooseProjectRoot", "", function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); else if (result) byId("project-root").value = result; }); };
    byId("source-import-assets").onclick = function () { var resultTarget = byId("source-import-result"); callHost("aetoolkitCepImportAssetPaths", byId("source-asset-paths").value, function (result) { try { var summary = JSON.parse(result); resultTarget.textContent = summary.imported ? "Imported " + summary.imported + " asset" + (summary.imported === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No assets were imported."; resultTarget.style.color = summary.errors.length ? "#ffcb8f" : "#91d0a4"; } catch (error) { resultTarget.textContent = result || error.message; resultTarget.style.color = "#ff9d9d"; } }); };
    byId("source-discover-projects").onclick = function () { callHost("aetoolkitCepDiscoverSourceProjects", "", function (result) { try { sourceDiscovery = JSON.parse(result); renderSourceDiscovery(); status(sourceDiscovery.records.length ? "Source projects found. Review the list before importing." : "No source projects found in the selected footage.", !sourceDiscovery.records.length); } catch (error) { status(result || error.message, true); } }); };
    byId("source-import-projects").onclick = function () { var chosen = []; document.querySelectorAll("#source-project-records input[type=checkbox]:checked").forEach(function (check) { chosen.push(check.value); }); if (!chosen.length) { status("Select at least one found source project.", true); return; } callHost("aetoolkitCepImportSourceProjects", JSON.stringify({ paths: chosen, sourceNames: sourceDiscovery.sourceNames || [] }), function (result) { try { var summary = JSON.parse(result); status(summary.imported ? "Imported " + summary.imported + " source project" + (summary.imported === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No source projects were imported.", !!summary.errors.length); } catch (error) { status(result || error.message, true); } }); };
    wireFormatPreset("comp"); wireFormatPreset("modify"); wireFormatPreset("cover"); wireFormatPreset("checker");
    byId("saved-comp-preset").onchange = function () { selectedCompPresetId = byId("saved-comp-preset").value; startCompPresetDraft(compPresetById(selectedCompPresetId)); renderCompPresetForm(); };
    byId("new-comp-preset").onclick = function () { selectedCompPresetId = ""; startCompPresetDraft(); renderCompPresetForm(); };
    byId("saved-comp-preset-code").oninput = function () { compPresetDraft.formatCode = this.value; };
    ["name", "width", "height"].forEach(function (key) { byId("saved-comp-preset-" + key).oninput = function () { compPresetDraft[key] = byId("saved-comp-preset-" + key).value; }; });
    byId("add-format-asset").onclick = function () { var key = "guide_" + Date.now().toString(36); while (Object.prototype.hasOwnProperty.call(compPresetDraft.assets, key)) key += "a"; compPresetDraft.assets[key] = ""; renderFormatAssets(); };
    byId("remove-comp-preset").onclick = function () { if (!compPresetDraft.id) return; var previous = state; state = store.removeCompPreset(state, compPresetDraft.id); callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result !== "OK") { state = previous; status(result || "Could not remove format.", true); return; } selectedCompPresetId = compPresets().length ? compPresets()[0].id : ""; startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); status("Format removed."); }); };

    byId("save-comp-preset").onclick = function () { try { var normalized = store.normalizeCompPreset(compPresetDraft); callHost("aetoolkitCepStorePresetAssets", JSON.stringify({ id: normalized.id, assets: normalized.assets }), function (result) { try { normalized.assets = JSON.parse(result); state = store.upsertCompPreset(state, normalized); selectedCompPresetId = normalized.id; startCompPresetDraft(normalized); save(function () { renderFormatSelects(); renderCompPresetForm(); status("Composition format saved."); }); } catch (error) { status(result || error.message, true); } }); } catch (error) { status(error.message, true); } };
    byId("create-comp").onclick = function () { callHost("aetoolkitCepCreateComp", JSON.stringify(compOptions()), function (result) { try { var created = JSON.parse(result); status("Created " + created.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("modify-comps").onclick = function () { var preset = presetFor("modify"), options = { width: byId("modify-width").value, height: byId("modify-height").value, fps: byId("modify-target-fps").value, duration: 10, replaceGuides: !!preset, guideAssets: preset && preset.assets || {}, knownGuideAssets: compPresets().map(function (entry) { return entry.assets || {}; }) }; options.updateSize = byId("modify-size").checked; options.updateFps = byId("modify-fps").checked; options.renameBase = byId("modify-name").checked ? byId("modify-name-base").value : ""; callHost("aetoolkitCepModifySelectedComps", JSON.stringify(options), function (result) { try { var summary = JSON.parse(result); status("Modified " + summary.modified + " composition" + (summary.modified === 1 ? "." : "s.") + " Layer relationships were preserved."); } catch (error) { status(result || error.message, true); } }); };
    function renderRenameFields() {
        var operation = byId("rename-operation").value;
        var labels = { replace: "Search", prefix: "Prefix", suffix: "Suffix", remove: "Remove" };
        byId("rename-find-field").hidden = operation === "number";
        byId("rename-replace-field").hidden = operation !== "replace";
        byId("rename-find-label").textContent = labels[operation] || "Search";
        byId("rename-find").placeholder = labels[operation] || "Search";
        byId("rename-find-field").style.gridColumn = operation === "replace" ? "" : "1 / -1";
    }
    byId("rename-operation").onchange = renderRenameFields;
    renderRenameFields();
    byId("rename-selected").onclick = function () { var options = { operation: byId("rename-operation").value, find: byId("rename-find").value, replace: byId("rename-replace").value, start: 1 }; callHost("aetoolkitCepRenameSelectedItems", JSON.stringify(options), function (result) { try { var summary = JSON.parse(result); status("Renamed " + summary.renamed + " item" + (summary.renamed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("conform-solids").onclick = function () { callHost("aetoolkitCepConformSelectedSolids", "", function (result) { try { var summary = JSON.parse(result); status("Conformed " + summary.conformed + " solid layer" + (summary.conformed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("create-cover").onclick = function () { callHost("aetoolkitCepCreateCover", JSON.stringify(coverOptions()), function (result) { try { var cover = JSON.parse(result); status("Created " + cover.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("create-checkers").onclick = function () { callHost("aetoolkitCepCreateCheckers", JSON.stringify(checkerOptions()), function (result) { try { var summary = JSON.parse(result); status("Created " + summary.created + " checker" + (summary.created === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("consolidate-footage").onclick = function () { callHost("aetoolkitCepConsolidateFootage", "", function (result) { try { JSON.parse(result); status("Consolidated footage."); } catch (error) { status(result || error.message, true); } }); };
    byId("remove-unused").onclick = function () { callHost("aetoolkitCepRemoveUnusedFootage", "", function (result) { try { JSON.parse(result); status("Removed unused footage."); } catch (error) { status(result || error.message, true); } }); };
    byId("reduce-project").onclick = function () { callHost("aetoolkitCepReduceProject", "", function (result) { try { var summary = JSON.parse(result); status("Reduced project to " + summary.kept + " selected item" + (summary.kept === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("organize-project").onclick = function () { var preset = byId("organizer-preset").value; callHost("aetoolkitCepOrganizeProject", preset, function (result) { try { var summary = JSON.parse(result); status("Organized " + summary.moved + " item" + (summary.moved === 1 ? "." : "s.") + " Selected items remain at the root."); } catch (error) { status(result || error.message, true); } }); };
    byId("localize-assets").onclick = function () { var project = activeProject(), paths = project && store.resolveProjectPaths(state, project.id); if (!paths || !paths.assets) { status("Connect an active project with an Assets location first.", true); return; } callHost("aetoolkitCepLocalizeSelectedAssets", paths.assets, function (result) { try { var summary = JSON.parse(result); status(summary.localized ? "Localized " + summary.localized + " asset" + (summary.localized === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No assets were localized.", !!summary.errors.length); } catch (error) { status(result || error.message, true); } }); };
    byId("collect-project").onclick = function () { callHost("aetoolkitCepOpenCollectFiles", "", function (result) { showHostResult(result, "Opened the Collect Files dialog."); }); };
    document.querySelectorAll("[data-comp-frame-change]").forEach(function (button) { button.onclick = function () { callHost("aetoolkitCepAdjustSelectedCompFrames", button.dataset.compFrameChange, function (result) { try { var summary = JSON.parse(result); status("Adjusted " + summary.changed + " composition" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); }; });
    byId("set-comp-duration").onclick = function () { callHost("aetoolkitCepSetSelectedCompDuration", byId("tool-comp-duration").value, function (result) { try { var summary = JSON.parse(result); status("Set duration on " + summary.changed + " composition" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("create-no-slate").onclick = function () { callHost("aetoolkitCepCreateNoSlateComp", byId("tool-slate-frames").value, function (result) { try { var summary = JSON.parse(result); status("Created " + summary.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("fade-in").onclick = function () { callHost("aetoolkitCepFadeSelectedLayers", JSON.stringify({ direction: "in", frames: byId("tool-fade-frames").value }), function (result) { try { var summary = JSON.parse(result); status("Added fade-in to " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("fade-out").onclick = function () { callHost("aetoolkitCepFadeSelectedLayers", JSON.stringify({ direction: "out", frames: byId("tool-fade-frames").value }), function (result) { try { var summary = JSON.parse(result); status("Added fade-out to " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("sequence-layers").onclick = function () { callHost("aetoolkitCepSequenceSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Sequenced " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("parent-layers").onclick = function () { callHost("aetoolkitCepParentSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Parented " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("unparent-layers").onclick = function () { callHost("aetoolkitCepUnparentSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Unparented " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("mark-guides").onclick = function () { callHost("aetoolkitCepMarkSelectedGuideLayers", "", function (result) { try { var summary = JSON.parse(result); status("Marked " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + " as guide layers."); } catch (error) { status(result || error.message, true); } }); };
    byId("select-layer-type").onclick = function () { callHost("aetoolkitCepSelectLayersByType", JSON.stringify({ type: byId("tool-select-type").value, mode: byId("tool-select-mode").value }), function (result) { try { var summary = JSON.parse(result); status("Selected " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("flip-layer-order").onclick = function () { callHost("aetoolkitCepReverseSelectedLayerOrder", "", function (result) { try { var summary = JSON.parse(result); status("Reversed " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("snap-to-last").onclick = function () { callHost("aetoolkitCepSnapSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Snapped " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("transfer-transform").onclick = function () { callHost("aetoolkitCepTransferTransform", JSON.stringify({ position: byId("transfer-position").checked, scale: byId("transfer-scale").checked, rotation: byId("transfer-rotation").checked }), function (result) { try { var summary = JSON.parse(result); status("Updated " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("replace-text").onclick = function () { callHost("aetoolkitCepReplaceSelectedText", byId("tool-replace-text").value, function (result) { try { var summary = JSON.parse(result); status("Updated " + summary.changed + " text layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("connect-project").onclick = function () { try { var name = byId("project-name").value, root = byId("project-root").value; state = store.assignProject(state, { name: name, root: root, templateId: byId("project-template").value }); var matched = state.projects.filter(function (project) { return project.name === name && project.root === String(root).replace(/\\/g, "/").replace(/\/+$/g, ""); })[0]; state = store.setActiveProject(state, matched.id); save(function () { renderProjects(); renderActiveProject(); status("Project connected."); }); } catch (error) { status(error.message, true); } };
    byId("active-project").onchange = function () { try { state = store.setActiveProject(state, byId("active-project").value); save(function () { renderProjects(); renderActiveProject(); status("Active project changed."); }); } catch (error) { status(error.message, true); } };
    byId("remove-project").onclick = function () { var project = activeProject(); if (!project) return; try { state = store.removeProject(state, project.id); save(function () { renderProjects(); renderActiveProject(); status("Project removed."); }); } catch (error) { status(error.message, true); } };
    byId("open-project-file").onclick = function () { var project = activeProject(), paths = project && store.resolveProjectPaths(state, project.id); if (paths) callHost("aetoolkitCepOpenProjectFromFolder", paths.afterEffects, function (result) { showHostResult(result); }); };
    byId("reveal-project-root").onclick = function () { var project = activeProject(); if (project) callHost("aetoolkitCepRevealFolder", project.root, function (result) { showHostResult(result, "Opened " + project.root); }); };
    byId("choose-render-subfolder").onclick = function () { callHost("aetoolkitCepChooseRenderSubfolder", "", function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); else if (result) byId("render-subfolder").value = result; }); };
    document.querySelectorAll("[data-render-mode]").forEach(function (button) { button.onclick = function () { var project = activeProject(), paths = project && store.resolveProjectPaths(state, project.id), mode = button.dataset.renderMode, basePath = mode === "styleFrames" ? paths.styleFrames : paths.outputs; if (!paths) return; callHost("aetoolkitCepRenderSelected", JSON.stringify({ mode: mode, basePath: basePath, subfolder: byId("render-subfolder").value }), function (result) { showHostResult(result); }); }; });
    byId("refresh-projects").onclick = function () { renderProjects(); renderActiveProject(); };
    load();
}());
