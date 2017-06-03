"use strict";
var _loadExternalScript = function (window) {
    "use strict";
    var context = window.parent;
    var port = null;
    var channelSetup = null;
    var bhstatic = "//127.0.0.1/bhstatic";
    var console = window["console"];
    var moduleIds = [];
    var pendingMessages = [];
    var logRemotingActive = false;
    var isShutdown = false;
    var resignedToBloodshed = false;
    var secretToken;
    var sentHeartbeat = false;
    var flipsville = false;
    var NoSettings = Object.create(null), currentSettings = NoSettings;
    var waitingForSettings = [];
    var lastVmInput = 0;
    var inputWindow = 5000;
    channelSetup = function (evt) {
        if (evt.data.type !== "vmInit")
            return;
        bhstatic = evt.data.bhstatic;
        moduleIds = evt.data.moduleIds;
        secretToken = (Math.random() * 1024000) | 0;
        port = evt.ports[0];
        port.onmessage = onWindowMessage;
        port.postMessage({ type: "vmHello", secretToken: secretToken });
        window.removeEventListener("message", channelSetup, true);
        for (var i = 0, l = pendingMessages.length; i < l; i++)
            port.postMessage(pendingMessages[i]);
        pendingMessages.length = 0;
        evt.preventDefault();
        evt.stopImmediatePropagation();
        log("External channel established");
    };
    window.addEventListener("message", channelSetup, true);
    function log(...args) {
        try {
            if (!logRemotingActive) {
                if (typeof (args[0]) === "string")
                    args[0] = "vms> " + args[0];
                else
                    args.unshift("vms>");
                return console.log.apply(console, args);
            }
            var evt = {
                type: "externalLog",
                args: args
            };
            for (var i = 0, l = args.length; i < l; i++) {
                switch (typeof args[i]) {
                    case "number":
                        break;
                    case "string":
                        args[i] = JSON.stringify(args[i]);
                        break;
                    default:
                        if (Array.isArray(args[i])) {
                            args[i] = "Array(" + String(args[i]) + ")";
                        }
                        else {
                            args[i] = "<" + String(args[i]) + ">";
                        }
                        break;
                }
            }
            sendMessage(evt);
        }
        catch (exc) {
            // :-(
        }
    }
    ;
    function sendMessage(msg) {
        if (port)
            port.postMessage(msg);
        else
            pendingMessages.push(msg);
    }
    ;
    var setTimeout_original = context.setTimeout;
    var setInterval_original = context.setInterval;
    var RAF_original = context.requestAnimationFrame;
    var isLagWorkaroundActive = false;
    var isPerformanceStatsActive = false;
    var targetFrameInterval = 1000 / 60;
    var resetThreshold = 100;
    var lastFrameTimestamp = null, lastFrameWallTimestamp = null;
    var queuedFrameCallbacks = [];
    var rafCallbackPending = false;
    var rafCallback = function (timestamp) {
        rafCallbackPending = false;
        if (isLagWorkaroundActive)
            return;
        try {
            frameDispatcher(timestamp);
        }
        catch (exc) {
        }
    };
    var lastFrameWhen = null;
    var frameIntervalHandle = null;
    var lagWorkaroundCallback = function () {
        if (!isLagWorkaroundActive) {
            if (frameIntervalHandle !== null) {
                clearInterval(frameIntervalHandle);
                frameIntervalHandle = null;
            }
            return;
        }
        var now = performance.now();
        var targetFrameTime, elapsed;
        try {
            if (lastFrameWhen == null) {
                lastFrameWhen = now;
                targetFrameTime = now;
            }
            else {
                targetFrameTime = lastFrameWhen + targetFrameInterval;
                elapsed = now - lastFrameWhen;
                if (elapsed < 0)
                    lastFrameWhen = now;
            }
            if (now >= targetFrameTime) {
                frameDispatcher(targetFrameTime);
                lastFrameWhen = targetFrameTime;
                now = performance.now();
            }
            if (elapsed >= resetThreshold)
                lastFrameWhen = now;
        }
        catch (exc) {
        }
        if (frameIntervalHandle === null)
            frameIntervalHandle = setInterval(lagWorkaroundCallback, 1);
    };
    lastFrameWhen = null;
    var frameDispatcher = function (timestamp) {
        var now = performance.now();
        var elapsed, elapsedWallClock;
        if (lastFrameTimestamp !== null) {
            elapsed = timestamp - lastFrameTimestamp;
            // Don't freak out if we stop getting frames for a while.
            if (elapsed > 2000)
                elapsed = targetFrameInterval;
        }
        else
            elapsed = targetFrameInterval;
        if (lastFrameWallTimestamp != null) {
            elapsedWallClock = now - lastFrameWallTimestamp;
            if (elapsedWallClock > 2000)
                elapsedWallClock = targetFrameInterval;
        }
        else
            elapsedWallClock = targetFrameInterval;
        // TODO: Frameskip
        var qfc = queuedFrameCallbacks;
        queuedFrameCallbacks = [];
        var callbacksStarted = performance.now();
        for (var i = 0, l = qfc.length; i < l; i++) {
            var callback = qfc[i];
            if (!callback)
                continue;
            try {
                callback(timestamp);
            }
            catch (exc) {
                log("Unhandled error in raf callback", exc.stack);
            }
        }
        var callbacksEnded = performance.now();
        if (isPushGameStatusEnabled)
            pushGameStatus();
        var pgsEnded = performance.now();
        var callbacksElapsed = callbacksEnded - callbacksStarted;
        var pgsElapsed = pgsEnded - callbacksEnded;
        if ((qfc.length > 0) || isPushGameStatusEnabled) {
            sendMessage({
                type: "frameStats",
                lastFrameTimestamp: lastFrameTimestamp,
                timestamp: timestamp,
                timeSinceLastFrame: elapsed,
                realTimeSinceLastFrame: elapsedWallClock,
                callbackDuration: callbacksElapsed,
                pgsDuration: pgsElapsed
            });
        }
        lastFrameTimestamp = timestamp;
        lastFrameWallTimestamp = now;
    };
    frameDispatcher.toString = function () { return ""; };
    var blacklistCache = new WeakMap();
    function isCallerBlacklisted(callback) {
        if (!callback)
            return true;
        var result = blacklistCache.get(callback);
        if (typeof (result) === "boolean")
            return result;
        var stack = (new Error()).stack;
        result = (stack.indexOf("platform.twitter.com") >= 0);
        blacklistCache.set(callback, result);
        return result;
    }
    ;
    var newRAF = function requestAnimationFrame(callback) {
        var result;
        if (isCallerBlacklisted(callback))
            return RAF_original.call(context, callback);
        if (!isPerformanceStatsActive && !isLagWorkaroundActive) {
            result = RAF_original.call(context, callback);
            if (isPushGameStatusEnabled)
                RAF_original.call(context, pushGameStatus);
            return result;
        }
        result = queuedFrameCallbacks.length;
        queuedFrameCallbacks.push(callback);
        if (isLagWorkaroundActive) {
            if (frameIntervalHandle === null)
                frameIntervalHandle = setInterval(lagWorkaroundCallback, 1);
        }
        else if (!rafCallbackPending) {
            if (frameIntervalHandle !== null) {
                clearInterval(frameIntervalHandle);
                frameIntervalHandle = null;
            }
            rafCallbackPending = true;
            RAF_original.call(context, rafCallback);
        }
        return result;
    };
    newRAF.toString = function toString() {
        return RAF_original.toString();
    };
    var isTickCache = new WeakMap();
    var wrappedCallbackCache = new WeakMap();
    function wrapCallbackWithPushGameStatus(callback) {
        var result = wrappedCallbackCache.get(callback);
        if (!result) {
            result = function () {
                callback.apply(this, arguments);
                if (isPushGameStatusEnabled)
                    pushGameStatus();
            };
            result.toString = function toString() {
                return callback.toString();
            };
            wrappedCallbackCache.set(callback, result);
        }
        return result;
    }
    ;
    var newSetTimeout = function setTimeout(callback, timeout) {
        var isTick = false;
        if (isPushGameStatusEnabled) {
            try {
                if ((timeout > 41) && (timeout < 42)) {
                    isTick = isTickCache.get(callback);
                    if (typeof (isTick) !== "boolean") {
                        var stack = (new Error()).stack;
                        isTick = stack.indexOf("._setupTick") >= 0;
                        isTickCache.set(callback, isTick);
                    }
                }
                if (isTick) {
                    var result = setTimeout_original.apply(context, arguments);
                    setTimeout_original.call(context, pushGameStatus, timeout);
                    return result;
                }
            }
            catch (exc) {
            }
        }
        return setTimeout_original.apply(context, arguments);
    };
    newSetTimeout.toString = function toString() {
        return setTimeout_original.toString();
    };
    var newSetInterval = function setInterval(callback, interval) {
        try {
            if (interval === 33) {
                var stack = (new Error()).stack;
                if ((stack.indexOf("raid/setup.js") >= 0) &&
                    (stack.indexOf("addEventListener") >= 0)) {
                    callback = wrapCallbackWithPushGameStatus(callback);
                }
            }
        }
        catch (exc) {
        }
        return setInterval_original.apply(context, arguments);
    };
    newSetInterval.toString = function toString() {
        return setInterval_original.toString();
    };
    context.requestAnimationFrame = newRAF;
    context.webkitRequestAnimationFrame = newRAF;
    context.setTimeout = newSetTimeout;
    context.setInterval = newSetInterval;
    var WebSocket_original = context.WebSocket;
    // Intercept web socket construction so we can snoop on messages
    // This allows us to find out when other players do stuff in raids
    var newWebSocket = function WebSocket() {
        var gluedArguments = Array.prototype.concat.apply([null], arguments);
        var boundConstructor = Function.prototype.bind.apply(WebSocket_original, gluedArguments);
        sendMessage({ type: 'webSocketCreated' });
        var result = new boundConstructor();
        result.addEventListener("message", function (evt) {
            sendMessage({ type: 'webSocketMessageReceived', data: evt.data });
        }, true);
        return result;
    };
    for (var k in WebSocket_original) {
        if (!WebSocket_original.hasOwnProperty(k))
            continue;
        var v = WebSocket_original[k];
        // console.log(k, v);
        newWebSocket[k] = v;
    }
    newWebSocket.toString = function toString() {
        return WebSocket_original.toString();
    };
    newWebSocket.prototype = WebSocket_original.prototype;
    newWebSocket.prototype.constructor = newWebSocket;
    context.WebSocket = newWebSocket;
    var document_addEventListener = context.Document.prototype.addEventListener;
    var element_addEventListener = context.Element.prototype.addEventListener;
    var filterMouseEvents = false;
    var lastMouseDownEvent = null;
    var lastMouseDownEventIsFiltered = false;
    var snoopedEvents = [
        "mousedown", "mousemove", "mouseup", "click",
        "touchstart", "touchend", "touchmove", "touchcancel"
    ];
    var swipeSuppressClasses = ["lis-ability"];
    var transferredEventPropertyNames = [
        "screenX", "screenY", "clientX", "clientY",
        "pageX", "pageY", "offsetX", "offsetY", "x", "y"
    ];
    function findElementAncestorWithClass(elt, classNames) {
        while (elt) {
            for (var i = 0, l = classNames.length; i < l; i++) {
                var className = classNames[i];
                if (elt.className.indexOf(className) >= 0)
                    return elt;
            }
            elt = elt.parentElement;
        }
        return null;
    }
    ;
    function transferProperty(src, dest, name) {
        Object.defineProperty(dest, name, {
            value: src[name]
        });
    }
    ;
    function looseElementComparison(a, b, classNames) {
        var aa = findElementAncestorWithClass(a, classNames);
        var ba = findElementAncestorWithClass(b, classNames);
        return aa && ba && (aa == ba);
    }
    ;
    function wrapMouseEventListener(type, listener) {
        if (!listener.apply) {
            // wtf cygames
            return listener;
        }
        switch (type) {
            /*
            case "touchstart":
                return function filterTouchStart (evt) {
                    // FIXME
                    if (filterMouseEvents)
                    try {
                        lastMouseDownEvent = evt;
                        lastMouseDownEventIsFiltered = !!findElementAncestorWithClass(evt.target, swipeSuppressClasses);
                        if (lastMouseDownEventIsFiltered)
                            return;
                    } catch (exc) {
                    }

                    return listener.apply(this, arguments);
                };

            case "touchmove":
            case "touchend":
            case "touchcancel":
                return function filterMouseMove (evt) {
                    try {
                        if (
                            lastMouseDownEvent &&
                            looseElementComparison(evt.target, lastMouseDownEvent.target, swipeSuppressClasses) &&
                            (
                                lastMouseDownEventIsFiltered ||
                                findElementAncestorWithClass(evt.target, swipeSuppressClasses)
                            )
                        ) {
                            return;
                        }
                    } catch (exc) {
                    }

                    return listener.apply(this, arguments);
                };
            */
            case "mousedown":
                return function filterMouseDown(evt) {
                    if (filterMouseEvents)
                        try {
                            lastMouseDownEvent = evt;
                            lastMouseDownEventIsFiltered = !!findElementAncestorWithClass(evt.target, swipeSuppressClasses);
                        }
                        catch (exc) {
                        }
                    return listener.apply(this, arguments);
                };
            case "mousemove":
                return function filterMouseMove(evt) {
                    if (filterMouseEvents)
                        try {
                            if ((evt.buttons !== 0) &&
                                lastMouseDownEvent &&
                                (lastMouseDownEventIsFiltered &&
                                    findElementAncestorWithClass(evt.target, swipeSuppressClasses))) {
                                // log("filtered mousemove");
                                return;
                            }
                        }
                        catch (exc) {
                        }
                    return listener.apply(this, arguments);
                };
            case "mouseup":
                return function filterMouseUp(evt) {
                    if (filterMouseEvents)
                        try {
                            if (lastMouseDownEvent &&
                                looseElementComparison(evt.target, lastMouseDownEvent.target, swipeSuppressClasses) &&
                                (lastMouseDownEventIsFiltered &&
                                    findElementAncestorWithClass(evt.target, swipeSuppressClasses))) {
                                // log("filtered mouseup");
                                for (var i = 0, l = transferredEventPropertyNames.length; i < l; i++)
                                    transferProperty(lastMouseDownEvent, evt, transferredEventPropertyNames[i]);
                                Object.defineProperty(evt, "movementX", { value: 0 });
                                Object.defineProperty(evt, "movementY", { value: 0 });
                            }
                        }
                        catch (exc) {
                        }
                    return listener.apply(this, arguments);
                };
        }
        return listener;
    }
    ;
    context.Document.prototype.addEventListener = function (type, _listener, options) {
        var listener = _listener;
        try {
            if (snoopedEvents.indexOf(type) >= 0)
                listener = wrapMouseEventListener(type, _listener);
        }
        catch (exc) {
        }
        var result = document_addEventListener.call(this, type, listener, options);
        // log("document", type, listener);
        return result;
    };
    context.Element.prototype.addEventListener = function (type, _listener, options) {
        var listener = _listener;
        try {
            if (snoopedEvents.indexOf(type) >= 0)
                listener = wrapMouseEventListener(type, _listener);
        }
        catch (exc) {
        }
        var result = element_addEventListener.call(this, type, listener, options);
        // log(name, type, listener);
        return result;
    };
    context.Document.prototype.addEventListener.toString = function () {
        return document_addEventListener.toString();
    };
    context.Element.prototype.addEventListener.toString = function () {
        return element_addEventListener.toString();
    };
    var XHR = context.XMLHttpRequest;
    var open_original = XHR.prototype.open;
    var send_original = XHR.prototype.send;
    var addEventListener_original = XHR.prototype.addEventListener;
    var setRequestHeader_original = XHR.prototype.setRequestHeader;
    var doResultFiltering = true;
    var xhrStateTable = new WeakMap();
    function getXhrState(xhr) {
        var result = xhrStateTable.get(xhr);
        if (!result) {
            result = {};
            xhrStateTable.set(xhr, result);
        }
        if (!result.readyStateListeners)
            result.readyStateListeners = [];
        return result;
    }
    ;
    var validTableKeys = [1002, 1003, 4001];
    function tryPreprocessXhr(xhr, state) {
        if (state.url.indexOf(atob("L29iLw==")) >= 0) {
            var obj = JSON.parse(state.data);
            if (obj.c[4001] && !sentHeartbeat) {
                for (var key in obj.c) {
                    if (validTableKeys.indexOf(Number(key)) < 0) {
                        log("Removing " + key + " from ob");
                        delete obj.c[key];
                    }
                }
                state.data = JSON.stringify(obj);
                sentHeartbeat = true;
            }
            else {
                log("Squelched");
                state.url = bhstatic;
                state.noHeaders = true;
                open_original.call(xhr, state.method, state.url, state.async);
            }
        }
        else if (state.url.indexOf(atob("Z2MvZ2M=")) >= 0) {
            var obj = JSON.parse(state.data);
            for (var key in obj.c) {
                if (validTableKeys.indexOf(Number(key)) < 0) {
                    log("Removing " + key + " from gc/gc");
                    delete obj.c[key];
                }
            }
            state.data = JSON.stringify(obj);
        }
        else if (state.url.indexOf(atob("ZXJyb3IvanM=")) >= 0) {
            log("Squelched");
            state.url = bhstatic;
            state.noHeaders = true;
            open_original.call(xhr, state.method, state.url, state.async);
        }
    }
    ;
    var customOnReadyStateChange = function () {
        try {
            var state = getXhrState(this);
            if (this.readyState == XHR.HEADERS_RECEIVED)
                state.headersReceived = performance.now();
            else if ((this.readyState == XHR.LOADING) && (state.loadingStarted <= 0))
                state.loadingStarted = performance.now();
            else if (this.readyState == XHR.DONE) {
                // HACK: This *should* always happen before 'load' is fired,
                //  allowing us to replace the result
                state.onComplete.call(this, state);
            }
        }
        catch (exc) {
            log(exc);
        }
        try {
            if (doResultFiltering) {
                for (var i = 0, l = state.readyStateListeners.length; i < l; i++) {
                    try {
                        state.readyStateListeners[i].apply(this, arguments);
                    }
                    catch (exc) {
                        log(exc);
                    }
                }
            }
        }
        catch (exc) {
            log(exc);
        }
    };
    function customOnComplete(state) {
        if (state.done)
            return;
        state.done = performance.now();
        state.result = this.response || this.responseText;
        state.response = this.response;
        state.responseType = this.responseType;
        if ((state.responseType === "") || (state.responseType === "text"))
            state.responseText = this.responseText;
        state.status = this.status;
        state.statusText = this.statusText;
        state.contentType = this.getResponseHeader('content-type');
        if (state.noHeaders) {
            var grh_original = this.getResponseHeader;
            var grh = function () {
                return;
            };
            grh.toString = function () {
                return grh_original.toString();
            };
            Object.defineProperty(this, "getResponseHeader", { value: grh });
        }
        if (state.resultFilter) {
            var didFilter = state.resultFilter.call(this, state);
            if (didFilter) {
                Object.defineProperty(this, "response", { value: state.response });
                Object.defineProperty(this, "responseText", { value: state.responseText });
                Object.defineProperty(this, "responseType", { value: state.responseType });
                Object.defineProperty(this, "status", { value: state.status });
                Object.defineProperty(this, "statusText", { value: state.statusText });
            }
        }
        afterAjax(state);
    }
    ;
    XHR.prototype.open = function open(method, url, async, user, password) {
        try {
            var state = getXhrState(this);
            state.method = method;
            state.url = url;
            state.async = async;
            state.opened = performance.now();
            state.loadingStarted = 0;
            state.headersReceived = 0;
            state.custom = false;
            addEventListener_original.call(this, "readystatechange", customOnReadyStateChange, false);
        }
        catch (exc) {
            log(exc);
        }
        var result = open_original.apply(this, arguments);
        return result;
    };
    XHR.prototype.addEventListener = function addEventListener(eventName, listener, useCapture) {
        try {
            var state = getXhrState(this);
            if (doResultFiltering &&
                (eventName === "readystatechange")) {
                state.readyStateListeners.push(listener);
                // console.log("xhr.addEventListener captured", eventName, listener);
                return true;
            }
        }
        catch (exc) {
            log(exc);
        }
        var result = addEventListener_original.apply(this, arguments);
        return result;
    };
    XHR.prototype.send = function send(data) {
        try {
            var state = getXhrState(this);
            state.sent = performance.now();
            state.data = data;
            state.onComplete = customOnComplete;
            state.resultFilter = pickResultFilter(state);
            tryPreprocessXhr(this, state);
            beforeAjax(state.url, state.data, this, context.Game.userId);
        }
        catch (exc) {
            log(exc);
        }
        if (state.custom) {
            try {
                state.sendResult = send_original.call(this, state.data);
            }
            catch (exc) {
                log(exc);
            }
        }
        else {
            state.sendResult = send_original.call(this, state.data);
        }
        try {
            if (!state.async)
                customOnComplete.call(this, state);
        }
        catch (exc) {
            log(exc);
        }
        return state.sendResult;
    };
    XHR.prototype.open.toString = function toString() {
        return open_original.toString();
    };
    XHR.prototype.setRequestHeader.toString = function toString() {
        return setRequestHeader_original.toString();
    };
    XHR.prototype.addEventListener.toString = function toString() {
        return addEventListener_original.toString();
    };
    XHR.prototype.send.toString = function toString() {
        return send_original.toString();
    };
    function pickResultFilter(state) {
        if ((state.url.indexOf("ability_result.json") >= 0) ||
            (state.url.indexOf("summon_result.json") >= 0) ||
            (state.url.indexOf("normal_attack_result.json") >= 0)) {
            if (resignedToBloodshed)
                return filter_actionResult;
            else if (flipsville)
                return filter_drop;
        }
        if (!resignedToBloodshed)
            return null;
        if (state.url.indexOf("start.json") >= 0) {
            return filter_start;
        }
        if ((state.url.indexOf("/condition/") >= 0) &&
            (state.url.indexOf(".json") >= 0)) {
            return filter_conditionList;
        }
        return null;
    }
    ;
    /*
    var missTypes = {
        1: "Miss",
        2: "Guard",
        3: "No Effect"
    };
    */
    var silencedAbilities = {
        // Hin Liechten
        "428": "1044",
        // Grausam
        "459": null,
        // Butterfly Effect
        "531": "1410",
        // Rose Barrier
        // FIXME
        "564": null,
        // Fulmine Blanco
        "1984": null,
        // Awakenings
        "211": null,
        // Revelation +
        "760": null,
        // Gate of Sin
        "999": "1104",
        // Redouble
        "5802": null,
    };
    // HACK: Player-equipped ex/zenith skills don't have constant IDs
    //  when sent to the server, they're addressed using virtual IDs.
    // So we have to use the names...
    var silencedAbilityNames = {
        "Double Trouble III": "1044",
        "デュアルインパルスIII": "1044",
        "Concludere": null,
        "High Voltage": null,
        "Call of the Abyss": "1044"
    };
    function filter_abilityScenarioEntry(data, s, temp) {
        var id = data.ability_id;
        var silenced = (id in silencedAbilities)
            || (temp.abilityName in silencedAbilityNames);
        if (!temp.preservedMessage)
            temp.preservedMessage = [];
        switch (s.cmd) {
            case "ability":
                temp.abilityName = s.name;
                break;
            case "message":
                if (!silenced)
                    return;
                if (!s.list)
                    return;
                if (temp.abilityName) {
                    for (var i = 0, l = s.list.length; i < l; i++) {
                        var elt = s.list[i];
                        if (temp.preservedMessage[elt.pos]) {
                            s.list.splice(i, 1);
                            i--;
                            l--;
                        }
                        else {
                            if (silencedAbilities[id] !== null)
                                elt.status = silencedAbilities[id];
                            else if (silencedAbilityNames[temp.abilityName] !== null)
                                elt.status = silencedAbilityNames[temp.abilityName];
                            elt.text = temp.abilityName;
                            temp.preservedMessage[elt.pos] = true;
                        }
                    }
                    return true;
                }
                break;
        }
        return;
    }
    ;
    function filterConditionList(buffs) {
        if (!buffs)
            return;
        var phalanx = buffs.find(function (elt) {
            return (elt.status === "1019_0_70");
        });
        var athena = buffs.find(function (elt) {
            return (elt.status === "1019_0_30");
        });
        if (phalanx && athena) {
            phalanx.status = "1019_0_100";
            if (phalanx.name)
                phalanx.name = "100% DMG Cut";
            if (phalanx.detail)
                phalanx.detail = "Athena and Phalanx active";
            buffs.splice(buffs.indexOf(athena), 1);
        }
    }
    ;
    function filter_start(state) {
        var result = JSON.parse(state.result);
        var param = result.player.param;
        for (var k in param)
            filterConditionList(param[k].condition.buff);
        param = result.boss.param;
        for (var k in param)
            filterConditionList(param[k].condition.buff);
        state.response =
            state.responseText =
                JSON.stringify(result);
        return true;
    }
    ;
    function filter_conditionList(state) {
        var result = JSON.parse(state.result);
        if (!result)
            return false;
        if (result.condition)
            filterConditionList(result.condition.buff);
        state.response =
            state.responseText =
                JSON.stringify(result);
        return true;
    }
    ;
    function removeDuplicates(list) {
        var previous = null;
        for (var i = 0, l = list.length; i < l; i++) {
            var item = list[i];
            // HACK :(
            var current = JSON.stringify(item);
            if (current === previous) {
                list.splice(i, 1);
                i--;
                l--;
            }
            previous = current;
        }
    }
    ;
    function filter_drop(state) {
        var original = JSON.parse(state.result);
        var result = null;
        var data = state.data;
        if (typeof (data) === "string")
            data = JSON.parse(data);
        var scenario = original.scenario;
        var changed = false;
        if (original && original.scenario) {
            for (var i = 0, l = scenario.length; i < l; i++) {
                var s = scenario[i];
                if (!s)
                    continue;
                switch (s.cmd) {
                    case "drop": {
                        if (flipsville) {
                            s.get = [10, 10, 10, 10, 10, 10, 10];
                            changed = true;
                        }
                        break;
                    }
                }
            }
            if (changed)
                result = original;
        }
        if (result) {
            state.response =
                state.responseText =
                    JSON.stringify(result);
            return true;
        }
        return false;
    }
    ;
    function filter_actionResult(state) {
        var original = JSON.parse(state.result);
        var result = null;
        var data = state.data;
        if (typeof (data) === "string")
            data = JSON.parse(data);
        var scenario = original.scenario;
        var changed = false;
        var lastConditionUpdate = {};
        var lastFailureMessage = {};
        var messageCounts = {};
        var temp = {};
        var shiftPlayerStatus = state.url.indexOf("normal_attack") < 0;
        var collapsePlayerDebuffs = state.url.indexOf("normal_attack") >= 0;
        if (original && original.scenario) {
            for (var i = 0, l = scenario.length; i < l; i++) {
                var s = scenario[i];
                if (!s)
                    continue;
                if (data && data.ability_id) {
                    var filterResult = filter_abilityScenarioEntry(data, s, temp);
                    if (filterResult) {
                        changed = true;
                        if (s.list && s.list.length === 0) {
                            scenario.splice(i, 1);
                            i--;
                            l--;
                        }
                    }
                    if (typeof (filterResult) !== "undefined")
                        continue;
                }
                switch (s.cmd) {
                    case "drop": {
                        if (flipsville) {
                            s.get = [10, 10, 10, 10, 10, 10, 10];
                            changed = true;
                        }
                        break;
                    }
                    case "condition": {
                        filterConditionList(s.condition.buff);
                        if ((s.to !== "boss") && !shiftPlayerStatus)
                            continue;
                        // We kill intermediary condition updates but record the last one
                        //  that we saw for each individual enemy, so that we can shift it
                        //  forward to ensure icons update immediately instead of at the
                        //  end of debuff name animation
                        changed = true;
                        lastConditionUpdate[s.to + s.pos] = s;
                        scenario.splice(i, 1);
                        i--;
                        l--;
                        break;
                    }
                    case "message": {
                        if (s.to !== "boss") {
                            if (!collapsePlayerDebuffs)
                                continue;
                        }
                        var newLfm = null;
                        for (var j = 0, l2 = s.list.length; j < l2; j++) {
                            var item = s.list[j];
                            if (item.miss) {
                                // We record the last message from a failed debuff
                                //  so that if we ended up erasing the entire set of
                                //  debuff messages, we can restore it.
                                // FIXME: This has the downside that if 'miss' and 
                                //  'no effect' both happened we won't show both
                                // FIXME: s.to
                                lastFailureMessage[s.to + item.pos] = [s, item];
                                // log("Removed a message list item", item);
                                changed = true;
                                s.list.splice(j, 1);
                                j--;
                                l2--;
                            }
                            else {
                                // Some messages are just plain text descriptions of
                                //  a secondary effect. We shouldn't let those stop
                                //  us from preserving a 'miss' or 'no effect'
                                if (item.status) {
                                    messageCounts[s.to + item.pos] = (messageCounts[s.to + item.pos] | 0) + 1;
                                }
                            }
                        }
                        if (s.list.length === 0) {
                            // log("Removed a message entry after making it empty");
                            scenario.splice(i, 1);
                            i--;
                            l--;
                            break;
                        }
                        break;
                    }
                }
            }
            for (var k in lastFailureMessage) {
                var mc = messageCounts[k];
                // A debuff message was preserved so there's no need to show 'miss' or
                //  'no effect', the player can infer that some of them failed by their
                //  nonpresence
                if (mc > 0)
                    continue;
                var lfm = lastFailureMessage[k];
                if (!lfm)
                    continue;
                // log("Ability failed completely so failure message was restored");
                if (lfm[0].list.indexOf(lfm[1]) < 0)
                    lfm[0].list.push(lfm[1]);
                if (scenario.indexOf(lfm[0]) < 0)
                    scenario.push(lfm[0]);
            }
            for (var k in lastConditionUpdate) {
                var lcu = lastConditionUpdate[k];
                if (!lcu)
                    continue;
                scenario.unshift(lcu);
            }
            if (changed)
                result = original;
        }
        if (result) {
            state.response =
                state.responseText =
                    JSON.stringify(result);
            return true;
        }
        return false;
    }
    ;
    function isCombatPage(hash) {
        // FIXME: More prefixes
        return hash.startsWith("#raid/") ||
            hash.startsWith("#raid_multi/") ||
            hash.startsWith("#raid_semi/");
    }
    ;
    var gameStatusMessage = {};
    var gameStatusEnemies = [];
    var gameStatusParty = [];
    var gameStatusCharacterIds = [];
    var isPushGameStatusEnabled = true;
    context.addEventListener("hashchange", schedulePushGameStatus, false);
    schedulePushGameStatus();
    function schedulePushGameStatus() {
        isPushGameStatusEnabled = true;
    }
    ;
    function pushGameStatusInner() {
        if (!context["stage"])
            return;
        var stage = context.stage;
        var gs = stage.gGameStatus;
        if (!gs)
            return;
        var enemies = gameStatusEnemies;
        var party = gameStatusParty;
        var characterIds = gameStatusCharacterIds;
        enemies.length = 0;
        party.length = 0;
        var conditions;
        for (var i = 0, l = gs.boss.param.length; i < l; i++) {
            var enemy = gs.boss.param[i];
            conditions = [];
            var cl = stage.gEnemyStatus[i].condition;
            if (cl)
                cl = cl.conditions;
            if (cl)
                for (var j = 0, l2 = cl.length; j < l2; j++)
                    conditions.push(cl[j].status);
            var enemyObj = {
                id: Number(enemy.enemy_id),
                name: enemy.name,
                cjs: enemy.cjs,
                hp: Number(enemy.hp),
                hpMax: Number(enemy.hpmax),
                recast: Number(enemy.recast),
                recastMax: Number(enemy.recastmax),
                conditions: conditions,
                mode: gs.bossmode.looks.mode[i],
                gauge: gs.bossmode.looks.gauge[i],
                hasModeGauge: enemy.modeflag
            };
            enemies.push(enemyObj);
        }
        for (var i = 0, l = gs.player.param.length; i < l; i++) {
            var player = gs.player.param[i];
            if (!player)
                continue;
            var buffs = [];
            var debuffs = [];
            if (player.condition) {
                if (player.condition.buff)
                    for (var j = 0; j < player.condition.buff.length; j++)
                        buffs.push(player.condition.buff[j].status);
                if (player.condition.debuff)
                    for (var j = 0; j < player.condition.debuff.length; j++)
                        debuffs.push(player.condition.debuff[j].status);
            }
            var playerCondition = {
                ability_available_flag: !(player.condition.ability_available_flag === false),
                seal_flag: !!player.condition.seal_flag,
                recast_down_flag: !!player.condition.recast_down_flag,
                summon_available_flag: !!player.condition.summon_available_flag
            };
            var playerObj = {
                name: player.name,
                cjs: player.cjs,
                pid: player.pid,
                attr: Number(player.attr),
                alive: !!player.alive,
                leader: !!player.leader,
                hp: Number(player.hp),
                hpMax: Number(player.hpmax),
                ougi: Number(player.recast),
                ougiMax: Number(player.recastmax),
                buffs: buffs,
                debuffs: debuffs,
                condition: playerCondition
            };
            party.push(playerObj);
        }
        var state = gameStatusMessage;
        state.btn_lock = gs.btn_lock;
        state.lock = gs.lock;
        state.target = gs.target;
        state.attacking = gs.attacking;
        state.usingAbility = gs.usingAbility;
        state.finish = gs.finish;
        state.turn = gs.turn;
        state.auto_attack = gs.auto_attack;
        state.enemies = enemies;
        state.party = party;
        state.characterIds = characterIds;
        state.hasFieldEffect = gs.field.hasFieldEffect;
        if (stage && stage.gFieldCondition && stage.gFieldCondition.fieldConditionList)
            state.fieldEffectCount = stage.gFieldCondition.fieldConditionList.length;
        else
            state.fieldEffectCount = 0;
        state.skillQueue = gs.attackQueue.$useAbility.map(function (e) {
            if (typeof (e) === "string")
                return e;
            if (e[0] && (e[0].className.indexOf("btn-summon") >= 0))
                return "Summon";
            var elt = e[0].querySelector("div[ability-id]");
            if (elt)
                return "div." + elt.className.replace(/ /g, ".");
            // FIXME: ???
            return null;
        });
        if (stage.pJsnData) {
            var pjd = stage.pJsnData;
            state.summon_enable = pjd.summon_enable;
            state.raid_id = pjd.raid_id;
            state.is_multi = pjd.is_multi;
            state.is_semi = pjd.is_semi;
            state.is_defendorder = pjd.is_defendorder;
            state.is_coopraid = pjd.is_coopraid;
            if (pjd.twitter && pjd.is_allowed_to_requesting_assistance)
                state.raidCode = pjd.twitter.battle_id;
            if (pjd.multi_raid_member_info)
                state.player_count = pjd.multi_raid_member_info.length;
            var characterInfo = pjd.player.param;
            characterIds.length = characterInfo.length;
            for (var i = 0, l = characterInfo.length; i < l; i++) {
                var ci = characterInfo[i];
                characterIds[i] = ci.pid;
            }
        }
        sendMessage({
            type: 'stageTick',
            state: state
        });
    }
    ;
    function pushGameStatus() {
        try {
            if (isShutdown)
                return;
            var _isCombatPage = isCombatPage(context.location.hash);
            if (!_isCombatPage) {
                isPushGameStatusEnabled = false;
                return;
            }
            // HACK: Moving the body of the try block into a function lets v8 optimize it
            pushGameStatusInner();
        }
        catch (exc) {
            sendMessage({
                type: 'error',
                stack: exc.stack
            });
        }
    }
    ;
    function generateClick(target, asClick) {
        if (isShutdown)
            return;
        lastVmInput = Date.now();
        context.$(target).trigger(asClick ? "click" : "tap");
    }
    function manufactureEvent(currentTarget, target) {
        var evt = Object.create(null);
        evt.type = "tap";
        // FIXME
        evt.x = (Math.random() * 256) | 0;
        evt.y = (Math.random() * 256) | 0;
        evt.delegateTarget = context.document.querySelector("div.contents");
        evt.currentTarget = currentTarget;
        evt.target = target;
        evt.timestamp = Date.now();
        return evt;
    }
    function onWindowMessage(evt) {
        if (!evt.data.type)
            return;
        try {
            switch (evt.data.type) {
                case "click":
                    if (isShutdown)
                        return;
                    var name = evt.data.name;
                    var token = evt.data.token;
                    var tokenAttribute = evt.data.tokenAttribute;
                    var element = context.document.querySelector(name + "[" + tokenAttribute + "='" + token + "']");
                    if (element)
                        generateClick(element, evt.data.asClick);
                    return;
                case "trySelectSummon":
                    if (isShutdown)
                        return;
                    currentRaidView.CommandChangeSummon();
                    var pos = evt.data.pos;
                    var elt = context.document.querySelector('div.lis-summon[pos="' + pos + '"]');
                    if (!elt)
                        return;
                    var evt = manufactureEvent(elt, elt.querySelector("img"));
                    currentRaidView.popShowSummon(evt);
                    return;
                case "tryClickSummonUseButton":
                    if (isShutdown)
                        return;
                    var elt = context.document.querySelector('div.btn-usual-ok.btn-summon-use');
                    if (!elt)
                        return;
                    var evt = manufactureEvent(elt, elt);
                    currentRaidView.AddSummonAttackQueue(evt);
                    return;
                case "navigating":
                    if (remoteSocket)
                        remoteSocket.send(JSON.stringify(evt.data));
                    return;
                case "socketResult":
                    if (remoteSocket) {
                        evt.data.type = "result";
                        remoteSocket.send(JSON.stringify(evt.data));
                    }
                    return;
                case "sendToRemote":
                    if (remoteSocket)
                        remoteSocket.send(JSON.stringify(evt.data.data));
                    return;
                case "settingsChanged":
                    currentSettings = JSON.parse(evt.data.settings);
                    isLagWorkaroundActive = !!currentSettings.lagWorkaround;
                    isPerformanceStatsActive = (currentSettings.showPerformanceHud || currentSettings.lagWorkaround);
                    var wfs = waitingForSettings;
                    if (wfs.length) {
                        waitingForSettings = [];
                        for (var i = 0, l = wfs.length | 0; i < l; i++)
                            wfs[i](currentSettings);
                    }
                    filterMouseEvents = !!currentSettings.buttonSwipeFix;
                    return;
                case "it's my lucky day":
                    flipsville = true;
                    return;
                case "setResigned":
                    var wasResigned = resignedToBloodshed;
                    resignedToBloodshed = (evt.data.secretToken === secretToken);
                    if (resignedToBloodshed && !wasResigned)
                        maybeInitWebSocket();
                    return;
                case "tryConnect":
                    if (resignedToBloodshed)
                        maybeInitWebSocket();
                    return;
                case "enableLogRemoting":
                    logRemotingActive = true;
                    return;
                case "compatibilityShutdown":
                    doShutdown();
                    return;
                case "doAjax":
                    doAjaxInternal(evt.data);
                    return;
                case "doPopup":
                    var popupData = evt.data.data;
                    popupData.className = null;
                    popupData.okCallBackName = "popRemove";
                    popupData.cancelCallBackName = null;
                    popupData.exceptionFlag = false;
                    context.Game.view.trigger("popup_error", { data: popupData });
                    return;
                case "getUserIdAndTabId":
                    tryGetUserIdAndTabId(evt.data.token, evt.data.tabId);
                    return;
                case "maskShadow":
                    var elts = context.document.querySelectorAll(evt.data.selector);
                    for (var i = 0, l = elts.length | 0; i < l; i++) {
                        var elt = elts[i];
                        if (!elt.shadowRoot)
                            continue;
                        Object.defineProperty(elt, "shadowRoot", { value: null, writable: false, configurable: false, enumerable: true });
                    }
                    return;
                case "clearSkillQueue":
                    var queue = context.stage.gGameStatus.attackQueue;
                    if (queue.length <= 1) {
                        return;
                    }
                    var mappedQueue = queue.$useAbility.map(function (e) {
                        if (e === "NormalAttack") {
                            return e;
                        }
                        if (e[0] && (e[0].className.indexOf("summon") >= 0)) {
                            return "Summon";
                        }
                        return null;
                    });
                    // > 0 because we want to check whether they
                    //  are being cleared from the queue
                    if (mappedQueue.indexOf("NormalAttack") > 0) {
                        queue.attackButtonPushed = false;
                    }
                    if (mappedQueue.indexOf("Summon") > 0) {
                        queue.summonButtonPushed = false;
                    }
                    queue.$useAbility.splice(1);
                    queue.index.splice(1);
                    queue.param.splice(1);
                    queue.abilityRailUI.g.g.splice(2);
                    queue.abilityRailUI.gIconPaths.splice(1);
                    queue.abilityRailUI.icons.splice(1);
                    return;
            }
        }
        catch (exc) {
            sendMessage({
                type: 'error',
                stack: exc.stack
            });
        }
    }
    ;
    function doAjaxInternal(evtData) {
        if (isShutdown)
            return;
        var jquery = context["$"];
        if (!jquery) {
            setTimeout(function () {
                doAjaxInternal(evtData);
            }, 500);
            return;
        }
        var url = evtData.url;
        var token = evtData.token;
        var data = evtData.data;
        var callback = evtData.callback;
        if (!callback && !token)
            log("Invalid ajax request", evtData);
        var options = {};
        if (data) {
            options.data = data;
            options.method = "POST";
        }
        options.success = function (result) {
            if (callback)
                callback(url, result, null, false);
            else if (token)
                sendMessage({ type: 'doAjaxResult', url: url, token: token, result: result, error: null, failed: false });
        };
        options.error = function (jqXHR, exception) {
            if (callback)
                callback(url, null, jqXHR.status + " -- " + String(exception), true);
            else if (token)
                sendMessage({ type: 'doAjaxResult', url: url, token: token, error: jqXHR.status + " -- " + String(exception), failed: true });
        };
        jquery.ajax(url, options);
    }
    ;
    function beforeAjax(url, requestData, xhr, uid) {
        if (isShutdown)
            return;
        sendMessage({ type: 'ajaxBegin', url: url, requestData: requestData, uid });
    }
    ;
    function afterAjax(state) {
        if (isShutdown)
            return;
        // HACK: Don't forward response data for non-json bodies.
        // Otherwise, we end up sending a LOT of data over the message channel,
        //  which causes it to be cloned.
        var responseData = state.result;
        if (state.contentType &&
            (state.contentType.indexOf("application/json") < 0) &&
            (state.url.indexOf(".json") < 0)) {
            responseData = null;
        }
        else {
            // log("done", url, contentType, requestData);
        }
        sendMessage({
            type: 'ajaxComplete',
            url: state.url,
            requestData: state.data,
            responseData: responseData,
            contentType: state.contentType,
            status: state.status,
            duration: state.done - state.opened,
            delay: state.done - (state.loadingStarted || state.headersReceived || state.sent),
            uid: context.Game.userId
        });
    }
    ;
    function tryGetUserIdAndTabId(token, tabId) {
        if (!context.Game) {
            setTimeout(function () { tryGetUserIdAndTabId(token, tabId); }, 100);
            return;
        }
        sendMessage({
            type: "userIdAndTabId",
            token: token,
            uid: context.Game.userId,
            tabId: tabId
        });
    }
    ;
    var moduleHooks = {};
    moduleHooks["view/raid/setup"] = function (name) {
        var vrs = context.require("view/raid/setup");
        hookRaidView(vrs);
    };
    moduleHooks["view/popup"] = function (name) {
        // console.log(name);
        getSettingsAsync(hookPopup);
    };
    var currentRaidView = null;
    var original_initialize_raidView;
    function hookRaidView(ctor) {
        var p = ctor.prototype;
        original_initialize_raidView = p.initialize;
        p.initialize = function () {
            var result = original_initialize_raidView.apply(this, arguments);
            currentRaidView = result || this;
            return result;
        };
        p.initialize.toString = function () {
            return original_initialize_raidView.toString();
        };
    }
    ;
    var original_popShow, original_popClose, original_onPushOk;
    function getSettingsAsync(callback) {
        if (currentSettings !== NoSettings)
            callback(currentSettings);
        else
            waitingForSettings.push(callback);
    }
    ;
    function hookPopup(currentSettings) {
        if (!currentSettings.autoHidePopups)
            return;
        var popup = context.require("view/popup");
        var api = popup.prototype;
        original_popShow = api.popShow;
        api.popShow = hook_popShow;
        original_popClose = api.popClose;
        api.popClose = hook_popClose;
        original_onPushOk = api.onPushOk;
        api.onPushOk = hook_onPushOk;
        hook_popShow.toString = function () {
            return original_popShow.toString();
        };
        hook_popClose.toString = function () {
            return original_popClose.toString();
        };
        hook_onPushOk.toString = function () {
            return original_onPushOk.toString();
        };
    }
    ;
    var isAutoCloseInProgress = false;
    var abortAutoClose = null;
    function doAutoClose(a, b) {
        isAutoCloseInProgress = true;
        // log("Auto-closing popup");
        var mask;
        if (this.options.maskSubMenu)
            mask = context.document.querySelector("div.mask_submenu");
        else
            mask = context.document.querySelector("div.mask");
        mask.style.display = "none";
        var elt = this.el.querySelector("div");
        elt.className += " auto-hiding";
        var footer = elt.querySelector(".prt-popup-footer");
        if (footer)
            footer.style.display = "none";
        var body = elt.querySelector(".prt-popup-body");
        if (body)
            body.style.paddingBottom = "20px";
        var btn = context.$(elt).find(".btn-usual-ok");
        var startedWhen = performance.now();
        var minimumWait = currentSettings.minimumPopupWait;
        var maximumWait = currentSettings.maximumPopupWait;
        if (!minimumWait)
            minimumWait = 350;
        if (!maximumWait)
            maximumWait = 1750;
        var holdDuration = ((elt.innerHTML.trim().length * 0.225) +
            (elt.textContent.trim().length * 6) +
            minimumWait);
        if (holdDuration > maximumWait)
            holdDuration = maximumWait;
        if (this.options.className === "pop-trialbattle-notice")
            holdDuration = 250;
        var fadeDuration = 150;
        var fadeInterval;
        abortAutoClose = function () {
            abortAutoClose = null;
            isAutoCloseInProgress = false;
            window.clearInterval(fadeInterval);
        };
        var completeAutoClose = (function () {
            // FIXME: Why???
            btn.trigger("tap");
            elt.style.opacity = "0.0";
            elt.style.pointerEvents = "none";
            elt.className = elt.className.replace("pop-show", "pop-hide");
            elt.style.display = "none";
            abortAutoClose = null;
            isAutoCloseInProgress = false;
            window.clearInterval(fadeInterval);
            fadeInterval = null;
        }).bind(this);
        elt.addEventListener("click", completeAutoClose, true);
        var onFadeTick = (function () {
            try {
                var elapsed = performance.now() - startedWhen;
                var opacity = 1.0;
                if (elapsed <= holdDuration) {
                }
                else {
                    elapsed -= holdDuration;
                    opacity = Math.max(1.0 - (elapsed / fadeDuration), 0);
                    if (elapsed > fadeDuration)
                        completeAutoClose();
                }
                elt.style.opacity = opacity.toFixed(3);
            }
            catch (exc) {
                log(exc);
            }
        }).bind(this);
        fadeInterval = window.setInterval(onFadeTick, 33);
    }
    ;
    function hook_popShow(a, b) {
        try {
            // HACK: Kill the previous auto-closing popup first.
            if (abortAutoClose) {
                // log("An auto-close is in progress, making room for new popup");
                abortAutoClose();
            }
        }
        catch (exc) {
            log(exc);
        }
        var result = original_popShow.apply(this, arguments);
        try {
            if (!currentSettings.autoHidePopups)
                return;
            var opts = this.options;
            if (opts.className === "pop-trialbattle-notice") {
            }
            else {
                // No OK button
                if (!opts.flagBtnOk)
                    return;
                // Has close or cancel button(s)
                if (opts.flagBtnClose || opts.flagBtnCancel)
                    return;
                var divs = this.el.querySelectorAll("div");
                for (var i = 0, l = divs.length; i < l; i++) {
                    var div = divs[i];
                    if (div.className.indexOf("btn-usual-ok") >= 0)
                        continue;
                    // Lyria
                    if (div.className.indexOf("lyria-deformed") >= 0)
                        return;
                    // Has a button other than OK
                    if (div.className.startsWith("btn-"))
                        return;
                    // Quest info box with favorite button
                    if (div.className.indexOf("prt-bookmark-register") >= 0)
                        return;
                }
                // No standard OK button
                if (!this.el.querySelector(".btn-usual-ok"))
                    return;
            }
            // If an auto-close is already in progress we don't
            //  auto-close the new popup, so that mashing doesn't
            //  make the game explode.
            if (isAutoCloseInProgress)
                return;
            doAutoClose.call(this, a, b);
        }
        catch (exc) {
            log(exc);
        }
        finally {
            return result;
        }
    }
    ;
    function hook_popClose() {
        isAutoCloseInProgress = false;
        return original_popClose.apply(this, arguments);
    }
    ;
    function hook_onPushOk() {
        isAutoCloseInProgress = false;
        return original_onPushOk.apply(this, arguments);
    }
    ;
    var remoteSocket = null;
    var tickIsPending = false;
    var retryCount = 2;
    function maybeInitWebSocket() {
        if (remoteSocket) {
            if ((remoteSocket.readyState === WebSocket.CLOSING) ||
                (remoteSocket.readyState === WebSocket.CLOSED))
                remoteSocket = null;
            else
                return;
        }
        var interval = -1, wasConnected = false;
        remoteSocket = new WebSocket("ws://vm:vm@127.0.0.1:8677/socket/viramate");
        remoteSocket.addEventListener("open", function () {
            log("ws connected");
            interval = setInterval(tickWebSocket, 200);
            wasConnected = true;
            sendMessage({ type: "connectionStatusChanged", connected: true });
        });
        remoteSocket.addEventListener("close", function () {
            tickIsPending = false;
            if (wasConnected)
                log("ws disconnected");
            clearInterval(interval);
            wasConnected = false;
            interval = -1;
            sendMessage({ type: "connectionStatusChanged", connected: false });
        });
        remoteSocket.addEventListener("message", handleWebSocketMessage);
        remoteSocket.addEventListener("error", function (e) {
            tickIsPending = false;
            if (retryCount > 0) {
                log("ws connection failed, retrying", e);
                retryCount--;
                setTimeout(maybeInitWebSocket, 2000);
            }
        });
    }
    ;
    function tickWebSocket() {
        if (tickIsPending)
            return;
        tickIsPending = true;
        remoteSocket.send(JSON.stringify({
            type: "tick",
            url: context.location.href
        }));
    }
    ;
    var nextSocketToken = 1;
    var previousWindowTitle = null;
    function handleWebSocketMessage(evt) {
        var msg = JSON.parse(evt.data);
        var response = undefined;
        switch (msg.type) {
            case "hello":
                log("ws handshake from " + msg.s);
                break;
            case "pushWindowTitle":
                if (previousWindowTitle === null)
                    previousWindowTitle = context.document.title;
                context.document.title = msg.title;
                response = true;
                break;
            case "popWindowTitle":
                if (previousWindowTitle !== null)
                    context.document.title = previousWindowTitle;
                previousWindowTitle = null;
                response = true;
                break;
            case "tickOk":
                tickIsPending = false;
                break;
            case "navigate":
                if (msg.url)
                    context.location.href = msg.url;
                if (msg.reload) {
                    window.setTimeout(function () {
                        context.location.reload();
                    }, 200);
                }
                response = true;
                break;
            case "getCombatState":
                response = getCombatState();
                break;
            case "querySelectorAll":
                var elements = context.document.querySelectorAll(msg.selector);
                response = [];
                for (var i = 0, l = elements.length; i < l; i++) {
                    var elt = elements[i];
                    var obj = {
                        tagName: elt.tagName,
                        id: elt.id,
                        name: elt.name,
                        text: elt.innerText,
                        attributes: {},
                        classNames: Array.from(elt.classList)
                    };
                    for (var a = elt.attributes, j = 0; j < a.length; j++)
                        obj.attributes[a[j].name] = a[j].value;
                    if (msg.mark) {
                        if (elt.hasAttribute("token"))
                            obj.token = elt.getAttribute("token");
                        else
                            elt.setAttribute("token", obj.token = (nextSocketToken++).toString(16));
                    }
                    response.push(obj);
                }
                break;
            case "getElementRect":
                var element = context.document.querySelector(msg.selector);
                if (element) {
                    // The game container's zoom needs to be applied to the client rect
                    var gc = context.document.querySelector("div.mobage-game-container");
                    var computedStyle = context.getComputedStyle(gc);
                    var zoom = parseFloat(computedStyle.getPropertyValue("zoom"));
                    // Browser DPI also matters
                    var dpi = context.devicePixelRatio;
                    var ratio = zoom * dpi;
                    var pr = gc.getBoundingClientRect();
                    var cr = element.getBoundingClientRect();
                    // The client rect of the element has the container's native-res left/top added to it
                    // var offsetLeft = cr.left - pr.left;
                    // var offsetTop = cr.top - pr.top;                    
                    // Then we finally scale the element's (relative to container) size and offset by ratio
                    response = [
                        cr.left * ratio,
                        cr.top * ratio,
                        cr.width * ratio,
                        cr.height * ratio
                    ];
                }
                else {
                    response = [];
                }
                break;
            case "tryUseAbility":
                var className = "ability-character-num-" + msg.characterIndex + "-" + msg.abilityIndex;
                var icon = context.document.querySelector("div.prt-command-chara:not(.quick-panels) div." + className);
                if (!icon) {
                    response = "not found";
                    break;
                }
                var recast = icon.getAttribute("ability-recast");
                if (recast != 0) {
                    response = "on cooldown";
                    break;
                }
                if (icon.parentNode.className.indexOf("btn-ability-unavailable") >= 0) {
                    response = "disabled";
                    break;
                }
                generateClick(icon, false);
                response = "ok";
                break;
            case "tryClickElement":
                var element = context.document.querySelector(msg.selector);
                if (element) {
                    generateClick(element, false);
                    response = true;
                }
                else {
                    response = false;
                }
                break;
            case "trySetTarget":
                var element = context.document.querySelector("a.btn-targeting.enemy-" + msg.index);
                if (element) {
                    if (context.stage.gGameStatus.target !== msg.index)
                        generateClick(element, false);
                    response = true;
                }
                else {
                    response = false;
                }
                break;
            case "trySetOugiStatus":
                var element = context.document.querySelector("div.btn-lock");
                if (element) {
                    var isActive = context.stage.gGameStatus.lock === 0;
                    if (isActive !== msg.active)
                        generateClick(element, false);
                    response = true;
                }
                else {
                    response = false;
                }
                break;
            case "xhr":
                var xhrCallback = function (url, result, error, failed) {
                    remoteSocket.send(JSON.stringify({
                        type: "result",
                        id: msg.id,
                        result: {
                            url: url,
                            result: result,
                            error: error,
                            failed: failed
                        }
                    }));
                };
                doAjaxInternal({
                    url: msg.url,
                    data: msg.data,
                    callback: xhrCallback
                });
                break;
            case "waitForIdle":
                registerIdleWait(msg.id);
                break;
            default:
                sendMessage(msg);
                break;
        }
        if ((response !== undefined) && ("id" in msg)) {
            remoteSocket.send(JSON.stringify({
                type: "result",
                id: msg.id,
                result: response
            }));
        }
    }
    ;
    function canAct(gsm) {
        return !gsm.btn_lock &&
            !gsm.attacking &&
            !gsm.usingAbility &&
            !gsm.finish &&
            !!context.document.querySelector("div.btn-attack-start.display-on");
    }
    function getCombatState() {
        var response = gameStatusMessage;
        if (response) {
            response = JSON.parse(JSON.stringify(response));
            if (context.stage && context.stage.gGameStatus)
                response.skillQueue = context.stage.gGameStatus.attackQueue.$useAbility.map(function (e) {
                    if (typeof (e) === "string")
                        return e;
                    if (e[0] && (e[0].className.indexOf("btn-summon") >= 0))
                        return "Summon";
                    var elt = e[0].querySelector("div[ability-id]");
                    if (elt)
                        return elt.getAttribute("ability-id");
                    // FIXME: ???
                    return null;
                });
            else
                response.skillQueue = [];
            var elt = context.document.querySelector("div.prt-battle-num div.txt-info-num");
            if (elt && elt.firstChild) {
                response.currentBattle = parseInt(elt.firstChild.className.replace("num-info", ""));
                response.totalBattles = parseInt(elt.lastChild.className.replace("num-info", ""));
            }
            response.canAct = canAct(response);
        }
        return response;
    }
    function registerIdleWait(id) {
        var interval = -1;
        var initialUrl = context.location.href;
        var callback = function () {
            try {
                var cs = getCombatState();
                var isIdle = (cs.canAct ||
                    cs.finish) &&
                    ((cs.currentBattle === undefined) ||
                        (cs.currentBattle > 0)) &&
                    (cs.skillQueue.length < 1);
                if (!isCombatPage(context.location.hash))
                    isIdle = true;
                // HACK
                if (context.location.href !== initialUrl)
                    isIdle = true;
                if (isIdle && (interval >= 0)) {
                    clearInterval(interval);
                    interval = -1;
                    remoteSocket.send(JSON.stringify({
                        type: "result",
                        id: id,
                        result: gameStatusMessage.finish
                    }));
                }
            }
            catch (exc) {
                log(exc);
            }
        };
        interval = setInterval(callback, 50);
    }
    ;
    var actualDefine = undefined;
    var anonymousModule = null;
    function maybeHashModule(name, body) {
        if (!name)
            return;
        var moduleId = btoa(name.trim().toLowerCase());
        if (moduleIds.indexOf(moduleId) < 0)
            return;
        var hasher = new window.jsSHA("SHA-256", "TEXT");
        hasher.update(body);
        var hash = hasher.getHash("HEX");
        sendMessage({
            type: "moduleLoaded",
            id: moduleId,
            hash: hash
        });
    }
    ;
    var hook_onResourceLoad = function (context, map, depArray) {
        try {
            var name = map.name;
            var hook = moduleHooks[name];
            if (hook)
                hook(name);
        }
        catch (exc) {
        }
    };
    hook_onResourceLoad.toString = function () {
        return "function () {}";
    };
    var installRequireHook = function () {
        var rjs = context.requirejs;
        if (rjs.onResourceLoad)
            return;
        Object.defineProperty(rjs, "onResourceLoad", {
            enumerable: false,
            value: hook_onResourceLoad
        });
    };
    function processObjectModuleDefinition(name, dict) {
        var body = JSON.stringify(dict);
        maybeHashModule(name, body);
    }
    ;
    function processDependencyResolve(arr) {
    }
    ;
    function processFunctionModuleDefinition(name, fn) {
        var body = fn.toString();
        maybeHashModule(name, body);
    }
    ;
    function processModuleDefinition(args) {
        switch (args.length) {
            case 1:
                {
                    var arg = args[0];
                    var ta = typeof (arg);
                    if (ta === "object") {
                        if (Array.isArray(arg))
                            return processDependencyResolve(arg);
                        else
                            return processObjectModuleDefinition(null, arg);
                    }
                    else if (ta === "function") {
                        return processFunctionModuleDefinition(null, arg);
                    }
                }
                break;
            case 2:
                {
                    var arg0 = args[0];
                    var arg1 = args[1];
                    if (Array.isArray(arg0)) {
                        processDependencyResolve(arg0);
                        arg0 = anonymousModule;
                    }
                    if (typeof (arg1) === "function")
                        return processFunctionModuleDefinition(arg0, arg1);
                    else if (typeof (arg1) === "object")
                        return processObjectModuleDefinition(arg0, arg1);
                }
                break;
            case 3:
                {
                    var arg0 = args[0];
                    var arg1 = args[1];
                    var arg2 = args[2];
                    if (!arg0)
                        arg0 = anonymousModule;
                    if (Array.isArray(arg1))
                        processDependencyResolve(arg1);
                    if (typeof (arg2) === "function")
                        return processFunctionModuleDefinition(arg0, arg2);
                    else if (typeof (arg2) === "object")
                        return processObjectModuleDefinition(arg0, arg2);
                }
                break;
        }
    }
    ;
    var define = function define() {
        installRequireHook();
        var result = actualDefine.apply(this, arguments);
        try {
            if (!isShutdown)
                processModuleDefinition(Array.from(arguments));
        }
        catch (exc) {
            log("Error processing module definition", exc);
        }
        return result;
    };
    var set_define = function (value) {
        if (value)
            define.toString = value.toString.bind(value);
        actualDefine = value;
    };
    var get_define = function () {
        if (actualDefine)
            return define;
        else
            return actualDefine;
    };
    Object.defineProperty(context, "define", {
        enumerable: true,
        configurable: false,
        get: get_define,
        set: set_define
    });
    function doShutdown() {
        isShutdown = true;
        try {
            context.requestAnimationFrame = RAF_original;
            context.webkitRequestAnimationFrame = RAF_original;
            context.setTimeout = setTimeout_original;
            context.setInterval = setInterval_original;
            context.WebSocket = WebSocket_original;
            XHR.prototype.open = open_original;
            XHR.prototype.send = send_original;
            XHR.prototype.addEventListener = addEventListener_original;
            XHR.prototype.setRequestHeader = setRequestHeader_original;
            isLagWorkaroundActive = false;
            isPerformanceStatsActive = false;
            for (var i = 0, l = queuedFrameCallbacks.length; i < l; i++)
                context.requestAnimationFrame(queuedFrameCallbacks[i]);
        }
        catch (exc) {
            log("Error during shutdown", exc);
        }
        sendMessage({
            type: "shutdownOk"
        });
    }
    ;
};
//# sourceMappingURL=external.js.map