(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.AEToolkitFormatCSV = api;
    else root.AEToolkitFormatCSV = api;
}(this, function () {
    function clean(value) { return String(value || "").trim(); }
    function clientName(value) { value = clean(value).replace(/\s+/g, " "); return !value || /^default(?:\s*\(.*\))?$/i.test(value) ? "Default" : value; }
    function identity(client, code) { return clientName(client).toLowerCase() + "|" + clean(code).toLowerCase(); }
    function rows(text) {
        text = String(text).replace(/^\uFEFF/, "");
        var result = [], row = [], value = "", quoted = false, afterQuote = false, i, char;
        for (i = 0; i < text.length; i++) {
            char = text.charAt(i);
            if (quoted) {
                if (char === '"') { if (text.charAt(i + 1) === '"') { value += '"'; i++; } else { quoted = false; afterQuote = true; } }
                else value += char;
            } else if (char === ',' || char === '\r' || char === '\n') {
                row.push(value); value = ""; afterQuote = false;
                if (char !== ',') { result.push(row); row = []; if (char === '\r' && text.charAt(i + 1) === '\n') i++; }
            } else if (char === '"' && !value && !afterQuote) quoted = true;
            else if (afterQuote && !/\s/.test(char)) throw new Error("Unexpected character after a quoted CSV field.");
            else if (!afterQuote) value += char;
        }
        if (quoted) throw new Error("Unclosed quoted CSV field.");
        if (value || row.length) { row.push(value); result.push(row); }
        return result;
    }
    function asset(value) {
        value = clean(value);
        if (/^(n\/?a|none)$/i.test(value)) return { value: "" };
        if (!value || /^(in progress|tbd|pending)$/i.test(value)) return { pending: true };
        value = value.replace(/['"]+$/g, "").replace(/^['"]+/g, "").replace(/\\/g, "/");
        if ((/^(\/|[A-Za-z]:\/|library:|bundled:)/.test(value)) && !/(^|\/)\.\.($|\/)/.test(value)) return { value: value };
        return { pending: true, note: value };
    }
    function parse(text) {
        var table = rows(text), report = { rows: [], clients: ["Default"], notices: [] }, currentClient = "Default", seen = {}, conflicts = {}, header;
        if (!table.length) throw new Error("The CSV is empty.");
        header = table.shift().map(function (value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ""); });
        var columns = {};
        var aliases = { client:["client"], name:["prefixmenuitemname", "prefix", "menuitemname", "name"], code:["aspectformatcode", "aspect", "formatcode"], width:["sizex", "width"], height:["sizey", "height"], matte:["matte"], chartOne:["chart1", "chartone"], chartTwo:["chart2", "charttwo"] };
        Object.keys(aliases).forEach(function (key) { columns[key] = -1; aliases[key].forEach(function (alias) { var index = header.indexOf(alias); if (index >= 0) columns[key] = index; }); if (columns[key] < 0) throw new Error("CSV column missing: " + key); });
        columns.fps = header.indexOf("fps"); if (columns.fps < 0) columns.fps = header.indexOf("framerate");
        table.forEach(function (row, index) {
            function cell(key) { return clean(row[columns[key]]); }
            if (cell("client")) currentClient = clientName(cell("client"));
            if (!report.clients.some(function (entry) { return entry.toLowerCase() === currentClient.toLowerCase(); })) report.clients.push(currentClient);
            if (!cell("name") && !cell("code")) return;
            var line = index + 2, code = cell("code"), name = cell("name"), width = Number(cell("width")), height = Number(cell("height"));
            if (!code || !name || !/^[A-Za-z0-9_-]+$/.test(code) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30000 || height > 30000) {
                report.notices.push("Row " + line + " (" + currentClient + "): incomplete name, code, or dimensions; existing presets kept."); return;
            }
            var entry = {client:currentClient, name:name, formatCode:code, width:width, height:height, assets:{}, line:line};
            if (cell("fps")) {
                entry.fps = Number(cell("fps"));
                if (!isFinite(entry.fps) || entry.fps < 1 || entry.fps > 240) { report.notices.push("Row " + line + ": invalid FPS; existing presets kept."); return; }
            }
            ["matte", "chartOne", "chartTwo"].forEach(function (key) {
                var field = asset(cell(key));
                if (!field.pending) entry.assets[key] = field.value;
                else if (cell(key)) report.notices.push("Row " + line + " " + key + ": pending guide; existing asset kept.");
            });
            var key = identity(currentClient, code), signature = JSON.stringify([name,width,height,entry.fps,entry.assets]);
            if (seen[key]) {
                if (seen[key].signature !== signature) { conflicts[key] = true; report.notices.push("Row " + line + ": conflicting duplicate client/code " + currentClient + " / " + code + "; neither row will be imported."); }
                return;
            }
            seen[key] = {signature:signature}; report.rows.push(entry);
        });
        report.rows = report.rows.filter(function (entry) { return !conflicts[identity(entry.client, entry.formatCode)]; });
        return report;
    }
    function merge(state, parsed) {
        var next = JSON.parse(JSON.stringify(state)), counts = {aspect:{added:0,updated:0,unchanged:0}, checker:{added:0,updated:0,unchanged:0}}, changes = [], notices = parsed.notices.slice();
        next.compPresets = next.compPresets || []; next.checkerPresets = next.checkerPresets || [];
        next.presetClients = next.presetClients || [];
        parsed.clients.forEach(function (client) { if (!next.presetClients.some(function (entry) { return clientName(entry).toLowerCase() === client.toLowerCase(); })) next.presetClients.push(client); });
        parsed.rows.forEach(function (entry) {
            ["aspect", "checker"].forEach(function (kind) {
                var presets = kind === "aspect" ? next.compPresets : next.checkerPresets, key = identity(entry.client,entry.formatCode);
                var existing = presets.filter(function (preset) { return identity(preset.client,preset.formatCode) === key && preset.importSource === "format-csv"; })[0];
                var id = "csv-"+kind+"-"+encodeURIComponent(key), removed = kind === "aspect" ? next.removedCompPresets || [] : next.removedCheckerPresets || [];
                if (!existing && removed.indexOf(id) >= 0) { notices.push(entry.client + " / " + entry.formatCode + ": previously removed " + kind + " preset kept removed."); return; }
                var suffix = 2, originalId = id;
                while (!existing && presets.some(function (preset) { return preset.id === id; })) id = originalId + "-" + suffix++;
                var updated = existing ? JSON.parse(JSON.stringify(existing)) : {id:id,assets:{},importSource:"format-csv"};
                updated.client = entry.client; updated.name = entry.name; updated.formatCode = entry.formatCode; updated.width = entry.width; updated.height = entry.height;
                if (entry.fps !== undefined) updated.fps = entry.fps;
                else if (updated.fps === undefined) updated.fps = 23.976;
                if (kind === "checker") updated.kind = "general-checker";
                Object.keys(entry.assets).forEach(function (assetKey) { updated.assets[assetKey] = entry.assets[assetKey]; });
                if (existing && JSON.stringify(existing) === JSON.stringify(updated)) counts[kind].unchanged++;
                else {
                    if (existing) { presets[presets.indexOf(existing)] = updated; counts[kind].updated++; }
                    else { presets.push(updated); counts[kind].added++; }
                    changes.push({kind:kind,client:entry.client,code:entry.formatCode,name:entry.name,action:existing?"Update":"Add"});
                }
            });
        });
        return {state:next,counts:counts,changes:changes,notices:notices};
    }
    return {parse:parse, merge:merge, clientName:clientName, identity:identity};
}));
