// ==UserScript==
// @name         Export Configuration
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

    function queryStringToJSON(qs) {
        qs = qs || location.search.slice(1);

        var pairs = qs.split('&');
        var result = {};
        pairs.forEach(function(p) {
            var pair = p.split('=');
            var key = pair[0];
            var value = decodeURIComponent(pair[1] || '');

            if( result[key] ) {
                if( Object.prototype.toString.call( result[key] ) === '[object Array]' ) {
                    result[key].push( value );
                } else {
                    result[key] = [ result[key], value ];
                }
            } else {
                result[key] = value;
            }
        });

        return JSON.parse(JSON.stringify(result));
    };

    function addElements() {
        const target = '#sideConfigViewCol > div'
        jQuery(target).append(jQuery(`<h5 class="configSidebarTitle m-t-30">Export</h5>`));
        jQuery(target).append(jQuery(`<ul class="nav nav-pills nav-stacked"><li class="viewtab ms-hover" id="export-discord"></li></ul>`));
        const exportButton = jQuery('<a href="#"><i class="md md-vertical-align-bottom m-r-5"/> Export to Discord</a>');
        exportButton.on('click', () => exportToText());
        jQuery('#export-discord').append(exportButton);
    };

    function exportToText() {
        const configQuery = $("form#configForm").serialize()
        const config = queryStringToJSON(configQuery)
        const strategyName = $("#s2id_strategy #select2-chosen-1").text()
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const today  = new Date();
        console.log(config)
        swal({
            title: 'Export',
            html: `<pre>
--------
${strategyName}
--------

# Version XXX
## Updated time: ${today.toLocaleDateString("en-US", options)}

# Buying

## Buy Settings
- Order Type: ${config.buy_order_type}${config.buy_order_type == 'limit' ? `\n- Percentage bid: ${config.bid_percentage} / ${config.bid_percentage_type}` : ''}
- Max open time buy: ${config.max_open_time_buy}
- Max Open position: ${config.max_open_positions}
- Max percentage open positions per coin: ${config.max_open_positions_per_coin}
- Enable cooldown: ${config.cooldown && config.cooldown == "1" ? "True" : "False"}${config.cooldown && config.cooldown == "1" ? `\n- Cooldown when: ${config.cooldown_when}` : ''}${config.cooldown && config.cooldown == "1" ? `\n- Cooldown period: ${config.cooldown_count} / ${config.cooldown_val}` : ''}
- Only 1 open buy per coin: ${config.one_open_order && config.one_open_order == "1" ? "True" : "False"}
- Only buy when there are positive pairs: ${config.only_when_positive && config.only_when_positive == "1" ? "True" : "False"}${config.only_when_positive && config.only_when_positive == "1" ? `\n- Positive pairs timeframe: ${config.only_when_positive_time} Minutes` : ''}
- Auto merge positions: ${config.auto_merge_positions && config.auto_merge_positions == "1" ? "True" : "False"}

## Strategy:
- Strategy: ${strategyName}
- Number of targets to buy: ${config.num_targets_per_buy}

## Trailing stop-buy
- Enable: ${config.trailing_buy == "1" ? "True" : "False"}${config.trailing_buy == "1" ? `\n- Trailing stop-buy percentage: ${config.trailing_buy_percentage}` : ""}

# Selling
## Sell Settings
Take profit at: ${config.set_percentage}
Order type: ${config.sell_order_type}
Max open time sell: ${config.max_open_time}${config.sell_order_type == "limit" ? `\n- Percentage ask : ${config.ask_percentage} / ${config.ask_percentage_type}` : ''}

## Sell Strategy
- Sell based on strategy: ${config.sell_with_strategy && config.sell_with_strategy == "1" ? "True" : "False"}

## Stop-loss
- Enable: ${config.stop_loss && config.stop_loss == "1" ? "True" : "False"}${config.stop_loss == "1" ? `\n - Stop-loss percentage: ${config.stop_loss_percentage}` : ''}

## Trailing stop-loss:
- Enable: ${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? "True" : "False"}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Trailing stop-loss percentage: ${config.stop_loss_trailing_percentage}` : ''}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Arm trailing stop-loss at: ${config.stop_loss_trailing_arm}` : ''}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Only sell with profit: ${config.trailing_stop_loss_profit && config.trailing_stop_loss_profit == "1" ? "True" : "False"}` : ""}

## Dollar Cost Averaging
- Enable: ${config.auto_dca && config.auto_dca == "1" ? "True" : "False"}
</pre>`,
            type: '',
        });
    };

    jQuery(() => {
        GM_addStyle(`
        .swal2-popup.swal2-modal.swal2-show pre {
           font-size: 11px;
           text-align: left;
        }`);
    });

    jQuery(document).ready(() => addElements());
})();
