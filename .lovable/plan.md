

## Diagnosis

The edge function `processar-documento` is working correctly -- I tested it directly and got a valid JSON response. The issue is in how the frontend handles the response from `supabase.functions.invoke()`.

Two problems identified:

1. **`supabase.functions.invoke()` response handling**: When the Supabase JS client calls an edge function, the `data` field may come back as a raw response that needs parsing, or `error` may be populated even on successful responses due to how the client interprets non-2xx or edge cases.

2. **React ref warning**: The `LeitorIAPage` is lazy-loaded via `React.lazy()` but the component is a plain function (not wrapped in `forwardRef`). While this is just a warning, it can cause issues with `Suspense`.

## Plan

### Step 1: Fix the `supabase.functions.invoke` response handling in LeitorIAPage

Update the `processarTexto` function to properly handle the response:
- Check if `data` contains an `error` property (edge function can return 200 with error in body)
- Add `console.log` for debugging the actual response structure
- Handle the case where `error` is a `FunctionsHttpError` by reading the response body

### Step 2: Redeploy the edge function

Redeploy `processar-documento` to ensure the latest version is live.

### Step 3: Test end-to-end

Invoke the function via curl to confirm it's responding, then verify the frontend correctly displays results.

### Technical Details

The fix in `LeitorIAPage.tsx` will update the `processarTexto` try/catch to:
```typescript
const { data, error } = await supabase.functions.invoke("processar-documento", {
  body: { texto: conteudo },
});

if (error) {
  // FunctionsHttpError wraps the response - extract the message
  const msg = error?.message || "Tente novamente";
  throw new Error(msg);
}

if (data?.error) {
  throw new Error(data.error);
}

setDados(data as DadosExtraidos);
```

