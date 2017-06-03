/*********************/

var TESTING = true;

var FIX_HEADER = "mdl-layout mdl-layout--fixed-header";
var CLASS_NAME = "gbfrf-column mdl-shadow--2dp";
var TARGET = "div.gbfrf-tweet__raid-id";

var UNDEF = 'undefined';
var DIV = "DIV";
var LI = "LI";
var ID_PATTERN = /([A-z0-9]{8})/;
var LUMINIERA = "Lvl 75 Luminiera";
var HUANGLONG = "Lvl 100 Huanglong";
var NOW = "now";
var raidid = "";

var SAFETY_LOCK = (getURLParameter('instajoin') != "") ? false : true;
var MAX = (getURLParameter('max') != "") ? getURLParameter('max') : 1;
var SEARCH = getURLParameter('instajoin');
var SEARCH_RARE = getURLParameter('rare');

//console.API;

var cl = function(ev){
  var str = ev.target.classList.toString();
  if (typeof ev == UNDEF) {
    //console.log("No raid item found.");
    return;
  }
  else if(ev.target.nodeName == DIV
    && ev.path[4].className == FIX_HEADER) {
    if(str.indexOf(TARGET)) {
      raidid = ev.target.innerText; 
      joinRaid(ev);
    }
  }
}

var ij = function(ev){
  if (typeof ev == UNDEF) {
    //console.log("No raid item found.");
    return;
  }
  else if(ev.target.nodeName == LI
    && ev.path[4].className == CLASS_NAME
    && (ev.path[4].innerText.toLowerCase().indexOf(SEARCH) >= 0)) {

    var obj = ev.target.children;
    async(function() {
      while(obj.length<=0);
      if((obj)[0].innerText.indexOf(NOW) >= 0) {
        raidid = (obj)[1].innerText;
        if(!SAFETY_LOCK && MAX > 0) {
          joinRaid(ev);
          if(MAX-- < 0) SAFETY_LOCK = true;
        }
      }
    }, null);
  }
  else if(ev.target.nodeName == LI
    && ev.path[4].className == CLASS_NAME
    && (ev.path[4].innerText.toLowerCase().indexOf(SEARCH_RARE) >= 0)) {

    var obj = ev.target.children;
    async(function() {
      while(obj.length<=0);
      if((obj)[0].innerText.indexOf(NOW) >= 0) {
        raidid = (obj)[1].innerText;
        joinRaid(ev);
        SAFETY_LOCK = true;
      }
    }, null);
  }
}

function joinRaid(ev) {
  //console.API.clear();
  console.log(ev);
  var TYPE = "raidFinderItemClicked";
  var messageTitle = "Ferry is best waifu";
  if(ID_PATTERN.exec(raidid)) {
      chrome.runtime.sendMessage({type: TYPE, title: messageTitle, message: raidid}, function(){});
      ev.stopPropagation();
      ev.preventDefault();
      return false;
    }
}

document.addEventListener('click', cl);
document.addEventListener("DOMNodeInserted", ij, true);
 
function async(your_function, callback) {
    setTimeout(function() {
        your_function();
        if (callback) {callback();}
    }, 0);
}

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

if (typeof console._commandLineAPI !== 'undefined') {
    console.API = console._commandLineAPI; //chrome
} else if (typeof console._inspectorCommandLineAPI !== 'undefined') {
    console.API = console._inspectorCommandLineAPI; //Safari
} else if (typeof console.clear !== 'undefined') {
    console.API = console;
}

function useHalfBerries() {
  var itemId = 5;
  var count = 5;
  var data = {
        item_id: String(itemId),
        num: count,
        special_token: null
    };
    console.log("Using item", data);
    doGameAjax("/item/use_normal_item", JSON.stringify(data), function (result) {
        console.log("Used item, response was", result);
        if (result &&
            (typeof (result.before) !== "undefined") &&
            (typeof (result.after) !== "undefined")) {
            successCallback(result);
        }
        else if (result && result.idleTimeout) {
            showModal("Idle timeout");
        }
        else {
            showModal("Failed to use item");
        }
    });
}
;
function doGameAjax(url, data, callback) {
    console.log("doGameAjax popup ", data)
    var msg = {
        type: "doGameAjax",
        url: url,
        data: data,
        tabId: activatorTab.id
    };
    chrome.runtime.sendMessage(msg, callback);
    if (chrome.runtime.lastError)
        console.log(chrome.runtime.lastError);
}
;