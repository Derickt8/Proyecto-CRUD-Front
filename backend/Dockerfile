# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Disable strict SSL certificate verification to bypass proxy/firewall verification issues
RUN npm config set strict-ssl false

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose NestJS port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]
