// ==UserScript==
// @name         Always show Advanced TA Settings
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Xiaodoudou
// @match        https://www.cryptohopper.com/config
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    jQuery(() => {
        GM_addStyle(`
        #multiple_ta_advanced {
           display: block !important;
        }`);
    });
})();


