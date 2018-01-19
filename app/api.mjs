import _ from 'lodash';
import LruCache from 'lru-cache';
import moment from 'moment';
import qs from 'querystring';
import axios from './axiosThrottled.mjs';
import { sleepSeconds } from './utils.mjs';

const BASE_URL = 'https://min-api.cryptocompare.com/data';
const LINK_BASE = 'https://cryptocompare.com';

const timeCache = new LruCache({
  max: 1000,
});
const getPriceAtTime = async (symbol, rawTimestamp) => {
  const timestamp = moment(rawTimestamp).startOf('hour').valueOf();
  const cacheKey = `${symbol}:${timestamp}`;
  if (timeCache.has(cacheKey)) {
    return timeCache.get(cacheKey);
  }
  const query = qs.stringify({
    fsym: symbol,
    tsyms: 'USD',
    ts: Math.round(timestamp / 1000),
  });
  const url = `${BASE_URL}/pricehistorical?${query}`;
  const { data } = await axios(url);
  const price = data[symbol].USD;
  timeCache.set(cacheKey, price);
  return price;
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
};

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
  timestamps.push(moment(now).year(now.year() - 1));
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
};

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
export const getInfo = async identifier =>
  await getInfoBySymbol(identifier) || await getInfoByName(identifier);

const LIST_URL = `${BASE_URL}/all/coinlist`;
const getCurrencyMaps = async () => {
  const allData = (await axios(LIST_URL)).data.Data;
  const newMaps = {
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
    newMaps.symbol.set(data.symbol.toLowerCase(), data);
    newMaps.name.set(data.name.toLowerCase(), data);
  }
  return newMaps;
};

/* eslint-disable no-await-in-loop */
(async () => {
  while (true) { // eslint-disable-line no-constant-condition
    maps = await getCurrencyMaps();
    if (resolveLoaded) {
      resolveLoaded();
      resolveLoaded = null;
    }
    await sleepSeconds(60 * 60);
  }
})();
/* eslint-enable no-await-in-loop */
