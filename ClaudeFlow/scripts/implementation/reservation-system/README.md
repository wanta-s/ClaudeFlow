# Reservation System - Rough Implementation

## Overview
This is a minimal reservation system implementation with basic functionality.

## Features
- Create reservations
- Check availability
- In-memory storage

## Setup
```bash
npm install
npm start
```

## API Endpoints

### Create Reservation
```
POST /api/reservations
Content-Type: application/json

{
  "title": "Meeting",
  "reservationDate": "2024-01-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "resourceId": "room-1",
  "creatorName": "John Doe"
}
```

### Check Availability
```
GET /api/reservations/availability?resourceId=room-1&date=2024-01-15&startTime=10:00&endTime=11:00
```

## Implementation Level: Rough
- No error handling
- Minimal validation
- Happy path only
- In-memory storage