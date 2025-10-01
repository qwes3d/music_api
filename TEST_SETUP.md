# Test Setup Instructions

## MongoDB Atlas Configuration

The tests are configured to use MongoDB Atlas (cloud database) instead of a local MongoDB instance.

### Steps to set up your Atlas connection:

1. **Go to MongoDB Atlas**: Visit https://cloud.mongodb.com

2. **Get your connection string**:
   - Select your project and cluster
   - Click "Connect" > "Connect your application"
   - Choose "Node.js" as your driver
   - Copy the connection string

3. **Update the .env.test file**:
   - Open `.env.test` in your project root
   - Replace the placeholder with your actual connection string
   - It should look like this:
     ```
     MONGODB_TEST_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/testdb?retryWrites=true&w=majority
     ```

4. **Whitelist your IP** (if needed):
   - In Atlas, go to Network Access
   - Add your current IP address or allow access from anywhere (0.0.0.0/0) for testing

5. **Create a test database**:
   - The tests will automatically create and use a database called `testdb`
   - Make sure your Atlas user has read/write permissions

### Running the tests:

Once you've set up the connection string, run:
```bash
npm test -- --testPathPattern=api.test.js
```

The tests will now connect to your Atlas cluster and run all API endpoint tests.
