import { get, port, string } from 'strict-env';

export const PORT = get('PORT', port);
export const SLACK_OAUTH_URL = 'https://slack.com/api/oauth.access';
export const SLACK_CLIENT_ID = get('SLACK_CLIENT_ID', string);
export const SLACK_CLIENT_SECRET = get('SLACK_CLIENT_SECRET', string);
