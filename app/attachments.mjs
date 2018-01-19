import moment from 'moment';
import numeral from 'numeral';
import { getSummary, getInfo } from './api.mjs';

const SUPPLY_FORMAT = '0,0.0a';
const VALUE_FORMAT = '$0,0.00';
const MARKET_CAP_FORMAT = '$0,0.0a';
const PERCENT_FORMAT = '+0,0.0';

// eslint-disable-next-line import/prefer-default-export
export const createAttachmentsForIdentifier = async (identifier) => {
  const info = await getInfo(identifier);
  if (!info) {
    return [{ text: `_No such cryptocurrency: "${identifier}"_` }];
  }
  const {
    fullName, imageUrl, infoUrl, symbol,
  } = info;
  const summary = await getSummary(symbol);
  const details = {
    title: fullName,
    title_link: infoUrl,
    thumb_url: imageUrl,
    mrkdwn_in: ['text'],
    text: [
      `*Value: ${numeral(summary.price).format(VALUE_FORMAT)}*`,
      `_Market cap: ${numeral(summary.marketCap).format(MARKET_CAP_FORMAT)}_`,
      `_Supply: ${numeral(summary.supply).format(SUPPLY_FORMAT)}_`,
    ].join('\n'),
  };
  const attachments = [details];
  const priceEntries = summary.pastPriceEntries.filter(entry => entry.price);
  // TODO: Investigate entries with price = 0. Nonexistent coin, or too low to parse?
  // https://min-api.cryptocompare.com/data/pricehistorical?fsym=BCH&tsyms=USD&ts=1500534000
  // https://min-api.cryptocompare.com/data/pricehistorical?fsym=BCH&tsyms=USD&ts=1484809200
  for (const { timestamp, price } of priceEntries) {
    const percentChange = ((summary.price / price) - 1) * 100;
    const percent = numeral(percentChange).format(PERCENT_FORMAT);
    attachments.push({
      color: percentChange >= 0 ? 'good' : 'danger',
      text: `*${percent}%* since ${moment(timestamp).fromNow()} _<!date^${moment(timestamp).unix()}^({date_short})| >_`,
      mrkdwn_in: ['text'],
    });
  }
  return attachments;
};
