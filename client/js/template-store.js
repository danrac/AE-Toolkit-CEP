(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.AEToolkitTemplates = api;
    else root.AEToolkitTemplates = api;
}(this, function () {
    var FOLDER_KEYS = ["afterEffects", "assets", "toGfx", "outputs", "styleFrames"];
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function idFromName(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "template"; }
    function normalizeRelativePath(value) {
        var path = String(value || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "").replace(/\/+$/g, "");
        if (path === "") return "";
        if (path.charAt(0) === "/" || /^[A-Za-z]:/.test(path) || /(^|\/)\.\.?($|\/)/.test(path)) throw new Error("Template folders must be relative paths without '..'.");
        return path;
    }
    function namingOrder(template) {
        var defaults = ["job", "format", "style", "description", "version", "initials"];
        var order = template ? template.namingOrder : undefined;
        if (order === undefined) return defaults;
        if (!Array.isArray(order) || order.length !== defaults.length) throw new Error("Naming order must include all six fields.");
        var seen = {};
        order.forEach(function (key) {
            if (defaults.indexOf(key) < 0 || seen[key]) throw new Error("Each naming field must appear exactly once.");
            seen[key] = true;
        });
        return order.slice();
    }
    function namingFields(template) {
        var labels = { job: "Job", format: "Format", style: "Style", description: "Description", version: "Version", initials: "Initials" };
        var fields = template && template.namingFields;
        if (fields === undefined || fields === null) fields = namingOrder(template).map(function (key) { return { id: key, label: labels[key], type: key === "version" ? "version" : key === "format" ? "format" : "text", value: key === "version" ? "1" : "", prefix: "v", digits: 2 }; });
        if (!Array.isArray(fields) || !fields.length) throw new Error("Add at least one naming field.");
        var seen = {};
        return fields.map(function (field) {
            var id = String(field.id || ""), label = String(field.label || "").trim(), type = field.type;
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id) || ["__proto__", "constructor", "prototype"].indexOf(id) >= 0 || seen[id]) throw new Error("Naming field IDs must be unique.");
            seen[id] = true;
            if (!label) throw new Error("Each naming field needs a label.");
            if (["text", "version", "format"].indexOf(type) < 0) throw new Error("Choose a naming field type.");
            var digits = field.digits === undefined ? 2 : Number(field.digits), value = String(field.value === undefined ? (type === "version" ? "1" : "") : field.value);
            if (type === "version" && (!/^\d+$/.test(value) || !Number.isInteger(digits) || digits < 1 || digits > 6)) throw new Error("Versions need a whole number and 1–6 digits.");
            return { id: id, label: label, type: type, value: value, prefix: field.prefix === undefined ? "v" : String(field.prefix), digits: digits };
        });
    }
    function previewNaming(fields) {
        var examples = {};
        fields.forEach(function (field) {
            if (field.type === "text" && !String(field.value || "").trim()) examples[field.id] = "[" + field.label + "]";
        });
        return formatNaming(fields, examples, "HD");
    }
    function formatNaming(fields, values, format) {
        function clean(value) { return String(value || "").trim().replace(/[\\\/:*?"<>|\r\n]+/g, "").replace(/\s+/g, "_"); }
        return fields.map(function (field) {
            var value = Object.prototype.hasOwnProperty.call(values, field.id) ? values[field.id] : field.value;
            if (field.type === "format") value = format;
            if (field.type === "version") {
                if (!/^\d+$/.test(String(value))) throw new Error(field.label + " must be a whole number.");
                value = String(Number(value)); while (value.length < field.digits) value = "0" + value;
                value = field.prefix + value;
            }
            return clean(value);
        }).filter(function (part) { return !!part; }).join("_") || "Comp";
    }
    function defaultCompPresets() {
        return [{"id": "hd", "name": "16:9 HD", "width": 1920, "height": 1080, "assets": {"chartOne": "bundled:HD_chart.psd"}, "formatCode": "HD"}, {"id": "uhd", "name": "UHD 3840", "width": 3840, "height": 2160, "assets": {"chartOne": "bundled:UHD_chart.psd"}, "formatCode": "UHD"}, {"id": "vertical", "name": "9:16 Social", "width": 1080, "height": 1920, "assets": {"matte": "bundled:9x16_matte.png", "chartOne": "bundled:9x16_chart.psd"}, "formatCode": "9x16"}, {"id": "vertical-tiktok", "name": "9:16 TikTok safe", "width": 1080, "height": 1920, "assets": {"matte": "bundled:9x16TT_matte.png", "chartOne": "bundled:9x16_chart.psd"}, "formatCode": "9x16"}, {"id": "social-4x5", "name": "4:5 Social", "width": 1080, "height": 1350, "assets": {"matte": "bundled:4x5_matte.png", "chartOne": "bundled:4x5_chart.psd"}, "formatCode": "4x5"}, {"id": "social-4x5-safe", "name": "4:5 with 9:16 safe", "width": 1080, "height": 1350, "assets": {"matte": "bundled:4x5_9x16_matte.png", "chartOne": "bundled:4x5_chart.psd"}, "formatCode": "4x5"}, {"id": "square", "name": "1:1 Square", "width": 1080, "height": 1080, "assets": {"matte": "bundled:1x1_matte.png", "chartOne": "bundled:1x1_chart.psd"}, "formatCode": "1x1"}, {"id": "hd-185", "name": "HD 1.85 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:185_matte.png", "chartOne": "bundled:185_chart.psd"}, "formatCode": "HD185"}, {"id": "hd-200", "name": "HD 2.00 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:200_matte.png", "chartOne": "bundled:200_chart.psd"}, "formatCode": "HD200"}, {"id": "hd-210", "name": "HD 2.10 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:210_matte.png", "chartOne": "bundled:210_chart.psd"}, "formatCode": "HD210"}, {"id": "hd-235", "name": "HD 2.35 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:235_matte.png", "chartOne": "bundled:235_chart.psd"}, "formatCode": "HD235"}, {"id": "hd-240", "name": "HD 2.40 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:240_matte.png", "chartOne": "bundled:240_chart.psd"}, "formatCode": "HD240"}, {"id": "hd-241", "name": "HD 2.41 letterbox", "width": 1920, "height": 1080, "assets": {"matte": "bundled:241_matte.png", "chartOne": "bundled:241_chart.psd"}, "formatCode": "HD241"}, {"id": "hd-1020", "name": "HD 10/20", "width": 1920, "height": 1080, "assets": {"matte": "bundled:HD1020_matte.png", "chartOne": "bundled:HD1020_chart.psd"}, "formatCode": "HD1020"}];
    }
    function defaultState() {
        return { version: 2, templates: [{ id: "default-motion", name: "Default Motion Project", folders: { afterEffects: "After Effects", assets: "Assets", toGfx: "Incoming", outputs: "Outputs", styleFrames: "Outputs/Style Frames" }, customFolders: [] }], compPresets: defaultCompPresets(), projects: [], activeProjectId: "" };
    }
    function renderFolders(template) {
        var defaults = { offline: "Offline", online: "Online", checker: "Checkers" }, supplied = template && template.renderFolders || {}, result = {};
        Object.keys(defaults).forEach(function (key) { result[key] = normalizeRelativePath(Object.prototype.hasOwnProperty.call(supplied, key) ? supplied[key] : defaults[key]); });
        return result;
    }
    function resolveRenderPaths(state, projectId) {
        var paths = resolveProjectPaths(state, projectId), project = state.projects.filter(function (entry) { return entry.id === projectId; })[0];
        var template = state.templates.filter(function (entry) { return entry.id === project.templateId; })[0], folders = renderFolders(template), result = { styleFrames: paths.styleFrames };
        Object.keys(folders).forEach(function (key) { result[key] = paths.outputs ? paths.outputs + (folders[key] ? "/" + folders[key] : "") : ""; });
        return result;
    }
    function renderDestinations(state, projectId) {
        var paths = resolveProjectPaths(state, projectId), project = state.projects.filter(function (entry) { return entry.id === projectId; })[0];
        var template = state.templates.filter(function (entry) { return entry.id === project.templateId; })[0];
        var result = [{ id: "outputs", label: "Outputs", path: paths.outputs }];
        (template.customFolders || []).forEach(function (entry) {
            if (entry.renderOutput === true) result.push({ id: entry.id, label: entry.label, path: paths[entry.id] });
        });
        return result;
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
            customFolders.push({ id: id, label: label, path: normalizeRelativePath(entry.path), renderOutput: entry.renderOutput === true });
        }
        return { id: template.id || idFromName(template.name), name: String(template.name).replace(/^\s+|\s+$/g, ""), folders: folders, renderFolders: renderFolders(template), customFolders: customFolders, namingFields: namingFields(template) };
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
    function compFormatCode(preset) {
        if (!preset) return "";
        if (String(preset.formatCode || "").trim()) return String(preset.formatCode).trim();
        var builtIn = defaultCompPresets().filter(function (entry) { return entry.id === preset.id && entry.width === Number(preset.width) && entry.height === Number(preset.height); })[0];
        return builtIn ? builtIn.formatCode : preset.width + "x" + preset.height;
    }
    function normalizeCompPreset(preset) {
        var name = String(preset.name || "").replace(/^\s+|\s+$/g, ""), width = Number(preset.width), height = Number(preset.height), assets = preset.assets || {};
        if (!name) throw new Error("Preset name is required.");
        if (!isFinite(width) || Math.floor(width) !== width || width < 1 || width > 30000) throw new Error("Preset width must be between 1 and 30000.");
        if (!isFinite(height) || Math.floor(height) !== height || height < 1 || height > 30000) throw new Error("Preset height must be between 1 and 30000.");
        return { id: preset.id || idFromName(name), name: name, formatCode: compFormatCode(preset), width: width, height: height, assets: Object.keys(assets).reduce(function (result, key) { if (!/^(matte|chartOne|chartTwo|matte_[a-z0-9]+|guide_[a-z0-9]+)$/.test(key)) throw new Error("Invalid guide entry."); result[key] = String(assets[key] || ""); return result; }, {}) };
    }
    function compPresets(state) {
        var saved = state.compPresets || [], defaults = defaultCompPresets(), legacy = { hd: "HD", uhd: "UHD", square: "Square", vertical: "Vertical" };
        var result = saved.map(function (preset) {
            var builtIn = defaults.filter(function (entry) { return entry.id === preset.id; })[0];
            if (builtIn && preset.name === legacy[preset.id] && preset.width === builtIn.width && preset.height === builtIn.height && !Object.keys(preset.assets || {}).some(function (key) { return !!preset.assets[key]; })) return builtIn;
            return preset;
        });
        defaults.forEach(function (preset) { if (!result.some(function (entry) { return entry.id === preset.id; })) result.push(preset); });
        return result.filter(function (preset) { return (state.removedCompPresets || []).indexOf(preset.id) === -1; });
    }
    function upsertCompPreset(state, preset) {
        var next = clone(state), normalized = normalizeCompPreset(preset), presets = compPresets(next), found = false;
        next.removedCompPresets = (next.removedCompPresets || []).filter(function (id) { return id !== normalized.id; });
        next.compPresets = presets;
        for (var i = 0; i < presets.length; i++) if (presets[i].id === normalized.id) { presets[i] = normalized; found = true; }
        if (!found) presets.push(normalized);
        return next;
    }
    function removeCompPreset(state, id) {
        var next = clone(state);
        next.compPresets = compPresets(next).filter(function (preset) { return preset.id !== id; });
        next.removedCompPresets = (next.removedCompPresets || []).concat([id]);
        return next;
    }
    return { renderDestinations: renderDestinations, renderFolders: renderFolders, resolveRenderPaths: resolveRenderPaths, removeCompPreset: removeCompPreset, compFormatCode: compFormatCode, previewNaming: previewNaming, namingFields: namingFields, formatNaming: formatNaming, namingOrder: namingOrder, FOLDER_KEYS: FOLDER_KEYS, defaultState: defaultState, defaultCompPresets: defaultCompPresets, compPresets: compPresets, normalizeCompPreset: normalizeCompPreset, upsertCompPreset: upsertCompPreset, validateTemplate: validateTemplate, upsertTemplate: upsertTemplate, assignProject: assignProject, setActiveProject: setActiveProject, removeProject: removeProject, resolveProjectPaths: resolveProjectPaths };
}));
