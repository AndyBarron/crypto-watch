import Koa from 'koa';
import { PORT } from './config.mjs';
import createRouter from './createRouter.mjs';

const app = new Koa();
const router = createRouter();
router.get('/', ctx => ctx.body = '!');

app
  .use(router.routes())
  .use(router.allowedMethods());

// eslint-disable-next-line no-console
app.listen(PORT, () => console.info(`Server listening on port ${PORT}`));
