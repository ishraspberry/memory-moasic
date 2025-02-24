# Use an official Node.js runtime as a parent image
FROM node:lts

# Set the working directory inside the container
WORKDIR ./

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the app dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port on which the app runs
EXPOSE 5001

# Start the Express app
CMD ["npm", "start"]