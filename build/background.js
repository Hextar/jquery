"use strict";
var settings = new Store("settings", {
    "preferFriendSummons": false,
    "preferNonFriendSummons": true,
    "preferLimitBrokenSummons": true,
    "preferHighLevelSummons": true,
    "notifyOnFullAP": false,
    "notifyOnFullBP": false,
    "showSkillCooldowns": true,
    "showDebuffTimers": true,
    "showBuffTimers": true,
    "monitorRaidDebuffs": true,
    "keyboardShortcuts": true,
    "showBookmarks": true,
    "preferredSummonElement": "",
    "submenuSize": 1.0,
    "bookmarksSize": 1.0,
    "bookmarksMenuSize": 1.0,
    "recentQuest": null,
    "showQuickPanels": true,
    "showGaugeOverlays": true,
    "openBookmarksOnClick": false,
    "fixJPFontRendering": true,
    "enableCoOpEnhancements": true,
    "dropdownFix": true,
    "disableMiddleRightClick": true,
    "statusPanel": true,
    "itemsPanel": true,
    "raidsPanel": false,
    "clockBrightness": 0.65,
    "oneClickQuickSummons": true,
    "bookmarksInactiveIcon": null,
    "bookmarksActiveIcon": null,
    "bookmarksIconPadding": 100,
    "horizontalBookmarks": false,
    "statusPanelBuffs": false,
    "statusPanelExpiringBuffs": true,
    "betterEnglishFont": false,
    "showItemWatchButtons": true,
    "showPartyNames": true,
    "filterEnemyTimers": true,
    "showPerformanceHud": false,
    "showNetworkHud": false,
    "showWeaponAttack": true,
    "showSkillActivationIndicator": true,
    "autofillBackupTweets": true,
    "moveCoOpFooter": true,
    "largeQuickPanels": false,
    "showPartyHelp": false,
    "keepSoundOnBlur": true,
    "stuckButtonWorkaround2": true,
    "showLastActionTimer": true,
    "smartSupports": true,
    "defaultToSmartSupports": false,
    "disablePhalanxSticker": true,
    "summonOrder": "{}",
    "password": "",
    "minimumPopupWait": 350,
    "maximumPopupWait": 1750,
    "focusQuickPanels": true
});
var failedUpdateMinimumDelay = 10 * 1000;
var minimumUpdateDelay = 60 * 4 * 1000;
var minimumRaidUpdateDelay = 30 * 1000;
var minimumItemUpdateDelay = 60 * 30 * 1000;
var minimumHaloUpdateDelay = 60 * 30 * 1000;
var secretKeysByTabId = {};
var lastFailure = -1;
var users = {};
var lastRaidCodes = {};
var isDead = true;
var isShutdown = false;
var lastLocation = null;
var idleRedirectPending = false;
var lastRedirectTarget = null;
var activatorTab;
chrome.runtime.onMessage.addListener(onRuntimeMessage);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.runtime.onInstalled.addListener(function () {
    var dc = chrome.declarativeContent;
    dc.onPageChanged.removeRules(undefined, function () {
        dc.onPageChanged.addRules([
            {
                conditions: [
                    new dc.PageStateMatcher({
                        pageUrl: { hostEquals: 'game.granbluefantasy.jp', schemes: ["https", "http"] },
                    }),
                    new dc.PageStateMatcher({
                        pageUrl: { hostEquals: 'gbf.game.mbga.jp', schemes: ["https", "http"] },
                    }),
                    new dc.PageStateMatcher({
                        pageUrl: { hostEquals: 'gbf-raidfinder.aikats.us', schemes: ["https", "http"] },
                    }),
                    new dc.PageStateMatcher({
                        pageUrl: { hostEquals: 'granblue-raidfinder.herokuapp.com', schemes: ["https", "http"] },
                    }),
                    new dc.PageStateMatcher({
                        pageUrl: { hostEquals: 'gbf-raidfinder.la-foret.me', schemes: ["https", "http"] },
                    })
                ],
                actions: [new dc.ShowPageAction()]
            }
        ]);
    });
});
log("Started");
function getAdjustedSettings() {
    var result = settings.toObject();
    result.allowDragSelect = false;
    // result.autoSkipToQuestResults = false;
    // result.oneClickQuickSummons = false;
    result.realtimeRaidList = false;
    // result.raidsPanel = false;
    // result.showQuickPanels = false;
    result.touchInputSupport = false;
    // Cygamesssssssssssssss
    result.autofillBackupTweets = false;
    return result;
}
;
function log(...args) {
    args.unshift((new Date()).toLocaleString() + " |");
    console.log.apply(console, args);
}
;
function getWatchedItems() {
    var result = JSON.parse(settings.get("watchedItems") || "[]");
    if ((result.length === 1) && (result[0] === null))
        result = [];
    return result;
}
;
function addWatchedItem(id) {
    var items = getWatchedItems();
    if (items.indexOf(id) >= 0)
        return items;
    if (!id)
        return items;
    items.push(id);
    settings.set("watchedItems", JSON.stringify(items));
    return items;
}
;
function removeWatchedItem(id) {
    var items = getWatchedItems();
    var index = items.indexOf(id);
    if (index < 0)
        return items;
    items.splice(index, 1);
    settings.set("watchedItems", JSON.stringify(items));
    return items;
}
;
function getFavedSummons() {
    var result = JSON.parse(settings.get("favedSummons") || "[]");
    if ((result.length === 1) && (result[0] === null))
        result = [];
    return result;
}
;
function addFavedSummon(id) {
    var items = getFavedSummons();
    if (items.indexOf(id) >= 0)
        return items;
    if (!id)
        return items;
    items.push(id);
    settings.set("favedSummons", JSON.stringify(items));
    return items;
}
;
function removeFavedSummon(id) {
    var items = getFavedSummons();
    var index = items.indexOf(id);
    if (index < 0)
        return items;
    items.splice(index, 1);
    settings.set("favedSummons", JSON.stringify(items));
    return items;
}
;
function getUserDict(uid) {
    var dict = users[uid];
    if (!dict)
        dict = users[uid] = { lastUpdate: [] };
    return dict;
}
;
function setUserData(uid, key, data) {
    var dict = getUserDict(uid);
    if (data) {
        dict.lastUpdate[key] = Date.now();
        dict[key] = data;
    }
    else {
        dict.lastUpdate[key] = 0;
        dict[key] = null;
    }
}
;
function getUserData(uid, key) {
    var dict = getUserDict(uid);
    return dict[key];
}
;
function getLastDataUpdate(uid, key) {
    var dict = getUserDict(uid);
    return dict.lastUpdate[key];
}
;
function formatItemCounters(uid) {
    var itemCounters = getUserDict(uid).itemCounters;
    if (!itemCounters)
        return null;
    var counterDict = {};
    for (var i = 0, l = itemCounters.length; i < l; i++) {
        var item = itemCounters[i];
        counterDict[item.item_id] = item;
    }
    return counterDict;
}
;
function goToGranblueTabAndRapidJoin(raidId) {
    console.log("doing something");
    var gbfTabId = -1;
    var url = "gbf.game.mbga.jp";
    var urls = ["gbf.game.mbga.jp","http://game.granbluefantasy.jp"];
    chrome.tabs.query({}, function (tabs) {
        if (tabs.length === 0) return;
        for (var i = 0; i < tabs.length; i++) {
            for(var j = 0; j < urls.length; j++) {
                if(tabs[i] != undefined) {
                    if(tabs[i].url != undefined) {
                        if (tabs[i].url.includes(urls[j])){
                            activatorTab = tabs[i];
                            gbfTabId = tabs[i].id;
                        }
                    }
                }

            }
        }
        if (gbfTabId >= 0) {
            chrome.tabs.update(gbfTabId, {selected: true});
            rapidJoinRaid(raidId);
        } else return;
    });
}
;
function rapidJoinRaid(raidId) {
    console.log("2. We're now doing shit bro " + raidId);
    var payload = { special_token: null, battle_key: raidId };
    var msg = {
        type: "doGameAjax",
        url: "/quest/battle_key_check",
        data: JSON.stringify(payload),
        tabId: activatorTab.id
    };
    doGameAjax(msg, activatorTab.id, null, function (result) {
        console.log("4. Battle key check returned", result);
        if (result) {
            if (result.redirect) {
                console.log("5. request redirect ",result.redirect);
                actuallySendMessage({type: "doGameRedirect",url: result.redirect,tabId: activatorTab.id},activatorTab.id);
            }
            else if ((typeof (result.current_battle_point) === "number") && !result.battle_point_check) {
                console.log("5. BP needed");
                tellWhyRapidJoinFailed({title: "Battle",body: "You don't have enought BP"});
                var statusText = result.chapter_name + " @ ";
                statusText += result.member_count + "people " + result.boss_hp_width + "% Hp";
                window.open("/../src/popup/popup.html", "extension_popup", "width=400,height=300,status=no,scrollbars=yes,resizable=no");
                actuallySendMessage({ type: "getUserIdAndTabId", tabId: activatorTab.id },activatorTab.id,function (uid) {
                    var userDict = getUserDict(uid);
                    getStatus(userDict,{ type: "getStatus", tabId: activatorTab.id, uid: uid, force: true }, function (status) {
                        console.log("5.2 No berries faggot", status);
                        var useCount = Math.min(result.used_battle_point, result.used_battle_point - status.bp);
                            //useNormalItemCallback(5, useCount, function () {
                                // always use the current raid id in case it changes due to the focus changing
                                //rapidJoinRaid(raidId);
                            //});
                    });
                });
            }
            else if (result.idleTimeout) {
                tellWhyRapidJoinFailed({title: "Battle",body: "Server timeout"});
                console.log("Idle timeout");
            }
            else {
                if(result != null) tellWhyRapidJoinFailed(result.popup);
                else tellWhyRapidJoinFailed({title: "Battle",body: "Server error 1"});
                console.log("Failed to join raid");
            }
        }
        else {
            if(result != null) tellWhyRapidJoinFailed(result.popup);
            else tellWhyRapidJoinFailed({title: "Battle",body: "Server error 2"});
            console.log("Failed to join raid");
        }
    });
}
;
function tellWhyRapidJoinFailed(msg) {
    var timer = null;
    var opt = {
      type: "basic",
      title: msg.title,
      message: msg.body,
      iconUrl: "../../icons/active-128.png",
    };
    chrome.notifications.create("copied", opt, function(id){
        if(timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(function(){chrome.notifications.clear(id);}, 3000);
    });
}
;
function onRuntimeMessage(msg, sender, sendResponse) {
    if (chrome.runtime.lastError)
        log(chrome.runtime.lastError);
    var key = msg.type;
    var userDict;
    if (msg.uid)
        userDict = getUserDict(msg.uid);
    var tabId;
    if (sender.tab && sender.tab.id)
        tabId = sender.tab.id;
    else if (msg.tabId)
        tabId = msg.tabId;
    if (tabId <= 0) {
        log("Message has no tab id", key);
        return;
    }
    switch (key) {
        case "raidFinderItemClicked":
            console.log("1. Ho ricevuto richiesta di RapidJoin ", msg.type);
            goToGranblueTabAndRapidJoin(msg.message);
            break;
        case "raidItemClicked":
                return true;
            break;
        case "getUserIds":
            sendResponse(JSON.stringify(Object.keys(users)));
            break;
        case "setPassword":
            settings.set("password", msg.password);
            break;
        case "pleaseInjectStylesheets":
            injectStylesheetsIntoTab(sender);
            break;
        case "heartbeat":
            isDead = false;
            break;
        case "cancelSuspend":
            if (userDict.isSuspended)
                log("Canceling idle/maintenance suspend for " + msg.uid);
            userDict.isSuspended = false;
            lastFailure = -1;
            break;
        case "isShutdown":
            sendResponse(isShutdown);
            break;
        case "setCompatibility":
            var newState = (msg.state === false);
            if (newState !== isShutdown) {
                log("Compatibility shutdown state set to", newState);
                isShutdown = newState;
            }
            break;
        case "openNewTab":
            chrome.tabs.create({
                url: msg.url
            });
            break;
        case "getVersion":
            sendResponse(chrome.app.getDetails().version);
            break;
        case "setRecentCoOpHost":
            settings.set("recentCoOpHost", msg.data);
            break;
        case "getRecentCoOpHost":
            sendResponse(settings.get("recentCoOpHost") || null);
            break;
        case "setCurrentEvent":
            if (msg.href !== settings.get("currentEvent"))
                log("Event changed to '" + msg.href + "'");
            settings.set("currentEvent", msg.href);
            break;
        case "setCurrentGuildWar":
            if (msg.href !== settings.get("currentGuildWar"))
                log("Guild war changed to '" + msg.href + "'");
            settings.set("currentGuildWar", msg.href);
            break;
        case "getCurrentEvent":
            sendResponse(settings.get("currentEvent") || null);
            break;
        case "getCurrentGuildWar":
            sendResponse(settings.get("currentGuildWar") || null);
            break;
        case "setRecentQuest":
            settings.set("recentQuest", msg.url);
            break;
        case "getRecentQuest":
            sendResponse(settings.get("recentQuest") || null);
            break;
        case "setLastLocation":
            // FIXME: Track per-tab
            lastLocation = msg.url;
            break;
        case "setIdleRedirectPending":
            // FIXME: Track per-tab
            idleRedirectPending = msg.state;
            if (msg.url)
                lastRedirectTarget = msg.url;
            break;
        case "getLastLocation":
            sendResponse(lastLocation || null);
            break;
        case "getIdleRedirectInfo":
            if (idleRedirectPending) {
                sendResponse({ pending: true, location: lastLocation, lastRedirectTarget: lastRedirectTarget });
            }
            else {
                sendResponse({ pending: false });
            }
            break;
        case "getSettings":
            sendResponse(getAdjustedSettings());
            break;
        case "getRaidCode":
            sendResponse(lastRaidCodes[tabId]);
            break;
        case "updateRaidCode":
            lastRaidCodes[tabId] = msg.raidCode;
            break;
        case "getItemCounters":
            return maybeDoUpdate(userDict.nextCounterUpdate, minimumUpdateDelay, formatItemCounters, updateItemCounters, sendResponse, msg.force, tabId, msg.uid);
        case "updateItemCounters":
            userDict.nextCounterUpdate = Date.now() + minimumUpdateDelay;
            userDict.itemCounters = msg.counters;
            break;
        case "invalidateStatus":
            if (userDict.lastStatus)
                log("Status invalidated");
            userDict.nextStatusUpdate = 0;
            userDict.lastStatus = null;
            break;
        case "getStatus":
            var getLastStatus = function (uid) {
                var s = getUserDict(uid).lastStatus;
                if (s)
                    fixupStatus(s, uid);
                return s;
            };
            if (msg.lazy) {
                var lastStatus = getLastStatus(msg.uid);
                if (lastStatus) {
                    sendResponse(lastStatus);
                    return;
                }
                else {
                    // log("Lazy status update failed");
                }
            }
            return maybeDoUpdate(userDict.nextStatusUpdate, minimumUpdateDelay, getLastStatus, updateStatus, sendResponse, msg.force, tabId, msg.uid);
        case "updateStatus":
            handleNewStatus(msg.status, msg.uid);
            break;
        case "invalidateBuffs":
            userDict.nextGuildBuffUpdate = 0;
            userDict.nextPersonalBuffUpdate = 0;
            userDict.guildBuffs = null;
            userDict.personalBuffs = null;
            log("Buffs invalidated");
            break;
        case "updateGuildBuffs":
            userDict.lastGuildBuffUpdate = Date.now();
            userDict.nextGuildBuffUpdate = Date.now() + minimumUpdateDelay;
            userDict.guildBuffs = msg.buffs;
            break;
        case "updatePersonalBuffs":
            userDict.lastPersonalBuffUpdate = Date.now();
            userDict.nextPersonalBuffUpdate = Date.now() + minimumUpdateDelay;
            userDict.personalBuffs = msg.buffs;
            break;
        case "getNextRankRp":
            // if not force, don't actually update since this is a heavy call
            if (!msg.force) {
                if (userDict.nextNextRankRpUpdate) {
                    sendResponse(userDict.nextRankRp);
                    break;
                }
                sendResponse(null);
                break;
            }
            return maybeDoUpdate(userDict.nextNextRankRpUpdate, minimumUpdateDelay, function (uid) { return getUserDict(uid).nextRankRp; }, updateNextRankRp, sendResponse, msg.force, tabId, msg.uid);
        case "updateNextRankRp":
            userDict.nextNextRankRpUpdate = Date.now() + minimumUpdateDelay;
            userDict.nextRankRp = getRpToNextRank(msg.data);
            break;
        case "getRaids":
            return maybeDoUpdate(userDict.nextRaidUpdate, minimumRaidUpdateDelay, function (uid) { return getUserDict(uid).lastRaids; }, updateRaids, sendResponse, msg.force, tabId, msg.uid);
        case "invalidateRaids":
            if (msg.raids) {
                handleNewRaids(msg.raids, msg.uid);
            }
            else {
                if (userDict.lastRaids)
                    log("Raids invalidated");
                userDict.nextRaidUpdate = 0;
                userDict.lastRaids = null;
            }
            break;
        case "getItems":
            return maybeDoUpdate(userDict.nextItemUpdate, minimumItemUpdateDelay, function (uid) { return getUserDict(uid).lastItems; }, updateItems, sendResponse, msg.force, tabId, msg.uid);
        case "invalidateItems":
            if (msg.items) {
                handleNewItems(msg.items, msg.uid);
            }
            else {
                if (userDict.lastItems)
                    log("Items invalidated");
                userDict.nextItemUpdate = 0;
                userDict.lastItems = null;
            }
            break;
        case "getWatchedItems":
            sendResponse(getWatchedItems());
            break;
        case "setItemWatchState":
            if (msg.state)
                sendResponse(addWatchedItem(msg.id));
            else
                sendResponse(removeWatchedItem(msg.id));
            break;
        case "getFavedSummons":
            sendResponse(getFavedSummons());
            break;
        case "setSummonFaveState":
            if (msg.state)
                sendResponse(addFavedSummon(msg.id));
            else
                sendResponse(removeFavedSummon(msg.id));
            break;
        case "setSummonOrder":
            settings.set("summonOrder", msg.data);
            break;
        case "getIsDead":
            sendResponse(isDead);
            break;
        case "doGameAjax":
            doGameAjax(msg, tabId, msg.uid, sendResponse);
            // retain sendResponse
            return true;
        case "doGamePopup":
        case "doGameRedirect":
            actuallySendMessage(msg, tabId);
            break;
        case "getTabId":
            sendResponse(tabId);
            break;
        case "getUserIdAndTabId":
            msg.tabId = tabId;
            actuallySendMessage(msg, tabId, sendResponse);
            return true;
        case "getIsSuspended":
            sendResponse(!!userDict.isSuspended);
            return true;
        case "recordRewards":
            handleQuestRewards(msg);
            break;
        case "recordRaidInfo":
            handleRaidInfo(msg);
            break;
        case "registerSecretKey":
            secretKeysByTabId[tabId] = msg.key;
            break;
        case "actionStarted":
            userDict.lastActionStartedWhen = msg.when;
            userDict.lastActionId = msg.actionId;
            broadcastActionTimestamps(msg.uid, userDict);
            break;
        case "actionEnded":
            if (msg.succeeded) {
                userDict.lastSuccessfulActionStartedWhen =
                    userDict.lastActionStartedWhen;
            }
            if (userDict.lastActionId === msg.actionId) {
                if (msg.succeeded) {
                    userDict.lastSuccessfulActionId =
                        userDict.lastActionId;
                }
                else {
                    userDict.lastActionId = null;
                }
            }
            userDict.lastActionEndedWhen = msg.when;
            broadcastActionTimestamps(msg.uid, userDict);
            break;
        case "actionCompletedAnimation":
            // When an action's animation is complete, we disable
            //  the timer since the lockout is definitely over
            if (msg.actionId === userDict.lastActionId) {
                userDict.lastActionStartedWhen =
                    userDict.lastActionId = null;
                broadcastActionTimestamps(msg.uid, userDict);
            }
            break;
        case "getLastActionTimestamps":
            sendResponse(makeActionTimestamps(userDict));
            break;
        default:
            log("Unknown message " + key);
            sendResponse({ error: true });
            break;
    }
}
;
function broadcastActionTimestamps(uid, userDict) {
    var obj = makeActionTimestamps(userDict);
    var msg = {
        type: "actionTimestampsChanged",
        data: obj,
        uid: uid
    };
    chrome.tabs.query(
    // FIXME: Can we narrow this to granblue tabs without the 'tabs' permission?
    {}, function (tabs) {
        if (!tabs)
            return;
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            chrome.tabs.sendMessage(tab.id, msg);
            if (chrome.runtime.lastError)
                log(chrome.runtime.lastError);
        }
    });
}
;
function makeActionTimestamps(userDict) {
    return {
        actionId: userDict.lastActionId,
        successfulActionId: userDict.lastSuccessfulActionId,
        started: userDict.lastActionStartedWhen,
        successfulStarted: userDict.lastSuccessfulActionStartedWhen,
        ended: userDict.lastActionEndedWhen
    };
}
;
function handleQuestRewards(msg) {
    var userDict = getUserDict(msg.uid);
    if (!userDict.raids)
        return;
    var urlFragment = msg.url.substr(msg.url.lastIndexOf("/") + 1);
    urlFragment = urlFragment.substr(0, urlFragment.indexOf("?"));
    var raidId = parseInt(urlFragment);
    var questId = userDict.raids[raidId];
}
;
function handleRaidInfo(msg) {
    var userDict = getUserDict(msg.uid);
    if (!userDict.raids)
        userDict.raids = {};
    userDict.raids[msg.raidId] = msg.questId;
}
;
function parseTimeInMinutes(text) {
    var parts = text.split(/[\D]+/);
    var result = 0;
    for (var i = 0, len = Math.min(parts.length, 2); i < len; i++) {
        if (parts[i].length === 0) {
            break;
        }
        result = result * 60 + parseInt(parts[i]);
    }
    return result;
}
;
function estimateValue(truncated, maximum, timeRemaining, elapsedTimeMs, minutesPerUnit) {
    if (truncated >= maximum)
        return truncated;
    // HACK: Add 59 seconds to the remaining time since they round down the number of minutes
    timeRemaining += 59 / 60;
    var durationFromFull = maximum * minutesPerUnit;
    timeRemaining = Math.max(0, timeRemaining - (elapsedTimeMs / 60000));
    var fract = (timeRemaining / durationFromFull);
    fract = Math.max(0.0, Math.min(1.0, fract));
    var estimatedValue = maximum * (1.0 - fract);
    return estimatedValue;
}
;
function fixupStatus(status, uid) {
    if (!status)
        return status;
    var userDict = getUserDict(uid);
    // FIXME
    var lastUpdate = userDict.lastStatusUpdate;
    status._lastUpdate = lastUpdate;
    status._now = Date.now();
    var age = (status._now - status._lastUpdate);
    status._precise_ap = estimateValue(status.ap, parseInt(status.max_ap), parseTimeInMinutes(status.action_point_remain), age, 5);
    status._precise_bp = estimateValue(status.bp, parseInt(status.max_bp), parseTimeInMinutes(status.battle_point_remain), age, 10);
    status.buffs = [];
    if (userDict.guildBuffs) {
        // FIXME
        age = (status._now - userDict.lastGuildBuffUpdate);
        for (var i = 0, l = userDict.guildBuffs.length; i < l; i++) {
            var gb = userDict.guildBuffs[i];
            var timeRemaining = (parseTimeInMinutes(gb.time) * 60 * 1000) - age;
            if (timeRemaining <= 0)
                continue;
            status.buffs.push({
                comment: gb.comment,
                timeRemaining: timeRemaining,
                imageUrl: "http://game-a.granbluefantasy.jp/assets_en/img/sp/assets/item/support/support_" +
                    gb.image + "_" + gb.level + ".png"
            });
        }
    }
    if (userDict.personalBuffs) {
        // FIXME
        age = (status._now - userDict.lastPersonalBuffUpdate);
        for (var k in userDict.personalBuffs) {
            if (!userDict.personalBuffs.hasOwnProperty(k))
                continue;
            var pb = userDict.personalBuffs[k];
            var timeRemaining = (parseTimeInMinutes(pb.remain_time) * 60 * 1000) - age;
            if (timeRemaining <= 0)
                continue;
            status.buffs.push({
                comment: pb.name,
                timeRemaining: timeRemaining,
                imageUrl: "http://game-a.granbluefantasy.jp/assets_en/img/sp/assets/item/support/" +
                    pb.image_path + "_" + pb.level + ".png"
            });
        }
    }
    return status;
}
;
function handleNewStatus(status, uid) {
    if (!status) {
        log("Failed status update");
        return;
    }
    getUserDict(uid).lastStatus = status;
    getUserDict(uid).lastStatusUpdate = Date.now();
    getUserDict(uid).nextStatusUpdate = Date.now() + minimumUpdateDelay;
    var minutesUntilApRefill = parseTimeInMinutes(status.action_point_remain);
    var minutesUntilBpRefill = parseTimeInMinutes(status.battle_point_remain);
    if ((minutesUntilApRefill > 1) && settings.get("notifyOnFullAP"))
        chrome.alarms.create("apFull", { delayInMinutes: minutesUntilApRefill + 1 });
    else
        chrome.alarms.clear("apFull");
    if ((minutesUntilBpRefill > 1) && settings.get("notifyOnFullBP"))
        chrome.alarms.create("bpFull", { delayInMinutes: minutesUntilBpRefill + 1 });
    else
        chrome.alarms.clear("bpFull");
    // log("ap time", minutesUntilApRefill, "bp time", minutesUntilBpRefill);
}
;
function maybeDoUpdate(nextTime, minimumUpdateDelay, getValue, doUpdate, sendResponse, force, tabId, uid) {
    var shouldUpdate = false;
    var userDict = getUserDict(uid);
    var now = Date.now();
    if (!nextTime)
        shouldUpdate = true;
    else if (now >= nextTime)
        shouldUpdate = true;
    else if (force)
        shouldUpdate = true;
    if ((now - lastFailure) < failedUpdateMinimumDelay) {
        log("Rate-limiting update due to failure");
        shouldUpdate = false;
    }
    if (userDict.isSuspended &&
        shouldUpdate) {
        log("Rejecting update request due to idle timeout");
        sendResponse(null);
        return false;
    }
    if (!userDict.inFlightRequests)
        userDict.inFlightRequests = {};
    var requestName = doUpdate.name;
    var ifr = userDict.inFlightRequests[requestName];
    if (ifr) {
        var elapsed = now - ifr.startedWhen.getTime();
        if (elapsed >= 30000) {
            log("Request of type '" + requestName + "' in-flight since " + ifr.startedWhen.toLocaleString() + "; that's too long, so we're going again anyway.");
        }
        else {
            log("Request of type '" + requestName + "' in-flight since " + ifr.startedWhen.toLocaleString() + "; waiting for it.");
            ifr.then(function (result) {
                log("In-flight '" + requestName + "' request completed with value", result);
                sendResponse(result);
            });
            return true;
        }
    }
    if (shouldUpdate) {
        var pr = new PromiseResolver();
        pr.promise.startedWhen = new Date();
        userDict.inFlightRequests[requestName] = pr.promise;
        doUpdate(tabId, uid, function (_uid) {
            var response = getValue(_uid);
            delete userDict.inFlightRequests[requestName];
            sendResponse(response);
            pr.resolve(response);
        });
        return true;
    }
    else {
        sendResponse(getValue(uid));
        return false;
    }
}
;
    function doGameRedirect(url) {
    var msg = {
        type: "doGameRedirect",
        url: url,
        tabId: activatorTab.id
    };
    chrome.runtime.sendMessage(msg);
    if (chrome.runtime.lastError)
        console.log(chrome.runtime.lastError);
}
;
function doGameAjax(msg, tabId, uid, callback) {
    /*
    if (Math.random() < 0.33) {
        console.log("Injecting error for request", msg);
        callback(null, "fake error");
        return;
    }
    */
    actuallySendMessage(msg, tabId, function (bundle) {
        if (!bundle) {
            callback({ error: true }, "no response");
            return;
        }
        var response = bundle[0];
        var error = bundle[1];
        var url = bundle[2];
        if (chrome.runtime.lastError) {
            isDead = true;
            log(chrome.runtime.lastError);
        }
        else {
            isDead = false;
        }
        if (error) {
            if (error.indexOf("-- abort") >= 0) {
                log("xhr aborted", url);
            }
            else {
                log("Error from server", error, url);
                lastFailure = Date.now();
            }
        }
        if (typeof (response) === "string") {
            try {
                response = JSON.parse(response);
            }
            catch (exc) {
            }
        }
        if (isIdleTimeoutRedirect(response)) {
            handleIdleTimeout(uid);
            callback({ idleTimeout: true }, error);
        }
        else if (isMaintenanceRedirect(response)) {
            handleMaintenance(uid);
            callback({ maintenance: true }, error);
        }
        else {
            callback(response, error);
        }
    });
}
;
function isIdleTimeoutRedirect(jsonBody) {
    if (jsonBody &&
        jsonBody.redirect &&
        (jsonBody.redirect.indexOf("top") >= 0))
        return true;
    return false;
}
;
function isMaintenanceRedirect(jsonBody) {
    if (jsonBody &&
        jsonBody.redirect &&
        (jsonBody.redirect.indexOf("maintenance") >= 0))
        return true;
    return false;
}
;
function handleIdleTimeout(uid) {
    log("Idle timeout");
    getUserDict(uid).isSuspended = true;
    lastFailure = Date.now() + 5000;
}
;
function handleMaintenance(uid) {
    log("Maintenance");
    getUserDict(uid).isSuspended = true;
    lastFailure = Date.now() + 5000;
}
;
function updateStatus(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/user/status"
    };
    // log("Triggering status update");
    doGameAjax(msg, tabId, uid, function (result) {
        getUserDict(uid).nextStatusUpdate = Date.now() + minimumUpdateDelay;
        if (!result) {
            log("Status update failed");
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("Status update failed: idle timeout");
            callback(uid);
        }
        else if (result.maintenance) {
            log("Status update failed: maintenance");
            callback(uid);
        }
        else {
            getUserDict(uid).lastStatusUpdate = Date.now();
            getUserDict(uid).lastStatus = result.status;
            // log("Status updated -> ", lastStatus);
            callback(uid);
        }
    });
}
;
function getRpToNextRank(data) {
    data = decodeURIComponent(data);
    /*
        Data is of the following form:
        [garbage]
        <div class="txt-next-value">Next ###Rankポイント</div>
        
        OR (depending on language)
        
        <div class="txt-next-value">Next lvl in ### Rank Points</div>
        [garbage]
    */
    var result = parseInt(data.replace(/^[^]*txt-next-value[\D]+([\d]+)[^]*$/, "$1"));
    // in case of something unexpected being passed in
    if (isNaN(result)) {
        return "?";
    }
    return result;
}
function updateNextRankRp(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/profile/content/index/" + uid
    };
    doGameAjax(msg, tabId, uid, function (result) {
        if (!result) {
            log("RP to next rank update failed");
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("RP to next rank update failed: idle timeout");
            callback(uid);
        }
        else {
            getUserDict(uid).lastNextRankRpUpdate = Date.now();
            getUserDict(uid).nextNextRankRpUpdate = Date.now() + minimumUpdateDelay;
            getUserDict(uid).nextRankRp = getRpToNextRank(result.data);
            callback(uid);
        }
    });
}
;
function getStrikeTime(data) {
    data = decodeURIComponent(data);
    /*
        Data is of the following form:
        [garbage]
        <div class="txt-next-value">Next ###Rankポイント</div>
        
        OR (depending on language)
        
        <div class="txt-next-value">Next lvl in ### Rank Points</div>
        [garbage]
    */
    /*
    var strikeTimes = [];
    var re = /\<div class="prt\-assault\-guildinfo"\>.*?\<div class="prt\-item\-status"\>(.*?)\<\/div/gms
    var m;
    while (m = re.exec(data)) {
        strikeTimes.push(m[1]);
    }

    log(strikeTimes);
    return strikeTimes;
    */
}
function updateStrikeTime(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/guild_main/content/index/"
    };
    doGameAjax(msg, tabId, uid, function (result) {
        if (!result) {
            log("Strike time update failed");
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("Strike time update failed: idle timeout");
            callback(uid);
        }
        else {
            getUserDict(uid).lastStrikeTimeUpdate = Date.now();
            getUserDict(uid).nextStrikeTimeUpdate = Date.now() + minimumUpdateDelay;
            getUserDict(uid).strikeTime = getStrikeTime(result.data);
            callback(uid);
        }
    });
}
;
function updateItemCounters(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/item/normal_item_list/1"
    };
    // log("Triggering counter update");
    doGameAjax(msg, tabId, uid, function (result) {
        if (!result) {
            log("Counter update failed");
            getUserDict(uid).nextCounterUpdate = Date.now() + minimumUpdateDelay;
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("Counter update failed: idle timeout");
            getUserDict(uid).nextCounterUpdate = Date.now() + minimumUpdateDelay;
            callback(uid);
        }
        else {
            getUserDict(uid).lastCounterUpdate = Date.now();
            getUserDict(uid).nextCounterUpdate = Date.now() + minimumItemUpdateDelay;
            getUserDict(uid).itemCounters = result;
            // log("Counters updated -> ", itemCounters);
            callback(uid);
        }
    });
}
;
function onAlarm(alarm) {
    log("Alarm '" + alarm.name + "' fired");
    if (alarm.name.indexOf("Full") >= 0) {
        var resourceName = alarm.name.replace("Full", "").toUpperCase();
        chrome.notifications.create({
            type: "basic",
            iconUrl: "../../icons/active-256.png",
            title: resourceName + " full",
            message: "Your Granblue Fantasy " + resourceName + " is full."
        });
        return;
    }
}
;
function actuallySendMessage(message, tabId, callback) {
    // *$!@)%KAKLMRSJ chrome garbage APIs
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message, callback);
    }
    else {
        log("No granblue tab found as target for message", message, tabId);
    }
}
;
function handleNewRaids(raids, uid) {
    if (!raids) {
        log("Failed raid update");
        return;
    }
    getUserDict(uid).lastRaids = raids;
    getUserDict(uid).lastRaidUpdate = Date.now();
    getUserDict(uid).nextRaidUpdate = Date.now() + minimumRaidUpdateDelay;
    // log("ap time", minutesUntilApRefill, "bp time", minutesUntilBpRefill);
}
;
function handleNewItems(items, uid) {
    if (!items) {
        log("Failed item update");
        return;
    }
    getUserDict(uid).lastItems = items;
    getUserDict(uid).lastItemUpdate = Date.now();
    getUserDict(uid).nextItemUpdate = Date.now() + minimumItemUpdateDelay;
    // log("ap time", minutesUntilApRefill, "bp time", minutesUntilBpRefill);
}
;
function updateRaids(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/quest/assist_list/0/1"
    };
    // log("Triggering status update");
    doGameAjax(msg, tabId, uid, function (result) {
        if (!result) {
            log("Raid update failed");
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("Raid update failed: idle timeout");
            lastFailure = Date.now() + 5000;
            callback(uid);
        }
        else if (result.maintenance) {
            log("Raid update failed: maintenance");
            lastFailure = Date.now() + 15000;
            callback(uid);
        }
        else {
            handleNewRaids(result, uid);
            callback(uid);
        }
    });
}
;
function updateItems(tabId, uid, callback) {
    var msg = {
        type: "doGameAjax",
        url: "/item/article_list/1"
    };
    // log("Triggering status update");
    doGameAjax(msg, tabId, uid, function (result) {
        if (!result) {
            log("Item update failed");
            callback(uid);
        }
        else if (result.idleTimeout) {
            log("Item update failed: idle timeout");
            lastFailure = Date.now() + 5000;
            callback(uid);
        }
        else if (result.maintenance) {
            log("Item update failed: maintenance");
            lastFailure = Date.now() + 15000;
            callback(uid);
        }
        else {
            handleNewItems(result, uid);
            callback(uid);
        }
    });
}
;
function injectStylesheetsIntoTab(sender) {
    var injectStylesheet = function (uri) {
        var cb = function () { };
        chrome.tabs.insertCSS(sender.tab.id, { file: uri, runAt: "document_start" }, cb);
    };
    // log(sender.tab.id, sender.url);
    var currentSettings = settings.toObject();
    injectStylesheet("/content/viramate.css");
    injectStylesheet("/css/watch-button.css");
    if (currentSettings.condensedUI)
        injectStylesheet("/css/condensed-ui.css");
    if ((navigator.userAgent.indexOf("Chrome/53.0") >= 0) ||
        (navigator.userAgent.indexOf("Chrome/54.0") >= 0) ||
        (navigator.userAgent.indexOf("Chrome/55.0") >= 0) ||
        (navigator.userAgent.indexOf("Chrome/56.0") >= 0) ||
        (navigator.userAgent.indexOf("Chrome/57.0") >= 0) ||
        (navigator.userAgent.indexOf("Chrome/58.0") >= 0))
        injectStylesheet("/css/chrome-53.css");
    if (currentSettings.betterEnglishFont) {
        injectStylesheet("/content/lato-woff.css");
        injectStylesheet("/css/lato.css");
    }
    if (currentSettings.showGaugeOverlays)
        injectStylesheet("/content/gauge-overlays.css");
    if (currentSettings.showQuickPanels)
        injectStylesheet("/css/quick-panels.css");
    if (currentSettings.moveCoOpFooter)
        injectStylesheet("/css/move-coop-footer.css");
    if (currentSettings.enableCoOpEnhancements)
        injectStylesheet("/css/coop.css");
    if (currentSettings.smartSupports)
        injectStylesheet("/css/smart-supports.css");
    if (currentSettings.singlePageStickers)
        injectStylesheet("/css/single-page-stickers.css");
    if (currentSettings.keyboardShortcuts2)
        injectStylesheet("/css/keyboard.css");
    if (currentSettings.permanentTurnCounter)
        injectStylesheet("/css/permanent-turn-counter.css");
    if (currentSettings.disablePerCharacterOugiSkip)
        injectStylesheet("/css/per-character-ougi-skip.css");
    // chrome.tabs.insertCSS(tabId, {code: "body{border:1px solid red}"});
}
;
//# sourceMappingURL=background.js.map