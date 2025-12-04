FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm install

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client ./client
RUN cd client && npm run build

COPY server ./server

EXPOSE 3000

CMD ["node", "server/index.js"]
