import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Hello from Functions!")

Deno.serve(async (req) => {
    try {
        // 1. Create Supabase Client with Service Role Key (admin access)
        // This allows us to bypass RLS to insert the blog
        const supabaseWithServiceRole = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse the request body
        const data = await req.json()
        console.log("Received payload:", data)

        // 3. Extract and normalize fields
        const title = data.title || 'Untitled Blog'
        const content = data.html_content || data.content || ''
        const featured_image = data.featured_image_url || data.featured_image || null

        // BlogMefy uses 'publish', we map to 'published' standard if needed, or keep as is.
        // Let's standardise on 'published' vs 'draft'
        let status = 'draft'
        if (data.status === 'publish' || data.status === 'published') {
            status = 'published'
        }

        const meta_description = data.meta_description || (data.meta && data.meta.description) || ''
        const published_at = data.published_at || (status === 'published' ? new Date().toISOString() : null)

        // 4. Generate Slug from Title
        let slug = title.toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // remove non-word chars
            .replace(/[\s_-]+/g, '-') // replace spaces with dashes
            .replace(/^-+|-+$/g, ''); // trim dashes

        // Fallback if slug became empty
        if (!slug) {
            slug = `blog-${Date.now()}`
        }

        // 5. Check uniqueness and append suffix if needed
        const { data: existing } = await supabaseWithServiceRole
            .from('blogs')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()

        if (existing) {
            slug = `${slug}-${Math.floor(Math.random() * 10000)}`
        }

        // 6. Insert into Database
        const { error } = await supabaseWithServiceRole
            .from('blogs')
            .insert({
                title,
                slug,
                content,
                featured_image,
                status,
                meta_description,
                published_at
            })

        if (error) {
            // If insert fails (e.g. valid constraint), return error
            console.error("Supabase Insert Error:", error)
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 7. Return Success
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Blog received successfully',
                post: {
                    title,
                    status,
                    received_at: new Date().toISOString(),
                    slug
                }
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 },
        )

    } catch (err) {
        console.error("Function Error:", err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
