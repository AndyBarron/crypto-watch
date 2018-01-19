import axios from 'axios';
import rateLimit from 'function-rate-limit';

const inner = rateLimit(
  15, // Max calls per interval
  1500, // Interval (milliseconds)
  (resolve, reject, ...args) => axios(...args).then(resolve, reject),
);

export default (...args) => new Promise((resolve, reject) => inner(resolve, reject, ...args));
