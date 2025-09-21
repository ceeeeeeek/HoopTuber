# client/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

RUN npm install

# Copy the rest of the frontend code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
