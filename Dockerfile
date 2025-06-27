FROM node:20-alpine As development

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

###################
# BUILD FOR PRODUCTION
###################

FROM node:20-alpine As build

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /usr/src/app

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node index.js index.js

USER node

CMD [ "node", "index.js" ]