import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina mudanças em tempo real de uma tabela Supabase.
 *
 * Usa `useRef` internamente para congelar o callback, evitando o loop de
 * re-subscription que ocorre quando `onDataChange` é recriado a cada render.
 * O channel é criado UMA vez por `table` montada e removido no cleanup.
 */
export function useRealtimeSubscription(
  table: string,
  onDataChange: () => void
) {
  // Mantém sempre a versão mais recente do callback sem invalidar o efeito
  const callbackRef = useRef(onDataChange);
  useEffect(() => {
    callbackRef.current = onDataChange;
  });

  useEffect(() => {
    const channelName = `realtime-${table}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]); // apenas `table` — callback nunca recria o channel
}
