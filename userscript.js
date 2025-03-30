// ==UserScript==
// @name         Telegraph
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add "Pinguin" button to download movie
// @author       poma23324
// @include      https://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=telegra.ph
// @grant        none
// ==/UserScript==


(async function () {
  "use strict";
  console.log("Telegraph");

  let storage = new TelegraphStorage();
  console.log(storage.telegraph.accessToken);
  console.log(await storage.list());
})();
