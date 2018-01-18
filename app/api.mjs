import _ from 'lodash';
import axios from 'axios';
import moment from 'moment';
import qs from 'querystring';
import { sleepSeconds } from './utils.mjs';

const BASE_URL = 'https://min-api.cryptocompare.com/data';
const LINK_BASE = 'https://cryptocompare.com';

const getPriceAtTime = async (symbol, timestamp) => {
  const query = qs.stringify({
    fsym: symbol,
    tsyms: 'USD',
    ts: Math.round(timestamp / 1000),
  });
  const url = `${BASE_URL}/pricehistorical?${query}`;
  return (await axios(url)).data[symbol].USD;
};

const getCurrentStats = async (symbol) => {
  const query = qs.stringify({
    fsyms: symbol,
    tsyms: 'USD',
  });
  const url = `${BASE_URL}/pricemultifull?${query}`;
  const data = (await axios(url)).data.RAW[symbol].USD;
  const output = {
    symbol,
    price: data.PRICE,
    updated: data.LASTUPDATE * 1000,
    supply: data.SUPPLY,
    marketCap: data.MKTCAP,
  };
  return output;
}

export const getSummary = async (symbol) => {
  const now = moment();
  const statsPromise = getCurrentStats(symbol);
  const offsets = [
    moment.duration(1, 'day'),
    moment.duration(1, 'week'),
    moment.duration(1, 'month'),
    moment.duration(6, 'months'),
  ].map(duration => duration.asMilliseconds());
  const timestamps = offsets.map(offset => now.valueOf() - offset);
  timestamps.push(
    moment(now).year(now.year() - 1),
  );
  const timestampToPrice = new Map();
  const pricePromises = timestamps.map(async (timestamp) => {
    timestampToPrice.set(timestamp, await getPriceAtTime(symbol, timestamp));
  });
  const [stats] = await Promise.all([statsPromise, ...pricePromises]);
  const priceEntries = [...timestampToPrice.entries()];
  const pastPrices = _.chain(priceEntries)
    .sortBy(0)
    .reverse()
    .map(([timestamp, price]) => ({ timestamp, price }))
    .value();
  return {
    ...stats,
    pastPriceEntries: pastPrices,
  };
}

// Auto-update functionality

let maps = null;

let resolveLoaded = null;
const mapLoaded = new Promise((resolve) => { resolveLoaded = resolve; });

export const getInfoBySymbol = async (symbol) => {
  await mapLoaded;
  return maps.symbol.get(symbol.toLowerCase());
};
export const getInfoByName = async (name) => {
  await mapLoaded;
  return maps.name.get(name.toLowerCase());
};
export const getInfo = async (identifier) => {
  return await getInfoBySymbol(identifier) || await getInfoByName(identifier);
};

const LIST_URL = `${BASE_URL}/all/coinlist`;
const getCurrencyMaps = async () => {
  const allData = (await axios(LIST_URL)).data.Data;
  const maps = {
    symbol: new Map(),
    name: new Map(),
  };
  for (const info of Object.values(allData)) {
    const data = {
      infoUrl: LINK_BASE + info.Url,
      imageUrl: LINK_BASE + info.ImageUrl,
      name: info.CoinName,
      symbol: info.Symbol,
      fullName: info.FullName,
      totalSupply: info.TotalCoinSupply,
    };
    maps.symbol.set(data.symbol.toLowerCase(), data);
    maps.name.set(data.name.toLowerCase(), data);
  }
  return maps;
}

(async () => {
  while (true) {
    maps = await getCurrencyMaps();
    if (resolveLoaded) {
      resolveLoaded();
      resolveLoaded = null;
    }
    await sleepSeconds(60 * 60);
  }
})();
