'use server'

import { createClient } from '@/lib/supabase-server'

// --- SECURITY: STRICT HQ VERIFICATION ---
async function verifyHQ() {
  const supabase = await createClient() 

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Unauthorized: No active session detected.")
  }

  // 2. Cryptographically verify this specific user exists in the HQ table
  const { data: hqUser, error: hqError } = await supabase
    .from('hq_users')
    .select('id') 
    .eq('id', user.id) 
    .single()

  if (hqError || !hqUser) {
    throw new Error("Forbidden: HQ clearance required to execute this action.")
  }

  return { user, supabase } 
}

// --- 1. SCHOOL ACTIONS ---
export async function approveSchoolAction(schoolId: string, schoolName: string, email: string) {
  const { supabase } = await verifyHQ() 
  
  const { error } = await supabase.from('partner_schools')
    .update({ status: 'Active' })
    .eq('id', schoolId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function suspendSchoolAction(schoolId: string) {
  const { supabase } = await verifyHQ() 

  const { error } = await supabase.from('partner_schools')
    .update({ status: 'Suspended' })
    .eq('id', schoolId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function toggleSchoolTierAction(schoolId: string, newTier: string) {
  const { supabase } = await verifyHQ() 

  const { error } = await supabase.from('partner_schools')
    .update({ tier: newTier } as any)
    .eq('id', schoolId)

  if (error) throw new Error(error.message)
  return { success: true }
}

// --- 2. PAYOUT ACTIONS ---
export async function approvePayoutAction(requestId: string, refNumber: string) {
  const { supabase, user } = await verifyHQ()

  const { error } = await supabase.from('withdrawal_requests').update({
    status: 'Approved',
    bank_reference: refNumber,
    approved_at: new Date().toISOString(),
    processed_by: user.id 
  }).eq('id', requestId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function rejectPayoutAction(requestId: string) {
  const { supabase } = await verifyHQ()

  const { error } = await supabase.from('withdrawal_requests')
    .update({ status: 'Rejected' })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
  return { success: true }
}