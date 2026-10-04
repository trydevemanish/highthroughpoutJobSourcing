FROM node:22-alpine

WORKDIR /code

COPY package*.json ./
RUN npm i

# worker imports from ../shared, so copy the whole project
COPY . .

# no EXPOSE: a worker doesn't listen on any port

CMD ["npm", "run", "dev:worker"]