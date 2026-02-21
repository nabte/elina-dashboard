/**
 * Smart Chunking System with Token-Aware Splitting and Overlap
 * Optimized for RAG (Retrieval-Augmented Generation)
 */

export interface ChunkConfig {
    maxTokens?: number
    overlapPercentage?: number
    minChunkSize?: number
    respectSentences?: boolean
}

export interface Chunk {
    content: string
    metadata: {
        index: number
        tokens: number
        startPos: number
        endPos: number
        hasOverlap: boolean
    }
}

const DEFAULT_CONFIG: Required<ChunkConfig> = {
    maxTokens: 500,           // Max tokens per chunk (safe for embeddings)
    overlapPercentage: 20,    // 20% overlap between chunks
    minChunkSize: 100,        // Minimum tokens to consider valid chunk
    respectSentences: true    // Try to break at sentence boundaries
}

/**
 * Approximates token count (1 token ≈ 4 chars for Spanish)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}

/**
 * Finds the best split point near the target position
 */
function findBestSplitPoint(
    text: string,
    targetPos: number,
    respectSentences: boolean
): number {
    if (!respectSentences) return targetPos

    // Look for sentence boundaries within ±100 chars
    const searchStart = Math.max(0, targetPos - 100)
    const searchEnd = Math.min(text.length, targetPos + 100)
    const searchZone = text.substring(searchStart, searchEnd)

    // Priority: period, exclamation, question mark, newline
    const sentenceEndings = ['. ', '.\n', '! ', '!\n', '? ', '?\n', '\n\n']

    for (const ending of sentenceEndings) {
        const pos = searchZone.lastIndexOf(ending)
        if (pos !== -1) {
            return searchStart + pos + ending.length
        }
    }

    // Fallback: look for any newline
    const newlinePos = searchZone.lastIndexOf('\n')
    if (newlinePos !== -1) {
        return searchStart + newlinePos + 1
    }

    // Last resort: use target position
    return targetPos
}

/**
 * Splits markdown text into smart chunks with overlap
 */
export function chunkMarkdown(
    text: string,
    config: ChunkConfig = {}
): Chunk[] {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const chunks: Chunk[] = []

    if (!text || text.trim().length === 0) {
        return chunks
    }

    const totalTokens = estimateTokens(text)

    // If text is small enough, return as single chunk
    if (totalTokens <= cfg.maxTokens) {
        return [{
            content: text.trim(),
            metadata: {
                index: 0,
                tokens: totalTokens,
                startPos: 0,
                endPos: text.length,
                hasOverlap: false
            }
        }]
    }

    // Calculate overlap size
    const overlapTokens = Math.floor(cfg.maxTokens * (cfg.overlapPercentage / 100))
    const overlapChars = overlapTokens * 4 // Approximate chars for overlap
    const chunkSizeChars = cfg.maxTokens * 4 // Approximate chars per chunk

    let currentPos = 0
    let chunkIndex = 0

    while (currentPos < text.length) {
        // Calculate end position for this chunk
        let endPos = currentPos + chunkSizeChars

        // Don't exceed text length
        if (endPos >= text.length) {
            endPos = text.length
        } else {
            // Find best split point
            endPos = findBestSplitPoint(text, endPos, cfg.respectSentences)
        }

        // Extract chunk content
        const chunkContent = text.substring(currentPos, endPos).trim()

        // Skip if too small (unless it's the last chunk)
        const chunkTokens = estimateTokens(chunkContent)
        if (chunkTokens < cfg.minChunkSize && endPos < text.length) {
            currentPos = endPos
            continue
        }

        // Add chunk
        chunks.push({
            content: chunkContent,
            metadata: {
                index: chunkIndex,
                tokens: chunkTokens,
                startPos: currentPos,
                endPos,
                hasOverlap: chunkIndex > 0
            }
        })

        // Move to next position with overlap
        if (endPos >= text.length) {
            break // We're done
        }

        // Next chunk starts with overlap from current chunk
        currentPos = Math.max(currentPos + 1, endPos - overlapChars)
        chunkIndex++
    }

    return chunks
}

/**
 * Splits markdown by sections (headers) first, then chunks large sections
 * This is optimized for structured documents with H1, H2, H3
 */
export function chunkMarkdownBySections(
    text: string,
    config: ChunkConfig = {}
): Chunk[] {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const allChunks: Chunk[] = []

    // Split by headers
    const lines = text.split('\n')
    let currentSection = { title: '', content: [] as string[] }
    const sections: Array<{ title: string; content: string }> = []

    for (const line of lines) {
        if (line.match(/^#{1,3}\s/)) {
            // Save previous section
            if (currentSection.content.length > 0) {
                sections.push({
                    title: currentSection.title,
                    content: currentSection.content.join('\n')
                })
            }
            // Start new section
            currentSection = {
                title: line.replace(/^#+\s/, '').trim(),
                content: [line]
            }
        } else {
            currentSection.content.push(line)
        }
    }

    // Save last section
    if (currentSection.content.length > 0) {
        sections.push({
            title: currentSection.title,
            content: currentSection.content.join('\n')
        })
    }

    // Chunk each section
    let globalIndex = 0
    for (const section of sections) {
        const sectionText = section.content.trim()
        if (!sectionText) continue

        const sectionTokens = estimateTokens(sectionText)

        // If section fits in one chunk, keep it whole
        if (sectionTokens <= cfg.maxTokens) {
            allChunks.push({
                content: sectionText,
                metadata: {
                    index: globalIndex++,
                    tokens: sectionTokens,
                    startPos: 0,
                    endPos: sectionText.length,
                    hasOverlap: false
                }
            })
        } else {
            // Section is too large, chunk it with overlap
            const sectionChunks = chunkMarkdown(sectionText, cfg)
            for (const chunk of sectionChunks) {
                allChunks.push({
                    ...chunk,
                    metadata: {
                        ...chunk.metadata,
                        index: globalIndex++
                    }
                })
            }
        }
    }

    return allChunks
}

/**
 * Formats chunks for display with metadata
 */
export function formatChunksForDisplay(chunks: Chunk[]): string[] {
    return chunks.map((chunk, i) => {
        const meta = chunk.metadata
        return `[Chunk ${i + 1}/${chunks.length}] (${meta.tokens} tokens${meta.hasOverlap ? ', con overlap' : ''})\n${chunk.content}`
    })
}
