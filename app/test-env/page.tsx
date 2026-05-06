export default function TestEnvPage() {
    return (
      <pre>
        {JSON.stringify(
          {
            NEXT_PUBLIC_SUPABASE_URL:
              process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  
            NEXT_PUBLIC_SUPABASE_ANON_KEY:
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "EXISTE"
                : null,
          },
          null,
          2,
        )}
      </pre>
    );
  }