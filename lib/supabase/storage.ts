import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function uploadAuditPdf(leadId: string, pdfBuffer: Buffer): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucketName = 'audit-pdfs';
  const fileName = `${leadId}-audit-${Date.now()}.pdf`; // Add timestamp to avoid caching/collision issues

  // 1. Upload the buffer
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[Storage] Error uploading PDF:', uploadError);
    throw new Error(`Failed to upload PDF for lead ${leadId}`);
  }

  // 2. Get the public URL
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
