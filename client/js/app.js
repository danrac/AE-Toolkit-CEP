(function () {
    var store = window.AEToolkitTemplates, cs = new CSInterface(), state = store.defaultState(), selectedTemplateId = state.templates[0].id, templateDraft;
    var folderLabels = { afterEffects: "After Effects", assets: "Assets", toGfx: "To GFX", outputs: "Outputs", styleFrames: "Style frames" };
    function byId(id) { return document.getElementById(id); }
    function status(message, error) { var target = byId("status"); target.textContent = message; target.style.color = error ? "#ff9d9d" : "#91d0a4"; }
    function callHost(name, argument, callback) { cs.evalScript(name + "(" + JSON.stringify(argument || "") + ")", callback); }
    function save(onSaved) { callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result === "OK") { if (onSaved) onSaved(); } else status(result || "Could not save project templates.", true); }); }
    function templateById(id) { return state.templates.filter(function (template) { return template.id === id; })[0]; }
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    function startTemplateDraft(template) {
        template = template || { id: "", name: "", folders: {}, customFolders: [] };
        templateDraft = { id: template.id || "", name: template.name || "", folders: copy(template.folders || {}), customFolders: copy(template.customFolders || []) };
    }
    function renderTemplateSelect() { var select = byId("project-template"); select.innerHTML = ""; state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.appendChild(option); }); }
    function renderTemplates() {
        var list = byId("template-list"); list.innerHTML = "";
        state.templates.forEach(function (template) { var item = document.createElement("button"), title = document.createElement("strong"), detail = document.createElement("small"); item.className = "list-item"; title.textContent = template.name; detail.textContent = template.id; item.appendChild(title); item.appendChild(detail); item.onclick = function () { selectedTemplateId = template.id; startTemplateDraft(template); renderTemplateForm(); }; list.appendChild(item); });
        renderTemplateSelect();
    }
    function renderTemplateForm() {
        var template = templateDraft || templateById(selectedTemplateId) || { id: "", name: "", folders: {}, customFolders: [] }; byId("template-name").value = template.name; byId("template-name").oninput = function () { templateDraft.name = byId("template-name").value; }; byId("template-form-title").textContent = template.id ? "Edit template" : "New template";
        var grid = byId("template-folders"); grid.innerHTML = "";
        store.FOLDER_KEYS.forEach(function (key) { var label = document.createElement("label"); label.textContent = folderLabels[key]; var input = document.createElement("input"); input.dataset.key = key; input.value = template.folders[key] || ""; input.placeholder = "Relative folder"; input.oninput = function () { templateDraft.folders[key] = input.value; }; label.appendChild(input); grid.appendChild(label); });
        template.customFolders.forEach(function (entry, index) { var row = document.createElement("div"), labelField = document.createElement("label"), pathField = document.createElement("label"), labelInput = document.createElement("input"), pathInput = document.createElement("input"), remove = document.createElement("button"); row.className = "custom-location"; labelField.textContent = "Custom name"; labelInput.value = entry.label; labelInput.oninput = function () { templateDraft.customFolders[index].label = labelInput.value; }; labelField.appendChild(labelInput); pathField.textContent = "Relative folder"; pathInput.value = entry.path; pathInput.oninput = function () { templateDraft.customFolders[index].path = pathInput.value; }; pathField.appendChild(pathInput); remove.textContent = "Remove"; remove.onclick = function () { templateDraft.customFolders.splice(index, 1); renderTemplateForm(); }; row.appendChild(labelField); row.appendChild(pathField); row.appendChild(remove); grid.appendChild(row); });
    }
    function renderProjects() {
        var list = byId("project-list"); list.innerHTML = "";
        state.projects.forEach(function (project) { var paths = store.resolveProjectPaths(state, project.id), item = document.createElement("div"), title = document.createElement("strong"), root = document.createElement("small"), pathsList = document.createElement("div"); item.className = "list-item"; title.textContent = project.name; root.textContent = project.root; pathsList.className = "resolved-paths"; Object.keys(paths).forEach(function (key) { if (!paths[key]) return; var row = document.createElement("div"), label = document.createElement("strong"), value = document.createElement("span"), reveal = document.createElement("button"); row.className = "resolved-path"; label.textContent = folderLabels[key] || key; value.textContent = paths[key]; reveal.textContent = "Reveal"; reveal.onclick = function () { callHost("aetoolkitCepRevealFolder", paths[key], function (result) { status(result === "OK" ? "Opened " + paths[key] : result, result !== "OK"); }); }; row.appendChild(label); row.appendChild(value); row.appendChild(reveal); pathsList.appendChild(row); }); item.appendChild(title); item.appendChild(root); item.appendChild(pathsList); list.appendChild(item); });
    }
    function load() { callHost("aetoolkitCepLoadState", "", function (result) { try { if (result) state = JSON.parse(result); selectedTemplateId = state.templates[0] && state.templates[0].id; startTemplateDraft(templateById(selectedTemplateId)); renderTemplates(); renderTemplateForm(); renderProjects(); status("Ready."); } catch (error) { startTemplateDraft(templateById(selectedTemplateId)); renderTemplates(); renderTemplateForm(); renderProjects(); status("Using the default template: " + error.message, true); } }); }
    document.querySelectorAll(".tab").forEach(function (tab) { tab.onclick = function () { document.querySelectorAll(".tab, .view").forEach(function (entry) { entry.classList.remove("active"); }); tab.classList.add("active"); byId(tab.dataset.view).classList.add("active"); }; });
    byId("new-template").onclick = function () { selectedTemplateId = ""; startTemplateDraft(); renderTemplateForm(); };
    byId("add-custom-folder").onclick = function () { templateDraft.customFolders.push({ label: "", path: "" }); renderTemplateForm(); };
    byId("save-template").onclick = function () { try { var saved = store.upsertTemplate(state, templateDraft), savedTemplate = saved.templates[saved.templates.length - 1]; for (var i = 0; i < saved.templates.length; i++) if (saved.templates[i].id === templateDraft.id || !templateDraft.id && saved.templates[i].name === templateDraft.name) savedTemplate = saved.templates[i]; state = saved; selectedTemplateId = savedTemplate.id; startTemplateDraft(savedTemplate); save(function () { renderTemplates(); renderTemplateForm(); status("Template saved."); }); } catch (error) { status(error.message, true); } };
    byId("choose-project-root").onclick = function () { callHost("aetoolkitCepChooseProjectRoot", "", function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); else if (result) byId("project-root").value = result; }); };
    byId("connect-project").onclick = function () { try { state = store.assignProject(state, { name: byId("project-name").value, root: byId("project-root").value, templateId: byId("project-template").value }); save(function () { renderProjects(); status("Project connected."); }); } catch (error) { status(error.message, true); } };
    byId("refresh-projects").onclick = renderProjects;
    load();
}());
