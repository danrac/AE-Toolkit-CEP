(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AEToolkitTemplates = api;
}(this, function () {
    var FOLDER_KEYS = ["afterEffects", "assets", "toGfx", "outputs", "styleFrames"];
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function idFromName(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "template"; }
    function normalizeRelativePath(value) {
        var path = String(value || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "").replace(/^\/+|\/+$/g, "");
        if (path === "") return "";
        if (/^[A-Za-z]:\//.test(path) || path.indexOf("../") === 0 || path.indexOf("/../") !== -1) throw new Error("Template folders must be relative paths without '..'.");
        return path;
    }
    function defaultState() {
        return { version: 1, templates: [{ id: "default-motion", name: "Default Motion Project", folders: { afterEffects: "05_GFX/02_AfterEffects", assets: "05_GFX/03_Assets", toGfx: "05_GFX/06_ToGFX", outputs: "05_GFX/07_Output", styleFrames: "05_GFX/07_Output/_StyleFrames" }, customFolders: [] }], projects: [] };
    }
    function validateTemplate(template) {
        if (!template || !String(template.name || "").replace(/^\s+|\s+$/g, "")) throw new Error("Template name is required.");
        var folders = {}, key;
        for (var i = 0; i < FOLDER_KEYS.length; i++) { key = FOLDER_KEYS[i]; folders[key] = normalizeRelativePath(template.folders && template.folders[key]); }
        var customFolders = [], usedIds = {}, reservedIds = { "after-effects": true, "to-gfx": true, "style-frames": true };
        for (var reservedIndex = 0; reservedIndex < FOLDER_KEYS.length; reservedIndex++) reservedIds[FOLDER_KEYS[reservedIndex]] = true;
        var supplied = template.customFolders || [];
        for (var customIndex = 0; customIndex < supplied.length; customIndex++) {
            var entry = supplied[customIndex];
            var label = String(entry.label || "").replace(/^\s+|\s+$/g, "");
            if (!label) throw new Error("Each custom location needs a name.");
            var id = idFromName(label);
            if (usedIds[id] || reservedIds[id]) throw new Error("Custom location names must be unique and cannot replace a standard location.");
            usedIds[id] = true;
            customFolders.push({ id: id, label: label, path: normalizeRelativePath(entry.path) });
        }
        return { id: template.id || idFromName(template.name), name: String(template.name).replace(/^\s+|\s+$/g, ""), folders: folders, customFolders: customFolders };
    }
    function upsertTemplate(state, template) {
        var next = clone(state), normalized = validateTemplate(template), found = false;
        for (var i = 0; i < next.templates.length; i++) if (next.templates[i].id === normalized.id) { next.templates[i] = normalized; found = true; }
        if (!found) next.templates.push(normalized);
        return next;
    }
    function assignProject(state, project) {
        var next = clone(state), root = String(project.root || "").replace(/\\/g, "/").replace(/\/+$/g, "");
        if (!project.name || !root || root.charAt(0) !== "/" && !/^[A-Za-z]:\//.test(root)) throw new Error("Project name and an absolute project root are required.");
        var templateExists = next.templates.some(function (template) { return template.id === project.templateId; });
        if (!templateExists) throw new Error("Choose a project template.");
        var record = { id: project.id || idFromName(project.name), name: String(project.name), root: root, templateId: project.templateId };
        var replaced = false;
        for (var i = 0; i < next.projects.length; i++) if (next.projects[i].id === record.id) { next.projects[i] = record; replaced = true; }
        if (!replaced) next.projects.push(record);
        return next;
    }
    function resolveProjectPaths(state, projectId) {
        var project = state.projects.filter(function (entry) { return entry.id === projectId; })[0];
        if (!project) throw new Error("Project not found.");
        var template = state.templates.filter(function (entry) { return entry.id === project.templateId; })[0];
        if (!template) throw new Error("Assigned template not found.");
        var result = {};
        FOLDER_KEYS.forEach(function (key) { result[key] = template.folders[key] ? project.root + "/" + template.folders[key] : ""; });
        (template.customFolders || []).forEach(function (entry) { result[entry.id] = entry.path ? project.root + "/" + entry.path : ""; });
        return result;
    }
    return { FOLDER_KEYS: FOLDER_KEYS, defaultState: defaultState, validateTemplate: validateTemplate, upsertTemplate: upsertTemplate, assignProject: assignProject, resolveProjectPaths: resolveProjectPaths };
}));
