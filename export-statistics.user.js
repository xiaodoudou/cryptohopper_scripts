// ==UserScript==
// @name         Trade History - Export Statistics
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Xiaodoudou
// @match        https://www.cryptohopper.com/trade-history
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.2.0/dom-to-image.min.js
// @grant        GM_addStyle
// ==/UserScript==
(function() {
    'use strict';

    class TradeHistoryStatistics {
        constructor () {
            this.loading = false
            this.labelEnabled = "Export"
            this.labelLoading = "Loading"
            this.labelHandle = jQuery(`<span>${this.labelEnabled}</span>`)
            this.addElements()
        }

        setLabel(text) {
            jQuery(this.labelHandle)[0].innerHTML = text
        }
        
        csvToArray(csv) {
            try {
                if (!csv.length || csv.length == 0) {
                    throw new Error("Empty CSV")
                }
                const lines = csv.split("\n")
                const result = []
                let headers = lines[0].split(",")
                headers = _.map(headers, item => _.camelCase(item))
                for (let i=1 ; i < lines.length ; i++) {
                    const obj = {}
                    const currentline = lines[i].split(",")
                    for(let j = 0 ; j < headers.length ; j++) {
                        try {
                            obj[headers[j]] = JSON.parse(currentline[j])
                        } catch (e) {
                            obj[headers[j]] = currentline[j]
                        }
                    }
                    result.push(obj)
                }
                return result
            } catch (error) {
                throw new Error("Failed to parse CSV to JSON: " + error)
            }
        }

        async calculate() {
            if (this.loading) {
                return
            }
            try {
                this.loading = true
                const statistics = {
                    trades: 0,
                    profit: 0,
                    fees: 0,
                    wins: 0,
                    loss: 0,
                    data: []
                }
                this.setLabel(this.labelLoading)
                const data = await this.getHistory()
                const tradeArray = this.csvToArray(data)
                const sellTrades = _.filter(tradeArray, (trade) => trade.type === "sell" && trade.buyOrderId && trade.buyOrderId !== "0")
                const buyTrades = _.filter(tradeArray, (trade) => trade.type === "buy")
                _.forEach(sellTrades, (sellTrade) => {
                    sellTrade.buyTrade = _.find(buyTrades, (buyTrade) => buyTrade.id === sellTrade.buyOrderId)
                })
                console.log("HERE", sellTrades)
                _.forEach(sellTrades, (sellTrade) => {
                    const buyTrade = _.get(sellTrade, 'buyTrade', false)
                    if (buyTrade !== false) {
                        sellTrade.totalFee = Number(sellTrade.fee) + Number(buyTrade.fee)
                        sellTrade.profit = Number(sellTrade.orderValue) - Number(buyTrade.orderValue)
                        statistics.trades = statistics.trades + 1
                        statistics.profit = statistics.profit + sellTrade.profit
                        statistics.fees = statistics.trades + sellTrade.totalFee
                        if (sellTrade.result.search("-") >= 0) {
                            statistics.loss = statistics.loss + 1
                        } else {
                            statistics.wins = statistics.wins + 1
                        }
                        statistics.data.push(sellTrade)
                    }
                })
                statistics.data = _.orderBy(statistics.data, ['date'])
                statistics.data.reverse()
                this.displayStatistics(statistics)
            } catch (error) {
                this.displayError(error)
            }
            this.loading = false
            this.setLabel(this.labelEnabled)
        }
        
        roundFinance(value) {
            return Math.round((value + Number.EPSILON) * 100) / 100
        }

        displayStatistics(statistics) {
            const dateRange = jQuery("#export-statistics-daterange").val()
            const template = _.template(`
                <% for (trade of statistics.data) { %>
                    <tr class="row">
                        <td class="coin"><%= trade.currency %></td>
                        <td class="sell-date"><%= trade.date %></td>
                        <td class="buy-date"><%= trade.buyTrade.date %></td>
                        <td class="trigger"><%= trade.trigger %></td>
                        <td class="profit <%= trade.profit > 0 ? 'positive' : 'negative' %>"><%= roundFinance(trade.profit) %>$</td>
                        <td class="result <%= trade.result.search('-') > -1 ? 'negative' : 'positive' %>"><%= trade.result %></td>
                    </tr>
                <% } %>
            `)
            swal({
                title:  'Statistics',
                width: '50%',
                html:   `<div id="modal-statistics">
                            <div class="statistics-sumup">
                                <div class="row">
                                    <div>
                                        <span>Date Range:</span> ${dateRange} (Timezone ${timezoneOffset()})
                                    </div>
                                </div>
                                <div class="row">
                                    <div>
                                        <span class="label label-primary">Trades:</span> ${statistics.trades}
                                    </div>
                                    <div>
                                        <span class="label label-primary">Profit:</span> <span class="${statistics.profit > 0 ? 'positive' : 'negative'}">${this.roundFinance(statistics.profit)}$</span>
                                    </div>
                                    <div>
                                        <span class="label label-success">Wins:</span> ${statistics.wins}
                                    </div>
                                    <div>
                                        <span class="label label-danger">Loss:</span> ${statistics.loss}
                                    </div>
                                </div>
                            </div>
                            <table class="statistics">
                                <thead>
                                    <tr class="row">
                                        <th class="coin">Coin</th>
                                        <th class="sell">Sell At</th>
                                        <th class="buy">Buy At</th>
                                        <th class="triger">Trigger</th>
                                        <th class="profit">Profit</th>
                                        <th class="result">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${template({ statistics, roundFinance: this.roundFinance })}
                                </tbobdy>
                            </table>
                        </div>`
                });
                if ($("#statistics-save-to-png").is(':checked')) {
                    domtoimage.toPng(jQuery('#modal-statistics').parent().parent()[0])
                    .then(function (dataUrl) {
                        const link = document.createElement('a');
                        link.download = +new Date() + '-modal-statistics.png',
                        link.href = dataUrl;
                        link.click()
                    })
                }
        }

        displayError(error) {
            swal({
                title: 'Failed to calculate statistics',
                html: `<div>${error}</div>`,
                type: 'error'
            });
        }

        addElements() {
            const target = '#component_content > div:nth-child(3) div.row div.text-right'
            const targetPanel = '#exportDiv'
            const buttonOpenPanel = jQuery('<button class="btn btn-primary waves-effect waves-light"><i class="fa fa-download m-r-5"></i> Export Statistics</button>')
            buttonOpenPanel.on('click', () => jQuery("div#export-statistics").toggle())
            jQuery(target).append(buttonOpenPanel)
            const buttonClosePanel = jQuery('<button type="button" class="btn btn-default waves-effect">Close</button>')
            buttonClosePanel.on('click', () => jQuery("div#export-statistics").toggle())
            const buttonExport = jQuery('<button class="btn btn-primary waves-effect waves-light"><i class="fa fa-download m-r-5"></i></button>')
            jQuery(buttonExport).append(this.labelHandle)
            buttonExport.on('click', async () => await this.calculate())
            const panel = jQuery(`<div class="row" id="export-statistics" style="display:none;">
                                    <div class="col-lg-12">
                                        <div class="card-box m-b-15">
                                            <h3 class="text-dark  header-title m-t-0">
                                                Export Statistics
                                            </h3>
                                            <hr>
                                            <div class="form-horizontal">
                                                <div class="form-group">
                                                    <label class="col-md-2 control-label">Save as PNG:</label>
                                                    <div class="col-md-9">
                                                        <div class="checkbox checkbox-primary">
                                                            <input id="statistics-save-to-png" type="checkbox" checked="true">
                                                            <label for="statistics-save-to-png">
                                                                Enabled
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="form-group">
                                                    <label class="col-md-2 control-label">Date range:</label>
                                                    <div class="col-md-9">
                                                        <input type="text" id="export-statistics-daterange" class="form-control input-daterange-timepicker" name="statistics-daterange">
                                                    </div>
                                                </div>
                                            </div>
                                            <hr>
                                            <div class="text-right actions"></div>
                                        </div>
                                    </div>
                                </div>`)
            const panelTarget = "#export-statistics .actions"
            jQuery(targetPanel).after(panel)
            jQuery('#export-statistics-daterange').daterangepicker({
                timePicker: true,
                startDate: moment().startOf('hour').subtract(5, "days"),
                endDate: moment().startOf('hour'),
            })
            jQuery(panelTarget).append(buttonClosePanel)
            jQuery(panelTarget).append(buttonExport)
        }
        async getHistory() {
            try {
                const dateRange = jQuery("#export-statistics-daterange").val()
                const { data } = await axios.get(`/export_trade_history.php?type=csv&daterange=${encodeURI(dateRange)}&timezone=${timezoneOffset()}&buys=1&sells=1&arbitrage=1`);
                return data
            } catch (error) {
                throw new Error("Export Trade History API Failed: " + error)
            }
        }

    }
    jQuery(() => {
        GM_addStyle(`
        #modal-statistics {
            background: white;
            position: relative;
            padding: 0 0 10px 0;
        }
        div.statistics-sumup {
            display: flex;
            width: 100%;
            align-items: center;
            flex-direction: column;
            justify-content: space-around;
            font-size: 12px;
        }
        div.statistics-sumup .row {
            display: flex;
            width: 100%;
            align-items: center;
            flex-direction: row;
            justify-content: space-around;
        }
         {
            font-weight: bold;
        }
        table.statistics {
            background: #303054;
            width: 100%;
        }
        table.statistics td, table.statistics th {
            font-size: 12px;
            border: 1px solid rgba(255, 255, 255, .2);
            padding: 0 6px 0 6px;
        }
        div.statistics-sumup div span.positive,
        table.statistics td.positive {
            color: #00b19d;
        }
        div.statistics-sumup div span.negative,
        table.statistics td.negative {
            color: #ef5350;
        }
        table.statistics .buy-date,
        table.statistics .sell-date,
        table.statistics .trigger,
        table.statistics .coin {
            text-align: left;
        }
        table.statistics .profit,
        table.statistics .result {
            text-align: right;
        }
        `);
    });
    jQuery(document).ready(() => new TradeHistoryStatistics());
  })();