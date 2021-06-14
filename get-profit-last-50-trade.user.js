// ==UserScript==
// @name         Trade History - Statistics
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Xiaodoudou
// @match        https://www.cryptohopper.com/trade-history
// @icon         https://www.google.com/s2/favicons?domain=cryptohopper.com
// @grant        GM_addStyle
// ==/UserScript==
(function() {
    'use strict';
    let loading = false;
    let queries = 0;
    const labelGetStatistics = "Get Statistics";
    const labelLoading = "Loading";
    const loadingHandle = jQuery(`<span>${labelGetStatistics}</span>`);
    async function pMap(
      iterable,
      mapper, {
        concurrency = Number.POSITIVE_INFINITY,
        stopOnError = true
      } = {}
    ) {
      return new Promise((resolve, reject) => {
        if (typeof mapper !== 'function') {
          throw new TypeError('Mapper function is required');
        }
        if (!((Number.isSafeInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency >= 1)) {
          throw new TypeError(`Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`);
        }
        const result = [];
        const errors = [];
        const iterator = iterable[Symbol.iterator]();
        let isRejected = false;
        let isIterableDone = false;
        let resolvingCount = 0;
        let currentIndex = 0;
        const next = () => {
          if (isRejected) {
            return;
          }
          const nextItem = iterator.next();
          const index = currentIndex;
          currentIndex++;
          if (nextItem.done) {
            isIterableDone = true;
            if (resolvingCount === 0) {
              if (!stopOnError && errors.length > 0) {
                reject(new AggregateError(errors));
              } else {
                resolve(result);
              }
            }
            return;
          }
          resolvingCount++;
          (async () => {
            try {
              const element = await nextItem.value;
              result[index] = await mapper(element, index);
              resolvingCount--;
              next();
            } catch (error) {
              if (stopOnError) {
                isRejected = true;
                reject(error);
              } else {
                errors.push(error);
                resolvingCount--;
                next();
              }
            }
          })();
        };
        for (let index = 0; index < concurrency; index++) {
          next();
          if (isIterableDone) {
            break;
          }
        }
      });
    }
    async function pAll(iterable, options) {
      return pMap(iterable, element => element(), options);
    }
  
    function addElements() {
      const target = '#component_content > div:nth-child(3) div.row div.text-right';
      const button = jQuery('<button class="btn btn-primary waves-effect waves-light"><i class="fa fa-download m-r-5"></i></button>');
      jQuery(button).append(loadingHandle);
      button.on('click', async () => await calculateRevenue());
      jQuery(target).append(button);
    };
    async function getHistory() {
      return new Promise((resolve, reject) => {
        jQuery.ajax({
          type: "POST",
          dataType: "json",
          url: "/siteapi.php?todo=gettradehistory",
          data: {
            start: 0,
            limit: 50,
            search: "",
            sells: 1,
            buys: 0,
            arbitrage: current_search_arbitrage,
            timezone: timezoneOffset()
          },
          cache: false,
          success: (data) => {
            if (data.table) {
              resolve(data.table);
            } else {
              reject(new Error("No data found"));
            }
          },
          error: () => {
            reject(new Error("History API failed"));
          }
        });
      });
    }
    function wait(delay) {
        return new Promise((resolve) => {
            setTimeout(()=> resolve(), delay)
        })
    }
    function roundFinance(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100
    }
    async function calculateRevenue() {
      if (loading) {
        return;
      }
      loading = true;
      try {
        const history = await getHistory();
        const lines = jQuery(history).find(".label.label-danger").parent().parent()
        queries = 0
        jQuery(loadingHandle)[0].innerHTML = `${labelLoading} (${queries}/${lines.length})`
        const statistics = {
          trades: 0,
          profit: 0
        }
        const today = new Date();
        const promises = [];
        for (const line of lines) {
          promises.push(async () => {
              const tradeIdData = jQuery(line).find("td:nth-child(11)")[0].innerHTML
              const regex = /(.*viewTradeModal\()([0-9]*)(\).*)/;
              const found = tradeIdData.match(regex);
              if (found && found[2]) {
                  const sellTradeId = found[2];
                  const sellData = await queryTradeId(sellTradeId);
                  if (sellData.info_html) {
                      const regex = /(.*viewTradeModal\()([0-9]*)(\).*)/;
                      const found = sellData.info_html.match(regex);
                      if (found && found[2]) {
                          const buyTradeId = found[2];
                          const buyData = await queryTradeId(buyTradeId);
                          const profitData = parseTrade(buyData, sellData);
                          statistics.trades = statistics.trades + 1
                          statistics.profit = statistics.profit + profitData.profit
                      }
                  }
              }
              queries = queries + 1
              jQuery(loadingHandle)[0].innerHTML = `${labelLoading} (${queries}/${lines.length})`
              await wait(200) // To avoid to be blocked in term of CH API
          })
        }
        await pAll(promises, { concurrency: 1 });
        swal({
          title: 'Profits',
          html: `<div>
  <span>Trades:</span> ${statistics.trades}
  <span>Profit:</span> ${roundFinance(statistics.profit)}
  </div>`
        });
      } catch (error) {
        swal({
          title: 'Failed to calculate profits',
          html: `<div>${error}</div>`,
          type: 'error'
        });
      }
      jQuery(loadingHandle)[0].innerHTML = `${labelGetStatistics}`
      loading = false;
    };
  
    function exportConfigToText() {}
  
    function parseTrade(buyTradeData, sellTradeData) {
      if (buyTradeData.info_html && sellTradeData.info_html) {
        const buyData = _parseTrade(buyTradeData);
        const sellData = _parseTrade(sellTradeData);
        console.log(sellData.cost, buyData.cost)
        return {
          coin: buyData.coin,
          profit: sellData.cost - buyData.cost
        };
      }
    }
  
    function _parseTrade(tradeData) {
      if (tradeData.info_html) {
        const dom = jQuery(tradeData.info_html).find("div > div");
        const data = {
          coin: dom.find(".lead strong").text(),
          cost: Number(dom.find("table tr:nth-child(2) td:nth-child(2)").text()),
          fee: Number(dom.find("table tr:nth-child(3) td:nth-child(2)").text())
        }
        return data;
      }
    }
  
    function queryTradeId(tradeId) {
      return new Promise((resolve) => {
        jQuery.ajax({
          type: "POST",
          dataType: "json",
          url: "/siteapi.php?todo=refreshmodaltrade",
          data: {
            trade_id: tradeId
          },
          cache: false,
          success: (data, textStatus) => {
            resolve(data);
          },
          error: () => {
            resolve();
          }
        })
      })
    }
    jQuery(document).ready(() => addElements());
  })();