# Use the official node image as the base image
FROM node:lts as build

# Set environment variable to trace warnings
ENV NODE_OPTIONS="--trace-warnings"

# Set the working directory
WORKDIR ./

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Use an official Nginx runtime as the base image
FROM nginx:alpine

# Copy the built app to Nginx's web directory
COPY --from=build /dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]