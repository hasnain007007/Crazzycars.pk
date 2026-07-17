import { NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db'
import Page from '@/lib/models/Page.model'

export async function GET(req) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const nav = searchParams.get('nav')
    const footer = searchParams.get('footer')
    const infobar = searchParams.get('infobar')
    const status = searchParams.get('status')

    const query = {}
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status
    } else if (!status) {
      query.status = 'published'
    }
    
    // Location filters
    if (nav === 'true') query.showInNav = true
    if (footer === 'true') query.showInFooter = true
    if (infobar === 'true') query.showInInfoBar = true

    const rows = await Page.find(query)
      .select('title slug template showInNav showInFooter showInInfoBar sortOrder icon externalUrl openInNewTab')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()

    const pages = rows.map((page) => ({
      ...page,
      showInFooter: Boolean(page.showInFooter),
    }))

    return NextResponse.json({
      success: true,
      pages,
      data: pages,
    })
  } catch (e) {
    console.error('Pages API error:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
