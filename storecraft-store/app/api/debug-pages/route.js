import { NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db'
import Page from '@/lib/models/Page.model'

export async function GET() {
  try {
    await dbConnect()
    const allPages = await Page.find({})
      .select('title slug status showInInfoBar showInNav showInFooter')
      .lean()
    
    return NextResponse.json({
      total: allPages.length,
      pages: allPages
    })
  } catch (e) {
    return NextResponse.json({ error: e.message })
  }
}
