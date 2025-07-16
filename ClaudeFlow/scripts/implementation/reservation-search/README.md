# Reservation Search Service (Rough Level)

A minimal implementation of reservation search functionality.

## Features

- Keyword search (reservation name, description, resource name)
- Date range filtering
- Status filtering
- Pagination support
- In-memory data storage

## Usage

```typescript
import { ReservationSearchService } from './searchService';

const service = new ReservationSearchService();

// Search by keyword
const results = await service.search({ keyword: 'meeting' });

// Search by date range
const dateResults = await service.search({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

// Combined search with pagination
const pagedResults = await service.search({
  keyword: 'conference',
  status: ['confirmed'],
  limit: 10,
  offset: 0
});
```

## Running the Demo

```bash
npm install
npm run demo
```

## Running Tests

```bash
npm install
npm test
```

## Limitations (Rough Level)

- No error handling
- No input validation
- No database persistence
- Minimal type definitions
- Happy path only

## Files

- `types.ts` - Basic type definitions
- `searchService.ts` - Main search service
- `memoryStore.ts` - In-memory data storage
- `demo.ts` - Demonstration script
- `index.ts` - Module exports