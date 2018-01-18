FROM node:8.9.4
RUN npm i -g npm@5.6.0

WORKDIR /app

COPY . .

ENV NODE_ENV production

RUN npm install --only=production

CMD [ "npm", "start" ]
