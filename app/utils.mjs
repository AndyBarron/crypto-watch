
// eslint-disable-next-line import/prefer-default-export
export const sleepSeconds = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000));
