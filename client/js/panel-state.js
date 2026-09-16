(function () {
    "use strict";
    var key = "ae-toolkit-cep.panel-layout.v1", preferences = { panels: {}, tab: "projects" };
    try {
        var saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (saved && typeof saved === "object") {
            if (saved.panels && typeof saved.panels === "object") preferences.panels = saved.panels;
            if (typeof saved.tab === "string") preferences.tab = saved.tab;
        }
    } catch (error) { /* Invalid layout preferences never block the toolkit. */ }
    function persist() {
        try { window.localStorage.setItem(key, JSON.stringify(preferences)); }
        catch (error) { console.warn("Could not save Toolkit panel layout: " + error.message); }
    }
    document.querySelectorAll(".module-panel[data-panel]").forEach(function (panel) {
        var id = panel.getAttribute("data-panel");
        if (typeof preferences.panels[id] === "boolean") panel.open = preferences.panels[id];
        panel.addEventListener("toggle", function () {
            if (preferences.panels[id] === panel.open) return;
            preferences.panels[id] = panel.open; persist();
        });
    });
    document.querySelectorAll(".tab[data-view]").forEach(function (tab) {
        tab.addEventListener("click", function () { preferences.tab = tab.getAttribute("data-view"); persist(); });
        if (tab.getAttribute("data-view") === preferences.tab) tab.click();
    });
}());
