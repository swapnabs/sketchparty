FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install
COPY . .
RUN npm run build -w client
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/src/index.js"]
