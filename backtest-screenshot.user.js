// ==UserScript==
// @name         Backtest - Screenshot
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Take automatically a screenshot for the backtest
// @author       Xiaodoudou
// @match        https://www.cryptohopper.com/backtesting
// @updateURL    https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/backtest-screenshot.user.js
// @downloadURL  https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/backtest-screenshot.user.js
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    class BacktestScreenshot {
        constructor() {
            this.addSetting()
            this.hookSuccess()
        }

        hookSuccess() {
            const screenshotSetting = document.querySelector('#screenshot')
            jQuery(document).ajaxComplete((event, jqXHR, ajaxOptions) => {
                if (screenshotSetting.checked && _.get(ajaxOptions, 'url') === '/siteapi.php?todo=getbacktestresult' && _.get(jqXHR, 'status') === 200) {
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
        }

        addSetting() {
            const target = jQuery("#custom_periodDiv_test").prev()
            const checkbox = jQuery(`<div class="form-group">
                <label class="col-md-2 control-label">Screenshot</label>
                <div class="col-md-10">
                    <input type="checkbox" class="js-switch" id="screenshot" checked />
                </div>
            </div>`)
            jQuery(target).after(checkbox)
            const screenshotSetting = document.querySelector('#screenshot')
            screenshotSetting.checked = GM_getValue("backtest-screenshot", false)
            screenshotSetting.onchange = () => GM_setValue("backtest-screenshot", screenshotSetting.checked)
            new Switchery(screenshotSetting, {
                color: "rgb(6, 204, 152)"
            })
        }
    }
    jQuery(document).ready(() => new BacktestScreenshot());
})();