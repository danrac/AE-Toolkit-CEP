const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../host/host.jsx'), 'utf8');

function makeProperty(options) {
    options = options || {};
    return {
        name: options.name || 'Property',
        propertyValueType: options.propertyValueType,
        value: options.value,
        expressionEnabled: !!options.expressionEnabled,
        expression: options.expression || '',
        _children: options.children || [],
        get numProperties() { return this._children.length; },
        property(index) { return this._children[index - 1]; }
    };
}

function makeContext(items, active, options) {
    function CompItem(name, id) {
        this.name = name; this.id = id; this._layers = [];
        Object.defineProperty(this, 'numLayers', { get: () => this._layers.length });
    }
    CompItem.prototype.layer = function (ref) {
        if (typeof ref === 'number') return this._layers[ref - 1];
        return this._layers.filter(layer => layer.name === ref)[0] || null;
    };
    function Layer(name, id, settings) {
        settings = settings || {};
        Object.assign(this, { name, id, source: settings.source || null, enabled: settings.enabled !== false, videoEnabled: settings.videoEnabled !== false,
            guideLayer: !!settings.guideLayer, adjustmentLayer: !!settings.adjustmentLayer, locked: !!settings.locked,
            nullLayer: !!settings.nullLayer, cameraLayer: !!settings.cameraLayer, lightLayer: !!settings.lightLayer,
            trackMatteLayer: settings.trackMatteLayer || null, parent: settings.parent || null, _effects: settings.effects || null });
        this.property = function (nameOrIndex) {
            if (nameOrIndex === 'ADBE Effect Parade') return this._effects;
            return null;
        };
    }
    function addLayer(comp, layer) {
        layer.index = comp._layers.length + 1; layer.containingComp = comp;
        layer.remove = function () { const index = comp._layers.indexOf(layer); if (index >= 0) comp._layers.splice(index, 1); comp._layers.forEach((entry, offset) => { entry.index = offset + 1; }); };
        comp._layers.push(layer); return layer;
    }
    items.forEach(item => { if (item._layers) item._layers.forEach((layer, index) => { layer.index = index + 1; layer.containingComp = item; }); });
    const context = { JSON: undefined, CompItem, PropertyValueType: { LAYER_INDEX: 'LAYER_INDEX' }, TrackMatteType: { NO_TRACK_MATTE: 0 },
        app: { beginUndoGroup() { this.undoOpened = true; }, endUndoGroup() { this.undoClosed = true; }, project: { numItems: items.length, item(index) { return items[index - 1]; }, activeItem: active } } };
    if (options && options.propertyTypeUnavailable) context.PropertyValueType = {};
    vm.createContext(context); vm.runInContext(source, context);
    return { context, CompItem, Layer, addLayer };
}

function createComp(name, id) { return new (function () { this.name = name; this.id = id; this._layers = []; Object.defineProperty(this, 'numLayers', { get: () => this._layers.length }); this.layer = function (ref) { return typeof ref === 'number' ? this._layers[ref - 1] : this._layers.filter(layer => layer.name === ref)[0] || null; }; })(); }

// Dependency edges preserve disabled layers used by effects, parents, mattes, and named expressions.
{
    const root = createComp('Root', 1), nested = createComp('Nested', 2);
    const setup = makeContext([root, nested], root);
    const { Layer, addLayer } = setup;
    const unused = addLayer(root, new Layer('Unused', 10, { enabled: false }));
    const nullParent = addLayer(root, new Layer('Parent Null', 11, { nullLayer: true }));
    const effectTarget = addLayer(root, new Layer('Effect Target', 12, { enabled: false }));
    const effect = addLayer(root, new Layer('Effect Controller', 13, { effects: makeProperty({ name: 'Effects', children: [makeProperty({ name: 'Layer Ref', propertyValueType: 'LAYER_INDEX', value: effectTarget.index })] }) }));
    addLayer(root, new Layer('Parent Child', 14, { enabled: false, parent: nullParent }));
    const matte = addLayer(root, new Layer('Matte', 15, { enabled: false }));
    addLayer(root, new Layer('Matted Content', 16, { trackMatteLayer: matte }));
    addLayer(root, new Layer('Nested Precomp', 17, { source: nested }));
    addLayer(nested, new Layer('Nested Unused', 21, { enabled: false }));
    const summary = JSON.parse(setup.context.aetoolkitCepAnalyzeCompositionCleanup());
    assert.equal(summary.compositionsAnalyzed, 2);
    assert.equal(summary.safeToRemove, 3);
    const rootResult = summary.compositions.filter(comp => comp.name === 'Root')[0];
    assert.equal(rootResult.layers.filter(layer => layer.name === 'Effect Target')[0].classification, 'KEEP');
    assert.equal(rootResult.layers.filter(layer => layer.name === 'Parent Null')[0].classification, 'AMBIGUOUS');
    assert.equal(rootResult.layers.filter(layer => layer.name === 'Matte')[0].classification, 'KEEP');
    assert.equal(rootResult.layers.filter(layer => layer.name === 'Parent Child')[0].classification, 'SAFE_TO_REMOVE');
    const nestedResult = summary.compositions.filter(comp => comp.name === 'Nested')[0];
    assert.equal(nestedResult.layers[0].classification, 'SAFE_TO_REMOVE');
    assert.equal(summary.compositions[0].layers.filter(layer => layer.name === 'Unused')[0].classification, 'SAFE_TO_REMOVE');
    const executed = JSON.parse(setup.context.aetoolkitCepExecuteCompositionCleanup());
    assert.equal(executed.removed, 3);
    assert.equal(root._layers.filter(layer => layer.name === 'Unused').length, 0);
    assert.equal(root._layers.filter(layer => layer.name === 'Parent Null').length, 1);
    assert.equal(nested._layers.filter(layer => layer.name === 'Nested Unused').length, 0);
    console.log('PASS comp cleanup preserves effect, parent, matte, and nested dependencies and removes only safe layers');
}

// Named expressions are resolved; indexed expressions disable deletion for the whole composition.
{
    const root = createComp('Expressions', 30), setup = makeContext([root], root), { Layer, addLayer } = setup;
    const target = addLayer(root, new Layer('Expression Target', 31, { enabled: false }));
    addLayer(root, new Layer('Named Expression', 32, { effects: makeProperty({ children: [makeProperty({ expressionEnabled: true, expression: 'thisComp.layer("Expression Target").opacity;' })] }) }));
    addLayer(root, new Layer('Indexed Expression', 33, { effects: makeProperty({ children: [makeProperty({ expressionEnabled: true, expression: 'thisComp.layer(1).opacity;' })] }) }));
    const summary = JSON.parse(setup.context.aetoolkitCepAnalyzeCompositionCleanup());
    const layers = summary.compositions[0].layers;
    assert.equal(layers.filter(layer => layer.name === target.name)[0].classification, 'KEEP');
    assert.ok(layers.every(layer => layer.classification !== 'SAFE_TO_REMOVE'));
    assert.ok(summary.compositions[0].unsafeForDeletion);
    console.log('PASS comp cleanup resolves named expressions and fails closed on indexed expressions');
}

// A precomp used outside the analyzed hierarchy is shared and remains ambiguous.
{
    const root = createComp('Root', 40), nested = createComp('Shared', 41), external = createComp('External', 42), setup = makeContext([root, nested, external], root), { Layer, addLayer } = setup;
    addLayer(root, new Layer('Shared Instance', 43, { source: nested }));
    addLayer(root, new Layer('Shared Instance Again', 46, { source: nested }));
    addLayer(external, new Layer('External Instance', 44, { source: nested }));
    addLayer(nested, new Layer('Shared Disabled', 45, { enabled: false }));
    const summary = JSON.parse(setup.context.aetoolkitCepAnalyzeCompositionCleanup());
    const shared = summary.compositions.filter(comp => comp.name === 'Shared')[0];
    assert.ok(shared.sharedExternal);
    assert.equal(shared.layers[0].classification, 'AMBIGUOUS');
    console.log('PASS comp cleanup protects precomps with external consumers');
}

// If an effect hierarchy cannot be inspected, cleanup does not guess.
{
    const root = createComp('Opaque', 50), setup = makeContext([root], root), { Layer, addLayer } = setup;
    const opaque = addLayer(root, new Layer('Opaque Effect', 51));
    opaque.property = function () { throw new Error('plugin property unavailable'); };
    addLayer(root, new Layer('Disabled Candidate', 52, { enabled: false }));
    const summary = JSON.parse(setup.context.aetoolkitCepAnalyzeCompositionCleanup());
    assert.ok(summary.compositions[0].unsafeForDeletion);
    assert.equal(summary.compositions[0].layers.filter(layer => layer.name === 'Disabled Candidate')[0].classification, 'AMBIGUOUS');
    console.log('PASS comp cleanup fails closed when a layer hierarchy is unavailable');
}

// Without AE's layer-reference type metadata, analysis remains read-only.
{
    const root = createComp('NoPropertyType', 60), setup = makeContext([root], root, { propertyTypeUnavailable: true }), { Layer, addLayer } = setup;
    addLayer(root, new Layer('Disabled Candidate', 61, { enabled: false }));
    const summary = JSON.parse(setup.context.aetoolkitCepAnalyzeCompositionCleanup());
    assert.equal(summary.propertyTypeAvailable, false);
    assert.equal(summary.safeToRemove, 0);
    assert.equal(summary.compositions[0].layers[0].classification, 'AMBIGUOUS');
    console.log('PASS comp cleanup stays analysis-only when layer-reference metadata is unavailable');
}
