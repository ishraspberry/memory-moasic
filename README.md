# seng513-fall24-group-24

# MemoryMosaic

MemoryMosaic is a collaborative digital scrapbooking platform.

## Description
Have you ever had a collection of photos from a crazy night or a romantic date night that you’ve wanted to create collages of? We all know Adobe Photoshop exists, but for such a high fee, sometimes it's not worth its cost for the times we want these memories to be saved.  In today’s digital world, individuals have many ways to capture content through photos, videos, and written content. While social media platforms exist to capture these moments, we wanted to develop a comprehensive solution that allows for greater flexibility in content created and serves more as a visual memory aid, and a way to express our experiences. That's why we wanted to create Memory Mosaic. 

Our application will allow users to upload and collage images together, whether it's by themselves or with others, to create beautiful pages that will reside there for as long as they’d like. It gives users a chance to save their work in a place designed for images like there as well as the option to collaborate with others on how the collage should look. Not only will it be a safe space for people to keep their images, it can be easily accessed and updated at any point, giving people more ease of use than any other photo editing tool on the market. Our application will provide a comprehensive and collaborative platform that can allow users to creatively organize their memories into a user-friendly format. While many use social media to serve similar purposes, they often lack the personalization and privacy needed for someone to create a unique and meaningful visual memory. 

## Releases
Check out the website [here](https://frontend-amber-chi-34.vercel.app/) or check out our [releases page](https://csgit.ucalgary.ca/rahat.chowdhury/seng513-fall24-group-24/-/releases).

## Local Deployment
If you want to locally deploy this application follow these steps:

1. Set up a firebase firestore database and firebase authentication.

2. Create an .env file with the following information (or provide the variables through your CLI when running docker):
    ```json
    FB_API_KEY={YourFirebaseKey}
    FB_AUTH_DOMAIN={YourFirebaseDomain}
    FB_PROJECT_ID={YourFirebaseProjectID}
    FB_STORAGE_BUCKET={YourFirebaseStorageBucketID}
    FB_MESSAGING_SENDER_ID={YourFirebaseMessagingSenderID}
    FB_APP_ID={YourFirebaseAppID}
    ```

3. Update the .env file within the frontend folder with the same information.

4. Run `docker-compose up` (assuming docker and docker-compose are installed and set up).