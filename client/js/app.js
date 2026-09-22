(function () {
    var store = window.AEToolkitTemplates, cs = new CSInterface(), state = store.defaultState(), selectedTemplateId = state.templates[0].id, selectedCompPresetId = state.compPresets[0].id, templateDraft, compPresetDraft, sourceDiscovery = null;
    var customCheckerPresets = [], checkerLibraryRoot = "", libraryReady = false;
    try { checkerLibraryRoot = window.localStorage.getItem("toolbox2.template-library") || ""; } catch (ignoreLibraryPreference) {}
    var folderLabels = { afterEffects: "AE Projects", assets: "Assets", toGfx: "Graphic In", outputs: "Graphic Out", styleFrames: "Style Frames" };
    function byId(id) { return document.getElementById(id); }
    var tooltipTimer = 0, tooltipNode = null, tooltipOwner = null;
    function tooltipTarget(node) {
        var text;
        while (node && node !== document) {
            if (node.nodeType === 1) {
                text = node.getAttribute("data-tooltip") || node.getAttribute("title");
                if (text) {
                    if (!node.getAttribute("data-tooltip")) { node.setAttribute("data-tooltip", text); node.removeAttribute("title"); }
                    return node;
                }
            }
            node = node.parentNode;
        }
        return null;
    }
    function tooltipInside(node, ancestor) {
        while (node) { if (node === ancestor) return true; node = node.parentNode; }
        return false;
    }
    function hideTooltip() {
        if (tooltipTimer) { window.clearTimeout(tooltipTimer); tooltipTimer = 0; }
        if (tooltipNode && tooltipNode.parentNode) tooltipNode.parentNode.removeChild(tooltipNode);
        tooltipNode = null; tooltipOwner = null;
    }
    function showTooltip(target, immediate) {
        var text = target.getAttribute("data-tooltip"), rect, left, top;
        hideTooltip(); tooltipOwner = target;
        tooltipTimer = window.setTimeout(function () {
            tooltipTimer = 0; rect = target.getBoundingClientRect(); tooltipNode = document.createElement("div");
            tooltipNode.className = "ui-tooltip"; tooltipNode.textContent = text; document.body.appendChild(tooltipNode);
            left = rect.left + (rect.width / 2) - (tooltipNode.offsetWidth / 2);
            left = Math.max(4, Math.min(window.innerWidth - tooltipNode.offsetWidth - 4, left));
            top = rect.bottom + 7;
            if (top + tooltipNode.offsetHeight > window.innerHeight - 4) top = Math.max(4, rect.top - tooltipNode.offsetHeight - 7);
            tooltipNode.style.left = left + "px"; tooltipNode.style.top = top + "px";
        }, immediate ? 0 : 280);
    }
    document.addEventListener("mouseover", function (event) {
        var target = tooltipTarget(event.target);
        if (target && target !== tooltipOwner) showTooltip(target, false);
    }, true);
    document.addEventListener("mouseout", function (event) {
        var target = tooltipTarget(event.target), next = event.relatedTarget;
        if (target && !tooltipInside(next, target)) hideTooltip();
    }, true);
    document.addEventListener("focusin", function (event) {
        var target = tooltipTarget(event.target);
        if (target) showTooltip(target, true);
    }, true);
    document.addEventListener("focusout", function (event) {
        var target = tooltipTarget(event.target);
        if (target) hideTooltip();
    }, true);
    function status(message, error) { var target = byId("status"); target.textContent = message; target.style.color = error ? "#ff9d9d" : "#91d0a4"; ["format-dialog", "custom-format-dialog"].forEach(function (id) { var dialog = byId(id); if (dialog && dialog.open) byId(id === "format-dialog" ? "format-dialog-status" : "custom-format-status").textContent = message; }); }
    function callHost(name, argument, callback) {
        if (name === "aetoolkitCepSaveState" && !libraryReady) { callback("ERROR: Library unavailable. Refresh or choose a library before saving."); return; }
        var setup = "AEToolkitLibraryRoot = " + JSON.stringify(checkerLibraryRoot) + ";", root = cs.getExtensionPath();
        if (root) setup += "AEToolkitHostDirectory = new Folder(" + JSON.stringify(root + "/host") + ").fsName;";
        function execute(release) {
            try {
                cs.evalScript(setup + name + "(" + JSON.stringify(argument || "") + ")", function (result) {
                    if (name === "aetoolkitCepSaveState" && result === "OK") state.libraryRevision = Number(state.libraryRevision || 0) + 1;
                    if (release) try { release(); } catch (error) { status("Saved, but library lock cleanup failed: " + error.message, true); }
                    if (callback) callback(result);
                });
            } catch (error) { if (release) release(); if (callback) callback("ERROR: " + error.message); }
        }
        if (name !== "aetoolkitCepSaveState") { execute(); return; }
        cs.evalScript(setup + "aetoolkitCepStatePath()", function (path) {
            var release;
            try {
                if (!path || path.indexOf("ERROR:") === 0) throw new Error(path || "Library path unavailable.");
                var nodeRequire = window.cep_node && window.cep_node.require || window.require;
                if (!nodeRequire) throw new Error("Library locking requires the updated extension. Restart After Effects after installing it.");
                release = nodeRequire(root + "/client/js/library-lock.js").acquire(path);
            } catch (error) { if (callback) callback("ERROR: " + error.message); return; }
            execute(release);
        });
    }

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
    var activeCurve = [0.42, 0, 0.58, 1];
    function curveNumber(value) { value = Number(value); return isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
    function curvePoint(x, y) { return { x: 12 + x * 216, y: 108 - y * 96 }; }
    function drawCurve(markCustom) {
        var first = curvePoint(activeCurve[0], activeCurve[1]), second = curvePoint(activeCurve[2], activeCurve[3]);
        byId("curve-path").setAttribute("d", "M12 108 C" + first.x + " " + first.y + " " + second.x + " " + second.y + " 228 12");
        byId("curve-tangent-start").setAttribute("d", "M12 108 L" + first.x + " " + first.y);
        byId("curve-tangent-end").setAttribute("d", "M228 12 L" + second.x + " " + second.y);
        byId("curve-handle-one").setAttribute("cx", first.x); byId("curve-handle-one").setAttribute("cy", first.y);
        byId("curve-handle-two").setAttribute("cx", second.x); byId("curve-handle-two").setAttribute("cy", second.y);
        ["curve-x1", "curve-y1", "curve-x2", "curve-y2"].forEach(function (id, index) { byId(id).value = activeCurve[index].toFixed(2); });
        if (markCustom) byId("curve-preset").value = "";
    }
    function renderCurvePresets(selectedId) {
        var select = byId("curve-preset"), presets = store.curvePresets(state), selected = selectedId === undefined ? select.value : selectedId; clearChildren(select);
        var custom = document.createElement("option"); custom.value = ""; custom.textContent = "Custom curve"; select.appendChild(custom);
        presets.forEach(function (preset) { var option = document.createElement("option"); option.value = preset.id; option.textContent = preset.name + (preset.builtIn ? "" : " · Shared"); select.appendChild(option); });
        select.value = presets.some(function (entry) { return entry.id === selected; }) ? selected : "ease-in-out";
        var preset = presets.filter(function (entry) { return entry.id === select.value; })[0]; if (preset) activeCurve = preset.curve.slice();
        byId("remove-curve-preset").disabled = !preset || preset.builtIn === true; drawCurve(false);
    }
    function editCurveHandle(index, event) {
        var graph = byId("curve-graph"), clientX = event.clientX, clientY = event.clientY, point, local;
        if (event.touches && event.touches.length) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        point = graph.createSVGPoint(); point.x = clientX; point.y = clientY; local = point.matrixTransform(graph.getScreenCTM().inverse());
        activeCurve[index] = curveNumber((local.x - 12) / 216);
        activeCurve[index + 1] = curveNumber((108 - local.y) / 96);
        drawCurve(true);
    }
    function wireCurveHandle(id, index) {
        var handle = byId(id), dragging = false;
        function begin(event) { dragging = true; editCurveHandle(index, event); event.preventDefault(); }
        function move(event) { if (!dragging) return; editCurveHandle(index, event); event.preventDefault(); }
        function end() { dragging = false; }
        handle.addEventListener("mousedown", begin, false); document.addEventListener("mousemove", move, false); document.addEventListener("mouseup", end, false);
        handle.addEventListener("touchstart", begin, false); document.addEventListener("touchmove", move, false); document.addEventListener("touchend", end, false); document.addEventListener("touchcancel", end, false);
        handle.onkeydown = function (event) { var step = event.shiftKey ? 0.1 : 0.01; if (event.key === "ArrowLeft") activeCurve[index] -= step; else if (event.key === "ArrowRight") activeCurve[index] += step; else if (event.key === "ArrowDown") activeCurve[index + 1] -= step; else if (event.key === "ArrowUp") activeCurve[index + 1] += step; else return; activeCurve[index] = curveNumber(activeCurve[index]); activeCurve[index + 1] = curveNumber(activeCurve[index + 1]); drawCurve(true); event.preventDefault(); };
    }
    function setAnimationSubtab(name, remember) {
        if (name !== "placement") name = "key-graph";
        Array.prototype.forEach.call(document.querySelectorAll("[data-animation-subtab]"), function (button) { var selected = button.getAttribute("data-animation-subtab") === name; button.setAttribute("aria-selected", selected ? "true" : "false"); button.tabIndex = selected ? 0 : -1; });
        byId("animation-key-graph-panel").hidden = name !== "key-graph"; byId("animation-placement-panel").hidden = name !== "placement";
        if (remember) try { window.localStorage.setItem("toolbox2.animation-subtab", name); } catch (ignoreAnimationSubtab) {}
    }
    function startTemplateDraft(template) {
        template = template || { id: "", name: "", folders: {}, customFolders: [] };
        templateDraft = { id: template.id || "", name: template.name || "", folders: copy(template.folders || {}), renderFolders: store.renderFolders(template), customFolders: copy(template.customFolders || []), namingFields: store.namingFields(template) };
    }
    function renderTemplateSelect() { var select = byId("project-template"); select.innerHTML = ""; state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.appendChild(option); }); }
    function renderTemplates() {
        var list = byId("edit-project-preset"); clearChildren(list);
        var blank = document.createElement("option"); blank.value = ""; blank.textContent = "New preset"; list.appendChild(blank);
        state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; list.appendChild(option); });
        list.value = selectedTemplateId || "";
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
    function addTemplateFolderBrowse(label, input, update) {
        var field = document.createElement("span"), button = document.createElement("button");
        field.className = "template-folder-input"; button.type = "button"; button.textContent = "Browse";
        button.onclick = function () {
            var project = activeProject();
            callHost("aetoolkitCepChooseTemplateFolder", JSON.stringify({root: project ? project.root : ""}), function (result) {
                if (!result) return;
                try { var chosen = JSON.parse(result); input.value = chosen.path; update(chosen.path); }
                catch (error) { status(result || error.message, true); }
            });
        };
        field.appendChild(input); field.appendChild(button); label.appendChild(field);
    }
    function renderTemplateForm() {
        var template = templateDraft || templateById(selectedTemplateId) || { id: "", name: "", folders: {}, customFolders: [] }; byId("template-name").value = template.name; byId("template-name").oninput = function () { templateDraft.name = byId("template-name").value; }; byId("template-form-title").textContent = "Create project presets";
        renderNamingOrder();
        var grid = byId("template-folders"); grid.innerHTML = "";
        store.FOLDER_KEYS.forEach(function (key) { var label = document.createElement("label"); label.textContent = folderLabels[key]; if (key === "styleFrames") label.className = "full-row"; var input = document.createElement("input"); input.dataset.key = key; input.value = template.folders[key] || ""; input.placeholder = "Relative folder"; input.oninput = function () { templateDraft.folders[key] = input.value; }; addTemplateFolderBrowse(label, input, function (path) { templateDraft.folders[key] = path; }); grid.appendChild(label); });
        template.customFolders.forEach(function (entry, index) { var row = document.createElement("div"), labelField = document.createElement("label"), pathField = document.createElement("label"), labelInput = document.createElement("input"), pathInput = document.createElement("input"), remove = document.createElement("button"); row.className = "custom-location"; labelField.className = "custom-location-name"; labelField.textContent = "Name"; labelInput.value = entry.label; labelInput.oninput = function () { templateDraft.customFolders[index].label = labelInput.value; }; labelField.appendChild(labelInput); pathField.className = "custom-location-path"; pathField.textContent = "Path"; pathInput.value = entry.path; pathInput.oninput = function () { templateDraft.customFolders[index].path = pathInput.value; }; addTemplateFolderBrowse(pathField, pathInput, function (path) { templateDraft.customFolders[index].path = path; }); remove.textContent = "×"; remove.className = "custom-location-remove"; remove.title = "Remove custom location"; remove.setAttribute("aria-label", "Remove custom location"); remove.onclick = function () { templateDraft.customFolders.splice(index, 1); renderTemplateForm(); }; var renderLabel = document.createElement("label"), renderCheck = document.createElement("input");
            renderLabel.className = "custom-render-toggle"; renderCheck.type = "checkbox"; renderCheck.checked = entry.renderOutput === true;
            renderCheck.onchange = function () { templateDraft.customFolders[index].renderOutput = renderCheck.checked; };
            renderLabel.appendChild(renderCheck); renderLabel.appendChild(document.createTextNode("Render output"));
            row.appendChild(labelField); row.appendChild(pathField); row.appendChild(renderLabel); row.appendChild(remove); grid.appendChild(row); });
    }
    function renderProjects() {
        var list = byId("project-list"), project = activeProject(); clearChildren(list);
        if (!project) { var empty = document.createElement("small"); empty.textContent = "Add a project to see its folders."; list.appendChild(empty); return; }
        var paths = store.resolveProjectPaths(state, project.id), item = document.createElement("div"), pathsList = document.createElement("div");
        item.className = "list-item"; pathsList.className = "resolved-paths";
        Object.keys(paths).forEach(function (key) {
            if (!paths[key]) return;
            var row = document.createElement("div"), label = document.createElement("strong"), value = document.createElement("span"), actions = document.createElement("div");
            row.className = "resolved-path"; label.textContent = pathLabel(project, key); value.textContent = paths[key]; actions.className = "folder-row-actions";
            projectActionButton(actions, "Reveal", function () { callHost("aetoolkitCepRevealFolder", paths[key], function (result) { showHostResult(result, "Opened " + paths[key]); }); });
            projectActionButton(actions, "Import", function () { callHost("aetoolkitCepImportFromFolder", paths[key], function (result) { showHostResult(result); }); });
            row.appendChild(label); row.appendChild(value); row.appendChild(actions); pathsList.appendChild(row);
        });
        item.appendChild(pathsList); list.appendChild(item);
    }
    function clearChildren(target) { while (target.firstChild) target.removeChild(target.firstChild); }
    function projectActionButton(target, label, handler) { var button = document.createElement("button"); button.textContent = label; button.title = label; button.onclick = handler; target.appendChild(button); }
    function showHostResult(result, successMessage) { if (result === "CANCELLED") status("No changes made."); else if (result && result.indexOf("ERROR:") === 0) status(result, true); else status(successMessage || result || "Done."); }
    function compPresets() { return store.compPresets(state).concat(customCheckerPresets.filter(function (entry) { return (state.removedCompPresets || []).indexOf(entry.id) === -1; })); }
    function compPresetById(id) { return compPresets().filter(function (preset) { return preset.id === id; })[0]; }
    function presetFor(prefix) { return compPresetById(byId(prefix + "-preset").value); }
    function compOptions() { var width = byId("comp-width").value, height = byId("comp-height").value, preset = presetFor("comp"); return { namingFields: activeNamingFields(), namingValues: namingValues[namingContext] || {}, width: width, height: height, fps: byId("comp-fps").value, duration: byId("comp-duration").value, format: preset ? store.compFormatCode(preset) : width + "x" + height, guideAssets: preset && preset.assets || {}, addGuides: byId("comp-add-guides").checked }; }
    function coverOptions() { var preset = presetFor("cover"); return { width: byId("cover-width").value, height: byId("cover-height").value, fps: byId("cover-fps").value, duration: byId("cover-duration").value, format: preset ? store.compFormatCode(preset) : byId("cover-width").value + "x" + byId("cover-height").value, topLine: byId("cover-top-line").value, bottomLine: byId("cover-bottom-line").value, date: byId("cover-date").value, spot: byId("cover-spot").value }; }
    function checkerOptions() { return { width: byId("checker-width").value, height: byId("checker-height").value, frame: byId("checker-frame").value }; }
    function renderFormatSelect(prefix) { var select = byId(prefix + "-preset"), selected = select.value; select.innerHTML = ""; compPresets().filter(function (preset) { return prefix === "checker" || preset.kind !== "custom-checker"; }).forEach(function (preset) { var option = document.createElement("option"); option.value = preset.id; option.textContent = (preset.kind === "custom-checker" ? "Checker · " : "") + preset.name + " · " + preset.width + " × " + preset.height; select.appendChild(option); }); var custom = document.createElement("option"); custom.value = "custom"; custom.textContent = "Custom"; select.appendChild(custom); select.value = selected && Array.prototype.some.call(select.options, function (option) { return option.value === selected; }) ? selected : "custom"; if (!selected && select.options.length) select.selectedIndex = 0; }
    function renderFormatSelects() { renderFormatSelect("comp"); renderFormatSelect("modify"); renderFormatSelect("cover"); renderFormatSelect("checker"); renderCheckerMode(); }
    function wireFormatPreset(prefix) { byId(prefix + "-preset").onchange = function () { var preset = presetFor(prefix); if (preset) { byId(prefix + "-width").value = preset.width; byId(prefix + "-height").value = preset.height; } if (prefix === "checker") renderCheckerMode(); }; }
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
    function renderCheckerMode() {
        var preset = presetFor("checker"), custom = !!(preset && preset.kind === "custom-checker");
        ["checker-width", "checker-height"].forEach(function (id) { byId(id).parentNode.hidden = custom; });
        byId("checker-frame-field").hidden = custom; byId("checker-job-field").hidden = !custom;
        if (custom && !byId("checker-job-code").value) {
            var values = namingValues[namingContext] || {}, fields = activeNamingFields(), jobField = fields.filter(function (field) { return field.id === "job" || field.label.toLowerCase() === "job"; })[0];
            byId("checker-job-code").value = jobField ? (values[jobField.id] || jobField.value || "") : "";
        }
    }
    function refreshCheckerLibrary(callback) {
        callHost("aetoolkitCepListCheckerTemplates", JSON.stringify({libraryRoot:checkerLibraryRoot}), function (result) {
            try { if (!result) return; var catalog = JSON.parse(result); customCheckerPresets = catalog.presets; byId("checker-library-root").value = catalog.root; renderFormatSelects(); renderCompPresetForm(); if (catalog.notices.length) status(catalog.notices.join(" "), true); if (callback) callback(catalog); }
            catch (error) { status(result || error.message, true); }
        });
    }
    function renderSourceDiscovery() {
        var list = byId("source-project-records"), importButton = byId("source-import-projects"); clearChildren(list);
        if (!sourceDiscovery) { importButton.disabled = true; return; }
        (sourceDiscovery.records || []).forEach(function (record) {
            var row = document.createElement("label"), check = document.createElement("input"), detail = document.createElement("div"), name = document.createElement("strong");
            row.className = "source-record";
            check.type = "checkbox"; check.value = record.path; check.checked = record.exists; check.disabled = !record.exists;
            name.className = "source-record-status"; name.textContent = record.exists ? "FOUND" : "MISSING";
            detail.appendChild(name);
            [["File Path", record.path], ["Color Space", record.colorSpace || "Unavailable"]].forEach(function (field) {
                var line = document.createElement("div"), caption = document.createElement("span"), value = document.createElement("span");
                line.className = "source-record-field"; caption.className = "source-record-caption"; caption.textContent = field[0] + ":";
                value.className = "source-record-value"; value.textContent = field[1];
                line.appendChild(caption); line.appendChild(value); detail.appendChild(line);
            });
            row.appendChild(check); row.appendChild(detail); list.appendChild(row);
        });
        (sourceDiscovery.notices || []).forEach(function (notice) { var note = document.createElement("small"); note.textContent = notice; list.appendChild(note); });
        importButton.disabled = !(sourceDiscovery.records || []).some(function (record) { return record.exists; });
    }
    function renderActiveProject() {
        renderCompNamingFields();
        var assignedProject = activeProject(), assignedTemplate = assignedProject && templateById(assignedProject.templateId);
        byId("change-project-template").textContent = assignedTemplate ? assignedTemplate.name : "No project selected";
        byId("change-project-template").disabled = !assignedProject;
        var select = byId("active-project"), project = activeProject(), ids = ["open-project-file", "reveal-project-root", "remove-project"];
        var query = byId("project-search").value.toLowerCase().trim();
        clearChildren(select); var matches = state.projects.filter(function (entry) { return !query || (entry.name + " " + entry.root).toLowerCase().indexOf(query) !== -1; });
        var prompt = document.createElement("option"); prompt.value = ""; prompt.textContent = matches.length ? "Select project" : "No matching projects"; select.appendChild(prompt);
        matches.forEach(function (entry) { var option = document.createElement("option"); option.value = entry.id; option.textContent = entry.name; select.appendChild(option); });
        if (project) { if (state.activeProjectId !== project.id) state.activeProjectId = project.id; select.value = matches.some(function (entry) { return entry.id === project.id; }) ? project.id : ""; }
        select.disabled = !project;
        for (var i = 0; i < ids.length; i++) byId(ids[i]).disabled = !project;
        renderDestinationButtons();

    }
    function load() { libraryReady = false; callHost("aetoolkitCepLoadState", "", function (result) { try { if (result) state = JSON.parse(result); libraryReady = true; if (!state.compPresets || !state.compPresets.length) state.compPresets = store.defaultCompPresets(); if (!state.curvePresets) state.curvePresets = []; if (!state.activeProjectId) state.activeProjectId = state.projects[0] && state.projects[0].id || ""; selectedTemplateId = state.templates[0] && state.templates[0].id; selectedCompPresetId = compPresets().length ? compPresets()[0].id : ""; startTemplateDraft(templateById(selectedTemplateId)); startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); renderCurvePresets("ease-in-out"); status("Ready."); refreshCheckerLibrary(); } catch (error) { startTemplateDraft(templateById(selectedTemplateId)); startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); renderCurvePresets("ease-in-out"); status("Library could not be loaded. Saving is disabled: " + error.message, true); } }); }
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
    byId("new-template").onclick = function () { selectedTemplateId = ""; startTemplateDraft(); renderTemplates(); renderTemplateForm(); byId("project-preset-editor").hidden = false; byId("template-name").focus(); };
    byId("close-project-preset").onclick = function () { byId("project-preset-editor").hidden = true; };
    byId("edit-project-preset").onchange = function () { selectedTemplateId = this.value; startTemplateDraft(templateById(selectedTemplateId)); renderTemplateForm(); };

    byId("add-custom-folder").onclick = function () { templateDraft.customFolders.push({ label: "", path: "" }); renderTemplateForm(); };
    byId("save-template").onclick = function () { try { var saved = store.upsertTemplate(state, templateDraft), savedTemplate = saved.templates[saved.templates.length - 1]; for (var i = 0; i < saved.templates.length; i++) if (saved.templates[i].id === templateDraft.id || !templateDraft.id && saved.templates[i].name === templateDraft.name) savedTemplate = saved.templates[i]; state = saved; selectedTemplateId = savedTemplate.id; startTemplateDraft(savedTemplate); save(function () { renderTemplates(); renderTemplateForm(); renderProjects(); renderActiveProject(); status("Template saved."); }); } catch (error) { status(error.message, true); } };
    byId("choose-project-root").onclick = function () { callHost("aetoolkitCepChooseProjectRoot", "", function (result) { if (result && result.indexOf("ERROR:") === 0) status(result, true); else if (result) byId("project-root").value = result; }); };
    byId("source-import-assets").onclick = function () { var resultTarget = byId("source-import-result"); callHost("aetoolkitCepImportAssetPaths", byId("source-asset-paths").value, function (result) { try { var summary = JSON.parse(result); resultTarget.textContent = summary.imported ? "Imported " + summary.imported + " asset" + (summary.imported === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No assets were imported."; resultTarget.style.color = summary.errors.length ? "#ffcb8f" : "#91d0a4"; } catch (error) { resultTarget.textContent = result || error.message; resultTarget.style.color = "#ff9d9d"; } }); };
    byId("source-discover-projects").onclick = function () { callHost("aetoolkitCepDiscoverSourceProjects", "", function (result) { try { sourceDiscovery = JSON.parse(result); renderSourceDiscovery(); status(sourceDiscovery.records.length ? "Source projects found. Review the list before importing." : "No source projects found in the selected footage.", !sourceDiscovery.records.length); } catch (error) { status(result || error.message, true); } }); };
    byId("source-import-projects").onclick = function () { var chosen = []; document.querySelectorAll("#source-project-records input[type=checkbox]:checked").forEach(function (check) { chosen.push(check.value); }); if (!chosen.length) { status("Select at least one found source project.", true); return; } callHost("aetoolkitCepImportSourceProjects", JSON.stringify({ paths: chosen, sourceNames: sourceDiscovery.sourceNames || [] }), function (result) { try { var summary = JSON.parse(result); status(summary.imported ? "Imported " + summary.imported + " source project" + (summary.imported === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No source projects were imported.", !!summary.errors.length); } catch (error) { status(result || error.message, true); } }); };
    wireFormatPreset("comp"); wireFormatPreset("modify"); wireFormatPreset("cover"); wireFormatPreset("checker");
    byId("format-dialog").addEventListener("close", function () { startCompPresetDraft(compPresetById(selectedCompPresetId)); renderCompPresetForm(); });
    byId("cancel-format-dialog").onclick = function () { byId("format-dialog").close(); startCompPresetDraft(compPresetById(selectedCompPresetId)); renderCompPresetForm(); };
    byId("cancel-custom-dialog").onclick = function () { byId("custom-format-dialog").close(); };
    byId("new-custom-preset").onclick = function () { byId("custom-format-status").textContent = ""; byId("custom-format-detail").textContent = ""; byId("custom-format-dialog").showModal(); };
    byId("edit-comp-preset").onclick = function () { var preset = compPresetById(byId("saved-comp-preset").value); if (!preset) return; startCompPresetDraft(preset); renderCompPresetForm(); if (preset.kind === "custom-checker") { byId("custom-format-detail").textContent = preset.name + " · " + preset.width + " × " + preset.height + ". Capture selected comps to save a new version."; byId("custom-format-dialog").showModal(); } else byId("format-dialog").showModal(); };
    byId("choose-checker-library").onclick = function () { callHost("aetoolkitCepChooseCheckerLibrary", "", function (path) { if (!path) return; customCheckerPresets = []; checkerLibraryRoot = path; try { window.localStorage.setItem("toolbox2.template-library", path); } catch (error) { status("Could not save library preference.", true); } load(); }); };
    byId("refresh-checker-library").onclick = function () { load(); };
    byId("use-local-library").onclick = function () { checkerLibraryRoot = ""; customCheckerPresets = []; try { window.localStorage.removeItem("toolbox2.template-library"); } catch (ignore) {} load(); };
    byId("capture-custom-checkers").onclick = function () { var button = this; button.disabled = true; status("Copying selected checker templates and media…"); callHost("aetoolkitCepCaptureCheckerTemplates", JSON.stringify({libraryRoot:checkerLibraryRoot}), function (result) { button.disabled = false; try { var summary = JSON.parse(result); refreshCheckerLibrary(function () { byId("custom-format-dialog").close(); status("Saved " + summary.captured + " checker template(s)."); }); } catch (error) { status(result || error.message, true); } }); };
    byId("saved-comp-preset").onchange = function () { selectedCompPresetId = byId("saved-comp-preset").value; startCompPresetDraft(compPresetById(selectedCompPresetId)); renderCompPresetForm(); };
    byId("new-comp-preset").onclick = function () { startCompPresetDraft(); renderCompPresetForm(); byId("format-dialog-status").textContent = ""; byId("format-dialog").showModal(); };
    byId("saved-comp-preset-code").oninput = function () { compPresetDraft.formatCode = this.value; };
    ["name", "width", "height"].forEach(function (key) { byId("saved-comp-preset-" + key).oninput = function () { compPresetDraft[key] = byId("saved-comp-preset-" + key).value; }; });
    byId("add-format-asset").onclick = function () { var key = "guide_" + Date.now().toString(36); while (Object.prototype.hasOwnProperty.call(compPresetDraft.assets, key)) key += "a"; compPresetDraft.assets[key] = ""; renderFormatAssets(); };
    byId("remove-comp-preset").onclick = function () { if (!compPresetDraft.id) return; var previous = state; state = store.removeCompPreset(state, compPresetDraft.id); callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) { if (result !== "OK") { state = previous; status(result || "Could not remove format.", true); return; } selectedCompPresetId = compPresets().length ? compPresets()[0].id : ""; startCompPresetDraft(compPresetById(selectedCompPresetId)); renderFormatSelects(); renderCompPresetForm(); status("Format removed."); }); };

    byId("save-comp-preset").onclick = function () { try { var normalized = store.normalizeCompPreset(compPresetDraft); callHost("aetoolkitCepStorePresetAssets", JSON.stringify({ id: normalized.id, assets: normalized.assets, libraryRoot: checkerLibraryRoot }), function (result) { try { normalized.assets = JSON.parse(result); state = store.upsertCompPreset(state, normalized); selectedCompPresetId = normalized.id; startCompPresetDraft(normalized); save(function () { renderFormatSelects(); renderCompPresetForm(); byId("format-dialog").close(); status("Composition format saved."); }); } catch (error) { status(result || error.message, true); } }); } catch (error) { status(error.message, true); } };
    byId("create-comp").onclick = function () { callHost("aetoolkitCepCreateComp", JSON.stringify(compOptions()), function (result) { try { var created = JSON.parse(result); status("Created " + created.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("modify-comps").onclick = function () { var preset = presetFor("modify"), options = { width: byId("modify-width").value, height: byId("modify-height").value, fps: byId("modify-target-fps").value, duration: 10, replaceGuides: !!preset, guideAssets: preset && preset.assets || {}, knownGuideAssets: compPresets().map(function (entry) { return entry.assets || {}; }) }; options.conformSolids = byId("modify-solids").checked; options.updateSize = byId("modify-size").checked; options.updateFps = byId("modify-fps").checked; options.renameBase = byId("modify-name").checked ? byId("modify-name-base").value : ""; callHost("aetoolkitCepModifySelectedComps", JSON.stringify(options), function (result) { try { var summary = JSON.parse(result); status("Modified " + summary.modified + " composition" + (summary.modified === 1 ? "." : "s.") + " Layer relationships were preserved."); } catch (error) { status(result || error.message, true); } }); };
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
    byId("create-cover").onclick = function () { callHost("aetoolkitCepCreateCover", JSON.stringify(coverOptions()), function (result) { try { var cover = JSON.parse(result); status("Created " + cover.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("create-checkers").onclick = function () { var preset = presetFor("checker"), custom = preset && preset.kind === "custom-checker", options = custom ? { libraryRoot: checkerLibraryRoot, packageId: preset.packageId, templateIndex: preset.templateIndex, jobCode: byId("checker-job-code").value } : checkerOptions(); callHost(custom ? "aetoolkitCepCreateCustomCheckers" : "aetoolkitCepCreateCheckers", JSON.stringify(options), function (result) { try { var summary = JSON.parse(result); status("Created " + summary.created + " checker" + (summary.created === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("consolidate-footage").onclick = function () { callHost("aetoolkitCepConsolidateFootage", "", function (result) { try { JSON.parse(result); status("Consolidated footage."); } catch (error) { status(result || error.message, true); } }); };
    byId("remove-unused").onclick = function () { callHost("aetoolkitCepRemoveUnusedFootage", "", function (result) { try { JSON.parse(result); status("Removed unused footage."); } catch (error) { status(result || error.message, true); } }); };
    byId("reduce-project").onclick = function () { callHost("aetoolkitCepReduceProject", "", function (result) { try { var summary = JSON.parse(result); status("Reduced project to " + summary.kept + " selected item" + (summary.kept === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("organize-project").onclick = function () { var preset = byId("organizer-preset").value; callHost("aetoolkitCepOrganizeProject", preset, function (result) { try { var summary = JSON.parse(result); status("Organized " + summary.moved + " item" + (summary.moved === 1 ? "." : "s.") + " Selected items remain at the root."); } catch (error) { status(result || error.message, true); } }); };
    byId("localize-assets").onclick = function () { var project = activeProject(), paths = project && store.resolveProjectPaths(state, project.id); if (!paths || !paths.assets) { status("Connect an active project with an Assets location first.", true); return; } callHost("aetoolkitCepLocalizeSelectedAssets", paths.assets, function (result) { try { var summary = JSON.parse(result); status(summary.localized ? "Localized " + summary.localized + " asset" + (summary.localized === 1 ? "." : "s.") + (summary.errors.length ? " " + summary.errors.join(" ") : "") : summary.errors.join(" ") || "No assets were localized.", !!summary.errors.length); } catch (error) { status(result || error.message, true); } }); };
    byId("collect-project").onclick = function () { callHost("aetoolkitCepOpenCollectFiles", "", function (result) { showHostResult(result, "Opened the Collect Files dialog."); }); };
    document.querySelectorAll("[data-comp-frame-change]").forEach(function (button) { button.onclick = function () { callHost("aetoolkitCepAdjustSelectedCompFrames", button.dataset.compFrameChange, function (result) { try { var summary = JSON.parse(result); status("Adjusted " + summary.changed + " composition" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); }; });
    byId("set-comp-duration").onclick = function () { callHost("aetoolkitCepSetSelectedCompDuration", byId("tool-comp-duration").value, function (result) { try { var summary = JSON.parse(result); status("Set duration on " + summary.changed + " composition" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("create-no-slate").onclick = function () { callHost("aetoolkitCepCreateNoSlateComp", byId("tool-slate-frames").value, function (result) { try { var summary = JSON.parse(result); status("Created " + summary.name + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("fade-in").onclick = function () { callHost("aetoolkitCepFadeSelectedLayers", JSON.stringify({ direction: "in" }), function (result) { try { var summary = JSON.parse(result), message = "Added marker-driven fade-in to " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + " Drag the layer markers to adjust it."; if (summary.skipped && summary.skipped.length) message += " Skipped: " + summary.skipped.join("; "); status(message, !!(summary.skipped && summary.skipped.length)); } catch (error) { status(result || error.message, true); } }); };
    byId("fade-out").onclick = function () { callHost("aetoolkitCepFadeSelectedLayers", JSON.stringify({ direction: "out" }), function (result) { try { var summary = JSON.parse(result), message = "Added marker-driven fade-out to " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + " Drag the layer markers to adjust it."; if (summary.skipped && summary.skipped.length) message += " Skipped: " + summary.skipped.join("; "); status(message, !!(summary.skipped && summary.skipped.length)); } catch (error) { status(result || error.message, true); } }); };
    byId("sequence-layers").onclick = function () { callHost("aetoolkitCepSequenceSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Sequenced " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("parent-layers").onclick = function () { callHost("aetoolkitCepParentSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Parented " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("parent-layers-to-null").onclick = function () { callHost("aetoolkitCepParentSelectedLayersToNewNull", "", function (result) { try { var summary = JSON.parse(result); status("Parented " + summary.changed + " layer" + (summary.changed === 1 ? "" : "s") + " to " + summary.name + (summary.skipped.length ? ". Skipped: " + summary.skipped.join(", ") : "."), summary.skipped.length > 0); } catch (error) { status(result || error.message, true); } }); };
    byId("move-animation-to-null").onclick = function () { callHost("aetoolkitCepMoveAnimationKeysToParentNull", "", function (result) { try { var summary = JSON.parse(result); status("Moved transform animation on " + summary.changed + " layer" + (summary.changed === 1 ? "" : "s") + " to parent null; opacity keys were left in place" + (summary.skipped.length ? ". Skipped: " + summary.skipped.join("; ") : "."), summary.skipped.length > 0); } catch (error) { status(result || error.message, true); } }); };
    byId("unparent-layers").onclick = function () { callHost("aetoolkitCepUnparentSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Unparented " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("mark-guides").onclick = function () { callHost("aetoolkitCepToggleSelectedGuideLayers", "", function (result) { try { var summary = JSON.parse(result), message = "Toggled " + summary.changed + " guide layer" + (summary.changed === 1 ? "" : "s") + ": " + summary.guides + " guide, " + summary.normal + " normal."; if (summary.skipped.length) message += " Skipped: " + summary.skipped.join(", "); status(message, summary.skipped.length > 0); } catch (error) { status(result || error.message, true); } }); };
    byId("curve-preset").onchange = function () { var preset = store.curvePresets(state).filter(function (entry) { return entry.id === byId("curve-preset").value; })[0]; if (preset) activeCurve = preset.curve.slice(); byId("remove-curve-preset").disabled = !preset || preset.builtIn === true; drawCurve(false); };
    ["curve-x1", "curve-y1", "curve-x2", "curve-y2"].forEach(function (id, index) { byId(id).onchange = function () { activeCurve[index] = curveNumber(this.value); drawCurve(true); }; });
    wireCurveHandle("curve-handle-one", 0); wireCurveHandle("curve-handle-two", 2);
    Array.prototype.forEach.call(document.querySelectorAll("[data-animation-subtab]"), function (button) { button.onclick = function () { setAnimationSubtab(button.getAttribute("data-animation-subtab"), true); }; });
    var initialAnimationSubtab = "key-graph"; try { initialAnimationSubtab = window.localStorage.getItem("toolbox2.animation-subtab") || initialAnimationSubtab; } catch (ignoreAnimationSubtab) {} setAnimationSubtab(initialAnimationSubtab, false);
    byId("apply-curve").onclick = function () { callHost("aetoolkitCepApplyCurvePreset", JSON.stringify({ curve: activeCurve }), function (result) { try { var summary = JSON.parse(result), message = "Applied the curve to " + summary.segments + " keyframe segment" + (summary.segments === 1 ? "" : "s") + " across " + summary.properties + " propert" + (summary.properties === 1 ? "y." : "ies."); if (summary.skipped.length) message += " Skipped: " + summary.skipped.join(", "); status(message, summary.skipped.length > 0); } catch (error) { status(result || error.message, true); } }); };
    byId("save-curve-preset").onclick = function () { var dialog = byId("curve-preset-dialog"); byId("curve-preset-name").value = ""; byId("curve-preset-error").textContent = ""; dialog.showModal(); byId("curve-preset-name").focus(); };
    byId("curve-preset-cancel").onclick = function () { byId("curve-preset-dialog").close(); };
    byId("curve-preset-form").onsubmit = function (event) { event.preventDefault(); try { var name = byId("curve-preset-name").value.trim(); state = store.upsertCurvePreset(state, { name: name, curve: activeCurve }); var id = store.normalizeCurvePreset({ name: name, curve: activeCurve }).id; save(function () { byId("curve-preset-dialog").close(); renderCurvePresets(id); status("Saved “" + name + "” to Shared resources."); }); } catch (error) { byId("curve-preset-error").textContent = error.message; } };
    byId("remove-curve-preset").onclick = function () { try { var selected = byId("curve-preset").value, preset = store.curvePresets(state).filter(function (entry) { return entry.id === selected; })[0]; state = store.removeCurvePreset(state, selected); save(function () { renderCurvePresets("ease-in-out"); status("Removed “" + preset.name + "” from Shared resources."); }); } catch (error) { status(error.message, true); } };
    byId("select-layer-type").onclick = function () { callHost("aetoolkitCepSelectLayersByType", JSON.stringify({ type: byId("tool-select-type").value, mode: byId("tool-select-mode").value }), function (result) { try { var summary = JSON.parse(result); status("Selected " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("flip-layer-order").onclick = function () { callHost("aetoolkitCepReverseSelectedLayerOrder", "", function (result) { try { var summary = JSON.parse(result); status("Reversed " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("repeat-offset").onchange = function () { byId("repeat-gap").disabled = !this.checked; };
    ["repeat", "anchor"].forEach(function (kind) {
        var buttons = byId(kind + "-directions").querySelectorAll("button");
        Array.prototype.forEach.call(buttons, function (button) {
            button.onclick = function () {
                callHost("aetoolkitCepLayerPlacement", JSON.stringify({ action: kind, x: Number(button.getAttribute("data-x")), y: Number(button.getAttribute("data-y")), gap: byId("repeat-offset").checked ? Number(byId("repeat-gap").value) : 0, bounds: byId("anchor-bounds").value, absolute: byId("anchor-absolute").checked }), function (result) {
                    try { var summary = JSON.parse(result); status("Updated " + summary.changed + " layer(s)." + (summary.skipped.length ? " Skipped: " + summary.skipped.join("; ") : ""), summary.skipped.length > 0); }
                    catch (error) { status(result || error.message, true); }
                });
            };
        });
    });
    byId("conform-solids").onclick = function () { callHost("aetoolkitCepConformSelectedSolids", "", function (result) { try { var summary = JSON.parse(result); status("Conformed " + summary.conformed + " solid layer(s)."); } catch (error) { status(result || error.message, true); } }); };
    byId("snap-to-last").onclick = function () { callHost("aetoolkitCepSnapSelectedLayers", "", function (result) { try { var summary = JSON.parse(result); status("Snapped " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("transfer-transform").onclick = function () { callHost("aetoolkitCepTransferTransform", JSON.stringify({ position: byId("transfer-position").checked, scale: byId("transfer-scale").checked, rotation: byId("transfer-rotation").checked }), function (result) { try { var summary = JSON.parse(result); status("Updated " + summary.changed + " layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    byId("replace-text").onclick = function () { callHost("aetoolkitCepReplaceSelectedText", byId("tool-replace-text").value, function (result) { try { var summary = JSON.parse(result); status("Updated " + summary.changed + " text layer" + (summary.changed === 1 ? "." : "s.") + "."); } catch (error) { status(result || error.message, true); } }); };
    var templateAssignmentProjectId = "", templateAssignmentSaving = false;
    byId("change-project-template").onclick = function () {
        var project = activeProject(); if (!project) return;
        templateAssignmentProjectId = project.id;
        var select = byId("assigned-project-template"); clearChildren(select);
        state.templates.forEach(function (template) { var option = document.createElement("option"); option.value = template.id; option.textContent = template.name; select.appendChild(option); });
        select.value = project.templateId;
        byId("project-template-error").textContent = "";
        byId("project-template-dialog").showModal();
    };
    byId("cancel-project-template").onclick = function () { if (!templateAssignmentSaving) byId("project-template-dialog").close(); };
    byId("project-template-dialog").addEventListener("cancel", function (event) { if (templateAssignmentSaving) event.preventDefault(); });
    byId("save-project-template").onclick = function () {
        if (templateAssignmentSaving) return;
        var previous = state, project = projectById(templateAssignmentProjectId);
        try {
            if (!project) throw new Error("This project is no longer available.");
            var updated = copy(project); updated.templateId = byId("assigned-project-template").value;
            state = store.assignProject(state, updated);
        } catch (error) { byId("project-template-error").textContent = error.message; return; }
        templateAssignmentSaving = true;
        byId("save-project-template").disabled = byId("cancel-project-template").disabled = true;
        callHost("aetoolkitCepSaveState", JSON.stringify(state), function (result) {
            templateAssignmentSaving = false;
            byId("save-project-template").disabled = byId("cancel-project-template").disabled = false;
            if (result !== "OK") { state = previous; byId("project-template-error").textContent = result || "Could not save project template."; return; }
            renderProjects(); renderActiveProject(); byId("project-template-dialog").close(); status("Project template updated.");
        });
    };
    byId("connect-project").onclick = function () { try { var name = byId("project-name").value, root = byId("project-root").value; state = store.assignProject(state, { name: name, root: root, templateId: byId("project-template").value }); var matched = state.projects.filter(function (project) { return project.name === name && project.root === String(root).replace(/\\/g, "/").replace(/\/+$/g, ""); })[0]; state = store.setActiveProject(state, matched.id); save(function () { renderProjects(); renderActiveProject(); status("Project added."); }); } catch (error) { status(error.message, true); } };
    byId("project-search").oninput = function () { renderActiveProject(); };
    byId("active-project").onchange = function () { if (!this.value) return; try { state = store.setActiveProject(state, byId("active-project").value); byId("project-search").value = ""; save(function () { renderProjects(); renderActiveProject(); status("Project selected."); }); } catch (error) { status(error.message, true); } };
    byId("remove-project").onclick = function () { var project = activeProject(); if (!project) return; try { state = store.removeProject(state, project.id); save(function () { renderProjects(); renderActiveProject(); status("Project removed."); }); } catch (error) { status(error.message, true); } };
    byId("open-project-file").onclick = function () { var project = activeProject(), paths = project && store.resolveProjectPaths(state, project.id); if (paths) callHost("aetoolkitCepOpenProjectFromFolder", paths.afterEffects, function (result) { showHostResult(result); }); };
    byId("reveal-project-root").onclick = function () { var project = activeProject(); if (project) callHost("aetoolkitCepRevealFolder", project.root, function (result) { showHostResult(result, "Opened " + project.root); }); };
    var renderSubfolderValues = {};
    function renderDestinationButtons() {
        var container = byId("render-destinations"), project = activeProject(); clearChildren(container);
        var destinations = project ? store.renderDestinations(state, project.id) : [{ id: "outputs", label: "Outputs", path: "" }];
        destinations.forEach(function (destination) {
            var section = document.createElement("section"), row = document.createElement("div"), label = document.createElement("label"), input = document.createElement("input"), choose = document.createElement("button");
            var key = project ? project.id + ":" + project.templateId + ":" + destination.id : "none";
            section.className = "render-destination"; section.setAttribute("aria-label", destination.label);
            row.className = "input-action folder-action"; label.textContent = "Optional subfolder";
            input.type = "text"; input.placeholder = "Version or delivery folder"; input.value = renderSubfolderValues[key] || "";
            input.disabled = !project || !destination.path; input.oninput = function () { renderSubfolderValues[key] = input.value; };
            choose.textContent = "Choose subfolder"; choose.className = "quiet choose-folder"; choose.disabled = input.disabled;
            choose.onclick = function () { callHost("aetoolkitCepChooseRenderSubfolder", "", function (result) {
                if (result && result.indexOf("ERROR:") === 0) status(result, true);
                else if (result) { input.value = result; renderSubfolderValues[key] = result; }
            }); };
            label.appendChild(input); row.appendChild(label); row.appendChild(choose); section.appendChild(row);
            var button = document.createElement("button"); button.className = "primary";
            button.textContent = destination.id === "outputs" ? "Render to outputs" : "Render to " + destination.label;
            button.disabled = !project || !destination.path; button.title = destination.path || "Choose a project with an output folder";
            button.onclick = function () {
                if (!byId("render-output-preset").value) { status("Choose an output preset. Refresh presets in Templates if needed.", true); return; }
                callHost("aetoolkitCepRenderSelected", JSON.stringify({ outputTemplate: byId("render-output-preset").value, basePath: destination.path, subfolder: input.value }), function (result) { showHostResult(result); });
            };
            section.appendChild(button); container.appendChild(section);
        });
    }
    var aomPresetNames = null;
    function inspectAom(path) {
        callHost("aetoolkitCepReadAom", path, function (result) {
            try { aomPresetNames = JSON.parse(result); if (!Array.isArray(aomPresetNames)) throw new Error("Invalid preset list."); byId("aom-preset-names").textContent = aomPresetNames.join(" · "); refreshOutputPresets(); }
            catch (error) { aomPresetNames = []; byId("aom-preset-names").textContent = result || "Unable to read AOM presets."; clearChildren(byId("render-output-preset")); }
        });
    }
    function refreshOutputPresets() {
        callHost("aetoolkitCepOutputTemplates", "", function (result) {
            try {
                if (!result) throw new Error("Open Toolbox in After Effects to read installed output presets.");
                var names = JSON.parse(result), select = byId("render-output-preset"), selected = select.value;
                if (!Array.isArray(names)) throw new Error("Could not read output presets.");
                if (!selected) try { selected = window.localStorage.getItem("toolbox2.output-preset") || ""; } catch (ignore) {}
                clearChildren(select); var empty = document.createElement("option"); empty.value = ""; empty.textContent = "Select output preset"; select.appendChild(empty);
                var fileNames = aomPresetNames || names;
                fileNames.forEach(function (name) { var option = document.createElement("option"); option.value = name; option.textContent = name + (names.indexOf(name) < 0 ? " (load in AE)" : ""); option.disabled = names.indexOf(name) < 0; select.appendChild(option); });
                select.value = names.indexOf(selected) >= 0 && fileNames.indexOf(selected) >= 0 ? selected : "";
                byId("output-presets-status").textContent = (aomPresetNames ? "Showing " + aomPresetNames.length + " presets from the AOM. Load the file in AE to use its exact settings." : names.length + " installed output presets available in Render to outputs.");
            } catch (error) { byId("output-presets-status").textContent = result && result.indexOf("ERROR:") === 0 ? result : error.message; }
        });
    }
    byId("choose-aom").onclick = function () { callHost("aetoolkitCepChooseAom", "", function (result) {
        if (!result) return;
        if (result.indexOf("ERROR:") === 0) { status(result, true); return; }
        byId("aom-path").value = result;
        inspectAom(result);
        try { window.localStorage.setItem("toolbox2.aom-path", result); } catch (ignore) {}
        byId("output-presets-status").textContent = "File selected. Load it through Edit → Templates → Output Module in After Effects, then click Refresh presets.";
    }); };
    byId("refresh-output-presets").onclick = refreshOutputPresets;
    byId("render-output-preset").onchange = function () { try { window.localStorage.setItem("toolbox2.output-preset", this.value); } catch (ignore) {} };
    try { byId("aom-path").value = window.localStorage.getItem("toolbox2.aom-path") || ""; } catch (ignore) {}
    if (cs.getExtensionPath()) { if (byId("aom-path").value) inspectAom(byId("aom-path").value); else refreshOutputPresets(); }
    byId("refresh-projects").onclick = function () { renderProjects(); renderActiveProject(); };
    load();
}());
