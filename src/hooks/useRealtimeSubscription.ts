import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeSubscription(
  table: string,
  onDataChange: () => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onDataChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onDataChange]);
}
