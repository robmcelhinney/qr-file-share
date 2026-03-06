FROM node:20-alpine AS build

WORKDIR /app

COPY client/package*.json ./client/
RUN npm --prefix client ci

COPY client ./client
RUN npm --prefix client run build

COPY package*.json ./
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/bin.js ./bin.js
COPY --from=build /app/constants.js ./constants.js
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/client/dist ./client/dist

EXPOSE 8765

CMD ["bin.js"]
