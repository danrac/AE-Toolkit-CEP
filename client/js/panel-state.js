(function () {
    "use strict";
    var key = "ae-toolkit-cep.panel-layout.v1", preferences = { panels: {}, tab: "projects", dock: "top" };
    try {
        var saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (saved && typeof saved === "object") {
            if (saved.panels && typeof saved.panels === "object") preferences.panels = saved.panels;
            if (["top", "bottom", "left", "right"].indexOf(saved.dock) !== -1) preferences.dock = saved.dock;
            if (typeof saved.tab === "string") preferences.tab = saved.tab;
        }
    } catch (error) { /* Invalid layout preferences never block the toolkit. */ }
    function persist() {
        try { window.localStorage.setItem(key, JSON.stringify(preferences)); }
        catch (error) { console.warn("Could not save Toolkit panel layout: " + error.message); }
    }
    var workspace = document.querySelector(".toolkit-workspace"), grip = document.getElementById("toolbar-grip"), dragging = null;
    function dock(edge) { workspace.setAttribute("data-dock", edge); preferences.dock = edge; persist(); }
    workspace.setAttribute("data-dock", preferences.dock);
    var overlay = document.createElement("div"); overlay.className = "dock-overlay"; overlay.hidden = true; overlay.setAttribute("aria-hidden", "true");
    ["top", "bottom", "left", "right"].forEach(function (edge) { var target = document.createElement("div"); target.className = "dock-target dock-" + edge; target.setAttribute("data-edge", edge); target.textContent = edge.charAt(0).toUpperCase() + edge.slice(1); overlay.appendChild(target); });
    document.body.appendChild(overlay);
    function candidate(event) {
        var rect = workspace.getBoundingClientRect(), choices = [{ edge: "left", distance: Math.abs(event.clientX - rect.left) }, { edge: "right", distance: Math.abs(event.clientX - rect.right) }, { edge: "top", distance: Math.abs(event.clientY - rect.top) }, { edge: "bottom", distance: Math.abs(event.clientY - rect.bottom) }];
        choices.sort(function (a, b) { return a.distance - b.distance; }); return choices[0].edge;
    }
    function endDrag(event, cancel) {
        if (!dragging) return;
        var moved = dragging.moved; dragging = null; overlay.hidden = true; document.body.classList.remove("toolbar-dragging");
        if (event && grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
        if (!cancel && moved) dock(candidate(event));
    }
    grip.addEventListener("pointerdown", function (event) { if (event.button !== 0) return; event.preventDefault(); grip.focus(); dragging = { x: event.clientX, y: event.clientY, moved: false }; grip.setPointerCapture(event.pointerId); });
    grip.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        if (Math.abs(event.clientX - dragging.x) + Math.abs(event.clientY - dragging.y) < 5 && !dragging.moved) return;
        dragging.moved = true; overlay.hidden = false; document.body.classList.add("toolbar-dragging");
        var edge = candidate(event); overlay.querySelectorAll(".dock-target").forEach(function (target) { target.classList.toggle("selected", target.getAttribute("data-edge") === edge); });
    });
    grip.addEventListener("pointerup", function (event) { endDrag(event, false); });
    grip.addEventListener("pointercancel", function (event) { endDrag(event, true); });
    grip.addEventListener("lostpointercapture", function () { endDrag(null, true); });
    grip.addEventListener("keydown", function (event) {
        var edges = { ArrowUp: "top", ArrowDown: "bottom", ArrowLeft: "left", ArrowRight: "right" };
        if (event.key === "Escape") { endDrag(null, true); return; }
        if (edges[event.key]) { event.preventDefault(); dock(edges[event.key]); }
    });
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
