# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Disable strict SSL certificate verification to bypass proxy/firewall verification issues
RUN npm config set strict-ssl false

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies like Vite)
RUN npm install --include=dev

# Copy source code
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Start development server binding to all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
