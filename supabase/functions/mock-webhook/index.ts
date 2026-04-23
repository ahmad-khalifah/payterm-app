// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const payload = await req.json()

    // We only care about successful charges
    if (payload.event === "charge.success") {
      const { amount, reference, metadata } = payload.data
      const planId = metadata?.custom_fields?.find((f: any) => f.variable_name === "plan_id")?.value

      if (!planId) throw new Error("No plan_id found in webhook metadata")

      // 1. Fetch the actual Plan details from the database
      const { data: plan, error: fetchError } = await supabase
        .from('plans')
        .select('total_fee, deposit_paid, status')
        .eq('id', planId)
        .single()

      if (fetchError) throw fetchError

      // 2. Financial Math (Model B - Upfront Financing)
      const parentPaid = amount / 100 // Convert Kobo to Naira
      const totalFee = Number(plan.total_fee)
      
      let paymentType = 'Plan_Activation'
      let serviceFeeProfit = 0
      let financierInjected = 0
      let schoolReceived = 0

      // MVP Pitch Logic: Determine if they paid in full or used installments
      if (parentPaid >= totalFee) {
        // Parent paid in full (Base fee + ₦1,500 gateway fee)
        serviceFeeProfit = 1500
        financierInjected = 0 // No loan needed
        schoolReceived = totalFee
      } else {
        // Parent used PayTerm Installments (Base deposit + ₦10,000 service fee)
        serviceFeeProfit = 10000
        const baseDeposit = parentPaid - serviceFeeProfit
        financierInjected = totalFee - baseDeposit // The loan amount we float
        schoolReceived = totalFee // School gets 100% upfront
      }

      // 3. Execute the 45/25/25/5 Profit Split on the Service Fee
      const splitSchoolKickback = serviceFeeProfit * 0.45
      const splitFinancierRoi = serviceFeeProfit * 0.25
      const splitGuaranteePool = serviceFeeProfit * 0.25
      const splitPlatformFee = serviceFeeProfit * 0.05

      // 4. Log the transaction into the Ledger
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          plan_id: planId,
          reference: reference,
          payment_type: paymentType,
          parent_paid: parentPaid,
          financier_injected: financierInjected,
          school_received: schoolReceived,
          service_fee_profit: serviceFeeProfit,
          split_school_kickback: splitSchoolKickback,
          split_financier_roi: splitFinancierRoi,
          split_guarantee_pool: splitGuaranteePool,
          split_platform_fee: splitPlatformFee
        })

      if (txError) throw txError

      // 5. Update the Plan and Generate Clearance
      const clearanceCode = 'PT-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      
      const { error: updateError } = await supabase
        .from('plans')
        .update({ 
          deposit_paid: parentPaid, // Recording what they actually paid today
          status: 'Cleared_Resumption', // Instantly cleared because school got 100% cash
          clearance_code: clearanceCode
        })
        .eq('id', planId)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ message: 'Model B transaction logged. School paid upfront.' }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    return new Response("Event ignored", { status: 200 })
  } catch (err: any) {
    console.error("WEBHOOK ERROR:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})