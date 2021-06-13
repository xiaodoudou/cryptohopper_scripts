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
        jQuery(target).append(jQuery(`<ul class="nav nav-pills nav-stacked"><li class="viewtab ms-hover" id="export-config-discord"></li><li class="viewtab ms-hover" id="export-coins-discord"></li></ul>`));
        const exportConfigButton = jQuery('<a href="#"><i class="md md-vertical-align-bottom m-r-5"/> Export config to Discord</a>');
        exportConfigButton.on('click', () => exportConfigToText());
        jQuery('#export-config-discord').append(exportConfigButton);
        const exportCoinsButton = jQuery('<a href="#"><i class="md md-vertical-align-bottom m-r-5"/> Export coins to Discord</a>');
        exportCoinsButton.on('click', () => exportCoinsToText());
        jQuery('#export-coins-discord').append(exportCoinsButton);
    };

        function exportCoinsToText() {
        const configQuery = $("form#configForm").serialize();
        const config = queryStringToJSON(configQuery);
        const selectedCurrency = $("#collect_currency option[selected]").text();
        const strategyName = $("#s2id_strategy #select2-chosen-1").text()
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const today  = new Date();
        swal({
            title: 'Export',
            html: `<pre>
--------
${strategyName}
--------

## Updated time: ${today.toLocaleDateString("en-US", options)}

# Base currency: ${selectedCurrency}
# Coins:
${config['allowed_coins%5B%5D'].join(", ")}
</pre>`,
            type: '',
        });
    };

    function exportConfigToText() {
        const configQuery = $("form#configForm").serialize();
        const config = queryStringToJSON(configQuery);
        const strategyName = $("#s2id_strategy #select2-chosen-1").text();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const today  = new Date();
        //console.log(config);
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
- Hold assets when new target is the same: ${config.hold_assets && config.hold_assets == "1" ? "True" : "False"}

## Stop-loss
- Enable: ${config.stop_loss && config.stop_loss == "1" ? "True" : "False"}${config.stop_loss == "1" ? `\n - Stop-loss percentage: ${config.stop_loss_percentage}` : ''}

## Trailing stop-loss:
- Enable: ${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? "True" : "False"}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Trailing stop-loss percentage: ${config.stop_loss_trailing_percentage}` : ''}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Arm trailing stop-loss at: ${config.stop_loss_trailing_arm}` : ''}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Use trailing stop-loss only: ${config.stop_loss_trailing_only && config.stop_loss_trailing_only== "1" ? "True" : "False"}` : ""}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Reset stop-loss after failed orders : ${config.trailing_stop_loss_reset && config.trailing_stop_loss_reset== "1" ? "True" : "False"}` : ""}${config.stop_loss_trailing && config.stop_loss_trailing == "1" ? `\n- Only sell with profit: ${config.trailing_stop_loss_profit && config.trailing_stop_loss_profit == "1" ? "True" : "False"}` : ""}

## Auto Close
- Enable: ${config.auto_close_positions && config.auto_close_positions == "1" ? "True" : "False"}${config.auto_close_positions && config.auto_close_positions == "1" ? `\n- Close positions after X time open: ${config.auto_close_positions_time}` : ''}

## Shorting
- Reset position after closed short: ${config.short_reset_position && config.short_reset_position == "1" ? "True" : "False"}
- Restore position after short: ${config.short_restore_position && config.short_restore_position == "1" ? "True" : "False"}
- Automatic shorting: ${config.automatic_shorting && config.automatic_shorting == "1" ? "True" : "False"}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Max open short positions: ${config.max_open_short_positions}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Open short based on strategy: ${config.short_sell_with_strategy && config.short_sell_with_strategy == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Close short based on strategy: ${config.short_buy_with_strategy && config.short_buy_with_strategy == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Always short instead of sell: ${config.short_always && config.short_always == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Shorting percentage profit: ${config.short_percentage_profit}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Use actual profit: ${config.short_use_actual_profit && config.short_use_actual_profit == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Trailing stop-short: ${config.short_stop_loss_trailing && config.short_stop_loss_trailing == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" && config.short_stop_loss_trailing && config.short_stop_loss_trailing == "1" ? `\n- Trailing stop-short percentage: ${config.short_stop_loss_trailing_percentage}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" && config.short_stop_loss_trailing && config.short_stop_loss_trailing == "1" ? `\n- Arm trailing stop-short at: ${config.short_stop_loss_trailing_arm}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" && config.short_stop_loss_trailing && config.short_stop_loss_trailing == "1" ? `\n- Use trailing stop-short only: ${config.short_stop_loss_trailing_only && config.short_stop_loss_trailing_only == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Auto close shorts within time: ${config.short_auto_close_positions && config.short_auto_close_positions == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" && config.short_auto_close_positions && config.short_auto_close_positions == "1" ? `\n- Close shorts after X time open: ${config.short_auto_close_positions_time}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Auto remove shorts within time: ${config.short_auto_remove_positions && config.short_auto_remove_positions == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" && config.short_auto_remove_positions && config.short_auto_remove_positions == "1" ? `\n- Remove shorts after X time open: ${config.short_auto_remove_positions_time}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Do not buy back on loss: ${config.short_remove_on_loss && config.short_remove_on_loss == "1" ? "True" : "False"}` : ''}${config.automatic_shorting && config.automatic_shorting == "1" ? `\n- Ignore max open positions: ${config.short_ignore_max_pos && config.short_ignore_max_pos == "1" ? "True" : "False"}` : ''}

## Dollar Cost Averaging
- Enable: ${config.auto_dca && config.auto_dca == "1" ? "True" : "False"}${config.auto_dca && config.auto_dca == "1" ? `\n- Order type: ${config.dca_order_type}` : ''}${config.auto_dca && config.auto_dca == "1" ? `\n- DCA after X time open: ${config.auto_dca_time}` : ''}${config.auto_dca && config.auto_dca == "1" ? `\n- DCA max retries: ${config.auto_dca_max}` : ''}${config.auto_dca && config.auto_dca == "1" ? `\n- DCA set percentage trigger: ${config.auto_dca_percentage}` : ''}${config.auto_dca && config.auto_dca == "1" ? `\n- DCA buy immediately: ${config.auto_dca_strategy && config.auto_dca_strategy == "1" ? "True" : "False"}` : ''}${config.auto_dca && config.auto_dca == "1" ? `\n- DCA order size: ${config.auto_dca_size}` : ''}${config.auto_dca && config.auto_dca == "1" && config.auto_dca_size && config.auto_dca_size == "custom" ? `\n- DCA order size percentage: ${confi.auto_dca_size_custom}` : ''}
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
