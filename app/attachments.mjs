import moment from 'moment';
import numeral from 'numeral';
import { getSummary, getInfo } from './api.mjs';

const MARKET_CAP_FORMAT = '$0,0.0a';
const PERCENT_FORMAT = '+0,0.0';
const SUPPLY_FORMAT = '0,0.0a';
const VALUE_ROUNDED_FORMAT = '$0,0.00';

// eslint-disable-next-line import/prefer-default-export
export const createAttachmentsForIdentifier = async (identifier) => {
  const info = await getInfo(identifier);
  if (!info) {
    return [{
      mrkdwn_in: ['text'],
      text: `_No such cryptocurrency: "${identifier}"_`,
    }];
  }
  const {
    fullName, imageUrl, infoUrl, symbol,
  } = info;
  const summary = await getSummary(symbol);
  const value = summary.price;
  const valueText = value <= 10 ? `${value}` : numeral(value).format(VALUE_ROUNDED_FORMAT);
  const details = {
    mrkdwn_in: ['text'],
    text: [
      `*Value: ${valueText}*`,
      `_Market cap: ${numeral(summary.marketCap).format(MARKET_CAP_FORMAT)}_`,
      `_Supply: ${numeral(summary.supply).format(SUPPLY_FORMAT)}_`,
    ].join('\n'),
    thumb_url: imageUrl,
    title: fullName,
    title_link: infoUrl,
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
      mrkdwn_in: ['text'],
      text: [
        `*${percent}%* since ${moment(timestamp).fromNow()}`,
        `_<!date^${moment(timestamp).unix()}^({date_short})| >_`,
      ].join(' '),
    });
    for (let i = 0; i < attachments.length - 1; i++) {
      const [current, next] = attachments.slice(i);
      if (current.color === next.color) {
        current.text += `\n${next.text}`;
        attachments.splice(i + 1, 1);
        i--;
      }
    }
  }
  return attachments;
};
