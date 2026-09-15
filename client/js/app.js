(function () {
    var store = window.AEToolkitTemplates, cs = new CSInterface(), state = store.defaultState(), selectedTemplateId = state.templates[0].id;
    var folderLabels = { afterEffects: "After Effects", assets: "Assets", toGfx: "To GFX", outputs: "Outputs", styleFrames: "Style frames" };
    function byId(id) { return document.getElementById(id); }
    function status(message, error) { var target = byId("status"); target.textContent = message; target.style.color = error ? "#ff9d9d" : "#91d0a4"; }
    function callHost(name, argument, callback) { cs.evalScript(name + "(" + JSON.stringify(argument || "") + ")", callback); }
    function save() { callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); }); }
    function templateById(id) { return state.templates.filter(function (template) { return template.id === id; })[0]; }
    function renderTemplateSelect() { var select = byId("project-template"); select.innerHTML = ""; state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.appendChild(option); }); }
    function renderTemplates() {
        var list = byId("template-list"); list.innerHTML = "";
        state.templates.forEach(function (template) { var item = document.createElement("button"); item.className = "list-item"; item.innerHTML = "<strong>" + template.name + "</strong><small>" + template.id + "</small>"; item.onclick = function () { selectedTemplateId = template.id; renderTemplateForm(); }; list.appendChild(item); });
        renderTemplateSelect();
    }
    function renderTemplateForm() {
        var template = templateById(selectedTemplateId) || { id: "", name: "", folders: {} }; byId("template-name").value = template.name; byId("template-form-title").textContent = template.id ? "Edit template" : "New template";
        var grid = byId("template-folders"); grid.innerHTML = "";
        store.FOLDER_KEYS.forEach(function (key) { var label = document.createElement("label"); label.textContent = folderLabels[key]; var input = document.createElement("input"); input.dataset.key = key; input.value = template.folders[key] || ""; input.placeholder = "Relative folder"; label.appendChild(input); grid.appendChild(label); });
    }
    function renderProjects() {
        var list = byId("project-list"); list.innerHTML = "";
        state.projects.forEach(function (project) { var paths = store.resolveProjectPaths(state, project.id), item = document.createElement("div"); item.className = "list-item"; item.innerHTML = "<strong>" + project.name + "</strong><small>" + project.root + "</small><small>Assets: " + (paths.assets || "Not configured") + "</small>"; list.appendChild(item); });
    }
    function load() { callHost("aetoolkitCepLoadState", "", function (result) { try { if (result) state = JSON.parse(result); selectedTemplateId = state.templates[0] && state.templates[0].id; renderTemplates(); renderTemplateForm(); renderProjects(); status("Ready."); } catch (error) { renderTemplates(); renderTemplateForm(); renderProjects(); status("Using the default template: " + error.message, true); } }); }
    document.querySelectorAll(".tab").forEach(function (tab) { tab.onclick = function () { document.querySelectorAll(".tab, .view").forEach(function (entry) { entry.classList.remove("active"); }); tab.classList.add("active"); byId(tab.dataset.view).classList.add("active"); }; });
    byId("new-template").onclick = function () { selectedTemplateId = ""; renderTemplateForm(); };
    byId("save-template").onclick = function () { try { var folders = {}; document.querySelectorAll("#template-folders input").forEach(function (input) { folders[input.dataset.key] = input.value; }); var current = templateById(selectedTemplateId); state = store.upsertTemplate(state, { id: current && current.id, name: byId("template-name").value, folders: folders }); selectedTemplateId = current && current.id || state.templates[state.templates.length - 1].id; save(); renderTemplates(); renderTemplateForm(); status("Template saved."); } catch (error) { status(error.message, true); } };
    byId("connect-project").onclick = function () { try { state = store.assignProject(state, { name: byId("project-name").value, root: byId("project-root").value, templateId: byId("project-template").value }); save(); renderProjects(); status("Project connected."); } catch (error) { status(error.message, true); } };
    byId("refresh-projects").onclick = renderProjects;
    load();
}());
