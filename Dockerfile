# Use Node 20 Alpine (lightweight)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# 1. Install system build tools (The "Safety Net")
# Some npm packages need Python/C++ to build on Linux. This prevents those errors.
RUN apk add --no-cache python3 make g++

# 2. Copy package files
COPY package*.json ./

# 3. THE FIX: Delete the local lockfile and install fresh
# This ensures we don't carry over Windows/Mac specific issues
RUN rm -f package-lock.json
RUN npm install

# 4. Copy the rest of the code
COPY . .

# 5. Build the TypeScript code
RUN npm run build

# 6. Expose the port and start
EXPOSE 3000
CMD ["npm", "start"]