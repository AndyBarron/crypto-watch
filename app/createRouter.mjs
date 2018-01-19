import axios from 'axios';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import _ from 'lodash';
import queryString from 'querystring';
import { createAttachmentsForIdentifier } from './attachments.mjs';
import { SLACK_OAUTH_URL, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from './config.mjs';

const createRouter = () => {
  const router = new Router();
  router.use(bodyParser());

  router.post('/slack', async (ctx) => {
    const { text } = ctx.request.body;
    const identifiers = _.chain(text.toLowerCase())
      .split(/\s+|\s*,\s*/)
      .filter()
      .uniq()
      .value();
    if (identifiers.length === 0) {
      ctx.body = {
        attachments: [{
          mrkdwn_in: ['text'],
          text: [
            'Specify at least one cryptocurrency to check. For example:',
            '*/crypto BTC eth dogecoin*',
            '(You can use symbols or full names.)',
          ].join('\n'),
        }],
        response_type: 'in_channel',
      };
      return;
    }
    const attachPromises = identifiers.map(createAttachmentsForIdentifier);
    const attachments = _.flatten(await Promise.all(attachPromises));
    ctx.body = {
      attachments,
      response_type: 'in_channel',
    };
  });

  router.get('/slack/authorize', async (ctx) => {
    const { code } = ctx.query;
    const query = queryString.stringify({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
    });
    await axios.post(SLACK_OAUTH_URL, query); // TODO: Save access token
    ctx.redirect('/slack/success');
  });

  router.get('/slack/success', async (ctx) => {
    ctx.body = 'Crypto Bot says hello!'; // TODO: Pretty landing page
  });

  router.get('/', async (ctx) => {
    ctx.body = 'Crypto Bot says hello!'; // TODO: Pretty landing page
  });

  router.get('/health', async (ctx) => {
    ctx.body = '';
  });

  return router;
};

export default createRouter;
