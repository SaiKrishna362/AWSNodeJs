FROM node:22
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 5000
ENV POSTGRES_CONNECTION_STRING = postgres://postgres:12345@host.docker.internal:5432/CustomProject01
CMD [ "node", "ServerDetails/express.js" ]