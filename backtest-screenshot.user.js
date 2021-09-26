// ==UserScript==
// @name         Backtest - Screenshot
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Take automatically a screenshot for the backtest
// @author       Xiaodoudou
// @match        https://www.cryptohopper.com/backtesting
// @updateURL    https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/backtest-screenshot.user.js
// @downloadURL  https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/backtest-screenshot.user.js
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';
    const $ = jQuery;

    class BacktestScreenshot {
        constructor() {
            this.addSetting()
            this.hookSuccess()
        }

        async waitFor(delay) {
            return new Promise(resolve => setTimeout(() => resolve(), delay))
        }

        hookSuccess() {
            const screenshotSetting = document.querySelector('#screenshot')
            $(document).ajaxComplete(async (event, jqXHR, ajaxOptions) => {
                if (screenshotSetting.checked && _.get(ajaxOptions, 'url') === '/siteapi.php?todo=getbacktestresult' && _.get(jqXHR, 'status') === 200) {
                    const resultTarget = $("#test_result_div").parent().parent()[0];
                    try {
                        await this.waitFor(350)
                        const canvas = await html2canvas(resultTarget, {
                            backgroundColor: _.includes(document.body.classList, 'nightmode') ? "rgb(48, 48, 84)" : "white",
                            windowWidth: 1700,
                            onclone: (html) => {
                                $(html).find("button").parent().remove()
                                const screenshotSettingDetails = document.querySelector('#include-details')
                                if (screenshotSettingDetails.checked) {
                                    $(html).find("#result_trades_div_test").find(".inbox-widget").removeClass("nicescroll mx-box")
                                } else {
                                    $(html).find("#result_trades_div_test").remove()
                                }
                                
                            },
                            imageTimeout: 0
                        })
                        const link = document.createElement('a');
                        const strategy = _.kebabCase($("#select2-chosen-1").text())
                        const coin = _.kebabCase($("#coin_test").val())
                        link.download = `backtest-${strategy}-${coin}-${moment().format("DD-MM-YYYY--HH-mm-ss")}.png`
                        link.href = canvas.toDataURL("image/png");
                        link.click()
                    } catch (error) {
                        console.error('Failed to generate png:', error)
                    }
                }
            });
        }

        toggleScreenshotDetail() {
            const screenshotSetting = document.querySelector('#screenshot')
            let screenshotSettingDetails = document.querySelector('#include-details')
            if (screenshotSetting.checked) {
                if (!screenshotSettingDetails) {
                    const target = $("#screenshot").parent().parent()
                    const checkbox = $(`<div class="form-group">
                        <label class="col-md-2 control-label">Include Details</label>
                        <div class="col-md-10">
                            <input type="checkbox" class="js-switch" id="include-details" checked />
                        </div>
                    </div>`)
                    $(target).after(checkbox)
                    screenshotSettingDetails = document.querySelector('#include-details')
                    screenshotSettingDetails.onchange = () => GM_setValue("backtest-include-details", screenshotSettingDetails.checked)
                    screenshotSettingDetails.checked = GM_getValue("backtest-include-details", false)
                    new Switchery(screenshotSettingDetails, { color: "rgb(6, 204, 152)" })
                }
            } else {
                if (screenshotSettingDetails) {
                    screenshotSettingDetails.parentElement.parentElement.remove()
                }
            }
           
        }

        addSetting() {
            const target = $("#trailing_buy_test").parent().parent()
            const checkbox = $(`<div class="form-group">
                <label class="col-md-2 control-label">Screenshot</label>
                <div class="col-md-10">
                    <input type="checkbox" class="js-switch" id="screenshot" checked />
                </div>
            </div>`)
            $(target).after(checkbox)
            const screenshotSetting = document.querySelector('#screenshot')
            screenshotSetting.checked = GM_getValue("backtest-screenshot", false)
            screenshotSetting.onchange = () => {
                GM_setValue("backtest-screenshot", screenshotSetting.checked)
                this.toggleScreenshotDetail()
            }
            this.toggleScreenshotDetail()
            new Switchery(screenshotSetting, { color: "rgb(6, 204, 152)" })
        }
    }
    jQuery(document).ready(() => new BacktestScreenshot());
})();