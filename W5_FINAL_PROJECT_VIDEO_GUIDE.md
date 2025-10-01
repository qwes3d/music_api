# W5 Final Project Video Guide - Music API Demo-- Individual demo-- Kendahl

## Demo Script

### 1. Deployment (30 seconds)

**[Open: https://music-api-cse341-u669.onrender.com/api-docs]**

"Hi! My Music API is deployed live on Render. I'll demonstrate the 3 graded requirements: Deployment, CRUD + Documentation, and Error Handling."

### 2. CRUD + Documentation (2.5 minutes)

**Artists CRUD:**

- GET /artists → Execute → 200 status
- POST /artists → Paste & Execute:

```json
{
  "name": "W5 Demo Band",
  "genre": "Indie Rock",
  "country": "United States",
  "formed_year": 2024,
  "members": ["Demo Singer", "Demo Guitarist", "Demo Drummer", "Demo Bassist"]
}
```

-PUT- Copy artist ID from response → PUT /artists/{id} → Update with:

```json
{
  "name": "W5 Demo Band",
  "genre": "Alternative Rock",
  "country": "United States",
  "formed_year": 2024,
  "members": ["Demo Singer", "Demo Guitarist", "Demo Drummer", "Demo Bassist"],
  "biography": "Updated for W5 demo"
}
```

- GET/artist by ID
- DELETE /artists/{id} → Use same ID → 200 status

**Albums CRUD:**

- GET /albums → Execute → 200 status
- POST /albums → Paste & Execute (uses The Beatles' permanent ID):

```json
{
  "title": "W5 Demo Album",
  "artist_id": "68d85a0e6d402fd815402298",
  "release_date": "2024-09-27",
  "genre": "Indie Rock",
  "track_count": 10,
  "duration": 35
}
```

-PUT- Copy album ID from response → PUT /albums/{id} → Update with:

```json
{
  "title": "W5 Demo Album (Deluxe)",
  "artist_id": "68d85a0e6d402fd815402298",
  "release_date": "2024-09-27",
  "genre": "Alternative Rock",
  "track_count": 13,
  "duration": 42,
  "record_label": "CSE341 Records"
}
```

- GET/ albums by ID
- DELETE /albums/{id} → Use same album ID → 200 status

### 3. Error Handling (1 minute)

**Trigger errors via Swagger:**

- POST /artists → Empty object `{}` → 400 error
- GET /artists/{id} → Type "invalidid" → 400 error
- GET /artists/{id} → Type "507f1f77bcf86cd799439011" → 500 error

### 4. Summary (30 seconds)

"All W5 requirements demonstrated successfully:

✅ **Deployment**: API working live on Render (not localhost)
✅ **CRUD + Documentation**: Two collections with complete CRUD operations via Swagger
✅ **Error Handling**: Try/catch blocks returning proper 400/500 status codes

This Music API is production-ready with professional documentation and comprehensive error handling. Thanks for watching!"