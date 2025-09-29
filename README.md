# Music API

A comprehensive REST API for managing artists and albums with full CRUD operations, authentication, and data validation.

## Features

- ✅ **Two Collections**: Artists and Albums with relational data
- ✅ **Full CRUD Operations**: GET, POST, PUT, DELETE for both collections
- ✅ **Data Validation**: Comprehensive input validation and error handling
- ✅ **Authentication**: OAuth integration with demo mode
- ✅ **API Documentation**: Interactive Swagger/OpenAPI documentation
- ✅ **MongoDB Integration**: Professional database operations
- ✅ **Error Handling**: Proper HTTP status codes and error messages

## API Collections

### Artists Collection

- **Fields**: name, genre, country, formed_year, members, biography, website, social_media
- **Validation**: Required fields, year validation, member arrays
- **Relationships**: One-to-many with albums

### Albums Collection

- **Fields**: title, artist_id, release_date, genre, track_count, duration, record_label, cover_image_url
- **Validation**: Required fields, date validation, artist reference validation
- **Relationships**: Many-to-one with artists

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- npm or yarn

### Installation

1. Clone or navigate to the project directory:

   ```bash
   cd music-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

4. Start the server:
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

### API Endpoints

The API will be available at `http://localhost:3000`

#### Artists

- `GET /artists` - Get all artists
- `GET /artists/:id` - Get artist by ID
- `POST /artists` - Create new artist (requires auth)
- `PUT /artists/:id` - Update artist (requires auth)
- `DELETE /artists/:id` - Delete artist (requires auth)

#### Albums

- `GET /albums` - Get all albums
- `GET /albums/:id` - Get album by ID
- `GET /albums/artist/:artistId` - Get albums by artist
- `POST /albums` - Create new album (requires auth)
- `PUT /albums/:id` - Update album (requires auth)
- `DELETE /albums/:id` - Delete album (requires auth)

#### Documentation

- `GET /api-docs` - Interactive Swagger documentation

### Sample Data

Use the seed endpoint to populate your database with sample data:

```bash
POST /seed
```

This will create sample artists (The Beatles, Queen, Taylor Swift) and their albums.

## Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Environment Variables for Production

- `MONGODB_URI` - Your MongoDB connection string
- `GOOGLE_CLIENT_ID` - For OAuth (optional)
- `GOOGLE_CLIENT_SECRET` - For OAuth (optional)
- `SESSION_SECRET` - Session encryption key

## Development Notes

### Authentication

- Demo mode is enabled by default for testing
- OAuth integration ready for production use
- All POST, PUT, DELETE operations require authentication

### Error Handling

- Comprehensive validation with detailed error messages
- Proper HTTP status codes
- Relationship validation (albums require valid artist references)

### Data Relationships

- Artists can have multiple albums
- Albums must reference a valid artist
- Cascade validation prevents data integrity issues

## Testing

Use the Swagger UI at `/api-docs` to test all endpoints interactively.

## CSE 341 Week 5 Project Requirements

This API meets all W5 assignment requirements:

- ✅ Two collections with full CRUD operations
- ✅ Comprehensive error handling and validation
- ✅ Swagger API documentation at `/api-docs`
- ✅ Authentication integration
- ✅ Professional code structure and organization
- ✅ Ready for Render deployment