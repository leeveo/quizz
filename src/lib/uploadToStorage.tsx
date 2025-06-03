import { supabase } from './supabase'

export async function uploadImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `images/${fileName}`

  const { error } = await supabase.storage
    .from('quiz-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error.message)
    return null
  }

  const { data: publicUrlData } = supabase.storage
    .from('quiz-images')
    .getPublicUrl(filePath)

  return publicUrlData?.publicUrl || null
}
