import axios from 'axios';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import _ from 'lodash';
import queryString from 'querystring';
import { createAttachmentsForIdentifier } from './attachments';
import { SLACK_OAUTH_URL, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from './config.mjs';

const createRouter = () => {
  const router = new Router();
  router.use(bodyParser());

  router.post('/slack', async (ctx) => {
    console.log('??');
    console.log(ctx.request.body);
    const { text } = ctx.request.body;
    const identifiers = text.trim().split(/\s+|\s*,\s*/).filter(s => s);
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

  return router;
};

export default createRouter;
