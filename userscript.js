// ==UserScript==
// @name         Telegraph Storage
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  uses Telegra.ph as storage
// @author       poma23324
// @include      https://telegra.ph/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=telegra.ph
// @require      https://cdn.jsdelivr.net/gh/roman-smolnyk/js-telegraph-storage@v0.0.5/telegraph.min.js
// @require      https://cdn.jsdelivr.net/gh/roman-smolnyk/js-telegraph-storage@v0.0.5/ciphers.min.js
// @require      https://cdn.jsdelivr.net/gh/roman-smolnyk/js-telegraph-storage@v0.0.5/telegraph_storage.min.js
// @grant        none
// ==/UserScript==

(async function () {
  "use strict";
  console.log("Telegraph");

  const telegraphStorage = new TelegraphStorage();

  window.telegraphStorage = telegraphStorage;
  await telegraphStorage.init();
  let accessToken = telegraphStorage.accessToken;
  console.log(accessToken);
  console.log(await telegraphStorage.list());
  await telegraphStorage.set("zebra", { hello: "world" });
  await telegraphStorage.get("zebra");

  console.log(await telegraphStorage.getForeign("Telegram-Themes-FAQ"));
})();
