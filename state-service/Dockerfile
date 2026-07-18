FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
ENV PORT=8787 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "server.mjs"]
