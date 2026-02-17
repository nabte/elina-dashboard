-- Secure RAG Search Function
-- Guarantees multi-tenant isolation by filtering on user_id

-- DROP IS REQUIRED IF RETURN TYPE CHANGES
DROP FUNCTION IF EXISTS search_knowledge_base(vector,float,int,uuid);

create or replace function search_knowledge_base(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,  -- FIXED: Changed from bigint to uuid to match knowledge_embeddings.id type
  content text,
  similarity float,
  metadata jsonb
)
language plpgsql
as $$
begin
  return query
  select
    ke.id,
    ke.content,
    1 - (ke.embedding <=> query_embedding) as similarity,
    ke.metadata
  from knowledge_embeddings ke
  join knowledge_files kf on ke.file_id = kf.id
  where 
    ke.user_id = p_user_id -- STRICT TENANT ISOLATION
    and kf.status = 'ready' -- Only search ready files
    and 1 - (ke.embedding <=> query_embedding) > match_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;
