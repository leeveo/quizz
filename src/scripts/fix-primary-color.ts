import { supabase } from '../lib/supabase';

/**
 * Script to ensure the primary_color column exists in the quizzes table
 */
async function addPrimaryColorColumn() {
  console.log('Running script to add primary_color column to quizzes table...');
  
  try {
    // Method 1: Try to select from the column to check if it exists
    console.log('Checking if primary_color column already exists...');
    const { error: checkError } = await supabase
      .from('quizzes')
      .select('primary_color')
      .limit(1);
    
    // If we get this specific error, the column doesn't exist
    if (checkError && checkError.message && checkError.message.includes('column "primary_color" does not exist')) {
      console.log('primary_color column does not exist, adding it directly...');
      
      // Method 2: Use direct SQL execution through RPC
      try {
        // First create the function if it doesn't exist
        await supabase.rpc('exec_sql', { 
          sql: `
          CREATE OR REPLACE FUNCTION add_primary_color_column()
          RETURNS void AS $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'quizzes' 
              AND column_name = 'primary_color'
            ) THEN
              ALTER TABLE quizzes ADD COLUMN primary_color VARCHAR(20) DEFAULT '#4f46e5';
            END IF;
          END;
          $$ LANGUAGE plpgsql;
          `
        });
        
        // Then execute the function
        await supabase.rpc('exec_sql', { sql: 'SELECT add_primary_color_column();' });
        console.log('Added primary_color column using RPC function');
      } catch (rpcError) {
        console.error('Error using RPC to add column:', rpcError);
        
        // Method 3: Direct SQL as a fallback
        console.log('Trying direct SQL ALTER TABLE statement...');
        const { error: alterError } = await supabase.rpc('exec_sql', { 
          sql: `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#4f46e5';` 
        });
        
        if (alterError) {
          throw new Error(`Failed to add column: ${alterError.message}`);
        }
        
        console.log('Added primary_color column using direct ALTER TABLE');
      }
      
      // Verify the column was added
      const { error: verifyError } = await supabase
        .from('quizzes')
        .select('primary_color')
        .limit(1);
      
      if (verifyError) {
        console.error('Verification failed, column may not have been added:', verifyError);
        throw new Error('Failed to verify column was added');
      }
      
      console.log('✅ Successfully added and verified primary_color column');
    } else {
      console.log('Column already exists or different error:', checkError);
    }
    
    // Check column content
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, primary_color')
      .limit(5);
    
    if (error) {
      console.error('Error querying quizzes:', error);
    } else {
      console.log('Sample quizzes with primary_color:', data);
    }
    
    console.log('Script completed');
  } catch (error) {
    console.error('Script failed:', error);
  }
}

// Run the function
addPrimaryColorColumn();
