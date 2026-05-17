# Use the official Node.js 22 image as the base
FROM node:22-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Service must listen to $PORT environment variable.
# Cloud Run sets this to 8080 by default, but your service expects 3000.
ENV PORT=3000

# Run the web service on container startup.
CMD [ "npm", "start" ]
