
import { supabase } from "@/integrations/supabase/client";
import { blogPosts } from "@/data/blogData";
// materialsData import removed
import { casesData } from "@/data/cases/index.ts"; // Import cases data

export const migratePosts = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const post of blogPosts) {
        // Map static post to DB schema
        // Note: We omit 'id' to let Supabase generate UUIDs, 
        // OR we try to match slug. Using slug as unique key for upsert is best.

        const dbPost = {
            title: post.title.replace(/<span>|<\/span>/g, ''), // Clean HTML from title if present
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content || `Conteúdo importado para: ${post.title}`,
            category: post.category,
            image: post.image,
            // Map author fields to flat columns if referencing strictly
            // Assuming DB has author_name fallback if no profile_id
            author_name: post.author.name,
            author_role: post.author.role,
            author_avatar: post.author.avatar,
            date: post.date,
            read_time: post.readTime,
            featured: post.featured || false,
            published: true,
        };

        const { error } = await supabase
            .from('blog_posts')
            .upsert(dbPost, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Falha ao migrar post ${post.slug}:`, error.message, error.details, error.hint);
            failCount++;
        } else {
            successCount++;
        }
    }

    return { success: successCount, failed: failCount };
};

export const migrateCases = async () => {
    let successCount = 0;
    let failCount = 0;

    // The data is a Record<string, CaseStudy>
    const casesArray = Object.entries(casesData).map(([slug, data]) => ({
        ...data,
        slug
    }));

    for (const caseStudy of casesArray) {
        // Map static case to DB matching types_utf8.ts
        const dbCase = {
            title: caseStudy.title,
            client_name: caseStudy.title,
            slug: caseStudy.slug,
            case_category: caseStudy.category,
            preview_description: caseStudy.preview_description || caseStudy.description || "",
            description: caseStudy.description || "",
            client_logo: caseStudy.logo,
            cover_image: caseStudy.coverImage,
            primary_metric: caseStudy.metrics?.[0] ? `${caseStudy.metrics[0].value} ${caseStudy.metrics[0].label}` : "",
            published: true,
            featured: caseStudy.featured || false,
            // JSON fields
            results: caseStudy.results || [],
            challenges: caseStudy.challenge ? [caseStudy.challenge] : [],
            strategies: caseStudy.solution ? [caseStudy.solution] : [],
            tech_stack: caseStudy.techStack || []
        };

        const { error } = await supabase
            .from('cases')
            .upsert(dbCase as any, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Falha ao migrar case ${caseStudy.slug}:`, error.message, error.details);
            failCount++;
        } else {
            successCount++;
        }
    }

    return { success: successCount, failed: failCount };
};

// migrateMaterials removed
