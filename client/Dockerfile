# client/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

RUN npm install

# Copy the rest of the frontend code
COPY . .

ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
