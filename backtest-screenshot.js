// ==UserScript==
// @name         Backtest - Screenshot
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Take automatically a screenshot for the backtest
// @author       You
// @match        https://www.cryptohopper.com/backtesting
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @match        https://www.cryptohopper.com/trade-history
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    jQuery(document).ajaxComplete((event, jqXHR, ajaxOptions) => {
        if (_.get(ajaxOptions, 'url') === '/siteapi.php?todo=getbacktestresult' && _.get(jqXHR, 'status') === 200) {
            const resultTarget = jQuery("#test_result_div").parent().parent()[0];
             setTimeout(async () => {
                try {
                    const canvas = await html2canvas(resultTarget, {
                        backgroundColor: _.includes(document.body.classList, 'nightmode') ? "rgb(48, 48, 84)" : "white",
                        windowWidth: 1700,
                        onclone: (html) => {
                            jQuery(html).find("button").parent().remove()
                        },
                        imageTimeout: 0
                    })
                    const link = document.createElement('a');
                    const strategy = _.kebabCase(jQuery("#select2-chosen-1").text())
                    const coin = _.kebabCase($("#coin_test").val())
                    link.download = `backtest-${strategy}-${coin}-${moment().format("DD-MM-YYYY--HH-mm-ss")}.png`
                    link.href = canvas.toDataURL("image/png");
                    link.click()
                } catch (error) {
                    console.error('Failed to generate png:', error)
                }
             }, 350)
        }
    });
})();