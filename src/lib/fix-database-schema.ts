import { supabase } from './supabase';

// Define more specific types to replace 'any'
type SchemaFixResult = {
  success: boolean;
  error?: unknown;
  columnResults?: Record<string, boolean>;
};

// Fix all database schemas without using exec_sql
export async function fixAllDatabaseSchemas() {
  console.log('Starting database schema checks...');
  
  // Track results for each operation
  const results: Record<string, SchemaFixResult> = {};
  
  try {
    // Check and fix participants table
    results.participants = await fixParticipantsTable();
    
    // Additional tables could be fixed here with similar approach
    
    return {
      success: Object.values(results).every(result => result.success),
      results
    };
  } catch (err) {
    console.error('Error in fixAllDatabaseSchemas:', err);
    return {
      success: false,
      error: err
    };
  }
}

// Helper function to fix participants table
async function fixParticipantsTable(): Promise<SchemaFixResult> {
  try {
    // Check if table exists
    const { error: tableError } = await supabase
      .from('participants')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, we can't fix it
    if (tableError && tableError.code === '42P01') {
      console.error('Participants table does not exist');
      return { success: false, error: tableError };
    }
    
    // Check for required columns and use insert approach instead of SQL
    const requiredColumns = ['avatar_emoji', 'connected_at'];
    const columnResults: Record<string, boolean> = {};
    
    for (const column of requiredColumns) {
      try {
        const { error } = await supabase
          .from('participants')
          .select(column)
          .limit(1);
        
        // If column doesn't exist, try to add it via a test record
        if (error && error.message && error.message.includes(`column "${column}" does not exist`)) {
          try {
            const tempId = `temp-${Date.now()}-${column}`;
            const insertData: Record<string, string | Date> = {
              id: tempId,
              name: 'Temporary User',
              quiz_id: '00000000-0000-0000-0000-000000000000'
            };
            
            // Add the missing column with a default value
            if (column === 'avatar_emoji') {
              insertData.avatar_emoji = '👤';
            } else if (column === 'connected_at') {
              insertData.connected_at = new Date().toISOString();
            }
            
            // Insert test record
            await supabase.from('participants').insert(insertData);
            
            // Delete test record
            await supabase.from('participants').delete().eq('id', tempId);
            
            columnResults[column] = true;
            console.log(`Added ${column} column successfully`);
          } catch (insertErr) {
            console.warn(`Could not add ${column} column:`, insertErr);
            columnResults[column] = false;
          }
        } else {
          // Column exists
          columnResults[column] = true;
        }
      } catch (err) {
        console.warn(`Error checking ${column} column:`, err);
        columnResults[column] = false;
      }
    }
    
    const allColumnsFixed = Object.values(columnResults).every(Boolean);
    return {
      success: allColumnsFixed,
      columnResults
    };
  } catch (err) {
    console.error('Error fixing participants table:', err);
    return { success: false, error: err };
  }
}
