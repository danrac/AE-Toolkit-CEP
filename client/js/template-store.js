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
    function defaultCompPresets() {
        return [{ id: "hd", name: "HD", width: 1920, height: 1080, assets: {} }, { id: "uhd", name: "UHD", width: 3840, height: 2160, assets: {} }, { id: "square", name: "Square", width: 1080, height: 1080, assets: {} }, { id: "vertical", name: "Vertical", width: 1080, height: 1920, assets: {} }];
    }
    function defaultState() {
        return { version: 2, templates: [{ id: "default-motion", name: "Default Motion Project", folders: { afterEffects: "05_GFX/02_AfterEffects", assets: "05_GFX/03_Assets", toGfx: "05_GFX/06_ToGFX", outputs: "05_GFX/07_Output", styleFrames: "05_GFX/07_Output/_StyleFrames" }, customFolders: [] }], compPresets: defaultCompPresets(), projects: [], activeProjectId: "" };
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
        if (!next.activeProjectId) next.activeProjectId = record.id;
        return next;
    }
    function setActiveProject(state, projectId) {
        var next = clone(state), found = false;
        for (var i = 0; i < next.projects.length; i++) if (next.projects[i].id === projectId) found = true;
        if (!found) throw new Error("Choose a connected project.");
        next.activeProjectId = projectId;
        return next;
    }
    function removeProject(state, projectId) {
        var next = clone(state), kept = [], found = false;
        for (var i = 0; i < next.projects.length; i++) {
            if (next.projects[i].id === projectId) found = true;
            else kept.push(next.projects[i]);
        }
        if (!found) throw new Error("Project not found.");
        next.projects = kept;
        if (next.activeProjectId === projectId) next.activeProjectId = kept.length ? kept[0].id : "";
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
    function normalizeCompPreset(preset) {
        var name = String(preset.name || "").replace(/^\s+|\s+$/g, ""), width = Number(preset.width), height = Number(preset.height), assets = preset.assets || {};
        if (!name) throw new Error("Preset name is required.");
        if (!isFinite(width) || Math.floor(width) !== width || width < 1 || width > 30000) throw new Error("Preset width must be between 1 and 30000.");
        if (!isFinite(height) || Math.floor(height) !== height || height < 1 || height > 30000) throw new Error("Preset height must be between 1 and 30000.");
        return { id: preset.id || idFromName(name), name: name, width: width, height: height, assets: { matte: assets.matte || "", chartOne: assets.chartOne || "", chartTwo: assets.chartTwo || "" } };
    }
    function compPresets(state) { return state.compPresets && state.compPresets.length ? state.compPresets : defaultCompPresets(); }
    function upsertCompPreset(state, preset) {
        var next = clone(state), normalized = normalizeCompPreset(preset), presets = compPresets(next), found = false;
        next.compPresets = presets;
        for (var i = 0; i < presets.length; i++) if (presets[i].id === normalized.id) { presets[i] = normalized; found = true; }
        if (!found) presets.push(normalized);
        return next;
    }
    return { FOLDER_KEYS: FOLDER_KEYS, defaultState: defaultState, defaultCompPresets: defaultCompPresets, compPresets: compPresets, normalizeCompPreset: normalizeCompPreset, upsertCompPreset: upsertCompPreset, validateTemplate: validateTemplate, upsertTemplate: upsertTemplate, assignProject: assignProject, setActiveProject: setActiveProject, removeProject: removeProject, resolveProjectPaths: resolveProjectPaths };
}));
