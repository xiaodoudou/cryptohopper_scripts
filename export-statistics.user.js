// ==UserScript==
// @name         Trade History - Export Statistics
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  try to take over the world!
// @author       Xiaodoudou
// @updateURL    https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/export-statistics.user.js
// @downloadURL  https://github.com/xiaodoudou/cryptohopper_scripts/raw/main/export-statistics.user.js
// @match        https://www.cryptohopper.com/trade-history
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js
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

        scan(data) {
            let orderedData = _.orderBy(data, 'date')
            let bags = {}
            _.forEach(orderedData, (trade) => {
                if (trade.pair) {
                    if (_.get(bags, trade.pair, false) == false) {
                        _.set(bags, trade.pair, {
                            buys: [],
                            sells: []
                        })
                    }
                    const currentBags = _.get(bags, trade.pair)
                    if (!trade.result) {
                        trade.result = "0%"
                    }
                    trade.originalValue = trade.orderValue
                    trade.date = +new Date(trade.date)
                    if (trade.type == "buy") {
                        currentBags.buys.push(trade)
                    } else {
                        currentBags.sells.push(trade)
                    }
                }
            })
            return bags
        } 

        calculate(data) {
            let trades = []
            _.forEach(data, (bags, coins) => {
                _.forEach(bags.sells, (sell, indexSell) => {
                    let found = false
                    const trade = {
                        currency: sell.currency,
                        pair: sell.pair,
                        orderCurrency: sell.orderCurrency,
                        result: sell.result,
                        profit: 0,
                        end: sell.date,
                        trigger: sell.trigger,
                        sell: {
                            date: sell.date,
                            orderAmount: sell.orderAmount,
                            orderRate: sell.orderRate,
                            orderValue: sell.orderValue,
                            fee: sell.fee,
                            trigger: sell.trigger,
                        },
                        buys: []
                    }
                    if (sell.buyOrderId) {
                        const buy = _.find(bags.buys, (i) => i.id == sell.buyOrderId)
                        if (buy) {
                            found = true
                            const indexBuy = _.indexOf(bags.buys, buy)
                            if (sell.orderAmount <= buy.orderAmount ) {
                                if (sell.orderAmount == buy.orderAmount) {
                                    delete bags.buys[indexBuy]
                                    bags.buys = _.compact(bags.buys)
                                    trade.type = "1:1"
                                    trade.buys = [
                                        {
                                            date: buy.date,
                                            orderAmount: buy.orderAmount,
                                            orderRate: buy.orderRate,
                                            orderValue: buy.orderValue,
                                            trigger: buy.trigger
                                        }
                                    ]
                                    trade.profit = sell.orderValue - buy.orderValue
                                    delete bags.sells[indexSell]
                                    bags.sells = _.compact(bags.sells)
                                } else {
                                    trade.type = "1:1*"
                                    trade.buys = [
                                        {
                                            date: buy.date,
                                            orderAmount: sell.orderAmount,
                                            orderRate: buy.orderRate,
                                            orderValue: sell.orderAmount * buy.orderRate,
                                            trigger: buy.trigger
                                        }
                                    ]
                                    trade.profit = sell.orderValue - sell.orderAmount * buy.orderRate
                                    buy.orderAmount = buy.orderAmount - sell.orderAmount
                                    buy.orderValue = buy.orderAmount * buy.orderRate
                                }
                                trades.push(trade)
                            } else {
                                found = false
                            }
                        }
                    }
                    if (!found) {
                        let amount = sell.orderAmount
                        while (amount > 0) {
                            if (_.filter(bags.buys, (buy) => buy.date < sell.date).length <= 0) {
                                if (amount > 0) {
                                    trade.sell.orderAmount = trade.sell.orderAmount - amount
                                    trade.sell.orderValue = trade.sell.orderRate * trade.sell.orderAmount 
                                }
                                break;
                            }
                            bags.buys = _.orderBy(bags.buys, 'date')
                            bags.buys.reverse()
                            _.forEach(bags.buys, (buy, indexBuy) => {
                                if (buy.date < sell.date) {
                                    let orderAmount = buy.orderAmount
                                    let fee = buy.fee
                                    let amountUsage =  buy.orderAmount - amount
                                    let fullyUsed = false
                                    if (amountUsage == 0) {
                                        amount = 0
                                        fullyUsed = true
                                    } else if (amountUsage > 0) {
                                        orderAmount = orderAmount - amountUsage
                                        amount = 0
                                        fullyUsed = false
                                    } else {
                                        fullyUsed = true
                                        amount = amount - buy.orderAmount
                                    }
                                    const orderValue = orderAmount * buy.orderRate + buy.fee
    
                                    if (fullyUsed) {
                                        delete bags.buys[indexBuy]
                                        bags.buys = _.compact(bags.buys)
                                    } else {
                                        const ratio = orderAmount / buy.orderAmount
                                        buy.orderAmount = buy.orderAmount - orderAmount
                                        buy.orderValue = buy.orderAmount * buy.orderRate + buy.fee * ratio
                                    }
                                    trade.buys.push(
                                        {
                                            date: buy.date,
                                            orderAmount: orderAmount,
                                            orderRate: buy.orderRate,
                                            orderValue: orderValue,
                                            trigger: buy.trigger
                                        }
                                    )
                                    if (amount == 0) {
                                        return false
                                    }
                                }
                            })
                        }
                        if (amount == 0) {
                            trade.type = trade.buys.length + ":1"
                            trades.push(trade)
                        }
                        delete bags.sells[indexSell]
                        bags.sells = _.compact(bags.sells)
                    }
                })
            })

            const statistics = {
                trades: 0,
                profit: 0,
                fees: 0,
                wins: 0,
                loss: 0,
                duration: 0,
                averageProfit: 0,
                data: []
            }
            trades = _.orderBy(trades, 'end')
            _.forEach(trades, (trade) => {
                let profit = trade.sell.orderValue
                trade.end = trade.sell.date
                trade.start = Infinity
                _.forEach(trade.buys, (buy) => {
                    profit = profit - buy.orderValue
                    if (trade.start > buy.date) {
                        trade.start = buy.date
                    }
                })
                trade.duration = trade.end - trade.start
                trade.profit = profit
                statistics.profit = statistics.profit + profit
                statistics.averageProfit = statistics.averageProfit + trade.profit
                if (profit > 0) {
                    statistics.wins = statistics.wins + 1
                } else {
                    statistics.loss = statistics.loss + 1
                }
                statistics.duration = statistics.duration + trade.duration
                trade.duration = this.durationWithPadding(trade.duration)
                statistics.trades = statistics.trades + 1
                statistics.data.push(trade)
                // console.log(new Date(trade.date), trade.pair, profit, trade.sell.fee, trade.result, trade.sell.trigger)
            })
            statistics.duration =  this.durationWithPadding(statistics.duration / trades.length)
            statistics.averageProfit = statistics.averageProfit / trades.length
            return statistics
        }

        durationWithPadding(n) {
            var momentInSeconds = moment.duration(n / 1000,'seconds')
            return "0" + `${Math.floor(momentInSeconds.asHours())}`.slice(-2) + ':' + ("0" + `${momentInSeconds.minutes()}`).slice(-2) + ':' + ("0" + `${momentInSeconds.seconds()}`).slice(-2)
        }

        async generateStatistics() {
            if (this.loading) {
                return
            }
            try {
                this.loading = true
                this.setLabel(this.labelLoading)
                let data = await this.getHistory()
                data = this.csvToArray(data)
                const bags = this.scan(data)
                const statistics = this.calculate(bags)
                statistics.data = _.orderBy(statistics.data, 'end')
                statistics.data.reverse()
                this.displayStatistics(statistics)
            } catch (error) {
                console.error(error)
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
                        <td class="sell-date"><%= moment(trade.end).format("DD/MM/YYYY hh:mm A") %></td>
                        <td class="buy-date"><%= moment(trade.start).format("DD/MM/YYYY hh:mm A") %></td>
                        <td class="duration"><%= trade.duration %></td>
                        <td class="trigger"><%= trade.trigger %></td>
                        <td class="type"><%= trade.type %></td>
                        <td class="profit <%= trade.profit > 0 ? 'positive' : 'negative' %>"><%= roundFinance(trade.profit) %>$</td>
                        <td class="result <%= trade.result.search('-') > -1 ? 'negative' : 'positive' %>"><%= trade.result ? trade.result : "0%" %></td>
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
                                        <span>Range:</span> ${dateRange} (Timezone ${timezoneOffset()})
                                    </div>
                                </div>
                                <div class="row">
                                    <div>
                                        <span class="label label-primary">Trades:</span> ${statistics.trades}
                                    </div>
                                    <div>
                                        <span class="label label-primary">Average Profit:</span> <span class="${statistics.averageProfit > 0 ? 'positive' : 'negative'}">${this.roundFinance(statistics.averageProfit* 100) }%</span>
                                    </div>
                                    <div>
                                        <span class="label label-success">Wins:</span> ${statistics.wins}
                                    </div>
                                    <div>
                                        <span class="label label-danger">Loss:</span> ${statistics.loss}
                                    </div>
                                </div>
                                <div class="row">
                                <div>
                                    <span class="label label-primary">Average Duration:</span> ${statistics.duration}
                                </div>
                                <div>
                                    <span class="label label-primary">Profit:</span> <span class="${statistics.profit > 0 ? 'positive' : 'negative'}">${this.roundFinance(statistics.profit)}$</span>
                                </div>
                            </div>
                            </div>
                            <table class="statistics">
                                <thead>
                                    <tr class="row">
                                        <th class="coin">Coin</th>
                                        <th class="sell">Sell At</th>
                                        <th class="buy">Buy At</th>
                                        <th class="dureation">Duration</th>
                                        <th class="triger">Trigger</th>
                                        <th class="type">Type</th>
                                        <th class="profit">Profit</th>
                                        <th class="result">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${template({ statistics, roundFinance: this.roundFinance, moment })}
                                </tbobdy>
                            </table>
                        </div>`
                });
                if ($("#statistics-save-to-png").is(':checked')) {
                    setTimeout(async () => {
                        try {
                            const canvas = await html2canvas(jQuery('#modal-statistics').parent().parent()[0], {
                                backgroundColor: _.includes(document.body.classList, 'nightmode') ? "rgb(48, 48, 84)" : "white",
                                windowWidth: 2560,
                                imageTimeout: 0
                            })
                            const link = document.createElement('a');
                            link.download = +new Date() + '-modal-statistics.png'
                            link.href = canvas.toDataURL("image/png");
                            link.click()
                        } catch (error) {
                            console.error('Failed to generate png:', error)
                        }
                    }, 10)
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
            buttonExport.on('click', async () => await this.generateStatistics())
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
            position: relative;
            padding: 0 0 10px 0;
        }
        div.statistics-sumup {
            width: 100%;
            font-size: 12px;
            padding-bottom: 10px;
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
        table.statistics .type,
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