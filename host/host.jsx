var AEToolkitLibraryRoot = "";
// Capture the extension location while this file is loaded, not during later evalScript calls.
var AEToolkitHostDirectory = (typeof $ !== "undefined" && $.fileName && typeof File !== "undefined") ? new File($.fileName).parent.fsName : "";
function aetoolkitCepResolveGuideAsset(path) {
    if (String(path).indexOf("library:") === 0) {
        var relative = String(path).substring(8);
        if (!relative || /(^|[\\\/])\.\.([\\\/]|$)/.test(relative) || aetoolkitCepIsAbsolutePath(relative)) throw new Error("Invalid library guide path.");
        return new File((AEToolkitLibraryRoot ? aetoolkitCepCheckerLibraryRoot(AEToolkitLibraryRoot).fsName : aetoolkitCepDataFolder().fsName) + "/" + relative);
    }
    if (String(path).indexOf("bundled:") !== 0) return new File(path);
    var name = String(path).substring(8);
    if (!/^[a-zA-Z0-9_.-]+$/.test(name) || name.indexOf("..") !== -1 || !AEToolkitHostDirectory) throw new Error("Invalid bundled guide path.");
    return new File(AEToolkitHostDirectory + "/guide-assets/" + name);
}
// Bundled ES3 JSON support. Private namespace: never depends on another panel defining JSON.
// Source: https://github.com/douglascrockford/JSON-js/blob/master/json2.js (2023-05-10, public domain)
var AEToolkitJSON = (function () {
var JSON = {};
//  json2.js
//  2023-05-10
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(
//                         +a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]
//                      ));
//                  }
//                  return value;
//              }
//          });

//          myData = JSON.parse(
//              "[\"Date(09/09/2001)\"]",
//              function (key, value) {
//                  var d;
//                  if (
//                      typeof value === "string"
//                      && value.slice(0, 5) === "Date("
//                      && value.slice(-1) === ")"
//                  ) {
//                      d = new Date(value.slice(5, -1));
//                      if (d) {
//                          return d;
//                      }
//                  }
//                  return value;
//              }
//          );

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return (n < 10)
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());

return JSON;
}());

function aetoolkitCepDataFolder() {
    var folder = new Folder(Folder.userData.fsName + "/AE-Toolkit-CEP");
    if (!folder.exists && !folder.create()) throw new Error("Cannot create " + folder.fsName);
    return folder;
}
function aetoolkitCepStateFile() {
    return new File((AEToolkitLibraryRoot ? aetoolkitCepCheckerLibraryRoot(AEToolkitLibraryRoot).fsName : aetoolkitCepDataFolder().fsName) + "/project-templates.json");
}
function aetoolkitCepDefaultState() {
    return '{"version":1,"templates":[{"id":"default-motion","name":"Default Motion Project","folders":{"afterEffects":"After Effects","assets":"Assets","toGfx":"Incoming","outputs":"Outputs","styleFrames":"Outputs/Style Frames"},"customFolders":[]}],"projects":[],"activeProjectId":""}';
}
function aetoolkitCepLoadState() {
    try {
        var file = aetoolkitCepStateFile();
        if (new File(file.fsName + ".lock").exists) throw new Error("Library is being saved. Refresh after the save finishes.");
        if (!file.exists) return aetoolkitCepDefaultState();
        file.encoding = "UTF-8";
        if (!file.open("r")) throw new Error("Cannot read saved templates.");
        var text = file.read(); file.close();
        AEToolkitJSON.parse(text);
        return text;
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSaveState(jsonText) {
    try {
        var parsed = AEToolkitJSON.parse(jsonText);
        if (!parsed.templates || !(parsed.templates instanceof Array) || parsed.templates.length === 0 || !parsed.projects || !(parsed.projects instanceof Array)) throw new Error("Invalid project-template data.");
        var file = aetoolkitCepStateFile();
        if (file.exists) {
            file.encoding = "UTF-8";
            if (!file.open("r")) throw new Error("Cannot check the latest library revision.");
            var latestText = file.read(); file.close();
            var latest = AEToolkitJSON.parse(latestText);
            if (Number(latest.libraryRevision || 0) !== Number(parsed.libraryRevision || 0)) throw new Error("Library changed on another computer. Refresh library before saving your changes.");
        }
        parsed.libraryRevision = Number(parsed.libraryRevision || 0) + 1;
        jsonText = AEToolkitJSON.stringify(parsed);
        var temp = new File(file.fsName + ".tmp");
        temp.encoding = "UTF-8";
        if (!temp.open("w")) throw new Error("Cannot prepare template save.");
        if (!temp.write(jsonText)) { temp.close(); throw new Error("Cannot write template data."); }
        temp.close();
        var backup = new File(file.fsName + ".bak");
        if (backup.exists && !backup.remove()) throw new Error("Cannot replace the template backup.");
        if (file.exists && !file.copy(backup.fsName)) throw new Error("Cannot back up saved templates.");
        if (file.exists && !file.remove()) throw new Error("Cannot replace saved templates.");
        if (!temp.rename(file.name)) {
            if (backup.exists) backup.copy(file.fsName);
            throw new Error("Cannot finalize saved templates.");
        }
        if (backup.exists) backup.remove();
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseProjectRoot() {
    try {
        var folder = Folder.selectDialog("Choose the project root folder");
        return folder ? folder.fsName : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRevealFolder(pathText) {
    try {
        var folder = new Folder(pathText);
        if (!folder.exists) throw new Error("Folder does not exist: " + folder.fsName);
        if (!folder.execute()) throw new Error("Could not open " + folder.fsName);
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseRenderSubfolder() {
    try {
        var folder = Folder.selectDialog("Choose a render subfolder");
        return folder ? folder.name : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRequireFolder(pathText) {
    var folder = new Folder(pathText);
    if (!folder.exists) throw new Error("Folder does not exist: " + folder.fsName);
    return folder;
}
function aetoolkitCepOpenProjectFromFolder(pathText) {
    try {
        aetoolkitCepRequireFolder(pathText);
        var selected = new File(pathText).openDlg("Choose an After Effects project", function (entry) {
            return entry instanceof Folder || /\.aepx?$/i.test(entry.name);
        });
        if (!selected) return "CANCELLED";
        while (selected.alias) selected = selected.resolve();
        if (!selected || !selected.exists) throw new Error("The selected project file is unavailable.");
        app.open(selected);
        return "Opened " + selected.name;
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepImportFromFolder(pathText) {
    try {
        var folder = aetoolkitCepRequireFolder(pathText);
        app.project.setDefaultImportFolder(folder);
        var imported = app.project.importFileWithDialog();
        return imported ? "Imported selected assets." : "CANCELLED";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRenderDate() {
    var date = new Date(), year = String(date.getFullYear()).slice(-2), month = date.getMonth() + 1, day = date.getDate();
    return year + (month < 10 ? "0" : "") + month + (day < 10 ? "0" : "") + day;
}
function aetoolkitCepNormalizeSubfolder(value) {
    var path = String(value || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "").replace(/\/+$/g, "");
    if (!path) return "";
    if (path.charAt(0) === "/" || /^[A-Za-z]:/.test(path) || /(^|\/)\.\.?($|\/)/.test(path)) throw new Error("Render subfolders must stay inside the selected project output folder.");
    return path;
}
function aetoolkitCepEnsureFolder(pathText) {
    var folder = new Folder(pathText);
    if (folder.exists) return folder;
    var parent = folder.parent;
    if (!parent || parent.fsName === folder.fsName) throw new Error("Cannot create output folder: " + folder.fsName);
    aetoolkitCepEnsureFolder(parent.fsName);
    if (!folder.create()) throw new Error("Cannot create output folder: " + folder.fsName);
    return folder;
}
function aetoolkitCepSelectedComps() {
    var comps = [], selected = app.project.selection;
    for (var i = 0; i < selected.length; i++) if (selected[i] instanceof CompItem) comps.push(selected[i]);
    if (!comps.length) throw new Error("Select one or more compositions in the Project panel before rendering.");
    return comps;
}
function aetoolkitCepRenderSelected(jsonText) {
    var oldQueueStates = [], workAreas = [], newQueueItems = [], renderStarted = false;
    try {
        if (!app.project.file) throw new Error("Save the After Effects project before rendering.");
        var options = AEToolkitJSON.parse(jsonText), mode = options.mode, basePath = String(options.basePath || "");
        if (mode !== "offline" && mode !== "online" && mode !== "styleFrames" && mode !== "checker") throw new Error("Unknown render mode.");
        if (!basePath) throw new Error("The selected project has no output folder for this render mode.");
        if (!options.outputTemplate) throw new Error("Choose an output preset before rendering.");
        var destination = basePath + "/" + aetoolkitCepRenderDate();
        var subfolder = aetoolkitCepNormalizeSubfolder(options.subfolder);
        if (subfolder) destination += "/" + subfolder;
        aetoolkitCepEnsureFolder(destination);
        var comps = aetoolkitCepSelectedComps(), queue = app.project.renderQueue, i, queueItem, outputModule, frameRate, templateName;
        for (i = 1; i <= queue.numItems; i++) { oldQueueStates.push({ item: queue.item(i), render: queue.item(i).render }); queue.item(i).render = false; }
        templateName = String(options.outputTemplate);
        for (i = 0; i < comps.length; i++) {
            queueItem = queue.items.add(comps[i]);
            newQueueItems.push(queueItem);
            outputModule = queueItem.outputModule(1);
            try { outputModule.applyTemplate(templateName); }
            catch (templateError) { throw new Error("The render template '" + templateName + "' is not installed. " + templateError.toString()); }
            outputModule = queueItem.outputModule(1);
            // Studio naming: [compName]_[frameRate]fps_[width]x[height].[fileExtension]
            frameRate = Math.round(comps[i].frameRate * 1000) / 1000;
            aetoolkitCepAssignOutputFile(queueItem, destination, comps[i].name + "_" + frameRate + "fps_" + comps[i].width + "x" + comps[i].height);
            if (mode === "checker") {
                workAreas.push({ comp: comps[i], start: comps[i].workAreaStart, duration: comps[i].workAreaDuration });
                comps[i].workAreaStart = comps[i].time;
                comps[i].workAreaDuration = 1 / comps[i].frameRate;
            }
        }
        renderStarted = true;
        queue.render();
        return "Rendered " + comps.length + " composition" + (comps.length === 1 ? "" : "s") + " to " + destination;
    } catch (error) { return "ERROR: " + error.toString(); }
    finally {
        if (!renderStarted) for (var addedIndex = newQueueItems.length - 1; addedIndex >= 0; addedIndex--) newQueueItems[addedIndex].remove();
        for (var workIndex = 0; workIndex < workAreas.length; workIndex++) { workAreas[workIndex].comp.workAreaStart = workAreas[workIndex].start; workAreas[workIndex].comp.workAreaDuration = workAreas[workIndex].duration; }
        for (var queueIndex = 0; queueIndex < oldQueueStates.length; queueIndex++) oldQueueStates[queueIndex].item.render = oldQueueStates[queueIndex].render;
    }
}
function aetoolkitCepCleanImportPath(value) {
    var path = String(value || "").replace(/^\s+|\s+$/g, "");
    if ((path.charAt(0) === "\"" && path.charAt(path.length - 1) === "\"") || (path.charAt(0) === "'" && path.charAt(path.length - 1) === "'")) path = path.substring(1, path.length - 1);
    if (/^file:/i.test(path)) {
        if (/^file:\/\/localhost\//i.test(path)) path = path.replace(/^file:\/\/localhost/i, "");
        else if (/^file:\/\/\//i.test(path)) path = path.replace(/^file:\/\//i, "");
        else if (/^file:\/\//i.test(path)) path = path.replace(/^file:\/\//i, "//");
        try { path = decodeURI(path); } catch (decodeError) {}
        if (/^\/[A-Za-z]:\//.test(path)) path = path.substring(1);
    }
    return path;
}
function aetoolkitCepIsAbsolutePath(path) {
    // Keep the branches separate: ExtendScript can mis-evaluate mixed logical chains.
    if (path.charAt(0) === "/") return true;
    if (path.substr(0, 2) === "\\\\") return true;
    if (path.length < 3) return false;
    if (path.charAt(1) !== ":") return false;
    return path.charAt(2) === "/" || path.charAt(2) === "\\";
}
function aetoolkitCepJoinImportPath(folder, name) {
    while (folder.length && (folder.charAt(folder.length - 1) === "/" || folder.charAt(folder.length - 1) === "\\")) folder = folder.substring(0, folder.length - 1);
    while (name.length && (name.charAt(0) === "/" || name.charAt(0) === "\\")) name = name.substring(1);
    return folder + "/" + name;
}
function aetoolkitCepImportAssetPaths(text) {
    var imported = 0, errors = [], seen = {}, folderPath = "", lines = String(text || "").replace(/\r/g, "").split("\n");
    if (!String(text || "").replace(/\s/g, "")) return AEToolkitJSON.stringify({ imported: imported, errors: ["Paste one or more asset paths before importing."] });
    app.beginUndoGroup("AE Toolkit CEP: Import assets");
    try {
        for (var i = 0; i < lines.length; i++) {
            var path = aetoolkitCepCleanImportPath(lines[i]);
            if (!path) continue;
            var candidate = aetoolkitCepIsAbsolutePath(path) ? path : folderPath ? aetoolkitCepJoinImportPath(folderPath, path) : "";
            if (!candidate) { errors.push("Line " + (i + 1) + " needs an absolute path or a preceding folder path."); continue; }
            var file = new File(candidate);
            // Try the literal path first. Terminal escapes spaces in dragged Mac paths.
            // Never strip Windows separators or alter an existing literal filename.
            if (!file.exists && !new Folder(candidate).exists && candidate.charAt(0) === "/" && candidate.substr(0, 2) !== "//") {
                var unescaped = candidate.replace(/\\([ \t\u00a0\u202f])/g, "$1");
                if (unescaped !== candidate && (new File(unescaped).exists || new Folder(unescaped).exists)) {
                    candidate = unescaped;
                    file = new File(candidate);
                }
            }
            if (!file.exists && new Folder(candidate).exists) { folderPath = candidate; continue; }
            var key = candidate.split("\\").join("/");
            if ($.os.indexOf("Win") !== -1) key = key.toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            if (!file.exists) { errors.push("Not found: " + file.fsName); continue; }
            try { app.project.importFile(new ImportOptions(file)); imported++; }
            catch (importError) { errors.push("Could not import " + file.fsName + ": " + importError.toString()); }
        }
    } finally { app.endUndoGroup(); }
    if (!imported && !errors.length) errors.push("No file paths were found.");
    return AEToolkitJSON.stringify({ imported: imported, errors: errors });
}
function aetoolkitCepEnsureXmp() {
    if (ExternalObject.AdobeXMPScript === undefined) ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
}
function aetoolkitCepUniqueSourcePath(paths, value) {
    if (!value || !/\.aepx?$/i.test(value)) return;
    for (var i = 0; i < paths.length; i++) if (paths[i] === value) return;
    paths.push(value);
}
function aetoolkitCepReadSourceLinks(xmp) {
    var paths = [], creator = XMPConst.NS_CREATOR_ATOM || "http://ns.adobe.com/creatorAtom/1.0/", dynamicMedia = XMPConst.NS_DM || "http://ns.adobe.com/xmp/1.0/DynamicMedia/";
    function read(call) {
        try {
            var property = call();
            aetoolkitCepUniqueSourcePath(paths, property && String(property.value !== undefined ? property.value : property));
        } catch (readError) {}
    }
    read(function () { return xmp.getStructField(creator, "aeProjectLink", creator, "fullPath"); });
    read(function () { return xmp.getStructField(dynamicMedia, "projectRef", dynamicMedia, "path"); });
    read(function () { return xmp.getProperty(creator, "fullPath"); });
    return paths;
}
function aetoolkitCepReadFootageSourceLinks(file) {
    var paths = [], notices = [], handle;
    function merge(xmp) {
        var found = aetoolkitCepReadSourceLinks(xmp);
        for (var i = 0; i < found.length; i++) aetoolkitCepUniqueSourcePath(paths, found[i]);
    }
    try {
        handle = new XMPFile(file.fsName, XMPConst.FILE_UNKNOWN, XMPConst.OPEN_FOR_READ);
        merge(handle.getXMP());
    } catch (embeddedError) { notices.push("Embedded metadata could not be read."); }
    finally { if (handle) try { handle.closeFile(); } catch (closeError) {} }
    var sidecarPaths = [file.fsName + ".xmp", file.fsName.replace(/\.[^\/.]+$/, "") + ".xmp"];
    for (var i = 0; i < sidecarPaths.length; i++) {
        if (i > 0 && sidecarPaths[i] === sidecarPaths[0]) continue;
        var sidecar = new File(sidecarPaths[i]), opened = false;
        if (!sidecar.exists) continue;
        try {
            if (sidecar.length > 10 * 1024 * 1024) throw new Error("sidecar exceeds 10 MB");
            sidecar.encoding = "UTF-8";
            opened = sidecar.open("r");
            if (!opened) throw new Error("cannot open sidecar");
            merge(new XMPMeta(sidecar.read()));
        } catch (sidecarError) { notices.push(sidecar.name + " could not be read."); }
        finally { if (opened) sidecar.close(); }
    }
    return { paths: paths, notices: notices };
}
function aetoolkitCepSourceProjectFile(pathText) {
    var path = aetoolkitCepCleanImportPath(pathText).split("\\").join("/");
    if (!/\.aepx?$/i.test(path) || !aetoolkitCepIsAbsolutePath(path)) return null;
    return new File(path);
}
function aetoolkitCepDiscoverSourceProjects() {
    try {
        aetoolkitCepEnsureXmp();
        var selection = app.project.selection, records = [], notices = [], sourceNames = [], seen = {};
        if (!selection.length) throw new Error("Select rendered footage in the Project panel first.");
        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];
            if (!(item instanceof FootageItem) || !item.file) { notices.push(item.name + ": select file-based footage."); continue; }
            if (!item.file.exists) { notices.push(item.name + ": source media is offline."); continue; }
            sourceNames.push(item.name);
            var result = aetoolkitCepReadFootageSourceLinks(item.file);
            if (!result.paths.length) notices.push(item.name + ": no explicit After Effects project link was found.");
            for (var j = 0; j < result.paths.length; j++) {
                var file = aetoolkitCepSourceProjectFile(result.paths[j]);
                if (!file) { notices.push(item.name + ": project link is not an absolute .aep or .aepx path."); continue; }
                var key = file.fsName;
                if ($.os.indexOf("Win") !== -1) key = key.toLowerCase();
                if (!seen[key]) { seen[key] = true; records.push({ path: file.fsName, exists: file.exists, colorSpace: aetoolkitCepSourceProjectColorSpace(file) }); }
            }
            for (j = 0; j < result.notices.length; j++) notices.push(item.name + ": " + result.notices[j]);
        }
        return AEToolkitJSON.stringify({ records: records, notices: notices, sourceNames: sourceNames });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepProjectFolder(name) {
    var root = app.project.rootFolder;
    for (var i = 1; i <= root.numItems; i++) {
        var item = root.item(i);
        if (item instanceof FolderItem && item.name === name) return item;
    }
    return app.project.items.addFolder(name);
}
function aetoolkitCepSourceName(name) {
    return String(name).replace(/\.[^.]+$/, "").replace(/_[0-9.]+fps_[0-9]+x[0-9]+$/, "");
}
function aetoolkitCepImportSourceProjects(jsonText) {
    var imported = 0, errors = [];
    try {
        var options = AEToolkitJSON.parse(jsonText), paths = options.paths || [], sourceNames = options.sourceNames || [];
        if (!paths.length) throw new Error("Select at least one source project.");
        var projectsFolder = aetoolkitCepProjectFolder("ImportedProjects"), compsFolder = null;
        function matches(comp) {
            for (var n = 0; n < sourceNames.length; n++) if (comp.name === aetoolkitCepSourceName(sourceNames[n])) return true;
            return false;
        }
        function gather(folder) {
            if (!(folder instanceof FolderItem)) return;
            for (var i = 1; i <= folder.numItems; i++) {
                var item = folder.item(i);
                if (item instanceof CompItem && matches(item)) {
                    if (!compsFolder) compsFolder = aetoolkitCepProjectFolder("ImportedComps");
                    item.parentFolder = compsFolder;
                } else if (item instanceof FolderItem) gather(item);
            }
        }
        app.beginUndoGroup("AE Toolkit CEP: Import source projects");
        try {
            for (var i = 0; i < paths.length; i++) {
                var file = aetoolkitCepSourceProjectFile(paths[i]);
                if (!file || !file.exists) { errors.push("Not found: " + paths[i]); continue; }
                try {
                    var project = app.project.importFile(new ImportOptions(file));
                    project.parentFolder = projectsFolder;
                    gather(project);
                    imported++;
                } catch (importError) { errors.push("Could not import " + file.fsName + ": " + importError.toString()); }
            }
        } finally { app.endUndoGroup(); }
    } catch (error) { errors.push(error.toString()); }
    return AEToolkitJSON.stringify({ imported: imported, errors: errors });
}
function aetoolkitCepNumber(value, label, minimum, maximum, integerOnly) {
    var parsed = Number(value);
    if (isNaN(parsed) || parsed < minimum || parsed > maximum || integerOnly && Math.floor(parsed) !== parsed) throw new Error(label + " must be between " + minimum + " and " + maximum + ".");
    return parsed;
}
function aetoolkitCepSafeName(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "").replace(/[\\\/:*?"<>|\r\n]+/g, "").replace(/\s+/g, " ");
}
function aetoolkitCepBuildCompName(options, index) {
    if (options.namingFields) {
        var fields = options.namingFields, values = options.namingValues || {}, pieces = [], ids = {}, n, field, value, digits;
        if (!(fields instanceof Array) || !fields.length) throw new Error("Add at least one naming field.");
        for (n = 0; n < fields.length; n++) {
            field = fields[n];
            if (!field.id || ids[field.id]) throw new Error("Naming fields must have unique IDs.");
            ids[field.id] = true;
            value = Object.prototype.hasOwnProperty.call(values, field.id) ? values[field.id] : field.value;
            if (field.type === "format") value = options.format;
            else if (field.type === "version") {
                if (!/^\d+$/.test(String(value))) throw new Error("Version must be a whole number.");
                digits = Number(field.digits);
                if (digits < 1 || digits > 6 || Math.floor(digits) !== digits || isNaN(digits)) throw new Error("Version digits must be 1–6.");
                value = String(Number(value)); while (value.length < digits) value = "0" + value;
                value = String(field.prefix === undefined ? "v" : field.prefix) + value;
            } else if (field.type !== "text") throw new Error("Unknown naming field type.");
            value = aetoolkitCepSafeName(value).replace(/\s+/g, "_");
            if (value) pieces.push(value);
        }
        return pieces.length ? pieces.join("_") : "Comp";
    }
    var defaults = ["job", "format", "style", "description", "version", "initials"];
    var order = options.namingOrder || defaults, parts = [], seen = {}, i, j, key, valid, part;
    if (!(order instanceof Array) || order.length !== defaults.length) throw new Error("Invalid composition naming order.");
    for (i = 0; i < order.length; i++) {
        key = order[i]; valid = false;
        for (j = 0; j < defaults.length; j++) if (defaults[j] === key) valid = true;
        if (!valid || seen[key]) throw new Error("Each naming field must appear exactly once.");
        seen[key] = true;
        part = key === "version" ? "v" + aetoolkitCepPadNumber(index || 1, 2) : aetoolkitCepSafeName(options[key]);
        if (part) parts.push(part.replace(/\s+/g, "_"));
    }
    if (parts.length === 1 && !options.initials) parts.unshift("Comp");
    return parts.join("_");
}
function aetoolkitCepCompDimensions(options) {
    return {
        width: aetoolkitCepNumber(options.width, "Width", 1, 30000, true),
        height: aetoolkitCepNumber(options.height, "Height", 1, 30000, true),
        fps: aetoolkitCepNumber(options.fps, "FPS", 1, 240, false),
        duration: aetoolkitCepNumber(options.duration, "Duration", 0.001, 86400, false)
    };
}
function aetoolkitCepCreateComp(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), settings = aetoolkitCepCompDimensions(options), name = aetoolkitCepBuildCompName(options, 1), comp;
        app.beginUndoGroup("AE Toolkit CEP: Create composition");
        try {
            comp = app.project.items.addComp(name, settings.width, settings.height, 1, settings.duration, settings.fps);
            comp.label = 14;
            if (options.addGuides) aetoolkitCepAddPresetGuides(comp, options.guideAssets || {});
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ id: comp.id, name: comp.name, width: comp.width, height: comp.height, fps: comp.frameRate });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseGuideAsset() {
    try {
        var file = File.openDialog("Choose a guide asset", function (entry) { return entry instanceof Folder || /\.(ai|jpg|jpeg|png|psd|tif|tiff)$/i.test(entry.name); });
        return file ? file.fsName : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepPresetAssetFolder(id, libraryRoot) {
    var safeId = String(id || "").replace(/[^a-z0-9_-]/ig, "");
    if (!safeId) throw new Error("Preset needs a safe name before copying guide assets.");
    return aetoolkitCepEnsureFolder((libraryRoot ? aetoolkitCepCheckerLibraryRoot(libraryRoot).fsName : aetoolkitCepDataFolder().fsName) + "/guide-assets/" + safeId);
}
function aetoolkitCepCopyPresetAsset(folder, sourcePath, label) {
    var source = aetoolkitCepResolveGuideAsset(sourcePath), safeLabel = String(label).replace(/[^a-z0-9_-]/ig, ""), target, attempt = 0, dot, base, extension;
    if (!source.exists) throw new Error(label + " guide file is unavailable: " + source.fsName);
    if (String(sourcePath).indexOf("bundled:") === 0) return sourcePath;
    if (source.parent && source.parent.fsName === folder.fsName) return source.fsName;
    dot = source.name.lastIndexOf("."); base = dot > 0 ? source.name.substring(0, dot) : source.name; extension = dot > 0 ? source.name.substring(dot) : "";
    do { target = new File(folder.fsName + "/" + safeLabel + "_" + base + (attempt ? "_" + aetoolkitCepPadNumber(attempt, 2) : "") + extension); attempt++; } while (target.exists && target.fsName !== source.fsName && attempt < 10000);
    if (target.fsName === source.fsName || target.exists) return target.fsName;
    if (!source.copy(target.fsName)) throw new Error("Could not copy " + source.name + " into " + folder.fsName);
    return target.fsName;
}
function aetoolkitCepGuideKeys(assets) {
    var keys = [], key;
    for (key in assets) if (Object.prototype.hasOwnProperty.call(assets, key) && /^(matte|chartOne|chartTwo|matte_[a-z0-9]+|guide_[a-z0-9]+)$/.test(key)) keys.push(key);
    return keys;
}
function aetoolkitCepStorePresetAssets(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), assets = options.assets || {}, folder = aetoolkitCepPresetAssetFolder(options.id, options.libraryRoot), saved = {};
        var keys = aetoolkitCepGuideKeys(assets), i;
        for (i = 0; i < keys.length; i++) {
            var stored = assets[keys[i]] ? aetoolkitCepCopyPresetAsset(folder, assets[keys[i]], keys[i]) : "";
            var base = options.libraryRoot ? aetoolkitCepCheckerLibraryRoot(options.libraryRoot).fsName : aetoolkitCepDataFolder().fsName;
            saved[keys[i]] = stored.indexOf(base + "/") === 0 ? "library:" + stored.substring(base.length + 1) : stored;
        }
        return AEToolkitJSON.stringify(saved);
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepGuideFootage(file) {
    var item, i;
    for (i = 1; i <= app.project.numItems; i++) {
        item = app.project.item(i);
        try { if (item instanceof FootageItem && item.file && item.file.fsName === file.fsName) return item; } catch (ignoreError) {}
    }
    return app.project.importFile(new ImportOptions(file));
}
function aetoolkitCepAddPresetGuides(comp, assets) {
    var keys = aetoolkitCepGuideKeys(assets), i, path, file, footage, layer;
    for (i = 0; i < keys.length; i++) {
        path = assets[keys[i]];
        if (!path) continue;
        file = aetoolkitCepResolveGuideAsset(path);
        if (!file.exists) throw new Error("Stored " + keys[i] + " guide file is unavailable: " + file.fsName);
        footage = aetoolkitCepGuideFootage(file);
        layer = comp.layers.add(footage);
        layer.guideLayer = true;
        layer.comment = "Toolbox2:format-guide:" + keys[i];
        try { layer.transform.position.setValue([comp.width / 2, comp.height / 2]); } catch (positionError) {}
        if (keys[i].indexOf("matte") !== 0) try { layer.opacity.setValue(50); } catch (opacityError) {}
    }
}
function aetoolkitCepPrepareGuideFiles(assets) {
    var keys = aetoolkitCepGuideKeys(assets), i, file;
    for (i = 0; i < keys.length; i++) if (assets[keys[i]]) {
        file = aetoolkitCepResolveGuideAsset(assets[keys[i]]);
        if (!file.exists) throw new Error("Guide file is unavailable: " + file.fsName);
        aetoolkitCepGuideFootage(file);
    }
}
function aetoolkitCepReplacePresetGuides(comp, assets, knownAssets) {
    var old = [], paths = {}, keys, i, j, layer, file;
    for (i = 0; i < knownAssets.length; i++) {
        keys = aetoolkitCepGuideKeys(knownAssets[i]);
        for (j = 0; j < keys.length; j++) if (knownAssets[i][keys[j]]) paths[aetoolkitCepResolveGuideAsset(knownAssets[i][keys[j]]).fsName] = true;
    }
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i);
        if (String(layer.comment || "").indexOf("Toolbox2:format-guide:") === 0) old.push(layer);
        else if (layer.guideLayer) {
            try { file = layer.source.file; if (file && paths[file.fsName]) old.push(layer); } catch (ignoreError) {}
        }
    }
    // Add the replacement before removing existing guides so a failed import preserves them.
    aetoolkitCepAddPresetGuides(comp, assets);
    for (i = 0; i < old.length; i++) { old[i].locked = false; old[i].remove(); }
}
function aetoolkitCepModifySelectedComps(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), updateSize = !!options.updateSize, updateFps = !!options.updateFps, renameBase = aetoolkitCepSafeName(options.renameBase), settings, comps, i;
        if (!updateSize && !updateFps && !renameBase && !options.conformSolids) throw new Error("Choose size, FPS, rename, or conform solids before modifying comps.");
        if (updateSize || updateFps) settings = aetoolkitCepCompDimensions(options);
        comps = aetoolkitCepSelectedComps();
        app.beginUndoGroup("AE Toolkit CEP: Modify compositions");
        try {
            if (updateSize && options.replaceGuides) aetoolkitCepPrepareGuideFiles(options.guideAssets || {});
            for (i = 0; i < comps.length; i++) {
                if (updateSize) { comps[i].width = settings.width; comps[i].height = settings.height; }
                if (updateSize && options.replaceGuides) aetoolkitCepReplacePresetGuides(comps[i], options.guideAssets || {}, options.knownGuideAssets || []);
                if (updateFps) comps[i].frameRate = settings.fps;
                if (options.conformSolids) aetoolkitCepConformCompSolids(comps[i]);
                if (renameBase) comps[i].name = renameBase + "_" + aetoolkitCepPadNumber(i + 1, 2);
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ modified: comps.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepPadNumber(value, width) {
    var text = String(value);
    while (text.length < width) text = "0" + text;
    return text;
}
function aetoolkitCepReplaceLiteral(value, find, replacement) {
    var pieces = String(value).split(find);
    return pieces.join(replacement);
}
function aetoolkitCepRenameSelectedItems(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), operation = options.operation, find = String(options.find || ""), replacement = String(options.replace || ""), selected = app.project.selection, start, i, item;
        if (!selected.length) throw new Error("Select one or more project items before renaming.");
        if (operation !== "replace" && operation !== "prefix" && operation !== "suffix" && operation !== "number" && operation !== "remove") throw new Error("Choose a rename operation.");
        if ((operation === "replace" || operation === "remove") && !find) throw new Error("Enter text to find.");
        if ((operation === "prefix" || operation === "suffix") && !find) throw new Error("Enter a prefix or suffix.");
        start = aetoolkitCepNumber(options.start || 1, "Start number", 0, 999999, true);
        app.beginUndoGroup("AE Toolkit CEP: Rename project items");
        try {
            for (i = 0; i < selected.length; i++) {
                item = selected[i];
                if (operation === "replace") item.name = aetoolkitCepReplaceLiteral(item.name, find, replacement);
                else if (operation === "remove") item.name = aetoolkitCepReplaceLiteral(item.name, find, "");
                else if (operation === "prefix") item.name = find + item.name;
                else if (operation === "suffix") item.name = item.name + find;
                else item.name = item.name + "_" + aetoolkitCepPadNumber(start + i, 2);
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ renamed: selected.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepConformSelectedSolids() {
    try {
        var comp = app.project.activeItem, conformed = 0, layers, i, layer;
        if (!(comp instanceof CompItem)) throw new Error("Open a composition and select one or more solid layers.");
        layers = comp.selectedLayers;
        if (!layers || !layers.length) throw new Error("Select one or more solid layers in the active composition.");
        app.beginUndoGroup("AE Toolkit CEP: Conform solid layers");
        try {
            conformed = aetoolkitCepConformCompSolids(comp, layers);
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ conformed: conformed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepAddTextLayer(comp, name, text, position, fontSize, opacity) {
    var layer = comp.layers.addText(text), textProperty, document;
    layer.name = name;
    try {
        textProperty = layer.property("ADBE Text Properties").property("ADBE Text Document");
        document = textProperty.value;
        document.fontSize = fontSize;
        document.fillColor = [1, 1, 1];
        document.justification = ParagraphJustification.LEFT_JUSTIFY;
        textProperty.setValue(document);
    } catch (textError) {}
    try { layer.transform.position.setValue(position); } catch (positionError) {}
    try { layer.opacity.setValue(opacity); } catch (opacityError) {}
    return layer;
}
function aetoolkitCepCreateCover(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), settings = aetoolkitCepCompDimensions(options), format = aetoolkitCepSafeName(options.format) || settings.width + "x" + settings.height, name = "COVER_" + format.replace(/\s+/g, "_") + "_01", comp, topLine, bottomLine, dateLine, spotLine;
        app.beginUndoGroup("AE Toolkit CEP: Create cover");
        try {
            comp = app.project.items.addComp(name, settings.width, settings.height, 1, settings.duration, settings.fps);
            comp.label = 14;
            try { comp.layers.addSolid([0.055, 0.075, 0.1], "Cover background", settings.width, settings.height, 1, settings.duration).moveToEnd(); } catch (backgroundError) {}
            topLine = aetoolkitCepSafeName(options.topLine);
            bottomLine = aetoolkitCepSafeName(options.bottomLine);
            dateLine = aetoolkitCepSafeName(options.date);
            spotLine = aetoolkitCepSafeName(options.spot);
            if (topLine) aetoolkitCepAddTextLayer(comp, "Cover top line", topLine, [settings.width * 0.1, settings.height * 0.35], Math.max(32, settings.width * 0.045), 100);
            if (bottomLine) aetoolkitCepAddTextLayer(comp, "Cover bottom line", bottomLine, [settings.width * 0.1, settings.height * 0.48], Math.max(22, settings.width * 0.028), 100);
            if (dateLine) aetoolkitCepAddTextLayer(comp, "Cover date", dateLine, [settings.width * 0.1, settings.height * 0.78], Math.max(18, settings.width * 0.018), 75);
            if (spotLine) aetoolkitCepAddTextLayer(comp, "Cover spot", spotLine, [settings.width * 0.1, settings.height * 0.86], Math.max(18, settings.width * 0.018), 75);
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ id: comp.id, name: comp.name });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSetCheckerHold(layer, sourceComp, targetComp, frame) {
    var frameTime = frame / sourceComp.frameRate, maximum = Math.max(0, sourceComp.duration - sourceComp.frameDuration), remap;
    if (frameTime > maximum) frameTime = maximum;
    try {
        if (layer.canSetTimeRemapEnabled === false) return;
        layer.timeRemapEnabled = true;
        remap = layer.property("ADBE Time Remapping");
        remap.setValueAtTime(0, frameTime);
        remap.setValueAtTime(targetComp.duration, frameTime);
    } catch (remapError) {}
}
function aetoolkitCepCreateCheckers(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), width = aetoolkitCepNumber(options.width, "Width", 1, 30000, true), height = aetoolkitCepNumber(options.height, "Height", 1, 30000, true), frame = aetoolkitCepNumber(options.frame, "Frame", 0, 999999, true), comps = aetoolkitCepSelectedComps(), i, source, checker, sourceLayer;
        app.beginUndoGroup("AE Toolkit CEP: Create checkers");
        try {
            for (i = 0; i < comps.length; i++) {
                source = comps[i];
                checker = app.project.items.addComp("CKR_" + aetoolkitCepPadNumber(i + 1, 2) + "_" + aetoolkitCepSafeName(source.name), width, height, source.pixelAspect || 1, source.duration, source.frameRate);
                checker.label = 14;
                sourceLayer = checker.layers.add(source);
                try { sourceLayer.transform.position.setValue([width / 2, height / 2]); } catch (positionError) {}
                aetoolkitCepSetCheckerHold(sourceLayer, source, checker, frame);
                aetoolkitCepAddTextLayer(checker, "Checker info", source.name + "  |  frame " + frame + "  |  " + source.frameRate + " fps", [10, height - 14], 13, 45);
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ created: comps.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepConsolidateFootage() {
    try {
        app.beginUndoGroup("AE Toolkit CEP: Consolidate footage");
        try { app.project.consolidateFootage(); }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ consolidated: true });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRemoveUnusedFootage() {
    try {
        app.beginUndoGroup("AE Toolkit CEP: Remove unused footage");
        try { app.project.removeUnusedFootage(); }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ removed: true });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReductionItems() {
    var items = [], selection = app.project.selection;
    function add(item) {
        var i;
        if (item instanceof FolderItem) { for (i = 1; i <= item.numItems; i++) add(item.item(i)); return; }
        if (!(item instanceof CompItem) && !(item instanceof FootageItem)) return;
        for (i = 0; i < items.length; i++) if (items[i].id === item.id) return;
        items.push(item);
    }
    for (var i = 0; i < selection.length; i++) add(selection[i]);
    return items;
}
function aetoolkitCepReduceProject() {
    try {
        var items = aetoolkitCepReductionItems();
        if (!items.length) throw new Error("Select one or more compositions or footage items to keep before reducing the project.");
        app.beginUndoGroup("AE Toolkit CEP: Reduce project");
        try { app.project.reduceProject(items); }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ kept: items.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepOpenCollectFiles() {
    try {
        var command = app.findMenuCommandId("Collect Files...");
        if (!command) command = app.findMenuCommandId("Collect Files\u2026");
        if (!command) throw new Error("The Collect Files command is not available in this After Effects language.");
        app.executeCommand(command);
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepLikelyImageSequence(item) {
    var name = item.file && item.file.name || "", imageExtension = /\.(ai|bmp|dpx|exr|gif|iff|jpeg|jpg|png|psd|tga|tif|tiff)$/i.test(name);
    return imageExtension && item.mainSource && item.mainSource.isStill === false;
}
function aetoolkitCepUniqueCopyFile(folder, sourceFile) {
    var name = sourceFile.name, dot = name.lastIndexOf("."), base = dot > 0 ? name.substring(0, dot) : name, extension = dot > 0 ? name.substring(dot) : "", attempt = 0, target;
    do {
        target = new File(folder.fsName + "/" + base + (attempt ? "_" + aetoolkitCepPadNumber(attempt, 2) : "") + extension);
        attempt++;
    } while (target.exists && attempt < 10000);
    if (target.exists) throw new Error("Could not find an unused name for " + sourceFile.name);
    return target;
}
function aetoolkitCepLocalizeSelectedAssets(assetsPath) {
    var localized = 0, errors = [], destination, selection, i, item, source, target;
    try {
        if (!assetsPath) throw new Error("The active project has no Assets folder configured.");
        destination = aetoolkitCepEnsureFolder(String(assetsPath).replace(/[\\\/]+$/, "") + "/Localized");
        selection = app.project.selection;
        if (!selection.length) throw new Error("Select one or more file-based footage items before localizing assets.");
        app.beginUndoGroup("AE Toolkit CEP: Localize selected assets");
        try {
            for (i = 0; i < selection.length; i++) {
                item = selection[i];
                if (!(item instanceof FootageItem) || !item.file) { errors.push(item.name + ": not file-based footage."); continue; }
                if (!item.file.exists) { errors.push(item.name + ": source file is offline."); continue; }
                if (aetoolkitCepLikelyImageSequence(item)) { errors.push(item.name + ": image sequences are skipped; use Collect Files for sequences."); continue; }
                source = item.file;
                try {
                    target = aetoolkitCepUniqueCopyFile(destination, source);
                    if (!source.copy(target.fsName)) throw new Error("copy failed");
                    item.replace(target);
                    localized++;
                } catch (copyError) { errors.push(item.name + ": " + copyError.toString()); }
            }
        } finally { app.endUndoGroup(); }
    } catch (error) { errors.push(error.toString()); }
    return AEToolkitJSON.stringify({ localized: localized, errors: errors });
}
function aetoolkitCepOrganizerSnapshot() {
    var project = app.project, root = project.rootFolder, snapshot = { items: [], folders: [], protectedIds: {}, selected: [] }, i, item, ancestor;
    for (i = 1; i <= project.numItems; i++) {
        item = project.item(i);
        if (item instanceof FolderItem) snapshot.folders.push(item); else snapshot.items.push(item);
        if (item.selected) snapshot.selected.push(item);
    }
    for (i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (item.selected) snapshot.protectedIds[item.id] = true;
        ancestor = item.parentFolder;
        while (ancestor && ancestor !== root) { if (ancestor.selected) { snapshot.protectedIds[item.id] = true; break; } ancestor = ancestor.parentFolder; }
    }
    for (i = 0; i < snapshot.folders.length; i++) {
        item = snapshot.folders[i];
        if (item.selected) snapshot.protectedIds[item.id] = true;
        ancestor = item.parentFolder;
        while (ancestor && ancestor !== root) { if (ancestor.selected) { snapshot.protectedIds[item.id] = true; break; } ancestor = ancestor.parentFolder; }
    }
    return snapshot;
}
function aetoolkitCepOrganizerFolder(snapshot, name, parent) {
    var i, item;
    parent = parent || app.project.rootFolder;
    for (i = 1; i <= parent.numItems; i++) {
        item = parent.item(i);
        if (item instanceof FolderItem && item.name === name && !snapshot.protectedIds[item.id]) return item;
    }
    item = app.project.items.addFolder(name);
    item.parentFolder = parent;
    snapshot.folders.push(item);
    return item;
}
function aetoolkitCepOrganizerExtension(item) {
    var name = "", dot;
    try { name = item.file ? item.file.name : item.name; } catch (error) {}
    dot = name.lastIndexOf(".");
    return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
}
function aetoolkitCepIsSolid(item) {
    try { return item.mainSource instanceof SolidSource; } catch (error) { return false; }
}
function aetoolkitCepIsStill(item) {
    try { return !!item.mainSource.isStill; } catch (error) { return false; }
}
function aetoolkitCepLiftSelectedItems(snapshot) {
    var root = app.project.rootFolder;
    for (var i = 0; i < snapshot.selected.length; i++) snapshot.selected[i].parentFolder = root;
}
function aetoolkitCepOrganizeBasic(snapshot) {
    var comps = aetoolkitCepOrganizerFolder(snapshot, "Comps"), precomps = aetoolkitCepOrganizerFolder(snapshot, "PreComps"), footage = aetoolkitCepOrganizerFolder(snapshot, "Footage"), images = aetoolkitCepOrganizerFolder(snapshot, "Images"), solids = aetoolkitCepOrganizerFolder(snapshot, "Solids"), moved = 0, item;
    for (var i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (snapshot.protectedIds[item.id]) continue;
        if (item instanceof CompItem) item.parentFolder = item.usedIn && item.usedIn.length ? precomps : comps;
        else if (item instanceof FootageItem) item.parentFolder = aetoolkitCepIsSolid(item) ? solids : aetoolkitCepIsStill(item) ? images : footage;
        else continue;
        moved++;
    }
    return moved;
}
function aetoolkitCepOrganizeDms(snapshot, ratio) {
    var comps = aetoolkitCepOrganizerFolder(snapshot, "1_COMPS"), precomps = aetoolkitCepOrganizerFolder(snapshot, "2_PRE_COMPS"), gfx = aetoolkitCepOrganizerFolder(snapshot, "3_GFX"), footage = aetoolkitCepOrganizerFolder(snapshot, "4_FOOTAGE"), compRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, comps), precompRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, precomps), footageRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, footage), solids = aetoolkitCepOrganizerFolder(snapshot, "SOLIDS", gfx), moved = 0, item, ext, destination;
    for (var i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (snapshot.protectedIds[item.id]) continue;
        if (item instanceof CompItem) destination = item.usedIn && item.usedIn.length ? precompRatio : compRatio;
        else if (item instanceof FootageItem) {
            if (aetoolkitCepIsSolid(item)) destination = solids;
            else {
                ext = aetoolkitCepOrganizerExtension(item);
                if (!aetoolkitCepIsStill(item) && (/^(wav|aif|aiff|mp3|m4a|aac)$/.test(ext) || item.hasAudio && !item.hasVideo)) destination = footageRatio;
                else if (!aetoolkitCepIsStill(item) && /^(mov|mp4|mxf|avi)$/.test(ext)) destination = footageRatio;
                else destination = aetoolkitCepOrganizerFolder(snapshot, (ext === "jpg" ? "JPEG" : ext === "tiff" ? "TIF" : ext ? ext.toUpperCase() : "OTHER"), gfx);
            }
        } else continue;
        item.parentFolder = destination;
        moved++;
    }
    return moved;
}
function aetoolkitCepOrganizeProject(preset) {
    try {
        var allowed = { basic: true, "dms-16x9": true, "dms-9x16": true, "dms-4x5": true, "dms-1x1": true }, snapshot, moved;
        if (!allowed[preset]) throw new Error("Choose an organizer preset.");
        app.beginUndoGroup("AE Toolkit CEP: Organize project");
        try {
            snapshot = aetoolkitCepOrganizerSnapshot();
            aetoolkitCepLiftSelectedItems(snapshot);
            if (preset === "basic") moved = aetoolkitCepOrganizeBasic(snapshot);
            else moved = aetoolkitCepOrganizeDms(snapshot, preset.substring(4));
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ moved: moved, selectedAtRoot: snapshot.selected.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepActiveCompLayers(minimum) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) throw new Error("Open a composition and select layer" + (minimum === 1 ? "." : "s."));
    if (!comp.selectedLayers || comp.selectedLayers.length < minimum) throw new Error("Select " + (minimum === 1 ? "at least one layer." : "at least " + minimum + " layers."));
    return { comp: comp, layers: comp.selectedLayers };
}
function aetoolkitCepAdjustSelectedCompFrames(value) {
    try {
        var frames = aetoolkitCepNumber(value, "Frame change", -9999, 9999, true), comps = aetoolkitCepSelectedComps(), changed = 0, duration, minimum;
        if (frames === 0) throw new Error("Enter a non-zero frame change.");
        app.beginUndoGroup("AE Toolkit CEP: Adjust composition duration");
        try {
            for (var i = 0; i < comps.length; i++) {
                minimum = comps[i].frameDuration || 1 / comps[i].frameRate;
                duration = comps[i].duration + frames / comps[i].frameRate;
                comps[i].duration = Math.max(minimum, duration);
                changed++;
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSetSelectedCompDuration(value) {
    try {
        var requested = aetoolkitCepNumber(value, "Duration", 0.001, 86400, false), comps = aetoolkitCepSelectedComps(), changed = 0, minimum;
        app.beginUndoGroup("AE Toolkit CEP: Set composition duration");
        try {
            for (var i = 0; i < comps.length; i++) {
                minimum = comps[i].frameDuration || 1 / comps[i].frameRate;
                comps[i].duration = Math.max(minimum, requested);
                changed++;
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepFadeSelectedLayers(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), direction = options.direction, frames = aetoolkitCepNumber(options.frames, "Fade frames", 1, 9999, true), context = aetoolkitCepActiveCompLayers(1), duration = frames / context.comp.frameRate, i, layer, start, end;
        if (direction !== "in" && direction !== "out") throw new Error("Choose a fade direction.");
        app.beginUndoGroup("AE Toolkit CEP: Fade selected layers");
        try {
            for (i = 0; i < context.layers.length; i++) {
                layer = context.layers[i];
                if (direction === "in") { start = layer.inPoint; end = Math.min(layer.outPoint, start + duration); layer.opacity.setValueAtTime(start, 0); layer.opacity.setValueAtTime(end, 100); }
                else { end = layer.outPoint; start = Math.max(layer.inPoint, end - duration); layer.opacity.setValueAtTime(start, 100); layer.opacity.setValueAtTime(end, 0); }
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSequenceSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), layers = [], i, current = context.comp.time, duration, offset;
        for (i = 0; i < context.layers.length; i++) layers.push(context.layers[i]);
        layers.sort(function (first, second) { return first.inPoint - second.inPoint || first.index - second.index; });
        app.beginUndoGroup("AE Toolkit CEP: Sequence layers");
        try {
            for (i = 0; i < layers.length; i++) {
                duration = layers[i].outPoint - layers[i].inPoint;
                offset = layers[i].inPoint - layers[i].startTime;
                layers[i].startTime = current - offset;
                current += duration;
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepParentSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(2), parent = context.layers[context.layers.length - 1], i;
        app.beginUndoGroup("AE Toolkit CEP: Parent selected layers");
        try { for (i = 0; i < context.layers.length - 1; i++) context.layers[i].parent = parent; }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepUnparentSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), i;
        app.beginUndoGroup("AE Toolkit CEP: Unparent selected layers");
        try { for (i = 0; i < context.layers.length; i++) context.layers[i].parent = null; }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepMarkSelectedGuideLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), i;
        app.beginUndoGroup("AE Toolkit CEP: Mark guide layers");
        try { for (i = 0; i < context.layers.length; i++) context.layers[i].guideLayer = true; }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReplaceSelectedText(text) {
    try {
        var context = aetoolkitCepActiveCompLayers(1), replacement = new TextDocument(String(text || " ")), changed = 0, i, property;
        app.beginUndoGroup("AE Toolkit CEP: Replace text");
        try {
            for (i = 0; i < context.layers.length; i++) {
                try {
                    property = context.layers[i].property("ADBE Text Properties").property("ADBE Text Document");
                    if (property.numKeys > 0) property.setValueAtTime(context.comp.time, replacement); else property.setValue(replacement);
                    changed++;
                } catch (notTextError) {}
            }
        } finally { app.endUndoGroup(); }
        if (!changed) throw new Error("Select one or more text layers.");
        return AEToolkitJSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepLayerMatchesType(layer, type) {
    var source;
    try { source = layer.source; } catch (sourceError) { source = null; }
    if (type === "null") return !!layer.nullLayer;
    if (type === "solid") { try { return !layer.nullLayer && source && source.mainSource instanceof SolidSource; } catch (solidError) { return false; } }
    if (type === "shape") return layer.matchName === "ADBE Vector Layer";
    if (type === "camera") return layer.matchName === "ADBE Camera Layer";
    if (type === "light") return layer.matchName === "ADBE Light Layer";
    if (type === "comp") return source instanceof CompItem;
    if (type === "footage") { try { return !layer.nullLayer && source instanceof FootageItem && !(source.mainSource instanceof SolidSource); } catch (footageError) { return false; } }
    if (type === "text") { try { return !!layer.property("ADBE Text Properties"); } catch (textError) { return false; } }
    return false;
}
function aetoolkitCepSelectLayersByType(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), allowed = { "null": true, solid: true, shape: true, comp: true, footage: true, text: true, camera: true, light: true }, context = aetoolkitCepActiveCompLayers(0), comp = context.comp, mode = options.mode, changed = 0, i, layer, matches;
        if (!allowed[options.type]) throw new Error("Choose a layer type.");
        if (mode !== "only" && mode !== "add" && mode !== "subtract") throw new Error("Choose a selection mode.");
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i); matches = aetoolkitCepLayerMatchesType(layer, options.type);
            if (mode === "only") layer.selected = matches;
            else if (matches && mode === "add") layer.selected = true;
            else if (matches && mode === "subtract") layer.selected = false;
            if (matches) changed++;
        }
        return AEToolkitJSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReverseSelectedLayerOrder() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), layers = [], i;
        for (i = 0; i < context.layers.length; i++) layers.push(context.layers[i]);
        layers.sort(function (first, second) { return first.index - second.index; });
        app.beginUndoGroup("AE Toolkit CEP: Reverse layer order");
        try { for (i = 0; i < layers.length; i++) layers[i].moveToBeginning(); }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepTransformProperty(layer, matchName) {
    var transform = layer.property("ADBE Transform Group"), property = transform && transform.property(matchName);
    if (!property) throw new Error("Layer does not support " + matchName + ".");
    return property;
}
function aetoolkitCepSetCurrentPropertyValue(property, value, time) {
    if (property.numKeys > 0 || property.isTimeVarying) property.setValueAtTime(time, value); else property.setValue(value);
}
function aetoolkitCepSnapSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(2), source = aetoolkitCepTransformProperty(context.layers[context.layers.length - 1], "ADBE Position").value, i, property;
        app.beginUndoGroup("AE Toolkit CEP: Snap selected layers");
        try { for (i = 0; i < context.layers.length - 1; i++) { property = aetoolkitCepTransformProperty(context.layers[i], "ADBE Position"); aetoolkitCepSetCurrentPropertyValue(property, source, context.comp.time); } }
        finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepTransferTransform(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText), context = aetoolkitCepActiveCompLayers(2), source = context.layers[context.layers.length - 1], properties = [], i, target, propertyIndex, sourceProperty, targetProperty;
        if (options.position) properties.push("ADBE Position");
        if (options.scale) properties.push("ADBE Scale");
        if (options.rotation) properties.push("ADBE Rotate Z");
        if (!properties.length) throw new Error("Choose one or more transform properties.");
        app.beginUndoGroup("AE Toolkit CEP: Transfer transform");
        try {
            for (i = 0; i < context.layers.length - 1; i++) {
                target = context.layers[i];
                for (propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
                    sourceProperty = aetoolkitCepTransformProperty(source, properties[propertyIndex]);
                    targetProperty = aetoolkitCepTransformProperty(target, properties[propertyIndex]);
                    aetoolkitCepSetCurrentPropertyValue(targetProperty, sourceProperty.value, context.comp.time);
                }
            }
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepCreateNoSlateComp(value) {
    try {
        var frames = aetoolkitCepNumber(value, "Slate frames", 1, 9999, true), selected = app.project.selection, footage, trimTime, duration, comp, layer;
        if (selected.length !== 1 || !(selected[0] instanceof FootageItem)) throw new Error("Select exactly one footage item in the Project panel.");
        footage = selected[0];
        if (!(footage.frameRate > 0) || !(footage.duration > 0)) throw new Error("The selected footage needs a valid frame rate and duration.");
        trimTime = frames / footage.frameRate;
        duration = footage.duration - trimTime;
        if (duration < 1 / footage.frameRate) throw new Error("The selected footage is shorter than the slate trim.");
        app.beginUndoGroup("AE Toolkit CEP: Create no-slate comp");
        try {
            comp = app.project.items.addComp(aetoolkitCepSafeName(footage.name) + "_NoSlate", footage.width, footage.height, footage.pixelAspect, duration, footage.frameRate);
            comp.label = 14;
            layer = comp.layers.add(footage);
            layer.startTime = -trimTime;
        } finally { app.endUndoGroup(); }
        return AEToolkitJSON.stringify({ id: comp.id, name: comp.name });
    } catch (error) { return "ERROR: " + error.toString(); }
}

// Native checker packages. Capture exports XML from a clean saved project and restores its file path; never closes or reduces it.
function aetoolkitCepCheckerLibraryRoot(path) {
    if (path && !aetoolkitCepIsAbsolutePath(path)) throw new Error("Choose an absolute library folder.");
    if (path) { var chosen = new Folder(path); if (!chosen.exists) throw new Error("Template library is unavailable. Reconnect the shared drive or choose another folder."); return chosen; }
    return aetoolkitCepEnsureFolder(aetoolkitCepDataFolder().fsName + "/template-library");
}
function aetoolkitCepChooseCheckerLibrary() {
    var folder = Folder.selectDialog("Choose shared template library");
    return folder ? folder.fsName : "";
}
function aetoolkitCepReadCheckerManifest(folder) {
    var file = new File(folder.fsName + "/template.json"), text, data;
    if (!file.exists || !file.open("r")) throw new Error("Cannot read template metadata.");
    text = file.read(); file.close(); data = AEToolkitJSON.parse(text);
    if ((data.version !== 1 && data.version !== 2) || !data.templates || !(data.templates instanceof Array)) throw new Error("Unsupported checker template package.");
    return data;
}
function aetoolkitCepCheckerFile(folder, relative) {
    if (!relative || /(^|[\\\/])\.\.([\\\/]|$)/.test(relative) || aetoolkitCepIsAbsolutePath(relative)) throw new Error("Invalid template asset path.");
    return new File(folder.fsName + "/" + relative);
}
function aetoolkitCepListCheckerTemplates(jsonText) {
    try {
        var options = AEToolkitJSON.parse(jsonText || "{}"), root = aetoolkitCepCheckerLibraryRoot(options.libraryRoot), folders = root.getFiles(), records = [], notices = [], i, j, data, entry;
        for (i = 0; i < folders.length; i++) if (folders[i] instanceof Folder && new File(folders[i].fsName + "/template.json").exists) {
            try {
                data = aetoolkitCepReadCheckerManifest(folders[i]);
                for (j = 0; j < data.templates.length; j++) { entry = data.templates[j]; records.push({id: "custom-" + folders[i].name + "-" + j, kind: "custom-checker", name: entry.name, width: entry.width, height: entry.height, packageId: folders[i].name, templateIndex: j, assets: {}}); }
            } catch (error) { notices.push(folders[i].name + ": " + error.toString()); }
        }
        return AEToolkitJSON.stringify({root:root.fsName, presets:records, notices:notices});
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepCompPath(item, stop) {
    var parts = [item.name], parent = item.parentFolder;
    while (parent && parent !== app.project.rootFolder && parent !== stop) { parts.unshift(parent.name); parent = parent.parentFolder; }
    return parts;
}
function aetoolkitCepCheckerWalk(comp, callback, visited) {
    visited = visited || {};
    if (visited[comp.id]) return;
    visited[comp.id] = true;
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        callback(layer, comp);
        if (layer.source instanceof CompItem && layer.name !== "REPLACE THIS LAYER WITH GRAPHIC COMP") aetoolkitCepCheckerWalk(layer.source, callback, visited);
    }
}
function aetoolkitCepValidateChecker(comp) {
    var slots = 0, labels = 0;
    aetoolkitCepCheckerWalk(comp, function (layer) {
        if (layer.name === "REPLACE THIS LAYER WITH GRAPHIC COMP" && layer.source instanceof CompItem) slots++;
        if (layer.name === "XXXX" && layer.property("ADBE Text Properties")) { if (layer.property("ADBE Text Properties").property("ADBE Text Document").expressionEnabled) throw new Error('Disable the expression on the "XXXX" text before capturing.'); labels++; }
    });
    if (!slots) throw new Error(comp.name + ': needs a precomp layer named "REPLACE THIS LAYER WITH GRAPHIC COMP".');
    if (!labels) throw new Error(comp.name + ': needs a text layer named "XXXX".');
}
function aetoolkitCepCaptureCheckerTemplates(jsonText) {
    var packageFolder = null, completed = false;
    try {
        var options = AEToolkitJSON.parse(jsonText || "{}"), comps = aetoolkitCepSelectedComps(), root, token, projectFile = app.project.file, templates = [], media = [], seen = {}, i, j, item, file, relative, folder, files, f;
        if (!projectFile || !projectFile.exists || app.project.dirty) throw new Error("Save the project, then use selected comps again.");
        if (!/\.aepx?$/i.test(projectFile.name)) throw new Error("Save the checker project as .aep or .aepx before capturing.");
        if (projectFile.readonly) throw new Error("The saved checker project must be writable before capture.");
        for (i = 0; i < comps.length; i++) {
            aetoolkitCepValidateChecker(comps[i]);
            var path = aetoolkitCepCompPath(comps[i]);
            for (j = 1; j <= app.project.numItems; j++) { item = app.project.item(j); if (item !== comps[i] && item instanceof CompItem && AEToolkitJSON.stringify(aetoolkitCepCompPath(item)) === AEToolkitJSON.stringify(path)) throw new Error("Give same-folder compositions unique names before capturing."); }
            templates.push({name:comps[i].name, width:comps[i].width, height:comps[i].height, path:path});
        }
        // Only export dedicated template projects; never publish unrelated work into a shared library.
        var dependencies = {};
        function visitDependency(comp) {
            if (dependencies[comp.id]) return;
            dependencies[comp.id] = true;
            for (var n = 1; n <= comp.numLayers; n++) { var src = comp.layer(n).source; if (!src) continue; if (src instanceof CompItem) visitDependency(src); else dependencies[src.id] = true; }
        }
        for (i = 0; i < comps.length; i++) visitDependency(comps[i]);
        for (i = 1; i <= app.project.numItems; i++) { item = app.project.item(i); if (!(item instanceof FolderItem) && !dependencies[item.id]) throw new Error("Use a dedicated checker project with only the selected templates and their dependencies. Unrelated item: " + item.name); }
        root = aetoolkitCepCheckerLibraryRoot(options.libraryRoot);
        token = "checkers-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000000);
        packageFolder = aetoolkitCepEnsureFolder(root.fsName + "/" + token);
        // Native XML retains layer import descriptors; only fileReference paths are rewritten on use.
        var snapshot = new File(packageFolder.fsName + "/project.aepx");
        if (/\.aepx$/i.test(projectFile.name)) { if (!projectFile.copy(snapshot.fsName)) throw new Error("Cannot copy template project."); }
        else {
            try { app.project.save(snapshot); }
            finally {
                if (app.project.file && app.project.file.fsName !== projectFile.fsName) {
                    try { app.project.save(projectFile); }
                    catch (restoreError) { throw new Error("XML export succeeded, but the original project path could not be restored. The original file remains at " + projectFile.fsName + ". Current project: " + snapshot.fsName); }
                }
            }
        }
        if (!snapshot.exists) throw new Error("After Effects did not export the template project.");
        // Copy complete media directories to preserve image sequences and layered import source files.
        for (i = 1; i <= app.project.numItems; i++) {
            item = app.project.item(i);
            if (!(item instanceof FootageItem)) continue;
            var sources = [];
            if (item.file) sources.push(item.file);
            try { if (item.proxySource && item.proxySource.file) sources.push(item.proxySource.file); } catch (ignoreProxy) {}
            for (j = 0; j < sources.length; j++) {
                file = sources[j];
                if (!file.exists) throw new Error("Missing media: " + file.fsName);
                if (seen[file.fsName]) continue;
                relative = "media/" + media.length + "/" + file.name;
                folder = aetoolkitCepEnsureFolder(packageFolder.fsName + "/media/" + media.length);
                if (aetoolkitCepLikelyImageSequence(item)) {
                    var sequenceMatch = file.name.match(/^(.*?)([0-9]+)(\.[^.]+)$/);
                    if (!sequenceMatch) throw new Error("Collect this image sequence in After Effects first: " + file.name);
                    files = file.parent.getFiles();
                    for (f = 0; f < files.length; f++) if (files[f] instanceof File) {
                        var match = files[f].name.match(/^(.*?)([0-9]+)(\.[^.]+)$/);
                        if (match && match[1] === sequenceMatch[1] && match[3] === sequenceMatch[3] && !files[f].copy(folder.fsName + "/" + files[f].name)) throw new Error("Cannot collect image sequence.");
                    }
                } else if (!file.copy(folder.fsName + "/" + file.name)) throw new Error("Cannot copy media: " + file.fsName);
                seen[file.fsName] = true;
                media.push({original:file.fsName, relative:relative, sequence:aetoolkitCepLikelyImageSequence(item)});
            }
        }
        var manifest = {version:2, project:"project.aepx", templates:templates, media:media};
        var output = new File(packageFolder.fsName + "/template.json"); output.encoding = "UTF-8";
        if (!output.open("w")) throw new Error("Cannot write template metadata.");
        var written = output.write(AEToolkitJSON.stringify(manifest)); output.close();
        if (!written) throw new Error("Cannot finish template metadata.");
        completed = true;
        return AEToolkitJSON.stringify({captured:templates.length, packageId:token, root:root.fsName});
    } catch (error) { return "ERROR: " + error.toString(); }
    finally {
        // Incomplete folders have no catalog manifest and never appear as usable presets.
        if (!completed && packageFolder) { var partial = new File(packageFolder.fsName + "/template.json"); if (partial.exists) partial.remove(); }
    }
}
function aetoolkitCepXmlEscape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function aetoolkitCepXmlDecode(value) {
    return String(value).replace(/&#x([0-9a-f]+);/ig, function (_, code) { return String.fromCharCode(parseInt(code, 16)); }).replace(/&#([0-9]+);/g, function (_, code) { return String.fromCharCode(parseInt(code, 10)); }).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function aetoolkitCepCheckerPathKey(path) { return String(path).replace(/\\/g, "/"); }
function aetoolkitCepResolveCheckerXml(xml, media, folder, platform) {
    var paths = {}, i;
    for (i = 0; i < media.length; i++) paths[aetoolkitCepCheckerPathKey(media[i].original)] = aetoolkitCepCheckerFile(folder, media[i].relative).fsName;
    if (xml.indexOf("<AfterEffectsProject") === -1) throw new Error("Template is not native After Effects XML.");
    return xml.replace(/<fileReference\b[^>]*\/>/g, function (tag) {
        var match = /\bfullpath="([^"]*)"/.exec(tag), original, mapped;
        if (!match || /target_is_folder="1"/.test(tag)) return tag;
        original = aetoolkitCepCheckerPathKey(aetoolkitCepXmlDecode(match[1])); mapped = paths[original];
        if (!mapped) throw new Error("Uncollected template media: " + original);
        tag = tag.replace(/\bfullpath="[^"]*"/, 'fullpath="' + aetoolkitCepXmlEscape(mapped) + '"');
        tag = tag.replace(/\s+(platform|ascendcount_base|ascendcount_target|server_name|server_volume_name)="[^"]*"/g, "");
        return tag.replace(/\/>$/, ' platform="' + platform + '" ascendcount_base="0" ascendcount_target="0" server_name="" server_volume_name=""/>');
    });
}
function aetoolkitCepPrepareCheckerProject(folder, data) {
    var source = aetoolkitCepCheckerFile(folder, data.project);
    if (data.version !== 2) return source;
    source.encoding = "UTF-8";
    if (!source.open("r")) throw new Error("Cannot read template XML.");
    var xml = source.read(); source.close();
    xml = aetoolkitCepResolveCheckerXml(xml, data.media, folder, Folder.fs === "Windows" ? "Win" : "MacPOSIX");
    var tempFolder = aetoolkitCepEnsureFolder(Folder.temp.fsName + "/Toolbox2-checkers");
    var file = new File(tempFolder.fsName + "/checker-" + new Date().getTime() + "-" + Math.floor(Math.random()*1000000) + ".aepx"); file.encoding = "UTF-8";
    if (!file.open("w")) throw new Error("Cannot prepare local checker project.");
    var written = file.write(xml); file.close();
    if (!written) { file.remove(); throw new Error("Cannot write local checker project."); }
    return file;
}
function aetoolkitCepCreateCustomCheckers(jsonText) {
    var before = {}, started = false, preparedProject = null, preparedTemporary = false;
    try {
        var options = AEToolkitJSON.parse(jsonText), root = aetoolkitCepCheckerLibraryRoot(options.libraryRoot), folder, data, template, sourceComps = aetoolkitCepSelectedComps(), job = String(options.jobCode || "").replace(/^\s+|\s+$/g, ""), i, j, item, imported, checker, matches, file, map = {}, media;
        if (!job) throw new Error("Enter a Job code before creating custom checkers.");
        if (!/^checkers-[a-z0-9-]+$/i.test(options.packageId || "")) throw new Error("Invalid checker package.");
        folder = new Folder(root.fsName + "/" + options.packageId); data = aetoolkitCepReadCheckerManifest(folder); template = data.templates[options.templateIndex];
        if (!template) throw new Error("This checker template is unavailable. Refresh the library.");
        file = aetoolkitCepCheckerFile(folder, data.project);
        if (!file.exists) throw new Error("Template project is missing.");
        for (i = 0; i < data.media.length; i++) { media = data.media[i]; var target = aetoolkitCepCheckerFile(folder, media.relative); if (!target.exists) throw new Error("Template media is missing: " + target.fsName); map[media.original] = {file:target,sequence:media.sequence}; }
        for (i = 1; i <= app.project.numItems; i++) before[app.project.item(i).id] = true;
        preparedProject = aetoolkitCepPrepareCheckerProject(folder, data); preparedTemporary = data.version === 2;
        app.beginUndoGroup("Toolbox 2: Custom checkers"); started = true;
        for (i = 0; i < sourceComps.length; i++) {
            var existing = {}; for (j = 1; j <= app.project.numItems; j++) existing[app.project.item(j).id] = true;
            imported = app.project.importFile(new ImportOptions(preparedProject)); matches = [];
            for (j = 1; j <= app.project.numItems; j++) {
                item = app.project.item(j); if (existing[item.id]) continue;
                if (item instanceof CompItem && AEToolkitJSON.stringify(aetoolkitCepCompPath(item, imported)) === AEToolkitJSON.stringify(template.path)) matches.push(item);
                // Native layered sources require their original or natively collected paths; do not flatten them by replacement.
                if (data.version !== 2 && item instanceof FootageItem && item.file && map[item.file.fsName]) {
                    var mapped = map[item.file.fsName];
                    if (/\.(psd|psb|ai)$/i.test(item.file.name)) {
                        if (!item.file.exists) throw new Error("Layered template media needs its original shared location or an After Effects Collect Files project: " + item.file.name);
                    } else if (mapped.sequence) item.replaceWithSequence(mapped.file, false); else item.replace(mapped.file);
                }
            }
            if (matches.length !== 1) throw new Error("Cannot uniquely locate the template composition in its saved project.");
            checker = matches[0]; aetoolkitCepValidateChecker(checker);
            (function(graphic){ aetoolkitCepCheckerWalk(checker, function(layer) {
                if (layer.name === "REPLACE THIS LAYER WITH GRAPHIC COMP") { var locked = layer.locked; layer.locked = false; layer.replaceSource(graphic, false); layer.locked = locked; }
                if (layer.name === "XXXX" && layer.property("ADBE Text Properties")) {
                    var text = layer.property("ADBE Text Properties").property("ADBE Text Document"), doc, k;
                    if (text.expressionEnabled) throw new Error('Disable the expression on the "XXXX" text before capturing.');
                    var wasLocked = layer.locked; layer.locked = false;
                    if (text.numKeys) for (k = 1; k <= text.numKeys; k++) { doc = text.keyValue(k); doc.text = job; text.setValueAtKey(k, doc); }
                    else { doc = text.value; doc.text = job; text.setValue(doc); }
                    layer.locked = wasLocked;
                }
            }); })(sourceComps[i]);
            checker.name = "CHK_" + sourceComps[i].name; imported.name = checker.name + " template";
        }
        return AEToolkitJSON.stringify({created:sourceComps.length});
    } catch (error) {
        if (started) for (var n = app.project.numItems; n >= 1; n--) { try { var added = app.project.item(n); if (!before[added.id]) added.remove(); } catch (cleanupError) {} }
        return "ERROR: " + error.toString();
    } finally { if (started) app.endUndoGroup(); if (preparedTemporary && preparedProject) preparedProject.remove(); }
}

// AOM loading is provided by AE's native Output Module Templates dialog.
// Only AE's installed template list is authoritative; do not parse binary AOM data.
function aetoolkitCepChooseAom() {
    try {
        var file = File.openDialog("Choose an AOM file to load in Edit > Templates > Output Module", "*.aom", false);
        if (!file) return "";
        if (!/\.aom$/i.test(file.name) || !file.exists) throw new Error("Choose an existing .aom file.");
        return file.fsName;
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepOutputTemplates() {
    var temporaryComp = null, temporaryItem = null;
    try {
        if (!app.project) throw new Error("Open a project first.");
        var queue = app.project.renderQueue, module, names = [], i;
        if (queue.rendering) throw new Error("Wait for the current render to finish.");
        if (queue.numItems) module = queue.item(1).outputModule(1);
        else {
            temporaryComp = app.project.items.addComp("Toolbox preset lookup", 4, 4, 1, 1, 24);
            temporaryItem = queue.items.add(temporaryComp);
            module = temporaryItem.outputModule(1);
        }
        var templates = module.templates;
        for (i = 0; i < templates.length; i++) if (String(templates[i]).indexOf("_HIDDEN") !== 0) names.push(String(templates[i]));
        return AEToolkitJSON.stringify(names);
    } catch (error) { return "ERROR: " + error.toString(); }
    finally {
        if (temporaryItem) temporaryItem.remove();
        if (temporaryComp) temporaryComp.remove();
    }
}
function aetoolkitCepOutputSuffix(module) {
    // A newly queued module can have no File until a destination is assigned.
    var name = module.file && module.file.name, settings, info, match;
    if (!name && module.getSettings) {
        settings = module.getSettings(GetSettingsFormat.STRING);
        info = settings["Output File Info"] || {};
        name = info["File Name"];
    }
    if (name) { try { name = decodeURI(String(name)); } catch (decodeError) {} }
    match = name && /((?:_?\[[#0]+\])?\.[A-Za-z0-9]+)$/.exec(name);
    if (!match) throw new Error("After Effects did not provide an output filename for this preset.");
    return match[1];
}
function aetoolkitCepAssignOutputFile(queueItem, destination, basename) {
    var module = queueItem.outputModule(1), suffix, settings, info, frameToken, template;
    try { suffix = aetoolkitCepOutputSuffix(module); } catch (suffixError) { suffix = ""; }
    if (suffix) {
        module.file = new File(destination + "/" + basename + suffix);
        return;
    }
    // Let AE resolve its format-specific extension instead of guessing from a
    // user-editable preset name. Preserve the preset's sequence frame token.
    settings = module.getSettings(GetSettingsFormat.STRING);
    info = settings["Output File Info"] || {};
    template = String(info["File Template"] || info["File Name"] || "");
    frameToken = /_?\[[#0]+\]/.exec(template);
    module.setSettings({ "Output File Info": {
        "Base Path": destination,
        "Subfolder Path": "",
        "File Template": basename + (frameToken ? frameToken[0] : "") + ".[fileextension]"
    } });
    // setSettings invalidates the old OutputModule object in AE.
    module = queueItem.outputModule(1);
    suffix = aetoolkitCepOutputSuffix(module);
    module.file = new File(destination + "/" + basename + suffix);
}

function aetoolkitCepAomNames(data) {
    function number(offset) {
        if (offset + 4 > data.length) throw new Error("Truncated AOM file.");
        return data.charCodeAt(offset) * 16777216 + data.charCodeAt(offset + 1) * 65536 + data.charCodeAt(offset + 2) * 256 + data.charCodeAt(offset + 3);
    }
    function decode(value) {
        var encoded = "", i, hex;
        for (i = 0; i < value.length; i++) { hex = value.charCodeAt(i).toString(16); encoded += "%" + (hex.length < 2 ? "0" : "") + hex; }
        return decodeURIComponent(encoded).replace(/\x00+$/, "");
    }
    if (data.substr(0, 4) !== "RIFX" || data.substr(8, 4) !== "LPom" || number(4) + 8 !== data.length) throw new Error("Unsupported or damaged AOM file.");
    var names = [], found = false;
    function chunks(start, end, records) {
        var p = start, size, next, tag, utfCount = -1, recordCount = 0;
        while (p < end) {
            if (p + 8 > end) throw new Error("Truncated AOM chunk.");
            tag = data.substr(p, 4); size = number(p + 4); next = p + 8 + size;
            if (next + size % 2 > end) throw new Error("Invalid AOM chunk size.");
            if (!records && tag === "LIST" && size >= 4 && data.substr(p + 8, 4) === "LOm ") { found = true; chunks(p + 12, next, true); }
            if (records && tag === "Roou") { if (recordCount && utfCount !== 3) throw new Error("Unsupported AOM preset layout."); utfCount = 0; recordCount++; }
            if (records && tag === "Utf8" && utfCount >= 0) {
                utfCount++;
                if (utfCount === 2) { var name = decode(data.substr(p + 8, size)); if (name && name.indexOf("_HIDDEN") !== 0) names.push(name); }
            }
            p = next + size % 2;
        }
        if (records && (!recordCount || utfCount !== 3)) throw new Error("Unsupported AOM preset layout.");
    }
    chunks(12, data.length, false);
    if (!found || !names.length) throw new Error("No readable output presets in this AOM file.");
    return names;
}
function aetoolkitCepReadAom(path) {
    var file = new File(path), opened = false;
    try {
        if (!file.exists || !/\.aom$/i.test(file.name)) throw new Error("Choose an existing .aom file.");
        if (file.length > 32 * 1024 * 1024) throw new Error("AOM file is too large to inspect.");
        file.encoding = "BINARY"; opened = file.open("r");
        if (!opened) throw new Error("Unable to read AOM file.");
        return AEToolkitJSON.stringify(aetoolkitCepAomNames(file.read()));
    } catch (error) { return "ERROR: " + error.toString(); }
    finally { if (opened) file.close(); }
}

function aetoolkitCepConformCompSolids(comp, selected) {
    var layers = [], count = 0, i, layer, source, temporary, replacement, locked, anchor, delta, value, k;
    if (selected) { for (i = 0; i < selected.length; i++) layers.push(selected[i]); }
    else for (i = 1; i <= comp.numLayers; i++) layers.push(comp.layer(i));
    for (i = 0; i < layers.length; i++) {
        layer = layers[i];
        if (!(layer instanceof AVLayer) || layer.nullLayer || !layer.source || !(layer.source.mainSource instanceof SolidSource)) continue;
        source = layer.source;
        if (source.width === comp.width && source.height === comp.height && source.pixelAspect === comp.pixelAspect) continue;
        // Create a dedicated source: shared solids in other comps must not change.
        temporary = comp.layers.addSolid(source.mainSource.color, source.name, comp.width, comp.height, comp.pixelAspect, comp.duration);
        replacement = temporary.source; temporary.remove();
        locked = layer.locked;
        try {
            layer.locked = false;
            delta = [(comp.width - source.width) / 2, (comp.height - source.height) / 2];
            layer.replaceSource(replacement, false);
            count++;
            anchor = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            if (!anchor.expressionEnabled) {
                if (anchor.numKeys) for (k = 1; k <= anchor.numKeys; k++) { value = anchor.keyValue(k); value[0] += delta[0]; value[1] += delta[1]; anchor.setValueAtKey(k, value); }
                else { value = anchor.value; value[0] += delta[0]; value[1] += delta[1]; anchor.setValue(value); }
            }
        } finally { layer.locked = locked; }
    }
    return count;
}

function aetoolkitCepStatePath() {
    try { return aetoolkitCepStateFile().fsName; }
    catch (error) { return "ERROR: " + error.toString(); }
}

function aetoolkitCepSourceProjectColorSpace(file) {
    // Never substitute footage/output profiles for the source project's working space.
    try {
        var current = app.project.file;
        if (current) {
            var a = current.fsName, b = file.fsName;
            if ($.os.indexOf("Win") !== -1) { a = a.toLowerCase(); b = b.toLowerCase(); }
            if (a === b) return app.project.workingSpace || "None";
        }
    } catch (error) {}
    var opened = false;
    try {
        if (!file.exists) return "Unavailable (source project missing)";
        if (file.length > 256 * 1024 * 1024) return "Unavailable (project exceeds inspection limit)";
        var xml = /\.aepx$/i.test(file.name);
        file.encoding = xml ? "UTF-8" : "BINARY";
        opened = file.open("r");
        if (!opened) return "Unavailable (cannot read source project)";
        return aetoolkitCepParseProjectColor(file.read(), xml);
    } catch (error) { return "Unavailable: " + error.message; }
    finally { if (opened) file.close(); }
}

function aetoolkitCepParseProjectColor(data, xml) {
    var mode = "", profile = "", cpid = "", payload = "", match, p, size, tag, previous = "";
    if (xml) {
        if (data.indexOf("<AfterEffectsProject") === -1) throw new Error("Not an AE XML project.");
        // Restrict inspection to project settings, before metadata and footage records.
        var boundary = data.indexOf("<ProjectXMPMetadata");
        if (boundary < 0) throw new Error("Unsupported project settings layout.");
        var header = data.substring(0, boundary);
        match = /<pcms\s+bdata="([a-fA-F0-9]+)"\s*\/>/.exec(header); mode = match ? match[1] : "";
        match = /<cpid\s+bdata="([a-fA-F0-9]+)"\s*\/>/.exec(header); cpid = match ? match[1].toLowerCase() : "";
        match = /<PwCs\s+bdata="[a-fA-F0-9]+"\s*\/>\s*<string>([\s\S]*?)<\/string>/.exec(header);
        if (match) payload = match[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    } else {
        if (data.substr(0, 4) !== "RIFX" || data.substr(8, 4) !== "Egg!") throw new Error("Unsupported AE project format.");
        function integer(at) { if (at + 4 > data.length) throw new Error("Truncated project."); return data.charCodeAt(at)*16777216 + data.charCodeAt(at+1)*65536 + data.charCodeAt(at+2)*256 + data.charCodeAt(at+3); }
        var projectEnd = integer(4) + 8;
        if (projectEnd > data.length) throw new Error("Truncated project.");
        function utf8(value) { var encoded="", i, hex; for(i=0;i<value.length;i++){hex=value.charCodeAt(i).toString(16);encoded+="%"+(hex.length<2?"0":"")+hex;}return decodeURIComponent(encoded); }
        for (p=12; p+8<=projectEnd; p+=8+size+size%2) {
            tag=data.substr(p,4);size=integer(p+4);
            if(p+8+size>projectEnd) throw new Error("Invalid project chunk.");
            if(tag==="pcms" && size===1) mode=data.charCodeAt(p+8)===1?"01":"other";
            if(tag==="cpid" && size===16) {cpid="";for(var i=0;i<16;i++){var h=data.charCodeAt(p+8+i).toString(16);cpid+=(h.length<2?"0":"")+h;}}
            if(tag==="Utf8" && previous==="PwCs") {payload=utf8(data.substr(p+8,size));break;}
            previous=tag;
        }
    }
    if(mode!=="01") throw new Error("Unsupported or OCIO project color settings.");
    if(!payload) throw new Error("Project working-space settings not found.");
    var settings=AEToolkitJSON.parse(payload);
    if(settings.baseColorProfile && settings.baseColorProfile.colorProfileName) return String(settings.baseColorProfile.colorProfileName);
    if(cpid==="ffffffffffffffffffffffffffffffff") return "None";
    throw new Error("Project working-space profile not found.");
}
