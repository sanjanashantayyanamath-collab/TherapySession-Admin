import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { rekeyNotes } from '../src/services/noteService.js';

await connectDatabase();
try {
  await rekeyNotes();
  console.log('Private notes rekeyed.');
} finally {
  await disconnectDatabase();
}
